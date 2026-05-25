export function printSuccess(command: string, data: Record<string, unknown>, json: boolean, label?: string): void {
  if (json) {
    process.stdout.write(JSON.stringify({ ok: true, command, data }) + "\n");
  } else {
    console.log(`\n${label ?? command}\n`);
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value) || typeof value === "object") continue;
      const k = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
      console.log(`  ${k}: ${String(value)}`);
    }
    console.log();
  }
}

export function printError(command: string, message: string, code: string, json: boolean): void {
  if (json) {
    process.stderr.write(JSON.stringify({ ok: false, command, error: { code, message } }) + "\n");
  } else {
    process.stderr.write(`\nError: ${message}\n\n`);
  }
}
