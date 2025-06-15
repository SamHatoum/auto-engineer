

export function main(): void {
  console.log('CLI is running!');
}

if (require.main === module) {
  main();
} 