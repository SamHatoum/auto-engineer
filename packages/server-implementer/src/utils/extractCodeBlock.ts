export function extractCodeBlock(text: string): string {
  return text
    .replace(/```(?:ts|typescript)?/g, '')
    .replace(/```/g, '')
    .trim();
}
