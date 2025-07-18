import { getFlows } from '@auto-engineer/flowlang';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

async function exportSchema() {
    try {
        const { toSchema } = await getFlows(resolve('flows'));
        const json = JSON.stringify(toSchema(), null, 2);
        const outPath = resolve('.context/schema.json');

        writeFileSync(outPath, json);
        console.log(`✅ Flow schema written to: ${outPath}`);
    } catch (error) {
        console.error('❌ Failed to export schema:', error);
        process.exit(1);
    }
}

exportSchema();