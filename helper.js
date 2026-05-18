// Shared JSON fixer - handles unescaped quotes, newlines, tabs in string values
export function fixAndParseJSON(raw) {
  // Strip markdown
  raw = raw.replace(/```json/g,'').replace(/```/g,'').trim();
  
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Kein JSON gefunden');
  
  const jsonStr = raw.substring(start, end + 1);
  
  // First try direct parse
  try { return JSON.parse(jsonStr); } catch(e) {}
  
  // Character-by-character fix
  let fixed = '';
  let inString = false;
  let escape = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];
    
    if (escape) {
      fixed += c;
      escape = false;
      continue;
    }
    
    if (c === '\\') {
      fixed += c;
      escape = true;
      continue;
    }
    
    if (c === '"') {
      if (inString) {
        // Check if this is a closing quote or an unescaped quote inside string
        // Look ahead: after closing quote should be , ] } or whitespace
        let j = i + 1;
        while (j < jsonStr.length && (jsonStr[j] === ' ' || jsonStr[j] === '\n' || jsonStr[j] === '\r' || jsonStr[j] === '\t')) j++;
        const next = jsonStr[j];
        if (next === ',' || next === ']' || next === '}' || next === ':' || j >= jsonStr.length) {
          inString = false;
          fixed += c;
        } else {
          // Unescaped quote inside string - escape it
          fixed += '\\"';
        }
      } else {
        inString = true;
        fixed += c;
      }
      continue;
    }
    
    if (inString) {
      if (c === '\n') { fixed += ' '; continue; }
      if (c === '\r') { continue; }
      if (c === '\t') { fixed += ' '; continue; }
    }
    
    fixed += c;
  }
  
  return JSON.parse(fixed);
}
