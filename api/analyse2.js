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
      "score": 5,
      "inhalt": "Kurze Bewertung was sichtbar ist und was fehlt",
      "highlights": [
        {"titel": "Willkommen", "punkte": ["Kurzes Vorstellungsvideo", "Dein Weg in 3 Saetzen", "Warum du die Richtige bist"]},
        {"titel": "Tipps & Wissen", "punkte": ["1 konkreter Tipp pro Slide", "Nischenspezifische Quickwins"]},
        {"titel": "Kundenstimmen", "punkte": ["Screenshots von Ergebnissen", "Kurze Zitate mit Vorher/Nachher"]},
        {"titel": "Angebot", "punkte": ["Was du anbietest", "Fuer wen es ist", "Naechster Schritt"]},
        {"titel": "Ueber mich", "punkte": ["Persoenliche Geschichte", "Dein Warum", "1 unbekannter Fakt"]}
      ]
    },
    {
      "nr": 7,
      "titel": "Feed & Pin-Posts",
      "score": 6,
      "inhalt": "Diagnose des aktuellen Feeds in 2 Saetzen",
      "postideen": [
        {"thema": "Konkretes Thema das zur Nische passt", "format": "Reel", "hook": "Erster Satz der stoppt", "skizze": "Was genau gezeigt wird und wie aufgebaut"},
        {"thema": "Zweites relevantes Thema", "format": "Karussell", "hook": "Erster Satz der stoppt", "skizze": "Aufbau und Inhalt der Slides"},
        {"thema": "Drittes Thema fuer Trust", "format": "Reel", "hook": "Erster Satz der stoppt", "skizze": "Was genau gezeigt wird"}
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
