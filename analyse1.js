export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = [
    'Du bist ein praeziser Instagram-Profil-Analyse-Assistent.',
    '',
    'Analysiere NUR: Einstiegstext, Orientierungswoerter, Punkte 1-4.',
    '',
    'EINSTIEGSTEXT: Schreibe 3-4 Saetze persoenlichen Einstieg von Kristin an ' + body.vorname + '. Warm, direkt, ehrlich. Groessten Hebel nennen. Ende: Deine Kristin',
    '',
    'ORIENTIERUNGSWOERTER: 9-10 nischenspezifische Woerter + 2-3 Saetze Erklaerung.',
    '',
    'PUNKT 1 - 3-SEKUNDEN-PROFILENTSCHEIDUNG: Bleiben oder Gehen + 2-3 Gruende + Gedanke der Besucherin.',
    '',
    'PUNKT 2 - PROFIL-FILTER: 1 klarer Leitsatz mit Zielgruppe + Problem + Loesung.',
    '',
    'PUNKT 3 - PROFILNAMEN-CHECK: Bewertung + 3 SEO-Varianten + Accountname-Einschaetzung.',
    '',
    'PUNKT 4 - BIO-CHECK: Diagnose + 5 Bio-Varianten. Jede Bio: max 150 Zeichen, 4 Zeilen, Zeile1=Problem+Emoji, Zeile2=statt-Prinzip, Zeile3=Transformation, Zeile4=Trust+CTA. Keine Buzzwords.',
    'Stile: ruhig-klar, fuehrend-direkt, leicht-provokant, emotional, reduziert.',
    '',
    'AUSGABE: Nur JSON. Kein Text davor oder danach. Keine Emojis in JSON-Werten. Valides JSON.',
    '',
    'Struktur: {"einstieg":"...","orientierungswoerter":{"woerter":["w1","w2"],"erklaerung":"..."},"analyse":[{"nr":1,"titel":"3-Sekunden-Profilentscheidung","verdict":"bleiben","inhalt":"...","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":2,"titel":"Profil-Filter","verdict":"neutral","inhalt":"...","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":3,"titel":"Profilnamen-Check","verdict":"neutral","inhalt":"...","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":4,"titel":"Bio-Check","verdict":"neutral","inhalt":"...","bios":[{"stil":"ruhig & klar","text":"Zeile1\nZeile2\nZeile3\nZeile4","zeichen":120}],"hooks":[],"todos":[],"wochenplan":[]}]}'
  ].join('\n');

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    const labels = ['Profiluebersicht (Bio, Highlights, angepinnte Posts)', 'Feed (erste 9 Beitraege)'];
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot: ' + (labels[i] || 'Screenshot') + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Analysiere dieses Instagram-Profil:\nVorname: ' + body.vorname + '\nProfilname: ' + body.link + '\nNische: ' + body.nische + '\nAngebot: ' + body.angebot + '\nZielgruppe: ' + body.zielgruppe + '\nProblem: ' + (body.problem || 'nicht angegeben') + '\nWunsch: ' + (body.ziel || 'nicht angegeben') });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: contentParts }] })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = (data.content || []).map(b => b.text || '').join('');
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Kein JSON gefunden' });

    let jsonStr = raw.substring(start, end + 1);
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch(e) {
      let fixed = '';
      let inString = false;
      let escape = false;
      for (let i = 0; i < jsonStr.length; i++) {
        const c = jsonStr[i];
        if (escape) { fixed += c; escape = false; continue; }
        if (c === '\\') { fixed += c; escape = true; continue; }
        if (c === '"') { inString = !inString; fixed += c; continue; }
        if (inString && (c === '\n' || c === '\r')) { fixed += ' '; continue; }
        fixed += c;
      }
      try { parsed = JSON.parse(fixed); }
      catch(e2) { return res.status(500).json({ error: 'JSON Parse Fehler: ' + e2.message }); }
    }
    return res.status(200).json(parsed);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
