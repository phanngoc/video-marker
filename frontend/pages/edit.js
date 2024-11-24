import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

const baseURL = 'http://127.0.0.1:5000'; // Ensure this matches the backend server's URL

export default function Edit() {
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [videoFile, setVideoFile] = useState(null);
  const [textColor, setTextColor] = useState('black');
  const imageRef = useRef(null);
  const selectedMedia = useSelector((state) => state.library.selectedMedia);

  useEffect(() => {
    if (selectedMedia) {
      if (selectedMedia.file_type === 'image') {
        setImage(`${baseURL}/${selectedMedia.file_path}`);
        determineTextColor(`${baseURL}/${selectedMedia.file_path}`);
      } else if (selectedMedia.file_type === 'video') {
        setVideoFile(selectedMedia.file_path);
      }
    }
  }, [selectedMedia]);

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch(`${baseURL}/api/upload_video`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setVideoFile(data.video_path);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    if (videoFile) {
      loadFrame();
    }
  }, [videoFile]);

  const loadFrame = async () => {
    if (!videoFile) {
      setMessage('Please upload a video first.');
      return;
    }

    try {
      const response = await fetch(`${baseURL}/api/load_frame?video_path=${videoFile}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImage(url);
      determineTextColor(url);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const determineTextColor = (imageUrl) => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      const pixelCount = data.length / 4;
      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      setTextColor(brightness > 125 ? 'black' : 'white');
    };
  };

  const handleDragStart = (e) => {
    const rect = imageRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - textPosition.x;
    const offsetY = e.clientY - rect.top - textPosition.y;
    e.dataTransfer.setData('text/plain', JSON.stringify({ offsetX, offsetY }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const { offsetX, offsetY } = JSON.parse(e.dataTransfer.getData('text/plain'));
    const x = e.clientX - rect.left - offsetX;
    const y = e.clientY - rect.top - offsetY;
    setTextPosition({ x, y });
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    const output_path = `uploads/${Date.now()}_edited.mp4`;
    try {
      const response = await fetch(`${baseURL}/api/save_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_path: videoFile,
          text,
          text_position: textPosition,
          output_path,
        }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="flex-1 bg-gray-100 flex items-center justify-center" id="main-edit">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">{image ? 'Save Video' : 'Create Video'}</h1>
          <form className="space-y-4">
            <input type="file" accept="video/*" onChange={handleVideoUpload} required className="w-full px-4 py-2 border rounded" />
          </form>
          <div className="mt-4" id="frame-edit-wrap">
            <button onClick={handleSaveVideo} className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">{image ? 'Save Video' : 'Create Video'}</button>
            {image && (
              <div className="relative">
                <img src={image} alt="Frame" id="preview-video-thumbnail" ref={imageRef} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="w-full" />
                <input type="text" placeholder="Text" value={text} onChange={(e) => setText(e.target.value)}
                  id="text-editor" draggable onDragStart={handleDragStart}
                  style={{ position: 'absolute', top: textPosition.y, left: textPosition.x, backgroundColor: 'transparent', border: 'none', color: textColor }} className="px-4 py-2" />
              </div>
            )}
          </div>
          {message && <p className="mt-4 text-center text-red-500">{message}</p>}
        </div>
      </div>
    </div>
  );
}
