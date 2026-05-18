import { fixAndParseJSON } from './helper.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent. Analysiere NUR Punkte 5-9.\nPUNKT 5 - PROFILBILD: Bewertung + Empfehlung + 3 Tipps.\nPUNKT 6 - HIGHLIGHTS: Struktur max 6 + Inhalte + Reduktion.\nPUNKT 7 - FEED: Diagnose + 3 Pin-Ideen.\nPUNKT 8 - STORYS: Leitlinien oder Notiz.\nPUNKT 9 - CONTENTSAEULEN: 1 Hauptthema + 3 Unterthemen + je 3 Ideen.\nWICHTIG: Nur valides JSON. Keine Anfuehrungszeichen in Textwerten - nutze Apostrophe stattdessen.';

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Profil: ' + body.link + ' | Nische: ' + body.nische + ' | Zielgruppe: ' + body.zielgruppe + '\n\nFormat:\n{"analyse":[{"nr":5,"titel":"Profilbild-Feedback","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":6,"titel":"Highlight-Struktur","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":7,"titel":"Erste 3 Posts / Feed-Einstieg","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":8,"titel":"Story-Check","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":9,"titel":"Contentsaeulen","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]}]}' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: contentParts }] })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = (data.content || []).map(b => b.text || '').join('');
    try {
      return res.status(200).json(fixAndParseJSON(raw));
    } catch(e) {
      return res.status(500).json({ error: 'JSON Parse Fehler: ' + e.message });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
