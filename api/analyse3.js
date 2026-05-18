import { fixAndParseJSON } from './helper.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = 'Du bist ein Instagram-Content-Planer. Antworte NUR mit validem JSON. Kein Text davor oder danach. Keine Markdown-Codeblocks.\n\nErstelle 7-Tage-Wochenplan plus To-do-Liste.\nHOOK-TYPEN: Zahlen-Vergleich, Mini-Liste, Wenn-Dann, Verlust-Trigger, Direkte Spiegelung, Story-Einstieg, Haltung, Gegenueberstellung.\nVerteilung: 50% Community, 30-40% Trust, 10% Sales.\n\nJSON-REGELN (strikt einhalten):\n- Kein Anführungszeichen innerhalb von String-Werten – nutze Apostrophe\n- Kein Zeilenumbruch innerhalb von String-Werten\n- Kein doppeltes Komma (,,) – nach jedem Objekt genau ein Komma\n- Kein Komma nach dem letzten Element eines Arrays oder Objekts\n- Jedes Array und Objekt muss korrekt geschlossen sein';

  const prefill = '{"analyse":[';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: [{ type: 'text', text: 'Nische: ' + body.nische + '\nZielgruppe: ' + body.zielgruppe + '\nProblem: ' + (body.problem || 'nicht angegeben') }] },
          { role: 'assistant', content: prefill }
        ]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = prefill + (data.content || []).map(b => b.text || '').join('');
    try {
      const parsed = fixAndParseJSON(raw);
      return res.status(200).json(parsed);
    } catch(e) {
      console.log('RAW length:', raw.length, '| stop_reason:', data.stop_reason);
      console.log('RAW end:', raw.substring(raw.length - 300));
      return res.status(500).json({ error: 'JSON Parse Fehler: ' + e.message });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
