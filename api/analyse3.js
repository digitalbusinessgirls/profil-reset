export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein Instagram-Content-Stratege und Hook-Experte. Erstelle einen 7-Tage-Wochenplan, eine To-do-Liste und 3 psychologisch starke Sofort-Hooks.

HOOKS - ABSOLUT KRITISCH:
- Erste Zeile: max 6-7 Woerter, KEIN Satzzeichen am Ende
- Kein generischer Einstieg (verboten: 'Wusstest du', 'So geht', 'Hast du dich je gefragt', 'Kennst du das')
- Jeder Hook trifft einen anderen psychologischen Nerv der Wunschkundin
- Caption: vollstaendig ausgearbeitet, 3-5 Saetze, direkt copy-paste verwendbar
- Spreche die Wunschkundin mit konkreten Alltagssituationen aus ihrer Nische an

HOOK-TRIGGER:
1. Schmerz-Spiegel: Sie liest es und denkt 'Das bin ich' - trifft exakt ihre Frustration
2. Zahlen-Schock: Konkrete Zahl oder Kontrast der sofort Neugier erzeugt
3. Identitaets-Provokation: Stellt ihr Selbstbild oder eine Annahme in Frage

CAPTION-REGELN:
- Mini-Learning ODER emotionale kurze Geschichte
- Kein Hashtag-Block
- CTA am Ende: Frage zum Kommentieren ODER konkreter Aufruf

WOCHENPLAN-REGELN:
- "haupthook": max 7 Woerter, kein Satzzeichen
- "caption": 1-2 Saetze + CTA (kurz halten!)
- "ziel": exakt "Community", "Trust" oder "Sales"
- Verteilung: 4x Community, 2x Trust, 1x Sales

JSON-STRUKTUR:
{
  "analyse": [
    {
      "nr": 10,
      "titel": "7-Tage-Wochenplan",
      "inhalt": "Strategische Einleitung in 1 Satz",
      "wochenplan": [
        {
          "tag": "Montag",
          "reels": [{
            "zeit": "18:00 Uhr",
            "ziel": "Community",
            "hooktyp": "Direkte Spiegelung",
            "haupthook": "Haupthook max 7 Woerter",
            "caption": "1-2 Saetze Mini-Learning + CTA",
            "cta": "Spezifischer CTA"
          }]
        }
      ]
    },
    {
      "nr": 11,
      "titel": "Deine naechsten Schritte",
      "inhalt": "Kurze motivierende Einleitung",
      "todos": ["Aufgabe 1", "Aufgabe 2", "Aufgabe 3", "Aufgabe 4", "Aufgabe 5"]
    },
    {
      "nr": 12,
      "titel": "3 Hooks fuer sofort",
      "inhalt": "Diese Hooks sind psychologisch geschaerft fuer deine Wunschkundin - kopier sie direkt",
      "hooks": [
        {
          "trigger": "Schmerz-Spiegel",
          "hook": "Max 7 Woerter die ihre Frustration treffen",
          "caption": "Vollstaendige Caption 3-5 Saetze komplett ausgearbeitet. Spezifisch fuer die Nische. Starker CTA am Ende.",
          "format": "Reel"
        },
        {
          "trigger": "Zahlen-Schock",
          "hook": "Konkreter Zahlen-Hook der stoppt",
          "caption": "Vollstaendige Caption direkt verwendbar mit emotionalem Aufbau und CTA.",
          "format": "Reel"
        },
        {
          "trigger": "Identitaets-Provokation",
          "hook": "Aussage die ihr Selbstbild herausfordert",
          "caption": "Vollstaendige Caption die vertieft und CTA enthaelt.",
          "format": "Karussell"
        }
      ]
    }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 3500,
        system: systemPrompt,
        tools: [{
          name: 'analyse_ausgabe',
          description: 'Gibt den 7-Tage-Contentplan, To-do-Liste und Sofort-Hooks zurueck',
          input_schema: {
            type: 'object',
            properties: {
              analyse: {
                type: 'array',
                description: 'Analysepunkte 10, 11 und 12',
                items: { type: 'object' }
              }
            },
            required: ['analyse']
          }
        }],
        tool_choice: { type: 'tool', name: 'analyse_ausgabe' },
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: 'Nische: ' + body.nische + '\nZielgruppe: ' + body.zielgruppe + '\nProblem: ' + (body.problem || 'nicht angegeben') }]
        }]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message || JSON.stringify(data.error) });

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
