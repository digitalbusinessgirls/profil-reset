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

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent. Antworte NUR mit validem JSON. Kein Text davor oder danach. Keine Markdown-Codeblocks.\n\nAnalysiere Punkte 5-9:\nPUNKT 5 - PROFILBILD: Kurze Bewertung und Empfehlung.\nPUNKT 6 - HIGHLIGHTS: Aktuelle Struktur bewerten, neue Struktur empfehlen.\nPUNKT 7 - FEED: Diagnose der ersten Posts, 3 Pin-Empfehlungen.\nPUNKT 8 - STORYS: Leitlinien oder Hinweis dass keine sichtbar sind.\nPUNKT 9 - CONTENTSAEULEN: Hauptthema plus 3 Unterthemen mit Ideen.\n\nJSON-REGELN (strikt einhalten):\n- Kein Anführungszeichen innerhalb von String-Werten – nutze Apostrophe\n- Kein Zeilenumbruch innerhalb von String-Werten\n- Kein doppeltes Komma (,,) – nach jedem Objekt genau ein Komma\n- Kein Komma nach dem letzten Element eines Arrays oder Objekts\n- Jedes Array und Objekt muss korrekt geschlossen sein';

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Profil: ' + body.link + '\nNische: ' + body.nische + '\nZielgruppe: ' + body.zielgruppe + '\nAngebot: ' + body.angebot });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: contentParts },
          { role: 'assistant', content: '{"analyse":[' }
        ]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    // Claude continues from where we left off, so prepend our start
    const raw = '{"analyse":[' + (data.content || []).map(b => b.text || '').join('');
    
    try {
      const parsed = fixAndParseJSON(raw);
      return res.status(200).json(parsed);
    } catch(e) {
      console.log('RAW length:', raw.length, '| stop_reason:', data.stop_reason);
      console.log('RAW end:', raw.substring(raw.length - 300));
      return res.status(500).json({ error: 'JSON Parse Fehler: ' + e.message });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
