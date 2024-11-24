import Link from 'next/link';

export default function Home() {
  return (
    <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Video Maker</h1>
      <Link href="/edit">
        <a className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 text-center block">Go to Edit Page</a>
      </Link>
    </div>
  );
}
