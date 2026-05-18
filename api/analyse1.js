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
  const vorname = body.vorname || 'dort';

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent. Antworte NUR mit JSON. Kein Text davor oder danach. Keine Markdown-Codeblocks.\n\nAnalysiere: Einstiegstext, Orientierungswoerter, Punkte 1-4.\nEINSTIEGSTEXT: 3-4 Saetze von Kristin an ' + vorname + '. Warm, direkt. Ende: Deine Kristin\nORIENTIERUNGSWOERTER: 9-10 Woerter plus Erklaerung.\nPUNKT 1 - 3-SEKUNDEN-ENTSCHEIDUNG: Bleiben oder Gehen plus Begruendung.\nPUNKT 2 - PROFIL-FILTER: 1 Leitsatz.\nPUNKT 3 - PROFILNAMEN: Bewertung plus 3 SEO-Varianten.\nPUNKT 4 - BIO: Diagnose plus 5 Varianten max 150 Zeichen, 4 Zeilen.\n\nVERBOTEN: Anfuehrungszeichen innerhalb von String-Werten. Nutze Apostrophe.';

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Vorname: ' + vorname + '\nProfil: ' + body.link + '\nNische: ' + body.nische + '\nAngebot: ' + body.angebot + '\nZielgruppe: ' + body.zielgruppe + '\nProblem: ' + (body.problem || 'nicht angegeben') });

  const prefill = '{"einstieg":"Liebe ' + vorname + ',';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: contentParts },
          { role: 'assistant', content: prefill }
        ]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = prefill + (data.content || []).map(b => b.text || '').join('');
    try {
      const parsed = fixAndParseJSON(raw);
      return res.status(200).json(parsed);
    } catch(e) {
      console.log('RAW:', raw.substring(0, 500));
      return res.status(500).json({ error: 'JSON Parse Fehler: ' + e.message });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
