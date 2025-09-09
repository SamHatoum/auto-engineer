# @auto-engineer/id

Generate opaque, URL-safe IDs.

## Installation

Install the package as a dependency in your Auto Engineer project:

```bash
npm install @auto-engineer/id
```

## Usage

```ts
import { generateId } from '@auto-engineer/id';

const id = generateId(); // "<64 base64url chars>"
const idWithPrefix = generateId({ prefix: 'AUTO-' });
```
