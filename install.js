(() => {
  let promptEvent = null;
  const btn = document.getElementById("installPlannerBtn");
  if (!btn) return;
  const installed = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (installed()) { btn.hidden = true; return; }
  window.addEventListener("beforeinstallprompt", ev => {
    ev.preventDefault(); promptEvent = ev;
    btn.hidden = false;
  });
  window.addEventListener("appinstalled", () => { btn.hidden = true; promptEvent = null; });
  btn.addEventListener("click", async () => {
    if (promptEvent) {
      const ev = promptEvent;
      promptEvent = null;
      await ev.prompt();
      return;
    }
    if (isiOS) {
      alert("Чтобы установить «Три гвоздя» на iPhone:\n1. Открой эту страницу в Safari.\n2. Нажми «Поделиться» (квадрат со стрелкой).\n3. Выбери «На экран Домой» и «Добавить».");
    } else {
      alert("Открой меню браузера (⋮ в Chrome или Edge) и выбери «Установить приложение» или «Добавить на главный экран». Если пункта пока нет, обнови страницу.");
    }
  });
})();