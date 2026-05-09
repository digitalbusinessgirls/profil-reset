export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein präziser Instagram-Profil-Analyse-Assistent. Du analysierst Instagram-Profile analytisch, klar und ohne Coaching-Sprech.

Analysiere jetzt NUR diese Punkte: Einstiegstext, Orientierungswörter, Punkte 1–4.

EINSTIEGSTEXT:
Schreibe einen persönlichen Einstiegstext (3-4 Sätze) im Stil von Kristin an ${body.vorname}. Warm, direkt, ehrlich. Erkläre kurz was der Reset ist und was der größte Hebel ist den du im Profil siehst. Ende mit "Deine Kristin".

PROFIL-ORIENTIERUNGSWÖRTER:
9-10 nischenspezifische Wörter die das Profil inhaltlich beschreiben. Keine Buzzwords. Aus Thema, Zielgruppe, Umsetzung, Haltung, Ergebnis. Dazu: kurze Erklärung warum diese Wörter wichtig sind (2-3 Sätze).

PUNKT 1 – 3-SEKUNDEN-PROFILENTSCHEIDUNG:
Bleiben oder Gehen + 2-3 konkrete Gründe + Gedanke der neuen Besucherin.

PUNKT 2 – PROFIL-FILTER:
1 klarer Leitsatz. Sehr konkrete Zielgruppe + Kernproblem + wie geholfen wird. Keine Floskeln.

PUNKT 3 – PROFILNAMEN-CHECK:
Bewertung aktueller Name + 3 SEO-optimierte Varianten + Accountname-Einschätzung.

PUNKT 4 – BIO-CHECK:
Diagnose der aktuellen Bio + 5 Varianten nach diesen EXAKTEN Regeln:
- Max. 150 Zeichen inkl. Emojis
- Genau 4 Zeilen
- Zeile 1: konkretes Problem der Zielgruppe + Emoji
- Zeile 2: Alltagssatz im "statt"-Prinzip – echte Situation, kein Klischee
- Zeile 3: klarer Effekt / Transformation
- Zeile 4: Trust-Element + CTA
Keine Buzzwords. So einfach dass ein Kind es versteht.
Stilrichtungen: 1. ruhig & klar, 2. führend & direkt, 3. leicht provokant, 4. emotional & identifizierend, 5. reduziert & sehr klar

AUSGABE: NUR valides JSON auf EINER EINZIGEN ZEILE - kein pretty-print, keine Einrueckungen, keine Zeilenumbrueche im JSON. Kein Text davor oder danach. Keine Emojis. Nur ASCII-Text in den Werten.

{
  "einstieg": "Liebe [Name],\n\n[Text]\n\nDeine Kristin",
  "orientierungswoerter": {
    "woerter": ["wort1","wort2","wort3","wort4","wort5","wort6","wort7","wort8","wort9"],
    "erklaerung": "Diese Wörter sollten immer wieder..."
  },
  "analyse": [
    {
      "nr": 1,
      "titel": "3-Sekunden-Profilentscheidung",
      "verdict": "bleiben",
      "inhalt": "Analysetext...",
      "bios": [],
      "hooks": [],
      "todos": [],
      "wochenplan": []
    },
    {
      "nr": 2,
      "titel": "Profil-Filter",
      "verdict": "neutral",
      "inhalt": "...",
      "bios": [],
      "hooks": [],
      "todos": [],
      "wochenplan": []
    },
    {
      "nr": 3,
      "titel": "Profilnamen-Check",
      "verdict": "neutral",
      "inhalt": "...",
      "bios": [],
      "hooks": [],
      "todos": [],
      "wochenplan": []
    },
    {
      "nr": 4,
      "titel": "Bio-Check",
      "verdict": "neutral",
      "inhalt": "Diagnose der aktuellen Bio...",
      "bios": [
        {"stil": "ruhig & klar", "text": "Zeile1\nZeile2\nZeile3\nZeile4", "zeichen": 120},
        {"stil": "führend & direkt", "text": "...", "zeichen": 130},
        {"stil": "leicht provokant", "text": "...", "zeichen": 125},
        {"stil": "emotional & identifizierend", "text": "...", "zeichen": 140},
        {"stil": "reduziert & sehr klar", "text": "...", "zeichen": 110}
      ],
      "hooks": [],
      "todos": [],
      "wochenplan": []
    }
  ]
}`;

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    const labels = ['Profilübersicht (Bio, Highlights, angepinnte Posts)', 'Feed (erste 9 Beiträge)'];
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot: ' + (labels[i] || 'Screenshot ' + (i+1)) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: `Analysiere dieses Instagram-Profil:\n\nVorname: ${body.vorname}\nProfilname: ${body.link}\nNische: ${body.nische}\nAngebot: ${body.angebot}\nZielgruppe: ${body.zielgruppe}\nProblem: ${body.problem || 'nicht angegeben'}\nWunsch: ${body.ziel || 'nicht angegeben'}` });

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
