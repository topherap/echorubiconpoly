/**
 * echo-q-diagnostic.js
 * Unified, zero-dependency sweep for Echo Rubicon
 *
 * ▶ WHAT IT ADDS (over the existing tools)
 *   • Regex-based React-loop + listener-leak scan (no Babel)
 *   • Missing-module & orphan-require map (quick link checker)
 *   • Live-port availability report (Meili 7700 / Rust 3000 / any extra you add)
 *   • Conversations/ clients duplicate detector (dates + hashes)
 *   • Summary JSON ->  C:\Users\tophe\Documents\Echo Rubicon\logs
 *
 * USAGE  :  node echo-q-diagnostic.js
 * OUTPUT :  logs\echo-q-diagnostic-<timestamp>.json
 */

const fs   = require('fs');
const net  = require('net');
const path = require('path');
const ROOT = path.resolve(__dirname);
const LOG_DIR  = path.join(ROOT, 'logs');
const OUT_FILE = path.join(LOG_DIR, `echo-q-diagnostic-${Date.now()}.json`);

const PORTS = [7700, 3000];        // add more if needed
const SKIP  = ['node_modules', '.git', '.vscode', 'dist', 'build', 'z__archive', 'vendor', 'venv'];

const STATE = { files: [], loops: [], listeners: [], timers: [], missing: [], dupes: [], ports: {}, timestamp: new Date().toISOString() };

// ---------- helpers ----------
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
    if (SKIP.some(s => path.relative(ROOT, path.join(dir, ent.name)).includes(s))) return [];
    const full = path.join(dir, ent.name);
    return ent.isDirectory() ? walk(full) : [full];
  });
}

function isCode(f) { return /\.(js|jsx|ts|tsx)$/.test(f); }

// quick port ping
function checkPort(port) {
  return new Promise(res => {
    const sock = net.createConnection({ port, host: '127.0.0.1', timeout: 1500 }, () => {
      sock.destroy(); res(true);
    });
    sock.on('error', () => res(false));
    sock.on('timeout', () => { sock.destroy(); res(false); });
  });
}

// duplicate hash util (for conversations/clients folders)
function fileHash(p) {
  const data = fs.readFileSync(p);
  let hash = 0;
  for (let i = 0; i < data.length; i++) hash = (hash + data[i]) & 0xffffffff;
  return hash.toString(16);
}

// ---------- PORT CHECK ----------
async function scanPorts() {
  for (const p of PORTS) STATE.ports[p] = await checkPort(p);
}

// ---------- CODE SWEEP ----------
function scanCode() {
  const files = walk(ROOT).filter(isCode);
  for (const file of files) {
    const rel  = path.relative(ROOT, file);
    const code = fs.readFileSync(file, 'utf8');

    // require / import link map
    const reqs = [...code.matchAll(/require\(['"](\.\/[^'"]+)['"]\)/g), ...code.matchAll(/import .* from ['"](\.\/[^'"]+)['"]/g)]
      .map(m => m[1]);
    reqs.forEach(r => {
      const target = path.resolve(path.dirname(file), r);
      const js     = fs.existsSync(`${target}.js`) ? `${target}.js` :
                     fs.existsSync(`${target}.ts`) ? `${target}.ts` : null;
      if (!js) STATE.missing.push(`${rel} → ${r}`);
    });

    // render-loop suspects
    const effectBlocks = [...code.matchAll(/use(Lay)?out?Effect\s*\([^)]*\{/g)];
    effectBlocks.forEach(eff => {
      const body = code.slice(eff.index, eff.index + 400);   // small window
      if (/set[A-Z][A-Za-z0-9_]*\(/.test(body) && !/\[[^\]]+\]/.test(body)) {
        STATE.loops.push({ file: rel, snippet: body.split('\n')[0].trim() });
      }
    });

    // listener leaks
    if (/addEventListener\(/.test(code) && !/removeEventListener/.test(code))
      STATE.listeners.push(rel);

    // setInterval/Timeout without clear
    if (/set(Time|Interval)\(/.test(code) && !/clear(Time|Interval)/.test(code))
      STATE.timers.push(rel);

    STATE.files.push(rel);
  }
}

// ---------- DUPLICATE CHECK (conversations & clients) ----------
function scanDuplicates(folder) {
  const dir = path.join(ROOT, folder);
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
  const map = {};
  for (const f of files) {
    const p = path.join(dir, f);
    const key = f.replace(/(_\d{6,}|\d{8,})/, '');           // normalise dates/serials
    const h   = fileHash(p);
    map[key] = map[key] || {};
    map[key][h] = map[key][h] ? [...map[key][h], f] : [f];
  }
  Object.entries(map).forEach(([base, variants]) => {
    const dupSets = Object.values(variants).filter(arr => arr.length > 1);
    dupSets.forEach(arr => STATE.dupes.push({ base, versions: arr }));
  });
}

// ---------- MAIN ----------
(async function main() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);
  await scanPorts();
  scanCode();
  scanDuplicates('conversations');
  scanDuplicates('clients');

  fs.writeFileSync(OUT_FILE, JSON.stringify(STATE, null, 2), 'utf8');
  console.log(`\n✅ echo-q-diagnostic complete → ${OUT_FILE}`);
})();
