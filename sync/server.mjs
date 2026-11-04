// Node 22+; dependency-free sync backend for "Три гвоздя".
// Deploy with HTTPS reverse proxy and a PERSISTENT DATA_DIR. Never host db.json publicly.
import http from 'node:http';
import { randomBytes, randomUUID, createHash, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(rawScrypt);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, '.private-sync'));
const DB_PATH = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';
const ORIGINS = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean));
const SESSION_MS = 365 * 86400000;
const MAX_BODY = 2 * 1024 * 1024;
const banned = new Map();
let store = { users: {} };
let writes = Promise.resolve();

function error(code, message) { const e = new Error(message); e.status = code; return e; }
function validUsername(v) { return typeof v === 'string' && /^[\\p{L}\\p{N}_.-]{3,32}$/u.test(v); }
function validPassword(v) { return typeof v === 'string' && v.length >= 8 && v.length <= 128; }
function userKey(v) { return v.normalize('NFKC').toLocaleLowerCase('en-US'); }
function digest(token) { return createHash('sha256').update(token).digest('hex'); }
async function passHash(password, salt) { return (await scrypt(password, salt, 64)).toString('hex'); }
async function writeStore() {
  const tmp = DB_PATH + '.' + process.pid + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(store), { mode: 0o600 });
  await fs.rename(tmp, DB_PATH);
}
async function mutate(fn) {
  const job = writes.catch(() => {}).then(async () => { const result = await fn(); await writeStore(); return result; });
  writes = job.catch(() => {});
  return job;
}
function cleanSnapshot(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.tasks) ||
      !input.secrets || typeof input.secrets !== 'object' || Array.isArray(input.secrets)) {
    throw error(400, 'Некорректный формат задач.');
  }
  const data = JSON.stringify({ tasks: input.tasks, secrets: input.secrets });
  if (data.length > MAX_BODY) throw error(413, 'Слишком много данных.');
  const ids = new Set();
  for (const t of input.tasks) {
    if (!t || typeof t !== 'object' || !['string','number'].includes(typeof t.id) ||
        typeof t.title !== 'string' || !t.title.trim() || typeof t.date !== 'string' ||
        !/^\\d{4}-\\d{2}-\\d{2}$/.test(t.date) ||
        ids.has(String(t.id))) throw error(400, 'Повреждённые задачи.');
    ids.add(String(t.id));
  }
  for (const [date, notes] of Object.entries(input.secrets)) {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date) || !Array.isArray(notes))
      throw error(400, 'Повреждённые заметки.');
  }
  return JSON.parse(data);
}
async function readJson(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw error(413, 'Слишком большой запрос.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw error(400, 'Неверный JSON.'); }
}
function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function limit(req, username) {
  const now = Date.now();
  const key = String(req.socket.remoteAddress) + ':' + String(username).slice(0,40);
  const value = banned.get(key) || { failures: 0, until: now + 15 * 60000 };
  if (now > value.until) { value.failures = 0; value.until = now + 15 * 60000; }
  if (value.failures >= 8) throw error(429, 'Слишком много попыток. Повтори позже.');
  banned.set(key, value);
  return { fail() { value.failures++; }, success() { banned.delete(key); } };
}
function sessionFor(req) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(String(req.headers.authorization || ''));
  if (!match) throw error(401, 'Необходим вход.');
  const hashed = digest(match[1]);
  const now = Date.now();
  for (const u of Object.values(store.users)) {
    const s = (u.sessions || []).find(x => x.hash === hashed && x.expires > now);
    if (s) return u;
  }
  throw error(401, 'Сеанс закончился. Войди снова.');
}
function issueSession(u) {
  const token = randomBytes(32).toString('hex');
  u.sessions = (u.sessions || []).filter(s => s.expires > Date.now()).slice(-19);
  u.sessions.push({ hash: digest(token), expires: Date.now() + SESSION_MS });
  return { token, accountId: u.id, username: u.name };
}
async function route(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true });
  if (req.method === 'POST' && (url.pathname === '/api/register' || url.pathname === '/api/login')) {
    const body = await readJson(req);
    const name = body?.username;
    const password = body?.password;
    if (!validUsername(name) || !validPassword(password))
      throw error(400, 'Логин: 3–32 символа; пароль: 8–128 символов.');
    const key = userKey(name);
    const throttle = limit(req, key);
    if (url.pathname === '/api/register') {
      return json(res, 201, await mutate(async () => {
        if (store.users[key]) throw error(409, 'Логин уже занят.');
        const salt = randomBytes(16).toString('hex');
        const user = { id: randomUUID(), name, salt, passwordHash: await passHash(password,salt),
          sessions: [], revision: 0, snapshot: { tasks: [], secrets: {} } };
        store.users[key] = user;
        return issueSession(user);
      }));
    }
    const u = store.users[key];
    const salt = u?.salt || '00000000000000000000000000000000';
    const candidate = Buffer.from(await passHash(password,salt),'hex');
    const correct = Buffer.from(u?.passwordHash || '00'.repeat(64),'hex');
    if (!u || !timingSafeEqual(candidate, correct)) {
      throttle.fail();
      throw error(401, 'Неверный логин или пароль.');
    }
    throttle.success();
    return json(res, 200, await mutate(async () => issueSession(u)));
  }
  if (url.pathname === '/api/snapshot') {
    const user = sessionFor(req);
    if (req.method === 'GET')
      return json(res, 200, { revision: user.revision, snapshot: user.snapshot });
    if (req.method === 'PUT') {
      const input = await readJson(req);
      if (!Number.isSafeInteger(input.baseRevision) || input.baseRevision < 0)
        throw error(400, 'Не указана версия данных.');
      const snapshot = cleanSnapshot(input.snapshot);
      const result = await mutate(async () => {
        if (input.baseRevision !== user.revision)
          return { conflict: true, revision: user.revision, snapshot: user.snapshot };
        user.snapshot = snapshot;
        user.revision++;
        return { revision: user.revision, snapshot: user.snapshot };
      });
      return json(res, result.conflict ? 409 : 200, result);
    }
  }
  if (url.pathname.startsWith('/api/')) throw error(404, 'Команда не найдена.');
  if (!['GET','HEAD'].includes(req.method)) throw error(405, 'Метод не поддерживается.');
  const requested = decodeURIComponent(url.pathname);
  let rel = requested.replace(/^\\/+/, '') || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel.includes('..') || rel.includes('\\\\') || rel.startsWith('.')) throw error(404, 'Не найдено.');
  // Never expose server source, passwords, git files, package metadata or data directory.
  const permitted = rel === 'index.html' || rel === 'install.html' ||
    /^icons\\/[\\w.-]+\\.(png|svg|ico)$/.test(rel) ||
    /^assets\\/[\\w.-]+\\.(png|jpe?g|webp)$/.test(rel) ||
    /^sync\\/(client|merge)\\.js$/.test(rel) ||
    /^(?:desktop\\/(?:preload-data|save-data)\\.js|[\\w-]+\\.(?:js|css|webmanifest))$/.test(rel);
  if (!permitted) throw error(404, 'Не найдено.');
  const target = path.resolve(ROOT, rel);
  if (!target.startsWith(ROOT + path.sep)) throw error(403, 'Недоступно.');
  let bytes;
  try { bytes = await fs.readFile(target); } catch { throw error(404, 'Не найдено.'); }
  const ext = path.extname(rel).slice(1);
  const types = { html:'text/html', js:'application/javascript', css:'text/css', png:'image/png',
    svg:'image/svg+xml', ico:'image/x-icon', jpg:'image/jpeg', jpeg:'image/jpeg',
    webp:'image/webp', webmanifest:'application/manifest+json' };
  res.writeHead(200, { 'Content-Type': (types[ext] || 'application/octet-stream') + '; charset=utf-8',
    'Cache-Control': 'no-cache' });
  res.end(req.method === 'HEAD' ? undefined : bytes);
}
const server = http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  const origin = req.headers.origin;
  const ownHost = req.headers.host;
  const sameOrigin = origin && (origin === 'http://' + ownHost || origin === 'https://' + ownHost);
  if (origin && !sameOrigin && !ORIGINS.has(origin)) return json(res,403,{error:'Источник не разрешён.'});
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try { await route(req,res,new URL(req.url,'http://localhost')); }
  catch (e) { json(res,e.status || 500,{error:e.status ? e.message : 'Внутренняя ошибка сервера.'}); if (!e.status) console.error(e); }
});
await fs.mkdir(DATA_DIR,{recursive:true,mode:0o700});
try { store = JSON.parse(await fs.readFile(DB_PATH,'utf8')); if (!store.users) throw Error('Missing users'); }
catch (e) { if (e.code !== 'ENOENT') throw e; await writeStore(); }
server.listen(PORT,HOST,() => console.log('Three Nails sync listening on ' + HOST + ':' + server.address().port));
