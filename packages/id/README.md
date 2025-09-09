# @auto-engineer/id

Generate opaque, URL-safe IDs.

## Installation

Install the package as a dependency in your Auto Engineer project:

```bash
npm install @auto-engineer/id
```

## Usage

```ts
// Default: 9-character base-63 token (A–Z a–z 0–9 _)
const id = generateId();
// e.g. "aP9ZfWcLQ"

// With a custom prefix (validated to be URL-safe)
// Result: <prefix><token>
const idWithPrefix = generateId({ prefix: 'AUTO-' });
// e.g. "AUTO-xYz7GhtR2"

// With a custom token length
const longerId = generateId({ length: 12 });
// e.g. "QwErTyUiOp12"
```
