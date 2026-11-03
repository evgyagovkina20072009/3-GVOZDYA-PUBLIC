// The install link belongs to the «Данные» menu, not to the header.
// Keep it visible in already installed applications so users can share it.
(() => {
  const button = document.getElementById('installPlannerBtn');
  if (!button) return;

  button.addEventListener('click', () => {
    const menu = document.getElementById('dataDropdown');
    menu?.classList.add('hidden');
    document.getElementById('dataMenuBtn')?.setAttribute('aria-expanded', 'false');

    // Opens the instructions/download page in the default browser.
    // Electron handles external HTTPS URLs using shell.openExternal().
    const url = 'https://evgyagovkina20072009.github.io/3-GVOZDYA-PUBLIC/install.html';
    window.open(url, '_blank', 'noopener,noreferrer');
  });
})();
