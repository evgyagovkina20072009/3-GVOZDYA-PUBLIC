/*
 * «Три гвоздя» — мобильная навигация без изменения данных и бизнес-логики.
 * Обновляет только кнопки интерфейса при перерисовке недели.
 */
(function () {
  'use strict';

  const mobileQuery = window.matchMedia('(max-width: 767px)');
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  function init() {
    const layout = document.querySelector('.app-layout');
    const workspace = document.querySelector('.main-workspace');
    const grid = document.getElementById('weekGrid');

    if (!layout || !workspace || !grid || !window.WeekGridManager || !window.DateUtils) return;
    if (document.getElementById('mobileDayJump')) return;

    const brandRow = document.querySelector('.header-left');
    const endControls = document.querySelector('.header-end-controls');
    const yearButton = document.getElementById('openYearDrawerBtn');
    const aboutButton = document.getElementById('aboutPlannerBtn');
    const todayButton = document.getElementById('todayBtn');
    const rangeLabel = document.getElementById('currentWeekRange');

    // Мобильные пиктограммы добавляются без замены работающих обработчиков кнопок.
    if (aboutButton && !aboutButton.querySelector('.mobile-briefcase-icon')) {
      aboutButton.setAttribute('aria-label', 'О планировщике');
      aboutButton.insertAdjacentHTML('afterbegin', '<svg class="mobile-briefcase-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M11 12v2h2v-2"/></svg>');
    }
    if (todayButton && !todayButton.querySelector('.mobile-today-icon')) {
      todayButton.setAttribute('aria-label', 'Перейти к сегодняшнему дню');
      todayButton.insertAdjacentHTML('afterbegin', '<svg class="mobile-today-icon" aria-hidden="true" viewBox="0 0 24 36"><circle cx="12" cy="4" r="3" fill="#1558ed"/><rect x="10" y="10" width="4" height="5" rx="2" fill="#ef202e"/><rect x="5" y="17" width="14" height="3.6" rx="1.8" fill="#1558ed"/><rect x="10" y="22.5" width="4" height="5" rx="2" fill="#ef202e"/><circle cx="12" cy="33" r="3" fill="#1558ed"/></svg>');
    }

    function formatMobileWeek() {
      if (!rangeLabel || !window.WeekGridManager.currentMonday) return;
      const monday = new Date(window.WeekGridManager.currentMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      const shortMonth = date => new Intl.DateTimeFormat('ru-RU', {month: 'short'}).format(date);
      rangeLabel.textContent = mobileQuery.matches
        ? monday.getDate() + ' ' + shortMonth(monday) + ' — ' + sunday.getDate() + ' ' + shortMonth(sunday) + ' ' + sunday.getFullYear()
        : window.DateUtils.formatRange(monday);
    }

    function syncMobileHeader() {
      if (brandRow && endControls && yearButton) {
        const destination = mobileQuery.matches ? brandRow : endControls;
        if (yearButton.parentElement !== destination) destination.appendChild(yearButton);
      }
      formatMobileWeek();
    }

    const nav = document.createElement('nav');
    nav.id = 'mobileDayJump';
    nav.className = 'mobile-day-jump';
    nav.setAttribute('aria-label', 'Быстрый переход к дню недели');
    layout.insertBefore(nav, workspace);

    const quickAdd = document.createElement('button');
    quickAdd.type = 'button';
    quickAdd.className = 'mobile-quick-add';
    quickAdd.id = 'mobileQuickAdd';
    quickAdd.textContent = '+ Добавить дело';
    quickAdd.setAttribute('aria-label', 'Добавить дело');
    quickAdd.hidden = true;
    layout.appendChild(quickAdd);

    let selectedDate = null;
    let initializedToday = false;

    function todayISO() {
      return window.DateUtils.getTodayISO();
    }

    function findDay(dateISO) {
      return Array.from(grid.children).find(col =>
        col.classList.contains('day-column') && col.dataset.date === dateISO
      );
    }

    function pickDate(days) {
      const today = todayISO();
      if (selectedDate && days.some(day => day.dataset.date === selectedDate)) return selectedDate;
      const current = days.find(day => day.dataset.date === today);
      const future = days.find(day => day.dataset.date >= today);
      return current ? current.dataset.date : future ? future.dataset.date : days[0].dataset.date;
    }

    function setSelected(dateISO, scrollToDay) {
      selectedDate = dateISO;
      nav.querySelectorAll('.mobile-day-chip').forEach(button => {
        const active = button.dataset.date === selectedDate;
        button.classList.toggle('is-current', active);
        button.setAttribute('aria-pressed', String(active));
      });

      const allowed = Boolean(dateISO && dateISO >= todayISO());
      quickAdd.hidden = !mobileQuery.matches || !allowed;
      if (allowed) {
        const displayDate = dateISO.split('-').reverse().join('.');
        quickAdd.setAttribute('aria-label', 'Добавить дело на ' + displayDate);
        quickAdd.title = 'Добавить дело на ' + displayDate;
      }

      if (scrollToDay && mobileQuery.matches) {
        const day = findDay(dateISO);
        if (day) day.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function decorate() {
      formatMobileWeek();
      const days = Array.from(grid.children).filter(col => col.classList.contains('day-column'));
      if (!days.length) return;

      for (const day of days) {
        if (day.dataset.date < todayISO()) continue;
        const header = day.querySelector('.day-header');
        if (!header || header.querySelector('.mobile-add-day')) continue;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mobile-add-day';
        button.textContent = '+';
        button.title = 'Добавить дело на ' + day.dataset.date;
        button.setAttribute('aria-label', 'Добавить дело на ' + day.dataset.date);
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          setSelected(day.dataset.date, false);
          window.WeekGridManager.openTaskModal(day.dataset.date);
        });
        header.appendChild(button);
      }

      selectedDate = pickDate(days);
      nav.replaceChildren();
      days.forEach((day, index) => {
        const dateISO = day.dataset.date;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'mobile-day-chip';
        button.dataset.date = dateISO;
        button.setAttribute('aria-label', 'Перейти к дню ' + weekdays[index] + ', ' + dateISO.split('-').reverse().join('.'));
        const name = document.createElement('span');
        name.className = 'mobile-chip-name';
        name.textContent = weekdays[index];
        const date = document.createElement('span');
        date.className = 'mobile-chip-date';
        date.textContent = String(Number(dateISO.slice(-2)));
        button.append(name, date);
        if (day.classList.contains('today')) button.classList.add('is-today');
        button.addEventListener('click', () => setSelected(dateISO, true));
        nav.appendChild(button);
      });
      setSelected(selectedDate, false);
    }

    quickAdd.addEventListener('click', () => {
      if (!mobileQuery.matches || !selectedDate || selectedDate < todayISO()) return;
      window.WeekGridManager.openTaskModal(selectedDate);
    });

    const observer = new MutationObserver(decorate);
    observer.observe(grid, { childList: true });
    decorate();

    function syncForViewport() {
      syncMobileHeader();
      if (mobileQuery.matches && !initializedToday) {
        initializedToday = true;
        const today = findDay(todayISO());
        if (today && today.classList.contains('collapsed')) {
          window.WeekGridManager.expandedDays.add(today.dataset.date);
          window.WeekGridManager.render();
        }
      }
      decorate();
    }

    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', syncForViewport);
    } else if (typeof mobileQuery.addListener === 'function') {
      mobileQuery.addListener(syncForViewport);
    }
    syncForViewport();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
