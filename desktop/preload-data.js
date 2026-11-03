// Restore the desktop backup before app.js reads localStorage.
(() => {
  if (!window.nailsDesktop) return;
  try {
    if (localStorage.getItem('tg_tasks') !== null || localStorage.getItem('tg_secrets') !== null) return;
    const snapshot = window.nailsDesktop.read();
    if (snapshot && Array.isArray(snapshot.tasks) && snapshot.secrets) {
      localStorage.setItem('tg_tasks', JSON.stringify(snapshot.tasks));
      localStorage.setItem('tg_secrets', JSON.stringify(snapshot.secrets));
    }
  } catch (error) {
    console.warn('[Три гвоздя] Не удалось восстановить локальную копию:', error);
  }
})();
