from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip, AudioFileClip, ImageClip, concatenate_videoclips
import openai
import os
from PIL import Image
import requests
from io import BytesIO
from dotenv import load_dotenv
import uuid
from rq import Queue
from rq.job import Job
from worker import conn
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.errors
from model import User, Library, db
import datetime

app = Flask(__name__, static_url_path='/uploads', static_folder='uploads')
CORS(app)  # Enable CORS for the Flask app

load_dotenv()
openai.api_key = os.getenv('OPENAI_API_KEY')

# Initialize job queue
q = Queue(connection=conn)

def upload_to_youtube(video_path, title, description):
    # YouTube API setup
    scopes = ["https://www.googleapis.com/auth/youtube.upload"]
    client_secrets_file = "client_secret.json"

    flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
        client_secrets_file, scopes)
    credentials = flow.run_console()

    youtube = googleapiclient.discovery.build(
        "youtube", "v3", credentials=credentials)

    request_body = {
        "snippet": {
            "categoryId": "22",
            "title": title,
            "description": description,
            "tags": ["test"]
        },
        "status": {
            "privacyStatus": "private"
        }
    }

    media_file = googleapiclient.http.MediaFileUpload(video_path, chunksize=-1, resumable=True)

    request = youtube.videos().insert(
        part="snippet,status",
        body=request_body,
        media_body=media_file
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%")

    return response

@app.route('/api/add_text', methods=['POST'])
def add_text():
    data = request.get_json()
    video_path = data.get('video_path')
    text = data.get('text')
    output_path = data.get('output_path')

    if not video_path or not text or not output_path:
        return jsonify({'error': 'Missing required parameters'}), 400

    try:
        video = VideoFileClip(video_path)
        txt_clip = TextClip(text, fontsize=70, color='white')
        txt_clip = txt_clip.set_pos('center').set_duration(video.duration)

        video = CompositeVideoClip([video, txt_clip])
        video.write_videofile(output_path, codec='libx264')

        return jsonify({'message': 'Text added to video successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload_video', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    video = request.files['video']
    if video.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        video_path = os.path.join('uploads', video.filename)
        video.save(video_path)
        Library.create(file_path=video_path, file_type='video', upload_time=datetime.datetime.now())

        return jsonify({'message': 'Video uploaded successfully', 'video_path': video_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/load_frame', methods=['GET'])
def load_frame():
    video_path = request.args.get('video_path')
    if not video_path:
        return jsonify({'error': 'Missing video path'}), 400

    try:
        video = VideoFileClip(video_path)
        frame = video.get_frame(0)
        img = Image.fromarray(frame)
        img_io = BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        return send_file(img_io, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/create_video', methods=['POST'])
def create_video():
    data = request.get_json()
    video_path = data.get('video_path')
    text = data.get('text')
    image_description = data.get('image_description')
    audio_path = data.get('audio_path')
    output_path = data.get('output_path')
    text_position = data.get('text_position')
    user_id = data.get('user_id', None)

    if not video_path or not text or not image_description or not audio_path or not output_path or not user_id:
        return jsonify({'error': 'Missing required parameters'}), 400

    try:
        # Generate image from description using OpenAI
        response = openai.images.generate(
            prompt=image_description,
            n=1,
            size="512x512",
            quality="standard",
            model="dall-e-3"
        )
        image_url = response['data'][0]['url']
        response = requests.get(image_url)
        img = Image.open(BytesIO(response.content))
        img_name = f"screenshot_{uuid.uuid4()}.png"
        img_path = os.path.join('uploads', img_name)
        img.save(img_path)

        video = VideoFileClip(video_path)
        txt_clip = TextClip(text, fontsize=70, color='white').set_pos((text_position['x'], text_position['y'])).set_duration(video.duration)
        img_clip = ImageClip(img_path).set_duration(video.duration).resize(height=100).set_pos('bottom')
        audio_clip = AudioFileClip(audio_path)

        video = CompositeVideoClip([video, txt_clip, img_clip])
        video = video.set_audio(audio_clip)
        edited_video_path = os.path.join('uploads', f"{os.path.splitext(os.path.basename(video_path))[0]}_edited.mp4")
        video.write_videofile(edited_video_path, codec='libx264')

        # Insert video and image paths into the library table
        Library.create(file_path=edited_video_path, file_type='video')
        Library.create(file_path=img_path, file_type='image')

        return jsonify({'message': 'Video created successfully', 'job_id': job.get_id()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/concatenate_videos', methods=['POST'])
def concatenate_videos():
    data = request.get_json()
    video_paths = data.get('video_paths')
    output_path = data.get('output_path')

    if not video_paths or not output_path:
        return jsonify({'error': 'Missing required parameters'}), 400

    try:
        clips = [VideoFileClip(path) for path in video_paths]
        final_clip = concatenate_videoclips(clips)
        final_clip.write_videofile(output_path, codec='libx264')

        return jsonify({'message': 'Videos concatenated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/library', methods=['GET', 'OPTIONS'])
def get_library():
    try:
        library_items = Library.select().dicts()
        response = jsonify(list(library_items))
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload_to_youtube', methods=['POST'])
def upload_to_youtube_endpoint():
    data = request.get_json()
    video_path = data.get('video_path')
    youtube_title = data.get('youtube_title')
    youtube_description = data.get('youtube_description')

    if not video_path or not youtube_title or not youtube_description:
        return jsonify({'error': 'Missing required parameters'}), 400

    try:
        # Add job to queue for uploading to YouTube
        job = q.enqueue(upload_to_youtube, video_path, youtube_title, youtube_description)
        return jsonify({'message': 'Upload to YouTube started', 'job_id': job.get_id()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_video', methods=['POST'])
def save_video():
    data = request.get_json()
    video_path = data.get('video_path')
    text = data.get('text')
    text_position = data.get('text_position')
    output_path = data.get('output_path')

    if not video_path or not text or not text_position or not output_path:
        return jsonify({'error': 'Missing required parameters'}), 400

    try:
        video = VideoFileClip(video_path)
        txt_clip = TextClip(text, fontsize=70, color='white').set_pos((text_position['x'], text_position['y'])).set_duration(video.duration)
        video = CompositeVideoClip([video, txt_clip])
        video.write_videofile(output_path, codec='libx264')

        Library.create(file_path=output_path, file_type='video', upload_time=datetime.datetime.now())

        return jsonify({'message': 'Video saved successfully', 'video_path': output_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
