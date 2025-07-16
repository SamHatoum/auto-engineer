export function extractCodeBlock(text: string): string {
    const match = text.match(/```(?:typescript)?\s*([\s\S]*?)\s*```/);
    return match?.[1]?.trim() ?? text.trim();
}