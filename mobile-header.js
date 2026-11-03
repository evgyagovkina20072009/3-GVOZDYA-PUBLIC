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
    if (!header || !left || !center || !right || !search || !input || !weekNav || !today || !calendar || !end || !about || !print || !menu) return;

    const searchToggle = document.createElement('button');
    searchToggle.type = 'button';
    searchToggle.className = 'nails-mobile-search-toggle';
    searchToggle.setAttribute('aria-label', 'Поиск задач');
    searchToggle.setAttribute('title', 'Поиск задач');
    searchToggle.setAttribute('aria-expanded', 'false');
    searchToggle.innerHTML = '<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.7"/><path d="m15.5 15.5 5 5"/></svg>';
    search.insertBefore(searchToggle, input);

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
      if (media.matches && !search.contains(event.target)) closeSearch();
    });

    function arrange() {
      if (media.matches) {
        header.classList.add('nails-mobile-header-ready');
        if (search.parentElement !== left) left.appendChild(search);
        if (today.parentElement !== end) end.appendChild(today);
        if (about.parentElement !== menu) menu.insertBefore(about, menu.firstChild);
        about.setAttribute('role', 'menuitem');
        about.textContent = 'О планировщике';
        about.classList.remove('btn-header-action');
        today.replaceChildren(hand);
        today.setAttribute('aria-label', 'Сегодня — перейти к текущей неделе');
        today.setAttribute('title', 'Сегодня');
        // Remove accidental blank search / Today buttons from the header.
        searchToggle.hidden = false;
      } else {
        header.classList.remove('nails-mobile-header-ready');
        closeSearch();
        searchToggle.hidden = true;
        if (search.parentElement !== center) center.insertBefore(search, weekNav);
        if (today.parentElement !== weekNav) weekNav.appendChild(today);
        today.textContent = 'Сегодня';
        if (about.parentElement !== right) right.insertBefore(about, print);
        about.removeAttribute('role');
        about.classList.add('btn-header-action');
      }
    }

    if (media.addEventListener) media.addEventListener('change', arrange);
    else if (media.addListener) media.addListener(arrange);
    arrange();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
