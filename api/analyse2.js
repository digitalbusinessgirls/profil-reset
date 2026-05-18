export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent.\n\nAnalysiere Punkte 5-9:\nPUNKT 5 - PROFILBILD: Kurze Bewertung und Empfehlung.\nPUNKT 6 - HIGHLIGHTS: Aktuelle Struktur bewerten, neue Struktur empfehlen.\nPUNKT 7 - FEED: Diagnose der ersten Posts, 3 Pin-Empfehlungen.\nPUNKT 8 - STORYS: Leitlinien oder Hinweis dass keine sichtbar sind.\nPUNKT 9 - CONTENTSAEULEN: Hauptthema plus 3 Unterthemen mit Ideen.';

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
        tools: [{
          name: 'analyse_ausgabe',
          description: 'Gibt die Profil-Analyse fuer Punkte 5-9 (Profilbild, Highlights, Feed, Storys, Contentsaeulen) als strukturiertes JSON zurueck',
          input_schema: { type: 'object', properties: {} }
        }],
        tool_choice: { type: 'tool', name: 'analyse_ausgabe' },
        messages: [{ role: 'user', content: contentParts }]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const toolUse = (data.content || []).find(b => b.type === 'tool_use');
    if (!toolUse) {
      console.log('Kein tool_use in response:', JSON.stringify(data).substring(0, 300));
      return res.status(500).json({ error: 'Kein strukturiertes Ergebnis erhalten' });
    }
    return res.status(200).json(toolUse.input);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
