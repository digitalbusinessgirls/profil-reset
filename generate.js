export const maxDuration = 60;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API Key nicht konfiguriert. Bitte ANTHROPIC_API_KEY in den Vercel Umgebungsvariablen eintragen.' });
  }

  const body = req.body;

  const systemPrompt = `Du bist ein präziser Instagram-Profil-Analyse-Assistent. Du analysierst Instagram-Profile nach einem festen 10-Punkte-Schema. Kein Coaching-Sprech, keine Weichzeichnung, klare analytische Aussagen.

ANALYSEPUNKTE – exakt in dieser Reihenfolge:
1. 3-Sekunden-Profilentscheidung (Bleiben/Gehen + 2–3 Gründe + Gedanke der Besucherin)
2. Profil-Filter (1 klarer Leitsatz als Entscheidungsfilter für jeden Post)
3. Profilnamen-Check (Bewertung + 3 SEO-Varianten + Accountname-Einschätzung)
4. Bio-Check (Diagnose + 5 Bio-Varianten nach exakten Regeln – siehe unten)
5. Profilbild-Feedback (kurze Bewertung + 1 klare Empfehlung + max. 3 Foto-Hinweise)
6. Highlight-Struktur (Bewertung + empfohlene Struktur + Inhalte je Highlight)
7. Erste 3 Posts / Feed-Einstieg (Diagnose + Empfehlung für neue Pin-Struktur)
8. Story-Check (Diagnose + 2–3 Leitlinien – nur wenn Storys sichtbar)
9. 10 Hooks (exakt 10, Haupt + Neben, passend zur Nische)
10. To-do-Liste (priorisiert nach Wirkung, konkret, max. 10 Punkte)

BIO-REGELN (Punkt 4 – KRITISCH WICHTIG):
Erstelle exakt 5 Bio-Varianten. Jede Bio muss:
- maximal 150 Zeichen haben (inkl. Emojis und Leerzeichen)
- genau 4 Zeilen haben
- Zeile 1: "Ich helfe dir, [konkretes Ziel], ohne [konkreter Alltags-Stress]" + Emoji
- Zeile 2: Konkreter Alltagssatz im "statt"-Prinzip – echte Situation aus dem Leben der Zielgruppe, kein Klischee
- Zeile 3: Klarer Effekt / Transformation in einfachen Worten
- Zeile 4: Trust-Element + klarer CTA
Keine Buzzwords, keine leeren Aussagen. So einfach, dass ein Kind es versteht.

Bio-Stilrichtungen (eine pro Variante):
1. ruhig & klar
2. führend & direkt
3. leicht provokant
4. emotional & identifizierend
5. reduziert & sehr klar

HOOK-REGELN (Punkt 9):
- Exakt 10 Hooks
- Je Haupt-Hook (Thema, Sog, max. 15 Wörter) + Neben-Hook (Trigger + Cliffhanger, max. 15 Wörter)
- Einfache Sprache, kein Clickbait, kein Druck, keine leeren Versprechen

AUSGABE: Antworte NUR mit validem JSON. Absolut kein Text davor oder danach.

JSON-Format:
{
  "orientierungswoerter": ["wort1","wort2","wort3","wort4","wort5","wort6","wort7","wort8","wort9"],
  "analyse": [
    {
      "nr": 1,
      "titel": "3-Sekunden-Profilentscheidung",
      "verdict": "bleiben",
      "inhalt": "Analysetext mit Zeilenumbrüchen zwischen Abschnitten",
      "bios": [],
      "hooks": [],
      "todos": []
    }
  ]
}

Für Punkt 4: "bios" = Array von 5 Objekten: [{"stil":"ruhig & klar","text":"Zeile1\nZeile2\nZeile3\nZeile4","zeichen":120}, ...]
Für Punkt 9: "hooks" = Array von 10 Objekten: [{"haupt":"...","neben":"..."}, ...]
Für Punkt 10: "todos" = Array von Strings: ["To-do 1", "To-do 2", ...]
Alle anderen Punkte: leere Arrays für bios, hooks, todos`;

  const userText = `Profil analysieren:\n\nProfilname: ${body.link}\nNische: ${body.nische}\nAngebot: ${body.angebot}\nZielgruppe: ${body.zielgruppe}\nProblem: ${body.problem || 'nicht angegeben'}\nWunsch: ${body.ziel || 'nicht angegeben'}\n\nFühre jetzt die vollständige 10-Punkte-Analyse durch.`;

  const contentParts = [];
  if (body.images && body.images.length > 0) {
    const labels = ['Profilübersicht (Bio, Highlights, angepinnte Posts)', 'Feed (erste 9 Beiträge)'];
    body.images.forEach(function(img, i) {
      contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } });
      contentParts.push({ type: 'text', text: '[Screenshot: ' + (labels[i] || 'Screenshot ' + (i+1)) + ']' });
    });
  }
  contentParts.push({ type: 'text', text: userText });

  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: contentParts }]
        })
      });

      if (response.status === 529 || response.status === 503) {
        await new Promise(r => setTimeout(r, 2500));
        continue;
      }

      const data = await response.json();
      if (data.error) {
        return res.status(500).json({ error: data.error.message || 'API Fehler' });
      }

      return res.status(200).json(data);

    } catch(e) {
      lastError = e;
      if (attempt < 2) await new Promise(r => setTimeout(r, 2500));
    }
  }

  return res.status(500).json({ error: 'Verbindungsfehler: ' + (lastError ? lastError.message : 'unbekannt') });
}
