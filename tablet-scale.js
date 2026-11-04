/* Scale the approved mobile composition uniformly on larger touch tablets.
 * The browser cannot read the device diagonal in inches, so we use the
 * available CSS viewport. 768x1024 portrait / 1024x768 landscape is the
 * 9-inch-class reference. Neither small-screen phones nor desktops change.
 */
(() => {
  'use strict';
  const query = window.matchMedia('(min-width: 768px) and (min-height: 650px) and (pointer: coarse)');
  let lastScale = 1;

  function calculate() {
    if (!query.matches) return 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const portrait = height >= width;
    const referenceWidth = portrait ? 768 : 1024;
    const referenceHeight = portrait ? 1024 : 768;
    return Math.max(1, Math.min(2.1, width / referenceWidth, height / referenceHeight));
  }

  function update() {
    // Avoid unexpected jumps when the iOS software keyboard changes viewport height.
    if (document.activeElement?.matches('input, textarea, select') && query.matches) return;
    lastScale = calculate();
    document.documentElement.style.setProperty('--nails-tablet-ui-scale', lastScale.toFixed(4));
  }

  window.NailsTabletScale = {
    getScale: () => lastScale,
    update
  };
  update();
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(update, 120));
  document.addEventListener('focusout', () => setTimeout(update, 250));
  if (query.addEventListener) query.addEventListener('change', update);
  else if (query.addListener) query.addListener(update);
})();
