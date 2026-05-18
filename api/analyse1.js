export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;
  const vorname = body.vorname || 'dort';

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent.\n\nAnalysiere: Einstiegstext, Orientierungswoerter, Punkte 1-4.\nEINSTIEGSTEXT: 3-4 Saetze von Kristin an ' + vorname + '. Warm, direkt. Ende: Deine Kristin\nORIENTIERUNGSWOERTER: 9-10 Woerter plus Erklaerung.\nPUNKT 1 - 3-SEKUNDEN-ENTSCHEIDUNG: Bleiben oder Gehen plus Begruendung.\nPUNKT 2 - PROFIL-FILTER: 1 Leitsatz.\nPUNKT 3 - PROFILNAMEN: Bewertung plus 3 SEO-Varianten.\nPUNKT 4 - BIO: Diagnose plus 5 Varianten max 150 Zeichen, 4 Zeilen.';

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Vorname: ' + vorname + '\nProfil: ' + body.link + '\nNische: ' + body.nische + '\nAngebot: ' + body.angebot + '\nZielgruppe: ' + body.zielgruppe + '\nProblem: ' + (body.problem || 'nicht angegeben') });

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
          description: 'Gibt die vollstaendige Profil-Analyse (Einstieg, Orientierungswoerter, Punkte 1-4) als strukturiertes JSON zurueck',
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
