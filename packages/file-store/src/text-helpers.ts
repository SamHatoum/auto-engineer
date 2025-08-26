export async function readText(
  fs: { read(path: string): Promise<Uint8Array | null> },
  path: string,
): Promise<string | null> {
  const buf = await fs.read(path);
  return buf ? new TextDecoder().decode(buf) : null;
}

export async function writeText(
  fs: { write(path: string, data: Uint8Array): Promise<void> },
  path: string,
  text: string,
): Promise<void> {
  const buf = new TextEncoder().encode(text);
  await fs.write(path, buf);
}
