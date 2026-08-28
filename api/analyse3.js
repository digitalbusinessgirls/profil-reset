export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein Instagram-Strategie-Experte. Erstelle eine priorisierte To-do-Liste mit den 5 wichtigsten Optimierungsschritten fuer das Instagram-Profil.

Regeln:
- Jedes To-do ist eine konkrete, sofort umsetzbare Aufgabe (kein allgemeines Blabla)
- Sortiert nach Hebelwirkung: was bringt am schnellsten am meisten
- Bezug auf die spezifische Nische und das Angebot der Person
- Formulierung: aktiv, klar, direkt (z.B. "Schreibe eine Bio die in einer Zeile erklaert wer du hilfst")

JSON-STRUKTUR:
{
  "analyse": [
    {
      "nr": 12,
      "titel": "Deine naechsten Schritte",
      "inhalt": "Die 5 wichtigsten Schritte jetzt - sortiert nach Hebelwirkung",
      "todos": ["Konkrete Aufgabe 1", "Konkrete Aufgabe 2", "Konkrete Aufgabe 3", "Konkrete Aufgabe 4", "Konkrete Aufgabe 5"]
    }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        system: systemPrompt,
        tools: [{
          name: 'analyse_ausgabe',
          description: 'Gibt die To-do-Liste zurueck',
          input_schema: {
            type: 'object',
            properties: {
              analyse: {
                type: 'array',
                description: 'Analysepunkt 11 (naechste Schritte)',
                items: { type: 'object' }
              }
            },
            required: ['analyse']
          }
        }],
        tool_choice: { type: 'tool', name: 'analyse_ausgabe' },
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: 'Nische: ' + body.nische + '\nZielgruppe: ' + body.zielgruppe + '\nAngebot: ' + (body.angebot || '') + '\nProblem der Zielgruppe: ' + (body.problem || 'nicht angegeben') }]
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
    const result = toolUse.input;
    // Sektion 10 wird statisch in report.html gerendert — hier nur Platzhalter damit der Renderer sie findet
    result.analyse = [{ nr: 11, titel: 'Hook-Bibliothek', inhalt: '' }, ...(result.analyse || [])];
    return res.status(200).json(result);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
