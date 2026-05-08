export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein präziser Instagram-Profil-Analyse-Assistent. Analysiere exakt die Punkte 6–10. Kein Coaching-Sprech, klare analytische Aussagen.

ANALYSEPUNKTE – nur diese 5:
6. Highlight-Struktur (Bewertung + empfohlene Struktur + Inhalte je Highlight)
7. Erste 3 Posts / Feed-Einstieg (Diagnose + Empfehlung für neue Pin-Struktur)
8. Story-Check (Diagnose + 2–3 Leitlinien – nur wenn Storys sichtbar, sonst kurze Notiz)
9. 10 Hooks (exakt 10, je Haupt + Neben, passend zur Nische)
10. To-do-Liste (priorisiert nach Wirkung, konkret, max. 10 Punkte)

HOOK-REGELN (Punkt 9):
- Exakt 10 Hooks
- Je Haupt-Hook (Thema, Sog, max. 15 Wörter) + Neben-Hook (Trigger + Cliffhanger, max. 15 Wörter)
- Einfache Sprache, kein Clickbait, kein Druck

AUSGABE: NUR valides JSON, kein Text davor oder danach.

{
  "analyse": [
    {
      "nr": 6,
      "titel": "Highlight-Struktur",
      "verdict": "neutral",
      "inhalt": "Analysetext...",
      "bios": [],
      "hooks": [],
      "todos": []
    }
  ]
}

Punkt 9: "hooks" = [{"haupt":"...","neben":"..."}, ...] (exakt 10)
Punkt 10: "todos" = ["To-do 1", "To-do 2", ...] (max. 10)
Alle anderen Punkte: leere Arrays`;

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    const labels = ['Profilübersicht (Bio, Highlights, angepinnte Posts)', 'Feed (erste 9 Beiträge)'];
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot: ' + (labels[i] || 'Screenshot ' + (i+1)) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: `Profil analysieren (Punkte 6–10):\n\nProfilname: ${body.link}\nNische: ${body.nische}\nAngebot: ${body.angebot}\nZielgruppe: ${body.zielgruppe}\nProblem: ${body.problem || 'nicht angegeben'}\nWunsch: ${body.ziel || 'nicht angegeben'}` });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: contentParts }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
