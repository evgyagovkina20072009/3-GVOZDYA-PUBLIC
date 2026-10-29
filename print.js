/* Step 8 — real-data monthly print preview, independent from task editing. */
(function () {
  'use strict';

  var rootId = 'plannerPrintInterface';
  var months = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];
  var shorts = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  var weekdays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  var dayMs = 86400000;
  var root, startInput, endInput, previewButton, printButton, preview, dateForm, pageList, message, lastFocus;
  var demoMode = false;

  function pad(n) { return String(n).padStart(2, '0'); }
  function printDate() {
    var now = new Date();
    return pad(now.getDate()) + '.' + pad(now.getMonth() + 1) + '.' + now.getFullYear();
  }
  function updatePrintDates() {
    if (!pageList) return;
    pageList.querySelectorAll('.pp-print-date').forEach(function (label) { label.textContent = printDate(); });
  }
  function iso(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    var bits = value.split('-').map(Number);
    var d = new Date(Date.UTC(bits[0], bits[1] - 1, bits[2], 12));
    if (bits[0] < 100 || d.getUTCFullYear() !== bits[0] ||
        d.getUTCMonth() !== bits[1] - 1 || d.getUTCDate() !== bits[2]) return null;
    return d;
  }
  function add(d, days) { return new Date(d.getTime() + days * dayMs); }
  function monday(d) { return add(d, -((d.getUTCDay() + 6) % 7)); }
  function monthStart(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12)); }
  function monthEnd(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function makeIcon(icon) {
    if (icon === 'medical-cross' || icon === '❄️') {
      return '<svg viewBox="0 0 48 48" role="img" aria-label="Медицинский крест" class="pp-cross"><circle cx="24" cy="24" r="23" fill="#fff" stroke="#cbd5e1"/><path d="M20 11H28V20H37V28H28V37H20V28H11V20H20Z" fill="#d71920"/></svg>';
    }
    return '<span class="pp-icon">' + escapeHtml(icon) + '</span>';
  }
  function demoRecords(fromISO, toISO) {
    var tasks = new Map(), secrets = new Map();
    var priorities = ['high', 'medium', 'flexible'];
    for (var day = 1; day <= 30; day++) {
      var key = '2026-11-' + pad(day);
      if (key < fromISO || key > toISO) continue;
      var amount = day <= 7 ? 1 : day <= 14 ? 5 : day <= 21 ? 7 : 3;
      var list = [];
      for (var n = 1; n <= amount; n++) {
        var p = priorities[(day + n) % priorities.length];
        list.push({date:key, title:'Дело ' + n,
          priority:p, time:pad(8 + (n % 12)) + ':' + (n % 2 ? '00' : '30')});
      }
      tasks.set(key, list);
      // Demonstration only: real secret reminders are never modified.
      if (day === 3) secrets.set(key, [{icon:'💧'}, {icon:'❤️'}]);
      if (day >= 4 && day <= 6) secrets.set(key, [{icon:'💧'}]);
      if (day === 12) secrets.set(key, [{icon:'medical-cross'}]);
      if (day === 22) secrets.set(key, [{icon:'🌸'}, {icon:'🍀'}]);
    }
    return {tasks:tasks, secrets:secrets};
  }
  function indexRecords(fromISO, toISO) {
    if (demoMode) return demoRecords(fromISO, toISO);
    var tasksByDate = new Map(), secretsByDate = new Map();
    var tasks = window.StorageAPI && window.StorageAPI.getTasks();
    if (!Array.isArray(tasks)) tasks = [];
    tasks.forEach(function (t) {
      if (!t || typeof t.date !== 'string' || t.date < fromISO || t.date > toISO) return;
      if (!tasksByDate.has(t.date)) tasksByDate.set(t.date, []);
      tasksByDate.get(t.date).push(t);
    });
    tasksByDate.forEach(function (items) {
      items.sort(function (a, b) {
        return String(a.time || '').localeCompare(String(b.time || '')) ||
          String(a.title || '').localeCompare(String(b.title || ''), 'ru');
      });
    });
    var allSecrets = window.StorageAPI && typeof window.StorageAPI.getSecrets === 'function'
      ? window.StorageAPI.getSecrets() : {};
    if (allSecrets && typeof allSecrets === 'object' && !Array.isArray(allSecrets)) {
      Object.keys(allSecrets).forEach(function (date) {
        if (date >= fromISO && date <= toISO && Array.isArray(allSecrets[date])) {
          var valid = allSecrets[date].filter(function (secret) { return secret && typeof secret.icon === 'string' && secret.icon; });
          if (valid.length) secretsByDate.set(date, valid);
        }
      });
    }
    return {tasks:tasksByDate, secrets:secretsByDate};
  }
  function weekHtml(weekStart, month, from, to, records) {
    var days = Array.from({length:7}, function (_, i) { return add(weekStart, i); });
    var end = days[6];
    var caption = 'НЕДЕЛЯ ' + weekStart.getUTCDate() + ' ' + shorts[weekStart.getUTCMonth()] +
      ' — ' + end.getUTCDate() + ' ' + shorts[end.getUTCMonth()];
    var inScope = function (d) {
      return d >= from && d <= to &&
        d.getUTCFullYear() === month.getUTCFullYear() &&
        d.getUTCMonth() === month.getUTCMonth();
    };
    var active = days.some(function (d) {
      var key = iso(d);
      return inScope(d) && ((records.tasks.get(key) || []).length > 0 ||
        (records.secrets.get(key) || []).length > 0);
    });
    if (!active) {
      return '<section class="pp-week pp-empty" data-week-start="' + iso(weekStart) + '" data-week-end="' + iso(end) + '"><h3>' + caption + '</h3>' +
        '<div class="pp-no-plans">Планов нет</div></section>';
    }
    var cells = days.map(function (d, i) {
      var valid = inScope(d), key = iso(d), body = '';
      if (valid) {
        body = (records.tasks.get(key) || []).map(function (t) {
          var time = String(t.time || '').trim();
          var priorityIcon = t.priority === 'high' ? '❗' : t.priority === 'medium' ? '☀️' : '';
          var priorityLabel = t.priority === 'high' ? 'Важно' : t.priority === 'medium' ? 'Средне' : t.priority === 'flexible' ? 'Свободно' : '';
          return '<div class="pp-task">' + (time ? '<strong>' + escapeHtml(time) + '</strong>' : '') +
            (priorityIcon ? '<span class="pp-priority-icon" role="img" aria-label="' + priorityLabel + '">' + priorityIcon + '</span> ' : '') +
            '<span>' + escapeHtml(t.title || '') + '</span></div>';
        }).join('');
        var daySecrets = records.secrets.get(key) || [];
        if (daySecrets.length) {
          body += '<div class="pp-secrets" aria-label="Секретные напоминания">' +
            daySecrets.map(function (secret) {
              return '<span class="pp-icon-box">' + makeIcon(secret.icon) + '</span>';
            }).join('') + '</div>';
        }
      } else {
        body = '<span class="pp-other-label">Другой месяц</span>';
      }
      return '<div class="pp-day' + (valid ? '' : ' pp-outside') + '">' +
        '<b>' + weekdays[i] + ' ' + pad(d.getUTCDate()) + '</b>' +
        '<div class="pp-day-content">' + body + '</div></div>';
    }).join('');
    return '<section class="pp-week pp-active" data-week-start="' + iso(weekStart) + '" data-week-end="' + iso(end) + '"><h3>' + caption +
      '</h3><div class="pp-days">' + cells + '</div></section>';
  }
  // Compose real A4 sheets in the browser. A complete week is indivisible
  // unless it is taller than a whole page; an oversized week is continued
  // on fresh pages at task/icon boundaries, never by clipping its contents.
  function newSheet(month) {
    var wrap = document.createElement('div');
    wrap.className = 'pp-scale-wrap';
    wrap.innerHTML = '<article class="pp-sheet">' +
      '<header class="pp-sheet-header"><span class="pp-brand-group">' +
      '<span class="pp-brand-badge">' + (document.querySelector('.app-header .brand-badge')
        ? document.querySelector('.app-header .brand-badge').innerHTML : '3 ГВОЗДЯ') + '</span>' +
      '<span class="pp-brand">ПЛАН ДЕЛ</span></span>' +
      '<span class="pp-month">' + months[month.getUTCMonth()] + ' ' +
      month.getUTCFullYear() + '</span></header>' +
      '<div class="pp-weeks"></div>' +
      '<footer class="pp-print-date" aria-label="Дата печати">' + printDate() + '</footer></article>';
    var group = wrap.querySelector('.pp-brand-group');
    group.style.cssText = 'display:flex;align-items:center;gap:8mm';
    var badge = wrap.querySelector('.pp-brand-badge');
    badge.style.cssText = 'display:inline-flex;align-items:center;gap:2mm;white-space:nowrap;background:#17283d;border-radius:3mm;padding:2mm 3mm';
    var emblem = badge.querySelector('.forged-nails-emblem');
    if (emblem) { emblem.style.width = '9mm'; emblem.style.height = '12mm'; emblem.querySelectorAll('.nail-head,.nail-shaft').forEach(function(n){ n.style.fill='#f1f5f9'; n.style.stroke='#cbd5e1'; }); emblem.querySelectorAll('.nail-ridge').forEach(function(n){ n.style.stroke='#64748b'; }); }
    var title = badge.querySelector('.brand-title');
    if (title) title.style.cssText = 'font-size:12pt;color:#fff;text-shadow:none;letter-spacing:.07em';
    var slogan = badge.querySelector('.brand-slogan');
    if (slogan) slogan.style.cssText = 'font-size:5.5pt;color:#e2e8f0;opacity:1;letter-spacing:.08em';
    pageList.appendChild(wrap);
    return wrap.querySelector('.pp-weeks');
  }
  function remainingHeight(container) {
    var css = getComputedStyle(container);
    var available = container.clientHeight -
      parseFloat(css.paddingTop || 0) - parseFloat(css.paddingBottom || 0);
    var items = Array.from(container.children);
    var gap = parseFloat(css.rowGap || css.gap) || 0;
    items.forEach(function (item) { available -= item.offsetHeight + gap; });
    return available;
  }
  function putWholeWeek(week, container) {
    var space = remainingHeight(container);
    container.appendChild(week);
    if (week.offsetHeight <= space + 1) return true;
    container.removeChild(week);
    return false;
  }
  function parseWeek(html) {
    var holder = document.createElement('div');
    holder.innerHTML = html;
    return holder.firstElementChild;
  }
  function continueOversizedWeek(template, month, container) {
    var sources = Array.from(template.querySelectorAll('.pp-day-content')).map(function (cell) {
      return Array.from(cell.children);
    });
    var positions = sources.map(function () { return 0; });
    var portion = 0;

    while (positions.some(function (pos, i) { return pos < sources[i].length; })) {
      // Each continuation repeats the calendar's weekday headings and colors.
      var section = template.cloneNode(true);
      var columns = Array.from(section.querySelectorAll('.pp-day-content'));
      columns.forEach(function (column) { column.textContent = ''; });
      if (portion) section.querySelector('h3').textContent += ' · ПРОДОЛЖЕНИЕ';
      var free = remainingHeight(container);
      container.appendChild(section);
      var accepted = 0;
      var pageFull = false;
      for (var day = 0; day < sources.length && !pageFull; day++) {
        var items = sources[day];
        while (positions[day] < items.length) {
          var node = items[positions[day]].cloneNode(true);
          columns[day].appendChild(node);
          // Keep the order of days/tasks when a week requires multiple sheets.
          if (section.offsetHeight > free + 1) {
            columns[day].removeChild(node);
            pageFull = true;
            break;
          }
          positions[day]++;
          accepted++;
        }
      }

      if (!accepted) {
        container.removeChild(section);
        // Remaining space after other weeks might be insufficient even for
        // a single task: retry with a clean A4 page, without losing anything.
        if (container.children.length) {
          container = newSheet(month);
          continue;
        }
        throw new Error('Одна запись слишком большая даже для отдельного листа А4. ' +
          'Сократи её текст или раздели на несколько задач.');
      }
      portion++;
      if (positions.some(function (pos, i) { return pos < sources[i].length; })) {
        container = newSheet(month);
      }
    }
    // A week that occupies several sheets is followed by a fresh sheet.
    return container;
  }
  function buildPages(from, to) {
    var records = indexRecords(iso(from), iso(to));
    var monthCount = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      to.getUTCMonth() - from.getUTCMonth() + 1;
    for (var n = 0; n < monthCount; n++) {
      var month = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + n, 1, 12));
      var min = monthStart(month) > from ? monthStart(month) : from;
      var max = monthEnd(month) < to ? monthEnd(month) : to;
      var container = newSheet(month);
      for (var w = monday(min); w <= max; w = add(w, 7)) {
        var template = parseWeek(weekHtml(w, month, from, to, records));
        if (putWholeWeek(template, container)) continue;
        // Prefer moving the ENTIRE week onto a new page.
        if (container.children.length) {
          container = newSheet(month);
          if (putWholeWeek(template, container)) continue;
        }
        // Only a week too large for an empty page can be split.
        container = continueOversizedWeek(template, month, container);
        if (add(w, 7) <= max) container = newSheet(month);
      }
    }
  }
  // Each printed A4 sheet identifies the full calendar period represented
  // by its week sections, including continuation sheets.
  function annotatePageRanges() {
    Array.from(pageList.querySelectorAll('.pp-sheet')).forEach(function (sheet) {
      var weeks = Array.from(sheet.querySelectorAll('.pp-week'));
      if (!weeks.length) return;
      var first = parseDate(weeks[0].getAttribute('data-week-start'));
      var last = parseDate(weeks[weeks.length - 1].getAttribute('data-week-end'));
      if (!first || !last) return;
      var format = function (d) {
        return d.getUTCDate() + ' ' + shorts[d.getUTCMonth()];
      };
      var label = document.createElement('span');
      label.className = 'pp-page-range';
      label.textContent = format(first) + ' — ' + format(last);
      sheet.querySelector('.pp-month').appendChild(label);
    });
  }
  function showMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle('pp-error', Boolean(isError));
  }
  function fitPreview() {
    if (!root || root.hidden || preview.hidden) return;
    var outer = root.querySelector('.pp-pages');
    var width = Math.max(0, outer.clientWidth - 16);
    var tooFull = Array.from(root.querySelectorAll('.pp-sheet')).some(function (sheet) {
      var weeks = sheet.querySelector('.pp-weeks');
      return weeks.scrollHeight > weeks.clientHeight + 3 ||
        sheet.scrollHeight > sheet.clientHeight + 3;
    });
    root.querySelectorAll('.pp-scale-wrap').forEach(function (wrap) {
      var sheet = wrap.querySelector('.pp-sheet');
      var actualWidth = sheet.offsetWidth, actualHeight = sheet.offsetHeight;
      var scale = Math.max(0.20, Math.min(1, width / actualWidth));
      wrap.style.width = (actualWidth * scale) + 'px';
      wrap.style.height = (actualHeight * scale) + 'px';
      sheet.style.transform = 'scale(' + scale + ')';
    });
    printButton.disabled = tooFull;
    showMessage(tooFull
      ? 'Некоторые записи выходят за границу листа А4. Печать отключена, чтобы не обрезать данные.'
      : 'Предпросмотр: ' + pageList.children.length + ' лист(ов) А4. Недели распределены без обрезания задач.',
      tooFull);
  }
  function open() {
    if (!root) return;
    lastFocus = document.activeElement;
    var now = new Date();
    var first = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12));
    startInput.value = iso(first);
    endInput.value = iso(monthEnd(first));
    demoMode = false;
    root.hidden = false;
    preview.hidden = true;
    dateForm.hidden = false;
    showMessage('', false);
    startInput.focus();
  }
  function close() {
    if (!root) return;
    root.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }
  function render(evt) {
    evt.preventDefault();
    var from = parseDate(startInput.value), to = parseDate(endInput.value);
    if (!from || !to || from > to) return showMessage('Укажи корректные даты начала и окончания периода.', true);
    var monthCount = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth() + 1;
    if (monthCount > 120) return showMessage('Выбери период не более 120 месяцев за один раз.', true);
    pageList.innerHTML = '';
    root.classList.add('pp-paginating');
    preview.hidden = false;
    try {
      buildPages(from, to);
      annotatePageRanges();
      updatePrintDates();
    } catch (error) {
      pageList.innerHTML = '';
      preview.hidden = true;
      dateForm.hidden = false;
      root.classList.remove('pp-paginating');
      return showMessage(error.message || 'Не удалось подготовить страницы печати.', true);
    }
    root.classList.remove('pp-paginating');
    dateForm.hidden = true;
    requestAnimationFrame(function () { fitPreview(); printButton.focus(); });
  }
  function init() {
    var openButton = document.getElementById('printBtn');
    if (!openButton || document.getElementById(rootId)) return;
    root = document.createElement('div');
    root.id = rootId;
    root.hidden = true;
    root.innerHTML =
      '<div class="pp-panel" role="dialog" aria-modal="true" aria-labelledby="ppTitle">' +
      '<div class="pp-titlebar"><h2 id="ppTitle">Печать плана</h2><button type="button" id="ppClose" aria-label="Закрыть">×</button></div>' +
      '<form id="ppForm"><p>Выбери период планировщика для печати.</p>' +
      '<div class="pp-input-row"><label>С даты <input id="ppStart" type="date" required></label>' +
      '<label>По дату <input id="ppEnd" type="date" required></label></div>' +
      '<div class="pp-buttons"><button type="button" id="ppCancel">Отмена</button>' +
      '<button type="submit" id="ppPreviewButton">Предварительный просмотр</button></div></form>' +
      '<div class="pp-preview" id="ppPreview" hidden>' +
      '<div class="pp-buttons pp-preview-buttons">' +
      '<button type="button" id="ppBack">Изменить период</button>' +
      '<button type="button" id="ppPrint">Печать</button></div>' +
      '<div class="pp-pages" id="ppPages"></div></div>' +
      '<p class="pp-message" id="ppMessage" role="status" aria-live="polite"></p></div>';
    document.body.appendChild(root);
    startInput = root.querySelector('#ppStart');
    endInput = root.querySelector('#ppEnd');
    dateForm = root.querySelector('#ppForm');
    preview = root.querySelector('#ppPreview');
    pageList = root.querySelector('#ppPages');
    printButton = root.querySelector('#ppPrint');
    previewButton = root.querySelector('#ppPreviewButton');
    message = root.querySelector('#ppMessage');
    openButton.addEventListener('click', open);
    root.querySelector('#ppClose').addEventListener('click', close);
    root.querySelector('#ppCancel').addEventListener('click', close);
    root.querySelector('#ppBack').addEventListener('click', function () {
      preview.hidden = true; dateForm.hidden = false; showMessage('', false); startInput.focus();
    });
    dateForm.addEventListener('submit', render);
    printButton.addEventListener('click', function () {
      if (printButton.disabled || !pageList.children.length) return;
      updatePrintDates();
      window.print();
    });
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    });
    window.addEventListener('resize', fitPreview);
    window.addEventListener('afterprint', function () {
      if (root && !root.hidden && !preview.hidden) fitPreview();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
