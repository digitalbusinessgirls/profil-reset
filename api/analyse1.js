export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;
  const vorname = body.vorname || 'dort';

  const systemPrompt = 'Du bist ein Instagram-Profil-Analyse-Assistent. Analysiere das Profil und gib die Ergebnisse in EXAKT dieser JSON-Struktur zurueck:\n\n{\n  "einstieg": "3-4 Saetze von Kristin an ' + vorname + ', warm und direkt, Ende: Deine Kristin",\n  "orientierungswoerter": {\n    "woerter": ["Wort1","Wort2","Wort3","Wort4","Wort5","Wort6","Wort7","Wort8","Wort9"],\n    "erklaerung": "Ein Satz der erklaert was diese Woerter ueber das Profil aussagen"\n  },\n  "analyse": [\n    {"nr":1,"titel":"3-Sekunden-Entscheidung","inhalt":"Bewertung und Begruendung ob man bleibt oder geht","verdict":"bleiben"},\n    {"nr":2,"titel":"Profil-Filter","inhalt":"1 Leitsatz der das Profil beschreibt"},\n    {"nr":3,"titel":"Profilname","inhalt":"Bewertung des aktuellen Namens plus 3 SEO-Varianten"},\n    {"nr":4,"titel":"Bio","inhalt":"Diagnose der aktuellen Bio","bios":[\n      {"stil":"Variante 1 Name","text":"Bio-Text max 150 Zeichen 4 Zeilen","zeichen":120},\n      {"stil":"Variante 2 Name","text":"Bio-Text","zeichen":115},\n      {"stil":"Variante 3 Name","text":"Bio-Text","zeichen":130},\n      {"stil":"Variante 4 Name","text":"Bio-Text","zeichen":118},\n      {"stil":"Variante 5 Name","text":"Bio-Text","zeichen":125}\n    ]}\n  ]\n}\n\nDas Feld "verdict" bei Punkt 1 muss genau "bleiben" oder "gehen" lauten. Keine anderen Werte. Alle Texte in Apostrophe statt Anfuehrungszeichen wenn noetig.';

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    body.images.forEach((img, i) => {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot ' + (i+1) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: 'Vorname: ' + vorname + '\nProfil: ' + body.link + '\nNische: ' + body.nische + '\nAngebot: ' + body.angebot + '\nZielgruppe: ' + body.zielgruppe + '\nProblem: ' + (body.problem || 'nicht angegeben') });

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
          description: 'Gibt die vollstaendige Profil-Analyse (Einstieg, Orientierungswoerter, Punkte 1-4) als strukturiertes JSON zurueck',
          input_schema: { type: 'object', properties: {} }
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
