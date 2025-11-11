export function lineNumberAt(content: string, index: number): number {
  if (index <= 0) {
    return 1;
  }

  let line = 1;
  const limit = Math.min(index, content.length);

  for (let i = 0; i < limit; i += 1) {
    if (content[i] === "\n") {
      line += 1;
    }
  }

  return line;
}

export function snippetAround(
  content: string,
  index: number,
  matchLength: number,
  maxLength = 80
): string {
  const safeMatchLength = Math.max(matchLength, 1);
  const halfWindow = Math.max(0, Math.floor((maxLength - safeMatchLength) / 2));

  let start = Math.max(0, index - halfWindow);
  let end = index + safeMatchLength + halfWindow;

  if (end - start > maxLength) {
    end = start + maxLength;
  }

  if (end > content.length) {
    end = content.length;
    start = Math.max(0, end - maxLength);
  }

  let snippet = content.slice(start, end).replace(/\r?\n+/g, " ");

  if (snippet.length > maxLength) {
    snippet = snippet.slice(0, maxLength);
  }

  return snippet;
}
