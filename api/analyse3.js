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

  const systemPrompt = 'Du bist ein Instagram-Content-Planer. Erstelle 7-Tage-Wochenplan + To-do-Liste.\nHOOK-TYPEN: Zahlen-Vergleich, Mini-Liste, Wenn-Dann, Verlust-Trigger, Direkte Spiegelung, Story-Einstieg, Haltung, Gegenueberstellung.\nVerteilung: 50% Community, 30% Trust, 10% Sales.\nWICHTIG: Nur valides JSON. Keine Anfuehrungszeichen in Textwerten.';

  const userMsg = 'Nische: ' + body.nische + ' | Zielgruppe: ' + body.zielgruppe + ' | Problem: ' + (body.problem || 'nicht angegeben') + '\n\nFormat:\n{"analyse":[{"nr":10,"titel":"7-Tage-Wochenplan","verdict":"neutral","inhalt":"Dein Posting-Plan.","bios":[],"hooks":[],"todos":[],"wochenplan":[{"tag":"Tag 1 - Montag","reels":[{"zeit":"Morgens","hooktyp":"[typ]","ziel":"Community","haupthook":"[hook]","nebenhook":"[neben]","visuell":"[visuell]","caption":"[caption]","cta":"[cta]"},{"zeit":"Abends","hooktyp":"[typ]","ziel":"Trust","haupthook":"[hook]","nebenhook":"[neben]","visuell":"[v]","caption":"[c]","cta":"[cta]"}]},{"tag":"Tag 2 - Dienstag","reels":[{"zeit":"Morgens","hooktyp":"[t]","ziel":"Community","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"},{"zeit":"Abends","hooktyp":"[t]","ziel":"Trust","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"}]},{"tag":"Tag 3 - Mittwoch","reels":[{"zeit":"Morgens","hooktyp":"[t]","ziel":"Community","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"},{"zeit":"Abends","hooktyp":"[t]","ziel":"Trust","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"}]},{"tag":"Tag 4 - Donnerstag","reels":[{"zeit":"Morgens","hooktyp":"[t]","ziel":"Community","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"},{"zeit":"Abends","hooktyp":"[t]","ziel":"Sales","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"}]},{"tag":"Tag 5 - Freitag","reels":[{"zeit":"Morgens","hooktyp":"[t]","ziel":"Community","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"},{"zeit":"Abends","hooktyp":"[t]","ziel":"Trust","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"}]},{"tag":"Tag 6 - Samstag","reels":[{"zeit":"Morgens","hooktyp":"[t]","ziel":"Community","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"},{"zeit":"Abends","hooktyp":"[t]","ziel":"Trust","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"}]},{"tag":"Tag 7 - Sonntag","reels":[{"zeit":"Morgens","hooktyp":"[t]","ziel":"Community","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"},{"zeit":"Abends","hooktyp":"[t]","ziel":"Community","haupthook":"[h]","nebenhook":"[n]","visuell":"[v]","caption":"[c]","cta":"[cta]"}]}]},{"nr":11,"titel":"To-do-Liste","verdict":"neutral","inhalt":"Deine Schritte.","bios":[],"hooks":[],"todos":["todo1","todo2","todo3","todo4","todo5"],"wochenplan":[]}]}';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: [{ type: 'text', text: userMsg }] }] })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = (data.content || []).map(b => b.text || '').join('');
    try {
      return res.status(200).json(fixAndParseJSON(raw));
    } catch(e) {
      return res.status(500).json({ error: 'JSON Parse Fehler: ' + e.message });
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
