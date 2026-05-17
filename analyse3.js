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
    'Du bist ein strategischer Instagram-Content-Planer. Erstelle einen 7-Tage-Wochenplan und eine To-do-Liste.',
    '',
    'HOOK-REGELN: Nutze diese 8 Typen: Zahlen-Vergleich, Mini-Liste, Wenn-Dann, Verlust-Trigger, Direkte Spiegelung (Du...), Story-Einstieg (Ich habe...), Haltung/Klartext, Gegenueberstellung.',
    'Jede Hook: spezifisch, nischenscharf, Zahlen wo moeglich, Haupt+Neben-Hook, visueller Tipp (B-Roll 5-7 Sek), Ziel: Community 50%, Trust 30-40%, Sales 10%.',
    'Keine leeren Versprechen, kein Clickbait.',
    '',
    'WOCHENPLAN: 7 Tage, je 2 Reels (morgens + abends).',
    'Pro Reel: hooktyp, ziel, haupthook, nebenhook, visuell, caption (2-3 Saetze), cta.',
    '',
    'TO-DO-LISTE: Max 10 Punkte, priorisiert nach Wirkung.',
    '',
    'AUSGABE: Nur valides JSON. Keine Emojis. Kein Text davor/danach.',
    '',
    'Struktur: {"analyse":[{"nr":10,"titel":"7-Tage-Wochenplan","verdict":"neutral","inhalt":"Dein Posting-Plan fuer die erste Woche.","bios":[],"hooks":[],"todos":[],"wochenplan":[{"tag":"Tag 1 - Montag","reels":[{"zeit":"Morgens","hooktyp":"Direkte Spiegelung","ziel":"Community","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."},{"zeit":"Abends","hooktyp":"Verlust-Trigger","ziel":"Trust","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."}]},{"tag":"Tag 2 - Dienstag","reels":[{"zeit":"Morgens","hooktyp":"...","ziel":"Community","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."},{"zeit":"Abends","hooktyp":"...","ziel":"Trust","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."}]},{"tag":"Tag 3 - Mittwoch","reels":[{"zeit":"Morgens","hooktyp":"...","ziel":"Community","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."},{"zeit":"Abends","hooktyp":"...","ziel":"Trust","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."}]},{"tag":"Tag 4 - Donnerstag","reels":[{"zeit":"Morgens","hooktyp":"...","ziel":"Community","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."},{"zeit":"Abends","hooktyp":"...","ziel":"Sales","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."}]},{"tag":"Tag 5 - Freitag","reels":[{"zeit":"Morgens","hooktyp":"...","ziel":"Community","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."},{"zeit":"Abends","hooktyp":"...","ziel":"Trust","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."}]},{"tag":"Tag 6 - Samstag","reels":[{"zeit":"Morgens","hooktyp":"...","ziel":"Community","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."},{"zeit":"Abends","hooktyp":"...","ziel":"Trust","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."}]},{"tag":"Tag 7 - Sonntag","reels":[{"zeit":"Morgens","hooktyp":"...","ziel":"Community","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."},{"zeit":"Abends","hooktyp":"...","ziel":"Community","haupthook":"...","nebenhook":"...","visuell":"...","caption":"...","cta":"..."}]}]},{"nr":11,"titel":"To-do-Liste","verdict":"neutral","inhalt":"Deine priorisierten Schritte.","bios":[],"hooks":[],"todos":["To-do 1","To-do 2"],"wochenplan":[]}]}'
  ].join('\n');

  const contentParts = [{ type: 'text', text: 'Erstelle Wochenplan + To-do-Liste:\nNische: ' + body.nische + '\nAngebot: ' + body.angebot + '\nZielgruppe: ' + body.zielgruppe + '\nProblem: ' + (body.problem || 'nicht angegeben') }];

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
