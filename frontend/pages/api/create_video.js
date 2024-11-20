import axios from 'axios';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const response = await axios.post('http://localhost:5000/api/create_video', req.body);
      res.status(200).json(response.data);
    } catch (error) {
      res.status(error.response.status).json({ error: error.response.data.error });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
