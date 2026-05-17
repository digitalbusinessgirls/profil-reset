export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent. Analysiere NUR: Einstiegstext, Orientierungswoerter, Punkte 1-4.\n\nEINSTIEGSTEXT: 3-4 Saetze von Kristin an ' + body.vorname + '. Warm, direkt, ehrlich. Groessten Hebel nennen. Ende: Deine Kristin\n\nORIENTIERUNGSWOERTER: 9-10 Woerter + 2-3 Saetze Erklaerung.\n\nPUNKT 1 - 3-SEKUNDEN-ENTSCHEIDUNG: Bleiben oder Gehen + Gruende + Besucherinnen-Gedanke.\nPUNKT 2 - PROFIL-FILTER: 1 Leitsatz mit Zielgruppe + Problem + Loesung.\nPUNKT 3 - PROFILNAMEN-CHECK: Bewertung + 3 SEO-Varianten + Accountname.\nPUNKT 4 - BIO-CHECK: Diagnose + 5 Varianten (max 150 Zeichen, 4 Zeilen, statt-Prinzip). Stile: ruhig-klar, fuehrend-direkt, provokant, emotional, reduziert.\n\nWICHTIG: Antworte NUR mit einem JSON-Objekt. Kein Text davor oder danach. Keine echten Zeilenumbrueche in String-Werten - nutze stattdessen das Leerzeichen. Keine Emojis. Das JSON muss auf einer Zeile sein.';

  const userMsg = 'Profil: ' + body.link + ' | Nische: ' + body.nische + ' | Angebot: ' + body.angebot + ' | Zielgruppe: ' + body.zielgruppe + ' | Problem: ' + (body.problem || 'nicht angegeben');

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: userMsg + '\n\nAntworte mit diesem JSON-Format (alles auf einer Zeile, keine echten Zeilenumbrueche in Strings):\n{"einstieg":"Liebe ' + body.vorname + ', [Text]. Deine Kristin","orientierungswoerter":{"woerter":["w1","w2","w3","w4","w5","w6","w7","w8","w9"],"erklaerung":"[Text]"},"analyse":[{"nr":1,"titel":"3-Sekunden-Profilentscheidung","verdict":"bleiben","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":2,"titel":"Profil-Filter","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":3,"titel":"Profilnamen-Check","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":4,"titel":"Bio-Check","verdict":"neutral","inhalt":"[Diagnose]","bios":[{"stil":"ruhig & klar","text":"[Zeile1] [Zeile2] [Zeile3] [Zeile4]","zeichen":120},{"stil":"fuehrend & direkt","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":130},{"stil":"leicht provokant","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":125},{"stil":"emotional","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":140},{"stil":"reduziert & klar","text":"[Z1] [Z2] [Z3] [Z4]","zeichen":110}],"hooks":[],"todos":[],"wochenplan":[]}]}' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: contentParts }] })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = (data.content || []).map(b => b.text || '').join('').replace(/```json/g,'').replace(/```/g,'').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Kein JSON gefunden. Rohantwort: ' + raw.substring(0,200) });

    let jsonStr = raw.substring(start, end + 1);
    
    // Fix any remaining literal newlines inside string values
    let fixed = '';
    let inString = false;
    let escape = false;
    for (let i = 0; i < jsonStr.length; i++) {
      const c = jsonStr[i];
      if (escape) { fixed += c; escape = false; continue; }
      if (c === '\\') { fixed += c; escape = true; continue; }
      if (c === '"') { inString = !inString; fixed += c; continue; }
      if (inString && c === '\n') { fixed += ' '; continue; }
      if (inString && c === '\r') { continue; }
      if (inString && c === '\t') { fixed += ' '; continue; }
      fixed += c;
    }

    try {
      const parsed = JSON.parse(fixed);
      return res.status(200).json(parsed);
    } catch(e) {
      return res.status(500).json({ error: 'JSON Parse Fehler: ' + e.message + ' | Position hint: ' + fixed.substring(Math.max(0, e.message.match(/\d+/)?.[0]-20||0), (e.message.match(/\d+/)?.[0]||0)+20) });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
