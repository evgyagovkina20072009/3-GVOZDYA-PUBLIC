/* 05.11.2026 — login once, local-first tasks, automatic multi-device sync.
   No password is stored in localStorage, only a revocable opaque session token.
   The backend must be deployed to enable login; GitHub Pages alone is not a server. */
(() => {
  'use strict';
  const { empty, equal, merge } = window.TGMerge;
  const TOKEN_KEY = 'tg_sync_session_20261105';
  const ACCOUNT_KEY = 'tg_sync_account_20261105';
  const BASE_KEY = 'tg_sync_baseline_20261105';
  const origin = window.location.origin;
  const configured = String(window.TG_SYNC_API_URL || '').replace(/\/$/, '');
  const apiBase = configured || ((location.protocol === 'http:' || location.protocol === 'https:') &&
    !location.hostname.endsWith('github.io') ? origin : '');
  let session, inFlight = false, requested = false, timer, isApplying = false, authCover;

  function getJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function snapshot() {
    return { tasks: window.StorageAPI.getTasks(), secrets: window.StorageAPI.getSecrets() };
  }
  function baseline() { return getJSON(BASE_KEY) || empty(); }
  function remember(snapshotValue) {
    localStorage.setItem(BASE_KEY, JSON.stringify(snapshotValue));
  }
  function saveDesktopCopy() {
    if (window.nailsDesktop?.save) {
      Promise.resolve(window.nailsDesktop.save(window.Step6.makeBackup()))
        .catch(e => console.warn('[Синхронизация] Копия Windows:', e));
    }
  }
  function applySnapshot(data) {
    const current = snapshot();
    if (equal(current, data)) return;
    isApplying = true;
    try {
      localStorage.setItem('tg_tasks', JSON.stringify(data.tasks));
      localStorage.setItem('tg_secrets', JSON.stringify(data.secrets));
      window.WeekGridManager.render();
      saveDesktopCopy();
    } finally { isApplying = false; }
  }
  function schedule(delay = 250) {
    if (!session || !apiBase || isApplying) return;
    clearTimeout(timer);
    timer = setTimeout(() => { synchronize().catch(e => console.warn('[Синхронизация]', e)); }, delay);
  }
  function handleAccount(accountId) {
    const old = localStorage.getItem(ACCOUNT_KEY);
    if (old && old !== accountId) {
      // Never expose one account's local tasks in another account.
      const previous = snapshot();
      localStorage.setItem('tg_isolated_backup_' + old, JSON.stringify(previous));
      localStorage.removeItem('tg_tasks');
      localStorage.removeItem('tg_secrets');
      localStorage.removeItem(BASE_KEY);
      window.WeekGridManager.render();
    }
    localStorage.setItem(ACCOUNT_KEY, accountId);
  }
  async function request(path, method = 'GET', payload, allowConflict = false) {
    if (!apiBase) throw Error('Сервер синхронизации пока не подключён.');
    const opts = { method, cache: 'no-store', headers: { 'Accept': 'application/json' } };
    if (session?.token) opts.headers.Authorization = 'Bearer ' + session.token;
    if (payload !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(payload);
    }
    const res = await fetch(apiBase + '/api/' + path, opts);
    let data;
    try { data = await res.json(); } catch { throw Error('Сервер вернул неправильный ответ.'); }
    if (res.status === 401 && path === 'snapshot') {
      session = null;
      localStorage.removeItem(TOKEN_KEY);
      showAuth();
    }
    if (!res.ok && !(allowConflict && res.status === 409))
      throw Error(data?.error || 'Ошибка подключения (' + res.status + ').');
    return { status: res.status, data };
  }
  async function synchronize() {
    if (!session || !apiBase || !navigator.onLine) return;
    if (inFlight) { requested = true; return; }
    inFlight = true;
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const remote = (await request('snapshot')).data;
        const local = snapshot();
        const combined = merge(baseline(), local, remote.snapshot).snapshot;
        if (equal(combined, remote.snapshot)) {
          // Changes made while the network response was pending must also survive.
          const newerLocal = snapshot();
          const rebased = merge(local, newerLocal, combined).snapshot;
          remember(combined);
          applySnapshot(rebased);
          if (!equal(rebased, combined)) requested = true;
          return;
        }
        const upload = await request('snapshot', 'PUT',
          { baseRevision: remote.revision, snapshot: combined }, true);
        if (upload.status === 409) continue; // server changed meanwhile; rebase and retry
        const newerLocal = snapshot();
        const rebased = merge(local, newerLocal, combined).snapshot;
        remember(combined);
        applySnapshot(rebased);
        if (!equal(rebased, combined)) requested = true;
        return;
      }
      throw Error('Другие устройства продолжают изменять задачи. Повторим синхронизацию.');
    } catch (e) {
      console.warn('[Синхронизация]', e.message || e);
    } finally {
      inFlight = false;
      if (requested && session) { requested = false; schedule(750); }
    }
  }
  function trackMutations() {
    const originalWrite = window.StorageAPI._write;
    window.StorageAPI._write = function (...args) {
      const ok = originalWrite.apply(this, args);
      if (ok) schedule();
      return ok;
    };
    for (const key of ['restoreBackup', 'clearPlanner']) {
      const original = window.Step6[key];
      window.Step6[key] = function (...args) {
        const value = original.apply(this, args);
        schedule();
        return value;
      };
    }
    window.addEventListener('online', () => schedule(150));
    window.addEventListener('focus', () => schedule(250));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) schedule(200);
    });
    setInterval(() => { if (!document.hidden) schedule(200); }, 20000);
  }
  function createAuthUI() {
    const overlay = document.createElement('div');
    overlay.id = 'tgAuthCover';
    overlay.className = 'tg-auth-cover';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tgAuthTitle');
    overlay.innerHTML = `
      <section class="tg-auth-panel">
        <h2 id="tgAuthTitle">🔨 Три гвоздя — вход</h2>
        <div class="tg-auth-tabs">
          <button id="tgRegisterTab" type="button" aria-pressed="true">Создать аккаунт</button>
          <button id="tgLoginTab" type="button" aria-pressed="false">Войти</button>
        </div>
        <form id="tgAuthForm" autocomplete="on">
          <label>Логин
            <input name="username" required minlength="3" maxlength="32"
              autocomplete="username" inputmode="text" placeholder="Ваш логин" />
          </label>
          <label>Пароль
            <input name="password" required minlength="8" maxlength="128"
              type="password" autocomplete="new-password" placeholder="От 8 символов" />
          </label>
          <button class="tg-auth-submit" type="submit" id="tgAuthSubmit">Сохранить и продолжить</button>
        </form>
        <p id="tgAuthMessage" class="tg-auth-message" role="status" aria-live="polite"></p>
        <p class="tg-auth-hint">Введите логин и пароль один раз на каждом устройстве.
          После этого задачи будут синхронизироваться автоматически при наличии интернета.
          Восстановление забытого пароля не предусмотрено — сохраните его сами.</p>
      </section>`;
    document.body.appendChild(overlay);
    authCover = overlay;
    let mode = 'register';
    const form = overlay.querySelector('#tgAuthForm');
    const submit = overlay.querySelector('#tgAuthSubmit');
    const message = overlay.querySelector('#tgAuthMessage');
    const registerTab = overlay.querySelector('#tgRegisterTab');
    const loginTab = overlay.querySelector('#tgLoginTab');
    const password = form.elements.password;
    function setMode(value) {
      mode = value;
      registerTab.setAttribute('aria-pressed', String(value === 'register'));
      loginTab.setAttribute('aria-pressed', String(value === 'login'));
      submit.textContent = value === 'register' ? 'Сохранить и продолжить' : 'Войти';
      password.autocomplete = value === 'register' ? 'new-password' : 'current-password';
      message.textContent = '';
    }
    registerTab.addEventListener('click', () => setMode('register'));
    loginTab.addEventListener('click', () => setMode('login'));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      message.textContent = '';
      if (!apiBase) {
        message.textContent = 'Сервер синхронизации ещё не подключён. Данные в старой версии сохранены отдельно.';
        return;
      }
      submit.disabled = true;
      try {
        const response = await request(mode === 'register' ? 'register' : 'login',
          'POST', { username: form.elements.username.value.trim(),
            password: password.value });
        const data = response.data;
        handleAccount(data.accountId);
        session = data;
        localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
        password.value = '';
        overlay.hidden = true;
        document.body.classList.remove('tg-auth-required');
        schedule(0);
      } catch (e) { message.textContent = e.message || 'Не удалось войти.'; }
      finally { submit.disabled = false; }
    });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') e.preventDefault();
    });
  }
  function showAuth() {
    if (!authCover) return;
    document.body.classList.add('tg-auth-required');
    // First-run greeting remains unchanged; show login only AFTER "Начать работу".
    const welcome = document.getElementById('onboardingModal');
    const reveal = () => {
      if (!session && (!welcome || welcome.classList.contains('hidden'))) {
        authCover.hidden = false;
        authCover.querySelector('input[name=username]').focus();
        return true;
      }
      return false;
    };
    if (reveal()) return;
    const observer = new MutationObserver(() => { if (reveal()) observer.disconnect(); });
    if (welcome) observer.observe(welcome, { attributes: true, attributeFilter: ['class'] });
  }
  function init() {
    createAuthUI();
    trackMutations();
    session = getJSON(TOKEN_KEY);
    if (session?.token && session?.accountId) {
      handleAccount(session.accountId);
      schedule(0); // Offline users continue with locally saved tasks.
    } else {
      session = null;
      showAuth();
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
