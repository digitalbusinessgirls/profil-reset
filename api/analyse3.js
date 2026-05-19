export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API Key fehlt.' });

  const body = req.body;

  const systemPrompt = `Du bist ein Instagram-Hook-Experte. Erstelle eine Hook-Bibliothek mit genau 30 Hooks (5 Kategorien x 6 Hooks) und eine kurze To-do-Liste. Alle Hooks sind 100% spezifisch fuer die angegebene Nische - kein generischer Hook der genauso bei Fitness, Ernaehrung oder Hundetraining stehen koennte.

=== HOOK-GRUNDGESETZ ===
Jeder Hook ist entweder:
A) Der innere Monolog der Wunschkundin - ein Gedanke den sie gerade denkt
B) Eine konkrete Alltagssituation die sie sofort wiedererkennt
C) Eine unbequeme Wahrheit oder Provokation die sie stoppt

VERBOTEN (kein einziger Hook darf so beginnen oder klingen):
- "Wusstest du", "So geht", "Hast du dich je gefragt", "Ich zeige dir", "Tipps fuer"
- Themen-Ansagen ("Wie du deine Bio optimierst", "Content-Strategie fuer Einsteiger")
- Vage Aussagen ohne konkretes Bild oder Zahl
- Doppelter Einstieg ("nicht... sondern", Satzanfang mit "Und")

SO NICHT → SO JA (fuer die Nische adaptieren):
- "Tipps fuer mehr Reichweite" → "Du postest seit Wochen und nichts passiert"
- "Wie du deine Bio verbesserst" → "Deine Bio liest sich wie ein Lebenslauf"
- "Content-Strategie erklaert" → "37 Minuten fuer ein Reel. 12 Likes."
- "Warum Storytelling wichtig ist" → "Sie scrollt vorbei obwohl dein Inhalt gut ist"
- "Mehr Sichtbarkeit in 5 Schritten" → "Du bist sichtbar. Aber die Falschen schauen zu"

=== 5 KATEGORIEN ===

1. COMMUNITY - Identifikation und Kommentare
Ziel: Sie liest und denkt "das bin ich" - kommentiert, speichert, teilt
Hook-Stil: Alltagssituation, innerer Monolog, geteilte Erfahrung

2. TRUST - Vertrauen und Bindung
Ziel: Sie spuert "hier bin ich richtig" - vertraut der Person hinter dem Profil
Hook-Stil: Ehrliche Beobachtung, unerwartete Wahrheit, nahe Perspektive

3. SALES - Kaufabsicht wecken
Ziel: Sie denkt "das brauche ich" - konkrete Verbindung zu ihrem Problem und der Loesung
Hook-Stil: Kontrast zwischen Problem und Ergebnis, konkreter Schmerzpunkt

4. VIRAL - Reichweite durch Teilbarkeit
Ziel: Sie schickt es weiter oder teilt es - weil es so wahr oder ueberraschend ist
Hook-Stil: Polarisierend, unbequem wahr, kontra-intuitiv, ueberraschende These

5. PROVOKATION - Meinung und Haltung
Ziel: Sie bleibt haengen weil es ihr Selbstbild oder eine Annahme herausfordert
Hook-Stil: Direkte These, Widerspruch zu gaengiger Meinung, starke Aussage

=== QUALITAETSCHECK (VOR AUSGABE - JEDER HOOK) ===
- Koennte dieser Hook genauso bei Fitness/Ernaehrung/Hundetraining stehen? → wenn JA: neu schreiben
- Ist es ein konkreter Gedanke/Situation oder eine vage Aussage? → wenn vage: neu schreiben
- Beginnt er mit einem der verbotenen Muster? → wenn ja: neu schreiben
- Ist er max 7 Woerter lang? → wenn laenger: kuerzten
- Sind alle 30 Hooks untereinander verschieden? → keine aehnlichen Formulierungen

JSON-STRUKTUR:
{
  "analyse": [
    {
      "nr": 10,
      "titel": "Deine Hook-Bibliothek",
      "inhalt": "30 Hooks direkt fuer deine Nische - jeder trifft einen anderen Nerv deiner Wunschkundin.",
      "kategorien": [
        {
          "kategorie": "Community",
          "ziel": "Identifikation erzeugen, Kommentare und Bindung",
          "hooks": [
            {"hook": "Max 7 Woerter - innerer Monolog oder konkrete Situation"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"}
          ]
        },
        {
          "kategorie": "Trust",
          "ziel": "Vertrauen aufbauen, zeigen dass sie richtig ist",
          "hooks": [
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"}
          ]
        },
        {
          "kategorie": "Sales",
          "ziel": "Kaufabsicht wecken, Angebot natuerlich platzieren",
          "hooks": [
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"}
          ]
        },
        {
          "kategorie": "Viral",
          "ziel": "Reichweite durch Teilbarkeit und Ueberraschung",
          "hooks": [
            {"hook": "Max 7 Woerter - polarisierend oder ueberraschend wahr"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"}
          ]
        },
        {
          "kategorie": "Provokation",
          "ziel": "Haltung zeigen, Selbstbild herausfordern, Meinung bilden",
          "hooks": [
            {"hook": "Max 7 Woerter - starke These oder Widerspruch"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"},
            {"hook": "Max 7 Woerter"}
          ]
        }
      ]
    },
    {
      "nr": 11,
      "titel": "Deine naechsten Schritte",
      "inhalt": "Die 3 wichtigsten Schritte jetzt",
      "todos": ["Konkrete Aufgabe 1", "Konkrete Aufgabe 2", "Konkrete Aufgabe 3"]
    }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        tools: [{
          name: 'analyse_ausgabe',
          description: 'Gibt die Hook-Bibliothek und To-do-Liste zurueck',
          input_schema: {
            type: 'object',
            properties: {
              analyse: {
                type: 'array',
                description: 'Analysepunkte 10 und 11',
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
    return res.status(200).json(toolUse.input);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
