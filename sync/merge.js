/* 05.11.2026: three-way snapshot merge for offline-first synchronization.
   A missing item is a deletion; non-conflicting remote/local edits are retained.
   Simultaneous conflicting edits preserve both copies rather than silently losing data. */
(function (root) {
  'use strict';
  const empty = () => ({ tasks: [], secrets: {} });
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const record = array => new Map((Array.isArray(array) ? array : []).map(t => [String(t.id), t]));
  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
  }
  function merge(base, local, remote) {
    base = base || empty(); local = local || empty(); remote = remote || empty();
    const B = record(base.tasks), L = record(local.tasks), R = record(remote.tasks);
    const keys = new Set([...B.keys(), ...L.keys(), ...R.keys()]);
    const tasks = [];
    let conflicts = 0;
    for (const id of keys) {
      const b = B.get(id), l = L.get(id), r = R.get(id);
      const lc = !equal(l, b), rc = !equal(r, b);
      if (!lc && !rc) { if (r) tasks.push(r); continue; }
      if (lc && !rc) { if (l) tasks.push(l); continue; }
      if (!lc && rc) { if (r) tasks.push(r); continue; }
      if (equal(l, r)) { if (r) tasks.push(r); continue; }
      // Both changed: never silently destroy an edited task.
      if (r && l) {
        tasks.push(r);
        const suffix = '-sync-' + hash(JSON.stringify(l));
        let cloneId = id + suffix;
        while (keys.has(cloneId)) cloneId += 'x';
        keys.add(cloneId);
        tasks.push({ ...l, id: cloneId, title: l.title + ' (конфликт синхронизации)' });
        conflicts++;
      } else if (l || r) {
        tasks.push(l || r); // concurrent edit beats a deletion
        conflicts++;
      }
    }
    const secrets = {};
    const bs = base.secrets || {}, ls = local.secrets || {}, rs = remote.secrets || {};
    for (const day of new Set([...Object.keys(bs), ...Object.keys(ls), ...Object.keys(rs)])) {
      const b = own(bs, day) ? bs[day] : undefined;
      const l = own(ls, day) ? ls[day] : undefined;
      const r = own(rs, day) ? rs[day] : undefined;
      const lc = !equal(l, b), rc = !equal(r, b);
      let value;
      if (!lc) value = r;
      else if (!rc) value = l;
      else if (equal(l, r)) value = l;
      else {
        value = [...new Map([...(r || []), ...(l || [])].map(v => [JSON.stringify(v), v])).values()];
        conflicts++;
      }
      if (Array.isArray(value) && value.length) secrets[day] = value;
    }
    return { snapshot: { tasks, secrets }, conflicts };
  }
  const api = { empty, equal, merge };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TGMerge = api;
})(typeof window === 'object' ? window : null);
