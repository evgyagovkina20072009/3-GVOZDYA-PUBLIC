/* Mobile-only header organisation for the originally approved Three Nails layout.
 * No changes to task storage, task rendering or desktop styles. */
(() => {
  'use strict';

  const media = window.matchMedia('(max-width: 767px)');

  function init() {
    const header = document.querySelector('.app-header');
    const left = header?.querySelector('.header-left');
    const center = header?.querySelector('.header-center');
    const right = header?.querySelector('.header-right');
    const search = center?.querySelector('.search-container') || left?.querySelector('.search-container');
    const input = document.getElementById('searchInput');
    const weekNav = document.querySelector('.week-nav');
    const today = document.getElementById('todayBtn');
    const calendar = document.getElementById('openYearDrawerBtn');
    const end = document.querySelector('.header-end-controls');
    const about = document.getElementById('aboutPlannerBtn');
    const print = document.getElementById('printBtn');
    const menu = document.getElementById('dataDropdown');
    const dataBtn = document.getElementById('dataMenuBtn');
    const dataWrapper = dataBtn?.closest('.data-menu-wrapper');
    if (!header || !left || !center || !right || !search || !input || !weekNav || !today || !calendar || !end || !about || !print || !menu || !dataBtn || !dataWrapper) return;

    const searchToggle = document.createElement('button');
    searchToggle.type = 'button';
    searchToggle.className = 'nails-mobile-search-toggle';
    searchToggle.setAttribute('aria-label', 'Поиск задач');
    searchToggle.setAttribute('title', 'Поиск задач');
    searchToggle.setAttribute('aria-expanded', 'false');
    searchToggle.innerHTML = '<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.7"/><path d="m15.5 15.5 5 5"/></svg>';
    search.insertBefore(searchToggle, input);

    // Mobile logo dropdown: reuse the existing welcome screen and its detailed help.
    const brandTools = document.createElement('div');
    brandTools.className = 'nails-brand-help';
    const brandToggle = document.createElement('button');
    brandToggle.type = 'button';
    brandToggle.className = 'nails-brand-help-toggle';
    brandToggle.setAttribute('aria-label', 'Открыть информацию о программе');
    brandToggle.setAttribute('title', 'О программе');
    brandToggle.setAttribute('aria-haspopup', 'menu');
    brandToggle.setAttribute('aria-expanded', 'false');
    brandToggle.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    const brandMenu = document.createElement('div');
    brandMenu.className = 'nails-brand-help-menu hidden';
    brandMenu.setAttribute('role', 'menu');
    brandMenu.setAttribute('aria-label', 'Информация о планировщике');
    const detailedHelp = document.createElement('button');
    detailedHelp.type = 'button';
    detailedHelp.setAttribute('role', 'menuitem');
    detailedHelp.textContent = 'Как работает планировщик';
    brandTools.append(brandToggle, brandMenu);
    left.appendChild(brandTools);

    function closeBrandMenu() {
      brandMenu.classList.add('hidden');
      brandToggle.setAttribute('aria-expanded', 'false');
    }

    brandToggle.addEventListener('click', event => {
      event.stopPropagation();
      const opening = brandMenu.classList.contains('hidden');
      brandMenu.classList.toggle('hidden', !opening);
      brandToggle.setAttribute('aria-expanded', String(opening));
      // There is room for the menu within the screen even on compact phones.
      if (opening) {
        const rect = brandToggle.getBoundingClientRect();
        const width = Math.min(250, window.innerWidth - 20);
        const leftEdge = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
        brandMenu.style.left = leftEdge + 'px';
        brandMenu.style.top = Math.min(rect.bottom + 6, window.innerHeight - 100) + 'px';
      }
    });
    brandMenu.addEventListener('click', event => event.stopPropagation());
    detailedHelp.addEventListener('click', () => {
      closeBrandMenu();
      about.click();
      document.getElementById('openDetailedHelpBtn')?.click();
    });

    // The data menu must be anchored to the visible viewport, not extend left
    // from the small "Данные" button. Move its DOM node for reliable iOS fixed positioning.
    function positionDataMenu() {
      if (!media.matches || menu.classList.contains('hidden')) return;
      const rect = dataBtn.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(290, Math.max(220, viewportWidth - 20));
      const leftEdge = Math.max(10, Math.min(rect.left, viewportWidth - width - 10));
      const top = rect.bottom + 7;
      menu.style.width = width + 'px';
      menu.style.left = leftEdge + 'px';
      menu.style.top = top + 'px';
      menu.style.maxHeight = Math.max(130, viewportHeight - top - 12) + 'px';
    }
    dataBtn.addEventListener('click', () => requestAnimationFrame(positionDataMenu));
    window.addEventListener('resize', positionDataMenu);
    menu.addEventListener('click', event => event.stopPropagation());

    const hand = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    hand.setAttribute('viewBox', '0 0 24 24');
    hand.setAttribute('width', '22');
    hand.setAttribute('height', '22');
    hand.setAttribute('aria-hidden', 'true');
    hand.setAttribute('fill', 'none');
    hand.setAttribute('stroke', '#fff');
    hand.setAttribute('stroke-width', '1.9');
    hand.setAttribute('stroke-linecap', 'round');
    hand.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M7 13V7a1.7 1.7 0 0 1 3.4 0v4-6a1.7 1.7 0 0 1 3.4 0v6-5a1.7 1.7 0 0 1 3.4 0v5-2a1.7 1.7 0 0 1 3.4 0v6c0 4.2-2.6 6.5-6.5 6.5h-2.2c-2 0-3.2-.5-4.4-2.1l-4-4.8a1.9 1.9 0 0 1 2.8-2.5L7 13Z');
    hand.appendChild(p);

    function closeSearch() {
      search.classList.remove('nails-search-open');
      searchToggle.setAttribute('aria-expanded', 'false');
    }

    searchToggle.addEventListener('click', () => {
      const open = !search.classList.contains('nails-search-open');
      search.classList.toggle('nails-search-open', open);
      searchToggle.setAttribute('aria-expanded', String(open));
      if (open) input.focus();
      else input.blur();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSearch();
    });
    document.addEventListener('pointerdown', (event) => {
      if (!media.matches) return;
      if (!search.contains(event.target)) closeSearch();
      if (!brandTools.contains(event.target) && !brandMenu.contains(event.target)) closeBrandMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeBrandMenu();
    });

    function arrange() {
      if (media.matches) {
        header.classList.add('nails-mobile-header-ready');
        if (search.parentElement !== left) left.appendChild(search);
        if (today.parentElement !== end) end.appendChild(today);
        if (brandTools.parentElement !== left) left.insertBefore(brandTools, search);
        if (about.parentElement !== brandMenu) brandMenu.insertBefore(about, brandMenu.firstChild);
        if (detailedHelp.parentElement !== brandMenu) brandMenu.appendChild(detailedHelp);
        if (brandMenu.parentElement !== document.body) document.body.appendChild(brandMenu);
        about.setAttribute('role', 'menuitem');
        about.textContent = 'Приветствие и идея';
        about.classList.remove('btn-header-action');
        if (menu.parentElement !== document.body) document.body.appendChild(menu);
        menu.classList.add('nails-data-dropdown-viewport');
        brandTools.hidden = false;
        today.replaceChildren(hand);
        today.setAttribute('aria-label', 'Сегодня — перейти к текущей неделе');
        today.setAttribute('title', 'Сегодня');
        // Remove accidental blank search / Today buttons from the header.
        searchToggle.hidden = false;
      } else {
        header.classList.remove('nails-mobile-header-ready');
        closeSearch();
        closeBrandMenu();
        brandTools.hidden = true;
        if (brandMenu.parentElement !== brandTools) brandTools.appendChild(brandMenu);
        searchToggle.hidden = true;
        if (menu.parentElement !== dataWrapper) dataWrapper.insertBefore(menu, dataWrapper.querySelector('#step6ImportInput'));
        menu.classList.remove('nails-data-dropdown-viewport');
        menu.style.removeProperty('width');
        menu.style.removeProperty('left');
        menu.style.removeProperty('top');
        menu.style.removeProperty('max-height');
        if (search.parentElement !== center) center.insertBefore(search, weekNav);
        if (today.parentElement !== weekNav) weekNav.appendChild(today);
        today.textContent = 'Сегодня';
        if (about.parentElement !== right) right.insertBefore(about, print);
        about.textContent = 'О планировщике';
        about.removeAttribute('role');
        about.classList.add('btn-header-action');
      }
    }
    about.addEventListener('click', closeBrandMenu);

    if (media.addEventListener) media.addEventListener('change', arrange);
    else if (media.addListener) media.addListener(arrange);
    arrange();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
