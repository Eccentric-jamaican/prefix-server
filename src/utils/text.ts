export function sanitizeTextInput(text?: string): string | undefined {
  if (!text) {
    return text;
  }

  if (!/[<]/.test(text)) {
    return text;
  }

  return text.replace(/<[^>]+>/g, " ");
}
