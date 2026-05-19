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

  const systemPrompt = `Du bist ein Instagram-Profil-Analyse-Experte. Analysiere das Profil und gib die Ergebnisse in EXAKT dieser JSON-Struktur zurueck.

PUNKT 4 - BIO: Erstelle 5 neue Bios nach diesen strikten Regeln:

ZEICHENLIMIT:
- Jede Bio MUSS zwischen 130 und 150 Zeichen haben (inkl. Emojis, Leerzeichen, Zeilenumbrueche)
- Emojis zaehlen als 2 Zeichen, Zeilenumbrueche als 1 Zeichen
- Zaehle jede Bio vor der Ausgabe durch

FORMAT:
- Genau 4 Zeilen, durch \\n getrennt
- Genau 1 Emoji pro Zeile
- Kein Hashtag, keine zusammenhaengenden Saetze
- Sprache: Deutsch, Du/Dein

ZEILEN-AUFBAU:
- Zeile 1: 'Ich helfe dir, [konkretes Ziel], ohne [typischer Stressfaktor]' + Emoji
- Zeile 2: Nischenspezifischer 'XYZ statt XYZ'-Kontrast + Emoji (reale Alltagssituationen)
- Zeile 3: Trust-Faktor mit konkreten Zahlen oder staerkste differenzierende Aussage + Emoji
- Zeile 4: CTA max 3-4 Woerter + Emoji

KATEGORIEN (exakt diese 5):
1. emotional - spricht Schmerz oder Frustration an
2. verkaufsstark - konkretes messbares Ergebnis mit Zahlen
3. direkt - klare Ansage, auf den Punkt
4. neugierig machend - Widerspruch oder unerwarteter Gedanke
5. persoenlich & nahbar - menschlich, Identifikation

JSON-STRUKTUR:
{
  "einstieg": "3-4 Saetze von Kristin an ${vorname}: was schon gut funktioniert am Profil + die groessten Optimierungshebel. Warm und direkt. Ende: Deine Kristin",
  "orientierungswoerter": {
    "woerter": ["Wort1","Wort2","Wort3","Wort4","Wort5","Wort6","Wort7","Wort8","Wort9"],
    "erklaerung": "Ein Satz der erklaert was diese Woerter ueber das Profil aussagen"
  },
  "analyse": [
    {"nr":1,"titel":"3-Sekunden-Entscheidung","score":7,"inhalt":"Konkrete Bewertung mit Begruendung","verdict":"bleiben"},
    {"nr":2,"titel":"Profil-Filter","score":6,"inhalt":"1 praegnanter Leitsatz"},
    {"nr":3,"titel":"Profilname","score":5,"inhalt":"Bewertung des aktuellen Namens. Empfehlung: [beste Variante]. Alternativen: Variante2, Variante3","empfehlung":"Name der empfohlenen Variante"},
    {"nr":4,"titel":"Bio","score":4,"inhalt":"Diagnose der aktuellen Bio in 2-3 Saetzen","empfehlung":"Name der Kategorie die am besten passt und kurze Begruendung","bios":[
      {"stil":"emotional","text":"Zeile1\\nZeile2\\nZeile3\\nZeile4","zeichen":147,"begruendung":"Psychologisches Wirkprinzip und warum diese Bio funktioniert","empfohlen":false},
      {"stil":"verkaufsstark","text":"Zeile1\\nZeile2\\nZeile3\\nZeile4","zeichen":149,"begruendung":"Psychologisches Wirkprinzip und warum diese Bio funktioniert","empfohlen":true},
      {"stil":"direkt","text":"Zeile1\\nZeile2\\nZeile3\\nZeile4","zeichen":145,"begruendung":"Psychologisches Wirkprinzip und warum diese Bio funktioniert","empfohlen":false},
      {"stil":"neugierig machend","text":"Zeile1\\nZeile2\\nZeile3\\nZeile4","zeichen":148,"begruendung":"Psychologisches Wirkprinzip und warum diese Bio funktioniert","empfohlen":false},
      {"stil":"persoenlich & nahbar","text":"Zeile1\\nZeile2\\nZeile3\\nZeile4","zeichen":146,"begruendung":"Psychologisches Wirkprinzip und warum diese Bio funktioniert","empfohlen":false}
    ]}
  ]
}

"verdict" muss exakt "bleiben" oder "gehen" lauten. Genau eine Bio hat "empfohlen":true.`;

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
          description: 'Gibt die vollstaendige Profil-Analyse zurueck',
          input_schema: {
            type: 'object',
            properties: {
              einstieg: { type: 'string', description: 'Persoenlicher Einleitungstext 3-4 Saetze' },
              orientierungswoerter: {
                type: 'object',
                properties: {
                  woerter: { type: 'array', items: { type: 'string' } },
                  erklaerung: { type: 'string' }
                },
                required: ['woerter', 'erklaerung']
              },
              analyse: {
                type: 'array',
                description: 'Analysepunkte 1-4',
                items: { type: 'object' }
              }
            },
            required: ['einstieg', 'orientierungswoerter', 'analyse']
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
