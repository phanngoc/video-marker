import 'tailwindcss/tailwind.css';
import '../styles/globals.css';
import { Provider, useDispatch } from 'react-redux';
import store from '../store';
import { useState, useEffect } from 'react';
import { setSelectedMedia } from '../store';

function MyApp({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-100 flex">
        <div className="w-1/4 bg-white p-4 shadow-md" id="main-sidebar">
          <h2 className="text-xl font-bold mb-4">Library</h2>
          <LibrarySidebar />
        </div>
        <div className="flex-1 bg-gray-100 flex items-center justify-center">
          <Component {...pageProps} />
        </div>
      </div>
    </Provider>
  );
}

function LibrarySidebar() {
  const [library, setLibrary] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/library');
        const data = await response.json();
        setLibrary(data);
      } catch (error) {
        console.error('fetchLibrary:error', error);
      }
    };
    fetchLibrary();
  }, []);

  const handleMediaClick = (item) => {
    dispatch(setSelectedMedia(item));
  };

  return (
    <div className="space-y-4">
      {library.map((item) => (
        <div key={item.id} className="border rounded p-2" onClick={() => handleMediaClick(item)}>
          {item.file_type === 'video' ? (
            <video src={`http://127.0.0.1:5000/${item.file_path}`} controls className="w-full h-32 object-cover" />
          ) : (
            <audio src={`http://127.0.0.1:5000/${item.file_path}`} controls className="w-full" />
          )}
        </div>
      ))}
    </div>
  );
}

export default MyApp;