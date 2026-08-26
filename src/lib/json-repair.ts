/**
 * Tolerant JSON extraction for LLM output.
 * Handles code fences, trailing prose, trailing commas, smart quotes,
 * unescaped newlines inside strings, and truncated output.
 */

function stripFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/** Slice from the first `{` to its balanced closing brace (string-aware). */
function balancedSlice(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  // Truncated output: close whatever is still open.
  let tail = text.slice(start);
  if (inStr) tail += '"';
  const opens: string[] = [];
  inStr = false;
  esc = false;
  for (const c of tail) {
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") opens.push(c);
    else if (c === "}" || c === "]") opens.pop();
  }
  while (opens.length) tail += opens.pop() === "{" ? "}" : "]";
  return tail;
}

function sanitize(text: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) {
        out += c;
        esc = false;
        continue;
      }
      if (c === "\\") {
        out += c;
        esc = true;
        continue;
      }
      if (c === '"') {
        inStr = false;
        out += c;
        continue;
      }
      if (c === "\n") {
        out += "\\n";
        continue;
      }
      if (c === "\r") continue;
      if (c === "\t") {
        out += "\\t";
        continue;
      }
      out += c;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }
    // Smart quotes outside strings are almost always meant as delimiters.
    if (c === "\u201C" || c === "\u201D") {
      inStr = true;
      out += '"';
      continue;
    }
    out += c;
  }
  // Remove trailing commas before a closing brace/bracket.
  return out.replace(/,\s*([}\]])/g, "$1");
}

/** Insert a missing comma between adjacent array/object values. */
function fixMissingCommas(text: string): string {
  return text
    .replace(/"(\s*\n\s*)"/g, '",$1"')
    .replace(/}(\s*\n\s*){/g, "},$1{")
    .replace(/](\s*\n\s*)\[/g, "],$1[");
}

export function parseLooseJson<T = any>(raw: string): T {
  const attempts: string[] = [];
  const stripped = stripFences(raw);
  attempts.push(stripped);
  const sliced = balancedSlice(stripped);
  if (sliced) {
    attempts.push(sliced);
    const clean = sanitize(sliced);
    attempts.push(clean);
    attempts.push(fixMissingCommas(clean));
  }
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      /* try next */
    }
  }
  throw new Error("AI returned unparseable output");
}
