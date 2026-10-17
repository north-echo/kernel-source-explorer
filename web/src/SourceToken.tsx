import hljs from "highlight.js/lib/core";
export function SourceToken({
  text,
  column,
}: {
  text: string;
  column?: number;
}) {
  const html = (value: string) =>
    hljs.highlight(value, { language: "c" }).value;
  if (!column) return <code dangerouslySetInnerHTML={{ __html: html(text) }} />;
  const parts = sourceParts(text, column);
  if (!parts) return <code dangerouslySetInnerHTML={{ __html: html(text) }} />;
  const { prefix, token, suffix } = parts;
  return (
    <code>
      <span dangerouslySetInnerHTML={{ __html: html(prefix) }} />
      <mark
        className="selected-token"
        title={"Selected token at source column " + column}
        dangerouslySetInnerHTML={{ __html: html(token) }}
      />
      <span dangerouslySetInnerHTML={{ __html: html(suffix) }} />
    </code>
  );
}

// Preserve the exact decoded source even when an external link supplies an invalid byte column.
export function sourceParts(text: string, column: number) {
  const bytes = new TextEncoder().encode(text);
  if (!Number.isSafeInteger(column) || column < 1 || column > bytes.length)
    return undefined;
  let prefix: string;
  try {
    prefix = new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.slice(0, column - 1),
    );
  } catch {
    return undefined;
  }
  const rest = text.slice(prefix.length);
  const token =
    rest.match(/^[A-Za-z_][A-Za-z_0-9]*/)?.[0] || Array.from(rest)[0] || "";
  return { prefix, token, suffix: rest.slice(token.length) };
}
