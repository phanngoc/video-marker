import { useState, useEffect, useRef } from 'react';

const baseURL = 'http://127.0.0.1:5000'; // Ensure this matches the backend server's URL

export default function Home() {
  const [text, setText] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [audioPath, setAudioPath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [library, setLibrary] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch(`${baseURL}/api/library`);
        const data = await response.json();
        console.log('fetchLibrary:response', data);
        setLibrary(data);
      } catch (error) {
        console.log('fetchLibrary:error', error);
        setMessage(error.message);
      }
    };
    fetchLibrary();
  }, []);

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
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTextPosition({ x, y });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${baseURL}/api/create_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          image_description: imageDescription,
          audio_path: audioPath,
          output_path: outputPath,
          youtube_title: youtubeTitle,
          youtube_description: youtubeDescription,
          text_position: textPosition,
        }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Video</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="file" accept="video/*" onChange={handleVideoUpload} required className="w-full px-4 py-2 border rounded" />
          {image && (
            <div className="relative">
              <img src={image} alt="Frame" ref={imageRef} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="w-full" />
              <input type="text" placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} style={{ position: 'absolute', top: textPosition.y, left: textPosition.x }} className="px-4 py-2 border rounded" />
            </div>
          )}
          <input type="text" placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} required className="w-full px-4 py-2 border rounded" />
          <input type="text" placeholder="Image Description" value={imageDescription} onChange={(e) => setImageDescription(e.target.value)} required className="w-full px-4 py-2 border rounded" />
          <input type="text" placeholder="Audio Path" value={audioPath} onChange={(e) => setAudioPath(e.target.value)} required className="w-full px-4 py-2 border rounded" />
          <input type="text" placeholder="Output Path" value={outputPath} onChange={(e) => setOutputPath(e.target.value)} required className="w-full px-4 py-2 border rounded" />
          <input type="text" placeholder="YouTube Title" value={youtubeTitle} onChange={(e) => setYoutubeTitle(e.target.value)} required className="w-full px-4 py-2 border rounded" />
          <input type="text" placeholder="YouTube Description" value={youtubeDescription} onChange={(e) => setYoutubeDescription(e.target.value)} required className="w-full px-4 py-2 border rounded" />
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Create Video</button>
        </form>
        {message && <p className="mt-4 text-center text-red-500">{message}</p>}
        <h2 className="text-xl font-bold mt-6">Library</h2>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {library.map((item) => (
            <div key={item.id} className="border rounded p-2">
              {item.file_type === 'video' ? (
                <video src={item.file_path} controls className="w-full h-32 object-cover" />
              ) : (
                <img src={item.file_path} alt="Image" className="w-full h-32 object-cover" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
