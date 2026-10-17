// Identify enclosing braces in our canonical C files. Strings/comments cannot add braces.
// This is a display aid, not a C parser or compiler-derived relationship.
export function sourceContext(source: string, start: number, end: number) {
  const clean = source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    (token) => token.replace(/[^\n]/g, " "),
  );
  const stack: number[] = [];
  const pairs = new Map<number, number>();
  const ancestors: number[] = [];
  clean.split("\n").forEach((line, index) => {
    const number = index + 1;
    if (number === start) ancestors.push(...stack);
    for (const char of line) {
      if (char === "{") stack.push(number);
      if (char === "}") {
        const opening = stack.pop();
        if (opening !== undefined) pairs.set(opening, number);
      }
    }
  });
  const lines = new Set<number>();
  for (const opening of ancestors) {
    lines.add(opening);
    const closing = pairs.get(opening);
    if (closing !== undefined) lines.add(closing);
  }
  for (
    let n = Math.max(1, start - 3);
    n <= Math.min(source.split("\n").length, end + 3);
    n++
  )
    lines.add(n);
  // A context line may itself open/close a neighboring block. Retain its mate,
  // too, so a clipped window cannot falsely make that block look unbalanced.
  let added = true;
  while (added) {
    added = false;
    for (const [opening, closing] of pairs)
      if (lines.has(opening) || lines.has(closing)) {
        if (!lines.has(opening)) {
          lines.add(opening);
          added = true;
        }
        if (!lines.has(closing)) {
          lines.add(closing);
          added = true;
        }
      }
  }
  return lines;
}
