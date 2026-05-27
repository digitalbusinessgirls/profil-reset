import { put } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Body aus POST oder GET (Fallback)
    const body = req.body || {};
    const data = body.data;

    if (!data) {
      return res.status(400).json({ error: 'Keine Daten übergeben', method: req.method });
    }

    const id = Math.random().toString(36).substring(2, 9);
    const filename = `reports/${id}.json`;

    const blob = await put(filename, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return res.status(200).json({ url: blob.url, id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
