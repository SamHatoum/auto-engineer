#!/usr/bin/env node
import { getFlows } from '../src';
import { NodeFileStore } from '@auto-engineer/file-store';
import path from 'path';

const main = async () => {
  try {
    const result = await getFlows({ vfs: new NodeFileStore(), root: path.resolve(__dirname) });
    const schema = result.toModel();
    console.log(JSON.stringify(schema, null, 2));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main().catch(console.error);
