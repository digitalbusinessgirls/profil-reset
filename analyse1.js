export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein präziser Instagram-Profil-Analyse-Assistent. Analysiere exakt die Punkte 1–5. Kein Coaching-Sprech, klare analytische Aussagen.

ANALYSEPUNKTE – nur diese 5:
1. 3-Sekunden-Profilentscheidung (Bleiben/Gehen + 2–3 Gründe + Gedanke der Besucherin)
2. Profil-Filter (1 klarer Leitsatz als Entscheidungsfilter für jeden Post)
3. Profilnamen-Check (Bewertung + 3 SEO-Varianten + Accountname-Einschätzung)
4. Bio-Check (Diagnose + 5 Bio-Varianten nach exakten Regeln – siehe unten)
5. Profilbild-Feedback (kurze Bewertung + 1 klare Empfehlung + max. 3 Foto-Hinweise)

BIO-REGELN (Punkt 4 – KRITISCH):
Erstelle exakt 5 Bio-Varianten. Jede Bio:
- maximal 150 Zeichen (inkl. Emojis und Leerzeichen)
- genau 4 Zeilen
- Zeile 1: "Ich helfe dir, [konkretes Ziel], ohne [konkreter Alltags-Stress]" + Emoji
- Zeile 2: Konkreter Alltagssatz im "statt"-Prinzip – echte Situation, kein Klischee
- Zeile 3: Klarer Effekt / Transformation in einfachen Worten
- Zeile 4: Trust-Element + klarer CTA
Keine Buzzwords. So einfach, dass ein Kind es versteht.

Bio-Stilrichtungen:
1. ruhig & klar
2. führend & direkt
3. leicht provokant
4. emotional & identifizierend
5. reduziert & sehr klar

AUSGABE: NUR valides JSON, kein Text davor oder danach.

{
  "orientierungswoerter": ["wort1","wort2","wort3","wort4","wort5","wort6","wort7","wort8","wort9"],
  "analyse": [
    {
      "nr": 1,
      "titel": "3-Sekunden-Profilentscheidung",
      "verdict": "bleiben",
      "inhalt": "Analysetext...",
      "bios": [],
      "hooks": [],
      "todos": []
    }
  ]
}

Punkt 4: "bios" = [{"stil":"ruhig & klar","text":"Zeile1\nZeile2\nZeile3\nZeile4","zeichen":120}, ...]
Alle anderen Punkte: leere Arrays für bios, hooks, todos`;

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    const labels = ['Profilübersicht (Bio, Highlights, angepinnte Posts)', 'Feed (erste 9 Beiträge)'];
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot: ' + (labels[i] || 'Screenshot ' + (i+1)) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: `Profil analysieren (Punkte 1–5):\n\nProfilname: ${body.link}\nNische: ${body.nische}\nAngebot: ${body.angebot}\nZielgruppe: ${body.zielgruppe}\nProblem: ${body.problem || 'nicht angegeben'}\nWunsch: ${body.ziel || 'nicht angegeben'}` });

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
