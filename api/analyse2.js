export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent. Analysiere das Profil und gib die Ergebnisse in EXAKT dieser JSON-Struktur zurueck:\n\n{\n  "analyse": [\n    {"nr":5,"titel":"Profilbild","inhalt":"Kurze Bewertung und konkrete Empfehlung"},\n    {"nr":6,"titel":"Highlights","inhalt":"Bewertung der aktuellen Struktur und Empfehlung fuer neue Struktur"},\n    {"nr":7,"titel":"Feed","inhalt":"Diagnose der ersten Posts und 3 konkrete Pin-Empfehlungen"},\n    {"nr":8,"titel":"Storys","inhalt":"Leitlinien fuer Storys oder Hinweis dass keine sichtbar sind"},\n    {"nr":9,"titel":"Contentsaeulen","inhalt":"Hauptthema plus 3 Unterthemen mit konkreten Ideen"}\n  ]\n}\n\nNur das "analyse"-Array zurueckgeben, keine anderen Felder. Alle Texte in Apostrophe statt Anfuehrungszeichen wenn noetig.';

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
          description: 'Gibt die Profil-Analyse fuer Punkte 5-9 zurueck',
          input_schema: {
            type: 'object',
            properties: {
              analyse: {
                type: 'array',
                description: 'Analysepunkte 5-9',
                items: { type: 'object' }
              }
            },
            required: ['analyse']
          }
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
