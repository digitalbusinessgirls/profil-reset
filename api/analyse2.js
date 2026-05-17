export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent. Analysiere NUR Punkte 5-9. WICHTIG: Antworte NUR mit einem JSON-Objekt auf einer einzigen Zeile. Keine echten Zeilenumbrueche in Strings. Keine Emojis.\n\nPUNKT 5 - PROFILBILD: Bewertung + Empfehlung + max 3 Tipps.\nPUNKT 6 - HIGHLIGHTS: Bewertung + Struktur max 6 + Inhalte + Reduktion.\nPUNKT 7 - FEED: Diagnose + 3 Pin-Ideen.\nPUNKT 8 - STORYS: Nur wenn sichtbar, sonst kurze Notiz. 2-3 Leitlinien.\nPUNKT 9 - CONTENTSAEULEN: 1 Hauptthema + 3 Unterthemen mit je 3 Ideen.';

  const userMsg = 'Profil: ' + body.link + ' | Nische: ' + body.nische + ' | Angebot: ' + body.angebot + ' | Zielgruppe: ' + body.zielgruppe + '\n\nFormat (eine Zeile, keine echten Zeilenumbrueche):\n{"analyse":[{"nr":5,"titel":"Profilbild-Feedback","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":6,"titel":"Highlight-Struktur","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":7,"titel":"Erste 3 Posts / Feed-Einstieg","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":8,"titel":"Story-Check","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]},{"nr":9,"titel":"Contentsaeulen","verdict":"neutral","inhalt":"[Text]","bios":[],"hooks":[],"todos":[],"wochenplan":[]}]}';

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: userMsg });

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
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Kein JSON gefunden' });

    let jsonStr = raw.substring(start, end + 1);
    let fixed = '';
    let inString = false;
    let escape = false;
    for (let i = 0; i < jsonStr.length; i++) {
      const c = jsonStr[i];
      if (escape) { fixed += c; escape = false; continue; }
      if (c === '\\') { fixed += c; escape = true; continue; }
      if (c === '"') { inString = !inString; fixed += c; continue; }
      if (inString && (c === '\n' || c === '\r' || c === '\t')) { fixed += ' '; continue; }
      fixed += c;
    }

    try {
      return res.status(200).json(JSON.parse(fixed));
    } catch(e) {
      return res.status(500).json({ error: 'JSON Parse Fehler: ' + e.message });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
