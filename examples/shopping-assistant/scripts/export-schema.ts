import { getFlows } from '@auto-engineer/flowlang';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
(async () => {
    const { toSchema } = await getFlows(resolve('flows'));
    const json = JSON.stringify(toSchema(), null, 2);
    const outPath = resolve('.context/schema.json');

    writeFileSync(outPath, json);
    console.log(`✅ Flow schema written to: ${outPath}`);
})();