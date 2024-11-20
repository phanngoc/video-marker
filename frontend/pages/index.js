import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function Home() {
  const [videoPath, setVideoPath] = useState('');
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
  const imageRef = useRef(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await axios.get('/api/library');
        setLibrary(response.data);
      } catch (error) {
        setMessage(error.response.data.error);
      }
    };
    fetchLibrary();
  }, []);

  const handleImageLoad = async () => {
    try {
      const response = await axios.get('/api/load_frame');
      setImage(response.data.image);
    } catch (error) {
      setMessage(error.response.data.error);
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
      const response = await axios.post('/api/create_video', {
        video_path: videoPath,
        text,
        image_description: imageDescription,
        audio_path: audioPath,
        output_path: outputPath,
        youtube_title: youtubeTitle,
        youtube_description: youtubeDescription,
        text_position: textPosition,
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response.data.error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Video</h1>
        <button onClick={handleImageLoad} className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 mb-4">Load Frame</button>
        {image && (
          <div className="relative">
            <img src={image} alt="Frame" ref={imageRef} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="w-full" />
            <input type="text" placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} style={{ position: 'absolute', top: textPosition.y, left: textPosition.x }} className="px-4 py-2 border rounded" />
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Video Path" value={videoPath} onChange={(e) => setVideoPath(e.target.value)} required className="w-full px-4 py-2 border rounded" />
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
