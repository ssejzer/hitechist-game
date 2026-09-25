import { readdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = [];
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory()) await walk(path);
    else if (e.name !== "sw.js" && !e.name.endsWith(".php")) files.push(path.replace("dist/", "./"));
  }
}
await walk("dist");
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(`dist/${file.slice(2)}`));
const cache = `root-access-${hash.digest("hex").slice(0, 12)}`;
// All cached responses are bundled static files. Ignore preview/hosting CORS
// Vary: Origin headers, which differ between precaching and module requests.
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(cache)};const FILES=${JSON.stringify(["./", ...files])};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('root-access-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request,{ignoreVary:true}).then(c=>c||fetch(e.request)));});
`,
);
console.log(`Offline cache generated: ${files.length} assets.`);
