// // src/server.ts
// import chokidar from 'chokidar';
// import path from 'path';
// import crypto from 'node:crypto';
// import { Server } from 'socket.io';
// import { getFlows } from '@auto-engineer/flow';
// import { NodeFileStore } from '@auto-engineer/file-store';
//
// type FileEvent = 'add' | 'change' | 'delete';
// type WireChange = { event: FileEvent; path: string; content?: string };
// type WireInitial = { files: Array<{ path: string; content: string }> };
//
// const io = new Server(3001, { cors: { origin: '*' } });
//
// // --- CLI args ---
// const watchDir = path.resolve(process.argv[2] || '.');
// // projectRoot is the parent of /flows by default, but users can structure freely
// const projectRoot = path.dirname(watchDir);
//
// console.log('[sync] >>> server.ts BUILD MARKER v6 <<<', import.meta.url, new Date().toISOString());
// console.log(`[sync] watchDir     = ${watchDir}`);
// console.log(`[sync] projectRoot  = ${projectRoot}`);
//
// // --- VFS ---
// const vfs = new NodeFileStore();
//
// // Track currently-sent files so we can compute diffs cheaply
// type FileMeta = { hash: string; size: number };
// const active = new Map<string, FileMeta>(); // key = absolute posix path
//
// // --- small utils ---
// const posix = (p: string) => p.split(path.sep).join('/');
//
// const toWirePath = (abs: string) => {
//   const rel = path.relative(projectRoot, abs);
//   const wire = ('/' + rel).split(path.sep).join('/');
//   if (rel.startsWith('..')) {
//     console.warn(`[sync] ⚠ toWirePath: abs is outside projectRoot. abs=${abs}`);
//   }
//   return wire;
// };
//
// async function readBase64(abs: string): Promise<string | null> {
//   const buf = await vfs.read(abs);
//   if (!buf) {
//     console.warn(`[sync] readBase64: missing file in VFS: ${abs}`);
//     return null;
//   }
//   return Buffer.from(buf).toString('base64');
// }
//
// async function md5(abs: string): Promise<string | null> {
//   const buf = await vfs.read(abs);
//   if (!buf) return null;
//   return crypto.createHash('md5').update(buf).digest('hex');
// }
//
// async function statSize(abs: string): Promise<number> {
//   const buf = await vfs.read(abs);
//   return buf ? buf.byteLength : 0;
// }
//
// function flattenPaths(x: string[] | Record<string, string[]> | undefined): string[] {
//   if (!x) return [];
//   if (Array.isArray(x)) return x;
//   return Object.values(x).flat();
// }
//
// function sample<T>(arr: T[], n = 5): T[] {
//   return arr.slice(0, n);
// }
//
// function logArray(label: string, arr: string[], n = 5) {
//   console.log(`[sync] ${label}: count=${arr.length}`);
//   if (arr.length) console.log(`  ${label} sample:`, sample(arr, n));
// }
//
// // ---------- bare-import harvest (from already-synced source files) ----------
// const BARE_IMPORT_RE =
//     /\bfrom\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
//
// function isBare(spec: string) {
//   return !!spec && !spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('node:');
// }
//
// function basePackageOf(spec: string): string {
//   if (spec.startsWith('@')) {
//     const parts = spec.split('/');
//     return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
//   }
//   const i = spec.indexOf('/');
//   return i === -1 ? spec : spec.slice(0, i);
// }
//
// async function collectBareImportsFromFiles(files: string[], vfs: NodeFileStore): Promise<string[]> {
//   const pkgs = new Set<string>();
//   for (const abs of files) {
//     if (!/\.(m?ts|m?js|tsx|jsx)$/i.test(abs)) continue;
//     try {
//       const buf = await vfs.read(abs);
//       if (!buf) continue;
//       const src = new TextDecoder().decode(buf);
//       for (const m of src.matchAll(BARE_IMPORT_RE)) {
//         const raw = (m[1] ?? m[2] ?? m[3] ?? '').trim();
//         if (!isBare(raw)) continue;
//         pkgs.add(basePackageOf(raw));
//       }
//     } catch {
//       // ignore per-file read/parse errors
//     }
//   }
//   return [...pkgs];
// }
// // --------------------------------------------------------------------------
//
// // ---------- d.ts discovery helpers (NO CRAWL) ----------
// async function readJsonIfExists(p: string): Promise<any | null> {
//   try {
//     const buf = await vfs.read(p);
//     if (!buf) return null;
//     return JSON.parse(new TextDecoder().decode(buf));
//   } catch {
//     return null;
//   }
// }
//
// async function exists(p: string): Promise<boolean> {
//   try {
//     const buf = await vfs.read(p);
//     return !!buf;
//   } catch {
//     return false;
//   }
// }
//
// function typesAlias(pkg: string): string {
//   // @scope/name -> @types/scope__name,  name -> @types/name
//   if (pkg.startsWith('@')) {
//     const [scope, name] = pkg.split('/');
//     return `@types/${scope.slice(1)}__${name}`;
//   }
//   return `@types/${pkg}`;
// }
//
// // Build node_modules roots dynamically from actual files (no hard-coded siblings)
// function uniq<T>(arr: T[]): T[] {
//   return [...new Set(arr)];
// }
// function dirOf(p: string): string {
//   const norm = p.replace(/\\/g, '/');
//   return norm.slice(0, norm.lastIndexOf('/')) || '/';
// }
// /** For each base dir, add its ancestors' node_modules (no crawl of contents). */
// function nmRootsForBases(bases: string[], maxUp = 8): string[] {
//   const roots = new Set<string>();
//   for (const base of bases) {
//     let cur = base.replace(/\\/g, '/');
//     for (let i = 0; i < maxUp; i++) {
//       roots.add(`${cur}/node_modules`);
//       const parent = cur.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/';
//       if (parent === cur) break;
//       cur = parent;
//     }
//   }
//   return [...roots].map((p) => p.replace(/\/+/g, '/'));
// }
//
// /** Probe a single package for its entry .d.ts inside a given nm root. */
// async function probeEntryDtsInRoot(nmRoot: string, pkg: string): Promise<string | null> {
//   const pkgDir = `${nmRoot}/${pkg}`.replace(/\/+/g, '/');
//
//   // package.json types/typings
//   const pj = await readJsonIfExists(`${pkgDir}/package.json`);
//   if (pj && (pj.types || pj.typings)) {
//     const rel = String(pj.types ?? pj.typings);
//     const abs = posix(`${pkgDir}/${rel}`.replace(/\/+/g, '/'));
//     if (await exists(abs)) return abs;
//   }
//
//   // index.d.ts at root
//   const idx = posix(`${pkgDir}/index.d.ts`);
//   if (await exists(idx)) return idx;
//
//   // dist/index.d.ts (very common)
//   const distIdx = posix(`${pkgDir}/dist/index.d.ts`);
//   if (await exists(distIdx)) return distIdx;
//
//   return null;
// }
//
// /** For each external pkg, choose at most ONE entry d.ts by scanning across provided nm roots. */
// async function probeEntryDtsForPackagesFromRoots(nmRoots: string[], pkgs: string[]): Promise<string[]> {
//   function scorePath(p: string): number {
//     // lower score = better
//     // prefer server/node_modules, then plain /node_modules, penalize /.pnpm/, and long paths
//     let s = 0;
//     const pathPosix = p.replace(/\\/g, '/');
//     if (pathPosix.includes('/server/node_modules/')) s -= 10;
//     if (!pathPosix.includes('/.pnpm/')) s -= 3;
//     if (pathPosix.includes('/node_modules/')) s -= 1;
//     s += pathPosix.length / 1000;
//     return s;
//   }
//
//   const out = new Set<string>();
//
//   for (const pkg of pkgs) {
//     const candidates: string[] = [];
//
//     // direct package in each nm root
//     for (const nm of nmRoots) {
//       const hit = await probeEntryDtsInRoot(nm, pkg);
//       if (hit) candidates.push(hit);
//     }
//
//     // if none, try @types alias
//     if (candidates.length === 0) {
//       const alias = typesAlias(pkg);
//       for (const nm of nmRoots) {
//         const hit = await probeEntryDtsInRoot(nm, alias);
//         if (hit) candidates.push(hit);
//       }
//     }
//
//     if (candidates.length) {
//       candidates.sort((a, b) => scorePath(a) - scorePath(b));
//       out.add(candidates[0]);
//     } else {
//       console.log(`[sync] dts-probe: ⚠ no entry .d.ts found for ${pkg}`);
//     }
//   }
//
//   return [...out];
// }
// // ------------------------------------------------------
//
// // Extract NPM package name from a node_modules path.
// // e.g. ".../node_modules/@scope/name/..." -> "@scope/name"
// //      ".../node_modules/axios/..."       -> "axios"
// function pkgNameFromPath(p: string): string | null {
//   const m = p.replace(/\\/g, '/').match(/\/node_modules\/((@[^/]+\/)?[^/]+)/);
//   return m ? m[1] : null;
// }
//
// // Scoring used to choose the "best" path per package.
// // Prefer server/node_modules, then plain node_modules, avoid .pnpm, and shorter paths.
// function scorePathForDedupe(p: string): number {
//   let s = 0;
//   const pathPosix = p.replace(/\\/g, '/');
//   if (pathPosix.includes('/server/node_modules/')) s -= 10;
//   if (!pathPosix.includes('/.pnpm/')) s -= 3;
//   if (pathPosix.includes('/node_modules/')) s -= 1;
//   s += pathPosix.length / 1000;
//   return s;
// }
//
// // Compute desired set of files to sync
// async function computeDesiredSet(): Promise<Set<string>> {
//   console.log('[sync] computeDesiredSet: calling getFlows…', { root: watchDir });
//
//   try {
//     const res = await getFlows({ vfs, root: watchDir });
//
//     const files = flattenPaths(res.vfsFiles);
//
//     // Build nm roots dynamically from actual files + projectRoot
//     const baseDirs = uniq([projectRoot, ...files.map(dirOf)]);
//     const nmRoots = nmRootsForBases(baseDirs);
//     console.log('[sync] nm-roots (candidates, no-crawl):', nmRoots.slice(0, 6));
//
//     // externals directly referenced by .flow files
//     const externalsFromFlows = (res.externals ?? []) as string[];
//
//     // also harvest bare imports from all synced source files (includes server integrations)
//     const extraPkgs = await collectBareImportsFromFiles(files, vfs);
//
//     // union
//     const externals = Array.from(new Set([...externalsFromFlows, ...extraPkgs]));
//
//     // d.ts from graph (already entry points)
//     const dtsFromGraph = flattenPaths(res.typings);
//
//     // plus: cheap probe for each base external (no crawl, one file per pkg)
//     const dtsFromProbe = await probeEntryDtsForPackagesFromRoots(nmRoots, externals);
//
//     // de-dupe and prefer non-.pnpm paths
//     const allDts = Array.from(new Set([...dtsFromGraph, ...dtsFromProbe]));
//     allDts.sort((a, b) => {
//       const pa = a.includes('/.pnpm/') ? 1 : 0;
//       const pb = b.includes('/.pnpm/') ? 1 : 0;
//       if (pa !== pb) return pa - pb;
//       return a.length - b.length;
//     });
//
//     // keep only ONE entry per NPM package (not per filename)
//     const bestByPkg = new Map<string, string>();
//     for (const p of allDts) {
//       const pkg = pkgNameFromPath(p) ?? path.basename(path.dirname(p)); // fallback
//       const prev = bestByPkg.get(pkg);
//       if (!prev || scorePathForDedupe(p) < scorePathForDedupe(prev)) {
//         bestByPkg.set(pkg, p);
//       }
//     }
//     const dts = [...bestByPkg.values()];
//
//     console.log(
//         `[sync] getFlows -> flows=${res.flows.length} files=${files.length} dts=${dts.length} externals=${externals.length}`,
//     );
//     logArray('files', files);
//     logArray('dts', dts);
//     logArray('externals', externals);
//
//     if (dts.length === 0) {
//       console.log(`[sync] ℹ no .d.ts discovered.`);
//     }
//
//     // warn if anything lies outside projectRoot (wire path becomes /../…)
//     const outside = [...files, ...dts].filter((p) => !posix(p).startsWith(posix(projectRoot) + '/'));
//     if (outside.length) {
//       console.warn(`[sync] ⚠ desired contains files outside projectRoot: ${outside.length}`);
//       console.warn('  sample:', sample(outside));
//     }
//
//     return new Set<string>([...files, ...dts]);
//   } catch (err) {
//     console.error('[sync] getFlows FAILED:', err);
//     return new Set<string>();
//   }
// }
//
// // Produce diff against `active` and emit socket messages
// async function rebuildAndBroadcast(): Promise<void> {
//   console.log('[sync] rebuildAndBroadcast: recomputing desired set…');
//   const desired = await computeDesiredSet();
//   console.log(`[sync] desired set size = ${desired.size}, active size = ${active.size}`);
//
//   const outgoing: WireChange[] = [];
//   for (const abs of desired) {
//     const hash = await md5(abs);
//     if (!hash) {
//       console.warn(`[sync] md5: could not read (skip): ${abs}`);
//       continue;
//     }
//     const size = await statSize(abs);
//     const prev = active.get(abs);
//     if (!prev || prev.hash !== hash || prev.size !== size) {
//       const content = await readBase64(abs);
//       if (!content) {
//         console.warn(`[sync] readBase64 returned null (skip emit): ${abs}`);
//         continue;
//       }
//       active.set(abs, { hash, size });
//       const wire = toWirePath(abs);
//       outgoing.push({ event: prev ? 'change' : 'add', path: wire, content });
//     }
//   }
//
//   // deletions
//   const toDelete: WireChange[] = [];
//   for (const abs of Array.from(active.keys())) {
//     if (!desired.has(abs)) {
//       active.delete(abs);
//       const wire = toWirePath(abs);
//       toDelete.push({ event: 'delete', path: wire });
//     }
//   }
//
//   console.log(`[sync] diff -> adds/changes=${outgoing.length} deletes=${toDelete.length}`);
//   if (outgoing.length) console.log('  outgoing sample:', sample(outgoing.map((o) => o.path)));
//   if (toDelete.length) console.log('  deletes sample:', sample(toDelete.map((d) => d.path)));
//
//   for (const ch of outgoing) io.emit('file-change', ch);
//   for (const ch of toDelete) io.emit('file-change', ch);
// }
//
// // Initial payload for a just-connected client (based on current desired set)
// async function initialFiles(): Promise<WireInitial> {
//   console.log('[sync] initialFiles: computing…');
//   const desired = await computeDesiredSet();
//   console.log(`[sync] initial desired size = ${desired.size}`);
//
//   const files: WireInitial['files'] = [];
//   for (const abs of desired) {
//     const content = await readBase64(abs);
//     if (!content) {
//       console.warn(`[sync] initial: skip missing ${abs}`);
//       continue;
//     }
//     const wire = toWirePath(abs);
//     if (wire.startsWith('/..')) {
//       console.warn(`[sync] ⚠ initial outside file: abs=${abs} wire=${wire}`);
//     }
//     files.push({ path: wire, content });
//     const size = await statSize(abs);
//     const hash = (await md5(abs))!;
//     active.set(abs, { hash, size });
//   }
//
//   console.log(`[sync] initialFiles -> sending ${files.length} files`);
//   if (files.length) console.log('  sample:', sample(files.map((f) => f.path)));
//   return { files };
// }
//
// // --- chokidar watcher ---
// const watcher = chokidar.watch([watchDir], {
//   ignoreInitial: true,
//   persistent: true,
// });
//
// let debounce: NodeJS.Timeout | null = null;
// function scheduleRebuild() {
//   if (debounce) clearTimeout(debounce);
//   debounce = setTimeout(() => {
//     debounce = null;
//     console.log('[sync] watcher event → rebuilding (debounced)…');
//     rebuildAndBroadcast().catch((err) => console.error('[sync] rebuild error', err));
//   }, 100);
// }
//
// watcher
//     .on('add', scheduleRebuild)
//     .on('change', scheduleRebuild)
//     .on('unlink', scheduleRebuild)
//     .on('addDir', scheduleRebuild)
//     .on('unlinkDir', scheduleRebuild)
//     .on('error', (err) => console.error('[watcher]', err));
//
// // --- socket.io wiring ---
// io.on('connection', async (socket) => {
//   console.log('[sync] client connected → sending initial-sync…');
//   try {
//     const init = await initialFiles();
//     socket.emit('initial-sync', init);
//     console.log('[sync] initial-sync sent.');
//   } catch (e) {
//     console.error('[sync] initial-sync failed:', e);
//   }
//
//   socket.on('client-file-change', async (msg: { event: 'write' | 'delete'; path: string; content?: string }) => {
//     const relFromProject = msg.path.startsWith('/') ? msg.path.slice(1) : msg.path;
//     const abs = path.join(projectRoot, relFromProject);
//
//     try {
//       if (msg.event === 'delete') {
//         console.log('[sync] client delete:', abs);
//         await vfs.remove(abs);
//         active.delete(abs);
//       } else {
//         console.log('[sync] client write:', abs);
//         const content = Buffer.from(msg.content ?? '', 'base64');
//         await vfs.write(abs, new Uint8Array(content));
//       }
//     } catch (e) {
//       console.error('[sync] client-file-change failed:', e);
//     } finally {
//       scheduleRebuild();
//     }
//   });
// });
//
// console.log(`[sync] Two-way flow-aware sync on ${watchDir} (ws://localhost:3001)`);
