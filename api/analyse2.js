export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein Instagram-Profil-Analyse-Experte. Bewerte jeden Bereich mit einem Score 1-10. Gib die Ergebnisse in EXAKT dieser JSON-Struktur zurueck:

PUNKT 7 - FEED & PIN-POSTS: Erstelle 3 konkrete Pinned-Post-Vorgaben. Der Hook muss den inneren Monolog oder eine Alltagssituation der Wunschkundin treffen - KEIN Thema ansagen, KEIN generischer Einstieg. "inhalt" beschreibt konkret was sie zeigen soll. "wirkung" beschreibt was die Besucherin danach denkt oder fuehlt.
Hook-Beispiel FALSCH: "3 Tipps fuer mehr Sichtbarkeit" - Hook-Beispiel RICHTIG: "Du postest taglich und niemand fragt nach"

PUNKT 6 - HIGHLIGHTS: Analysiere NICHT die vorhandenen Highlights (Screenshots zeigen kein vollstaendiges Bild). Schlage stattdessen genau 5 Highlights vor die zur Nische und Zielgruppe passen. Jeder Titel muss fuer eine neue Besucherin sofort verstaendlich sein (keine internen Begriffe). Die Punkte sind Orientierung was reingehoert - konkret und nischenspezifisch.

PUNKT 9 - CONTENT-SAEULEN: Definiere genau 3 Content-Saeulen speziell fuer diese Nische und Wunschkundin. Jede Saeule deckt ein klar abgegrenztes thematisches Gebiet ab - keine Ueberschneidungen zwischen den Saeulen. Die beschreibung erklaert was diese Saeule leistet und welches konkrete Beduerfnis der Wunschkundin sie bedient. Die ideen sind sofort umsetzbar - keine generischen Platzhalter wie "Tipps und Tricks", sondern echte Reel-Ideen die zu genau dieser Nische passen.

{
  "analyse": [
    {
      "nr": 5,
      "titel": "Profilbild",
      "score": 7,
      "inhalt": "Konkrete Bewertung in 2-3 Saetzen: Was wirkt, was nicht, klare Empfehlung"
    },
    {
      "nr": 6,
      "titel": "Highlights",
      "score": 8,
      "inhalt": "Das sind 5 Highlights die aus Sicht einer neuen Besucherin auf deinem Profil nicht fehlen duerfen - aufgebaut fuer jemanden der dich noch gar nicht kennt.",
      "highlights": [
        {"titel": "Nischenspezifischer Titel den Besucher sofort versteht", "punkte": ["Konkreter Inhaltspunkt 1", "Konkreter Inhaltspunkt 2", "Konkreter Inhaltspunkt 3"]},
        {"titel": "Nischenspezifischer Titel", "punkte": ["Inhaltspunkt 1", "Inhaltspunkt 2", "Inhaltspunkt 3"]},
        {"titel": "Nischenspezifischer Titel", "punkte": ["Inhaltspunkt 1", "Inhaltspunkt 2", "Inhaltspunkt 3"]},
        {"titel": "Nischenspezifischer Titel", "punkte": ["Inhaltspunkt 1", "Inhaltspunkt 2", "Inhaltspunkt 3"]},
        {"titel": "Nischenspezifischer Titel", "punkte": ["Inhaltspunkt 1", "Inhaltspunkt 2", "Inhaltspunkt 3"]}
      ]
    },
    {
      "nr": 7,
      "titel": "Feed & Pin-Posts",
      "score": 6,
      "inhalt": "Diese 3 angepinnten Posts passen gut zu deinem Profil. Sie sorgen dafuer, dass eine neue Besucherin sofort versteht wer du bist, ob sie richtig ist und was sie als naechstes tun kann.",
      "pinposts": [
        {
          "nr": 1,
          "ziel": "Trust",
          "format": "Reel",
          "hook": "Konkreter Hook max 7 Woerter - innerer Monolog oder Alltagssituation der Wunschkundin, kein Thema",
          "inhalt": "Was sie inhaltlich zeigen soll: konkrete Szene, Botschaft oder Geschichte die zum Ziel fuehrt",
          "wirkung": "Was dieser Post bei der Besucherin ausloesen soll"
        },
        {
          "nr": 2,
          "ziel": "Community",
          "format": "Karussell",
          "hook": "Konkreter Hook max 7 Woerter",
          "inhalt": "Was sie inhaltlich zeigen soll",
          "wirkung": "Was dieser Post bei der Besucherin ausloesen soll"
        },
        {
          "nr": 3,
          "ziel": "Sales",
          "format": "Reel",
          "hook": "Konkreter Hook max 7 Woerter",
          "inhalt": "Was sie inhaltlich zeigen soll",
          "wirkung": "Was dieser Post bei der Besucherin ausloesen soll"
        }
      ]
    },
    {
      "nr": 9,
      "titel": "Content-Saeulen",
      "score": 7,
      "inhalt": "Kurze strategische Einleitung zu den 3 Saeulen",
      "saeulen": [
        {"titel": "Name der Saeule", "beschreibung": "Worum geht es, welches Beduerfnis der Wunschkundin wird bedient", "ideen": ["Konkrete Content-Idee 1", "Konkrete Content-Idee 2", "Konkrete Content-Idee 3"]},
        {"titel": "Name der Saeule", "beschreibung": "Worum geht es", "ideen": ["Idee 1", "Idee 2", "Idee 3"]},
        {"titel": "Name der Saeule", "beschreibung": "Worum geht es", "ideen": ["Idee 1", "Idee 2", "Idee 3"]}
      ]
    }
  ]
}

Storys werden nicht analysiert. Genau diese 4 Punkte ausgeben.`;

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Profil: ' + body.link + '\nNische: ' + body.nische + '\nZielgruppe: ' + body.zielgruppe + '\nAngebot: ' + body.angebot });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: systemPrompt,
        tools: [{
          name: 'analyse_ausgabe',
          description: 'Gibt die Profil-Analyse fuer Punkte 5-9 zurueck',
          input_schema: {
            type: 'object',
            properties: {
              analyse: {
                type: 'array',
                description: 'Analysepunkte 5-9',
                items: { type: 'object' }
              }
            },
            required: ['analyse']
          }
        }],
        tool_choice: { type: 'tool', name: 'analyse_ausgabe' },
        messages: [{ role: 'user', content: contentParts }]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const toolUse = (data.content || []).find(b => b.type === 'tool_use');
    if (!toolUse) {
      console.log('Kein tool_use in response:', JSON.stringify(data).substring(0, 300));
      return res.status(500).json({ error: 'Kein strukturiertes Ergebnis erhalten' });
    }
    return res.status(200).json(toolUse.input);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
