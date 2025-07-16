#!/usr/bin/env node
import { getFlows } from '../src/getFlows.js';

const main = async () => {
  try {
    const result = await getFlows();
    const schema = result.toSchema();
    console.log(JSON.stringify(schema, null, 2));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();