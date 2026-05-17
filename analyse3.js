export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein strategischer Instagram-Content-Planer. Erstelle einen 7-Tage-Wochenplan + To-do-Liste.

HOOK-REGELN (kritisch wichtig):
Nutze diese 8 Hook-Typen: Zahlen-Vergleich, Mini-Liste, Wenn-Dann-Logik, Verlust-Trigger, Direkte Spiegelung ("Du..."), Story-Einstieg ("Ich habe..."), Haltung/Klartext, Gegenüberstellung.

Jede Hook muss:
- Spezifisch und nischenscharf sein (keine generischen Aussagen)
- Konkrete Zahlen enthalten wo möglich
- Einen klaren Haupt-Hook + Neben-Hook haben
- Einen visuellen Tipp haben (B-Roll, 5-7 Sekunden)
- Einem Ziel zugeordnet sein: Community (50%), Trust (30-40%), Sales (10%)
- Die Hook öffnet Spannung, löst NICHTS auf
- Kein Clickbait, keine leeren Versprechen

WOCHENPLAN – 7 TAGE, JE 2 REELS:
Pro Tag: Morgen-Reel + Abend-Reel
Pro Reel: Hook-Typ, Ziel (Community/Trust/Sales), Haupt-Hook, Neben-Hook, visueller Tipp, Caption-Anfang (2-3 Sätze), CTA

TO-DO-LISTE:
Max. 10 Punkte, priorisiert nach Wirkung, konkret und umsetzbar.

AUSGABE: NUR valides JSON auf EINER EINZIGEN ZEILE - kein pretty-print, keine Einrueckungen, keine Zeilenumbrueche im JSON. Kein Text davor oder danach. Keine Emojis. Nur ASCII-Text in den Werten.

{
  "analyse": [
    {
      "nr": 10,
      "titel": "7-Tage-Wochenplan",
      "verdict": "neutral",
      "inhalt": "Dein persönlicher Posting-Plan für die erste Woche. 2 Reels täglich – morgens und abends. Jedes Reel mit Hook, Caption-Einstieg und CTA.",
      "bios": [],
      "hooks": [],
      "todos": [],
      "wochenplan": [
        {
          "tag": "Tag 1 – Montag",
          "reels": [
            {
              "zeit": "Morgens",
              "hooktyp": "Direkte Spiegelung",
              "ziel": "Community",
              "haupthook": "...",
              "nebenhook": "...",
              "visuell": "...",
              "caption": "...",
              "cta": "..."
            },
            {
              "zeit": "Abends",
              "hooktyp": "Verlust-Trigger",
              "ziel": "Trust",
              "haupthook": "...",
              "nebenhook": "...",
              "visuell": "...",
              "caption": "...",
              "cta": "..."
            }
          ]
        },
        {
          "tag": "Tag 2 – Dienstag",
          "reels": [
            {"zeit": "Morgens", "hooktyp": "...", "ziel": "Community", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."},
            {"zeit": "Abends", "hooktyp": "...", "ziel": "Trust", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."}
          ]
        },
        {
          "tag": "Tag 3 – Mittwoch",
          "reels": [
            {"zeit": "Morgens", "hooktyp": "...", "ziel": "Community", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."},
            {"zeit": "Abends", "hooktyp": "...", "ziel": "Trust", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."}
          ]
        },
        {
          "tag": "Tag 4 – Donnerstag",
          "reels": [
            {"zeit": "Morgens", "hooktyp": "...", "ziel": "Community", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."},
            {"zeit": "Abends", "hooktyp": "...", "ziel": "Sales", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."}
          ]
        },
        {
          "tag": "Tag 5 – Freitag",
          "reels": [
            {"zeit": "Morgens", "hooktyp": "...", "ziel": "Community", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."},
            {"zeit": "Abends", "hooktyp": "...", "ziel": "Trust", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."}
          ]
        },
        {
          "tag": "Tag 6 – Samstag",
          "reels": [
            {"zeit": "Morgens", "hooktyp": "...", "ziel": "Community", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."},
            {"zeit": "Abends", "hooktyp": "...", "ziel": "Trust", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."}
          ]
        },
        {
          "tag": "Tag 7 – Sonntag",
          "reels": [
            {"zeit": "Morgens", "hooktyp": "...", "ziel": "Community", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."},
            {"zeit": "Abends", "hooktyp": "...", "ziel": "Community", "haupthook": "...", "nebenhook": "...", "visuell": "...", "caption": "...", "cta": "..."}
          ]
        }
      ]
    },
    {
      "nr": 11,
      "titel": "To-do-Liste",
      "verdict": "neutral",
      "inhalt": "Deine priorisierten Schritte – in dieser Reihenfolge umsetzen.",
      "bios": [],
      "hooks": [],
      "todos": ["To-do 1", "To-do 2", "To-do 3"],
      "wochenplan": []
    }
  ]
}`;

  const contentParts = [{ type: 'text', text: `Erstelle Wochenplan + To-do-Liste für dieses Profil:\n\nNische: ${body.nische}\nAngebot: ${body.angebot}\nZielgruppe: ${body.zielgruppe}\nProblem der Zielgruppe: ${body.problem || 'nicht angegeben'}` }];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: contentParts }] })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = data.content.map(b => b.text || '').join('');
    const start = raw.indexOf('{'); const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Kein JSON gefunden' });
    let jsonStr = raw.substring(start, end + 1);
    let parsed;
    try { parsed = JSON.parse(jsonStr); } catch(e) {
      let fixed = ''; let inString = false; let escape = false;
      for (let i = 0; i < jsonStr.length; i++) {
        const c = jsonStr[i];
        if (escape) { fixed += c; escape = false; continue; }
        if (c === '\\') { fixed += c; escape = true; continue; }
        if (c === '"') { inString = !inString; fixed += c; continue; }
        if (inString && (c === '\n' || c === '\r')) { fixed += ' '; continue; }
        fixed += c;
      }
      parsed = JSON.parse(fixed);
    }
    return res.status(200).json(parsed);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
