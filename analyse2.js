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
    'Du bist ein praeziser Instagram-Profil-Analyse-Assistent. Analysiere NUR die Punkte 5-9.',
    '',
    'PUNKT 5 - PROFILBILD-FEEDBACK: Kurze Bewertung + 1 Empfehlung + max 3 Foto-Hinweise.',
    '',
    'PUNKT 6 - HIGHLIGHT-STRUKTUR: Bewertung + empfohlene Reihenfolge max 6 + Inhalte je Highlight + Reduktionsempfehlung.',
    '',
    'PUNKT 7 - ERSTE 3 POSTS: Diagnose + empfohlene Pin-Struktur mit 3 konkreten Post-Ideen.',
    '',
    'PUNKT 8 - STORY-CHECK: Nur wenn Storys sichtbar, sonst kurze Notiz. 2-3 Leitlinien.',
    '',
    'PUNKT 9 - CONTENTSAEULEN: 1 Hauptthema + 3 Unterthemen mit je 3-4 Inhaltsideen. Kurze Erklaerung warum 3 Unterthemen wichtig sind.',
    '',
    'AUSGABE: Nur valides JSON. Keine Emojis in Werten. Kein Text davor oder danach.',
    '',
    'Struktur: {"analyse":[{"nr":5,"titel":"Profilbild-Feedback","verdict":"neutral","inhalt":"...","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":6,"titel":"Highlight-Struktur","verdict":"neutral","inhalt":"...","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":7,"titel":"Erste 3 Posts / Feed-Einstieg","verdict":"neutral","inhalt":"...","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":8,"titel":"Story-Check","verdict":"neutral","inhalt":"...","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":9,"titel":"Contentsaeulen","verdict":"neutral","inhalt":"Hauptthema: ...\nUnterthema 1: ...\n- Idee\nUnterthema 2: ...\nUnterthema 3: ...","bios":[],"hooks":[],"todos":[],"wochenplan":[]}]}'
  ].join('\n');

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    const labels = ['Profiluebersicht', 'Feed'];
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot: ' + (labels[i] || 'Screenshot') + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Profil: ' + body.link + '\nNische: ' + body.nische + '\nAngebot: ' + body.angebot + '\nZielgruppe: ' + body.zielgruppe });

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
