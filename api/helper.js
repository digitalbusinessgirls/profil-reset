export function fixAndParseJSON(raw) {
  raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Kein JSON gefunden');

  const jsonStr = raw.substring(start, end + 1);

  // Phase 1: Direkt parsen
  try { return JSON.parse(jsonStr); } catch(e) {}

  // Phase 2: Regex-Reparatur (schneller Pfad für Komma-Fehler)
  let regexFixed = jsonStr;
  regexFixed = regexFixed.replace(/,(\s*,)+/g, ',');     // ,, → ,
  regexFixed = regexFixed.replace(/,(\s*[}\]])/g, '$1'); // trailing commas
  try { return JSON.parse(regexFixed); } catch(e) {}

  // Phase 3: Zeichen-für-Zeichen-Reparatur (unescaped quotes, newlines + Komma-Fehler)
  let fixed = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];

    if (escape) { fixed += c; escape = false; continue; }
    if (c === '\\') { fixed += c; escape = true; continue; }

    if (c === '"') {
      if (inString) {
        // Prüfe ob dies ein echtes schließendes Anführungszeichen ist
        let j = i + 1;
        while (j < jsonStr.length && /[ \t\r\n]/.test(jsonStr[j])) j++;
        const next = jsonStr[j];
        if (!next || next === ',' || next === ']' || next === '}' || next === ':') {
          inString = false;
          fixed += '"';
        } else {
          // Unescaped quote innerhalb eines Strings → escapen
          fixed += '\\"';
        }
      } else {
        inString = true;
        fixed += '"';
      }
      continue;
    }

    if (inString) {
      if (c === '\n') { fixed += ' '; continue; }
      if (c === '\r') continue;
      if (c === '\t') { fixed += ' '; continue; }
      fixed += c;
      continue;
    }

    // Außerhalb von Strings: Komma-Fehler reparieren
    if (c === ',') {
      let j = i + 1;
      while (j < jsonStr.length && /[ \t\r\n]/.test(jsonStr[j])) j++;
      // Komma überspringen wenn danach: weiteres Komma, ] oder }
      if (jsonStr[j] === ',' || jsonStr[j] === ']' || jsonStr[j] === '}') continue;
    }

    fixed += c;
  }

  return JSON.parse(fixed);
}
