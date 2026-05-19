export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = 'Du bist ein Instagram-Content-Planer. Erstelle einen 7-Tage-Wochenplan und eine To-do-Liste. Gib die Ergebnisse in EXAKT dieser JSON-Struktur zurueck:\n\n{\n  "analyse": [\n    {\n      "nr": 10,\n      "titel": "7-Tage-Wochenplan",\n      "inhalt": "Kurze Einleitung zum Plan",\n      "wochenplan": [\n        {\n          "tag": "Montag",\n          "reels": [{\n            "zeit": "18:00 Uhr",\n            "ziel": "Community",\n            "hooktyp": "Mini-Liste",\n            "haupthook": "Haupthook-Text",\n            "nebenhook": "Alternativer Hook",\n            "visuell": "Visueller Hinweis fuer das Video",\n            "caption": "Caption-Einstieg",\n            "cta": "Call-to-Action"\n          }]\n        }\n      ]\n    },\n    {\n      "nr": 11,\n      "titel": "To-do-Liste",\n      "inhalt": "Kurze Einleitung",\n      "todos": ["Aufgabe 1","Aufgabe 2","Aufgabe 3"]\n    }\n  ]\n}\n\nHOOK-TYPEN: Zahlen-Vergleich, Mini-Liste, Wenn-Dann, Verlust-Trigger, Direkte Spiegelung, Story-Einstieg, Haltung, Gegenueberstellung.\nVerteilung: 50% Community, 30-40% Trust, 10% Sales.\nDas Feld "ziel" muss genau "Community", "Trust" oder "Sales" lauten. Alle 7 Tage besetzen. Alle Texte in Apostrophe statt Anfuehrungszeichen wenn noetig.';

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
          description: 'Gibt den 7-Tage-Contentplan und die To-do-Liste als strukturiertes JSON zurueck',
          input_schema: { type: 'object', properties: {} }
        }],
        tool_choice: { type: 'tool', name: 'analyse_ausgabe' },
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: 'Nische: ' + body.nische + '\nZielgruppe: ' + body.zielgruppe + '\nProblem: ' + (body.problem || 'nicht angegeben') }]
        }]
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
