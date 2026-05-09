export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein präziser Instagram-Profil-Analyse-Assistent. Analysiere NUR die Punkte 5-9.

PUNKT 5 – PROFILBILD-FEEDBACK:
Kurze Bewertung + 1 klare Empfehlung + max. 3 Foto-Hinweise.

PUNKT 6 – HIGHLIGHT-STRUKTUR:
Bewertung aktueller Struktur + empfohlene Reihenfolge (max. 6) + grobe Inhalte je Highlight + Reduktionsempfehlung.

PUNKT 7 – ERSTE 3 POSTS / FEED-EINSTIEG:
Diagnose + empfohlene Pin-Struktur mit 3 konkreten Post-Ideen.

PUNKT 8 – STORY-CHECK:
Nur wenn Storys sichtbar. Sonst kurze Notiz. 2-3 konkrete Leitlinien mit Themenbeispielen.

PUNKT 9 – CONTENTSÄULEN:
1 Hauptthema + 3 Unterthemen mit je 3-4 konkreten Inhaltsideen darunter.
Erkläre kurz warum 3 feste Unterthemen wichtig sind (2 Sätze).

AUSGABE: NUR valides JSON auf EINER EINZIGEN ZEILE - kein pretty-print, keine Einrueckungen, keine Zeilenumbrueche im JSON. Kein Text davor oder danach. Keine Emojis. Nur ASCII-Text in den Werten.

{
  "analyse": [
    {
      "nr": 5,
      "titel": "Profilbild-Feedback",
      "verdict": "neutral",
      "inhalt": "...",
      "bios": [], "hooks": [], "todos": [], "wochenplan": []
    },
    {
      "nr": 6,
      "titel": "Highlight-Struktur",
      "verdict": "neutral",
      "inhalt": "...",
      "bios": [], "hooks": [], "todos": [], "wochenplan": []
    },
    {
      "nr": 7,
      "titel": "Erste 3 Posts / Feed-Einstieg",
      "verdict": "neutral",
      "inhalt": "...",
      "bios": [], "hooks": [], "todos": [], "wochenplan": []
    },
    {
      "nr": 8,
      "titel": "Story-Check",
      "verdict": "neutral",
      "inhalt": "...",
      "bios": [], "hooks": [], "todos": [], "wochenplan": []
    },
    {
      "nr": 9,
      "titel": "Contentsäulen",
      "verdict": "neutral",
      "inhalt": "Hauptthema: ...\n\nUnterthema 1: ...\n- Idee 1\n- Idee 2\n- Idee 3\n\nUnterthema 2: ...\n- Idee 1\n- Idee 2\n- Idee 3\n\nUnterthema 3: ...\n- Idee 1\n- Idee 2\n- Idee 3\n\nWarum 3 Unterthemen: ...",
      "bios": [], "hooks": [], "todos": [], "wochenplan": []
    }
  ]
}`;

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    const labels = ['Profilübersicht', 'Feed'];
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot: ' + (labels[i] || 'Screenshot') + ']' });
    });
  }
  contentParts.push({ type: 'text', text: `Profil: ${body.link}\nNische: ${body.nische}\nAngebot: ${body.angebot}\nZielgruppe: ${body.zielgruppe}` });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: contentParts }] })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
