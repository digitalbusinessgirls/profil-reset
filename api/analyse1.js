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

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent. Analysiere NUR: Einstiegstext, Orientierungswoerter, Punkte 1-4.\n\nEINSTIEGSTEXT: 3-4 Saetze von Kristin an ' + vorname + '. Warm, direkt. Ende: Deine Kristin\nORIENTIERUNGSWOERTER: 9-10 Woerter + Erklaerung.\nPUNKT 1 - 3-SEKUNDEN-ENTSCHEIDUNG: Bleiben oder Gehen + Gruende.\nPUNKT 2 - PROFIL-FILTER: 1 Leitsatz.\nPUNKT 3 - PROFILNAMEN-CHECK: Bewertung + 3 Varianten.\nPUNKT 4 - BIO-CHECK: Diagnose + 5 Varianten (max 150 Zeichen, 4 Zeilen). Stile: ruhig-klar, direkt, provokant, emotional, reduziert.\n\nWICHTIG: Antworte AUSSCHLIESSLICH mit validem JSON. Keine Erklaerungen. Keine Markdown-Bloecke. Verwende in Textwerten keine Anfuehrungszeichen - schreibe Anfuehrungszeichen als einfache Apostrophe oder lasse sie weg.';

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Profil: ' + body.link + ' | Nische: ' + body.nische + ' | Angebot: ' + body.angebot + ' | Zielgruppe: ' + body.zielgruppe + ' | Problem: ' + (body.problem || 'nicht angegeben') + '\n\nAntworte mit diesem JSON:\n{"einstieg":"Liebe ' + vorname + ', [Text]. Deine Kristin","orientierungswoerter":{"woerter":["w1","w2","w3","w4","w5","w6","w7","w8","w9"],"erklaerung":"[Text]"},"analyse":[{"nr":1,"titel":"3-Sekunden-Profilentscheidung","verdict":"bleiben","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":2,"titel":"Profil-Filter","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":3,"titel":"Profilnamen-Check","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":4,"titel":"Bio-Check","verdict":"neutral","inhalt":"[Diagnose]","bios":[{"stil":"ruhig & klar","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":120},{"stil":"fuehrend & direkt","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":130},{"stil":"leicht provokant","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":125},{"stil":"emotional","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":140},{"stil":"reduziert & klar","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":110}],"hooks":[],"todos":[],"wochenplan":[]}]}' });

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
      const parsed = fixAndParseJSON(raw);
      return res.status(200).json(parsed);
    } catch(e) {
      return res.status(500).json({ error: 'JSON Parse Fehler: ' + e.message });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
