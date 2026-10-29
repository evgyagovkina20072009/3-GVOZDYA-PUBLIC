// Веб-приложение «Три гвоздя»
// Модульная архитектура: Шаги 1, 2, 3

/**
 * ============================================================================
 * 1. АВТОМАТИЧЕСКАЯ СМЕНА ТЕМЫ (День с 07:00 до 19:00 / Ночь с 19:00 до 07:00)
 * ============================================================================
 */
function getUrbanThemeForHour(hour) {
  return (hour >= 7 && hour < 19) ? 'theme-day' : 'theme-night';
}

function updateThemeBySystemClock() {
  const currentHour = new Date().getHours();
  const themeClass = getUrbanThemeForHour(currentHour);

  if (!document.body.classList.contains(themeClass)) {
    document.body.classList.remove('theme-day', 'theme-night');
    document.body.classList.add(themeClass);
    console.log(`[Три гвоздя] Тема автоматически обновлена на: ${themeClass} (${currentHour}:00)`);
  }
}

function initThemeScheduler() {
  updateThemeBySystemClock();
  setInterval(updateThemeBySystemClock, 60000);
  window.addEventListener('focus', updateThemeBySystemClock);
}

/**
 * ============================================================================
 * 2. УПРАВЛЕНИЕ ШТОРКОЙ ГОДОВОГО КАЛЕНДАРЯ
 * ============================================================================
 */
function initDrawerHandlers() {
  Step7.initCalendar();
}

/**
 * ============================================================================
 * 3. ПРИВЕТСТВЕННОЕ ОКНО И ОНБОРДИНГ (Раздел 7 ТЗ)
 * ============================================================================
 */
function initOnboarding() {
  const onboardingModal = document.getElementById('onboardingModal');
  const startBtn = document.getElementById('startAppBtn');
  const aboutBtn = document.getElementById('aboutPlannerBtn');

  const nail1 = document.getElementById('onboardingNail1');
  const nail2 = document.getElementById('onboardingNail2');
  const nail3 = document.getElementById('onboardingNail3');

  if (!onboardingModal || !startBtn) return;

  function resetNailsAnimation() {
    if (nail1) nail1.classList.remove('strike-nail-1');
    if (nail2) nail2.classList.remove('strike-nail-2');
    if (nail3) nail3.classList.remove('strike-nail-3');
  }

  function showOnboardingModal() {
    resetNailsAnimation();
    onboardingModal.classList.remove('hidden', 'modal-fade-out');
  }

  function closeOnboardingWithHammerAnimation() {
    if (nail1) nail1.classList.add('strike-nail-1');
    if (nail2) nail2.classList.add('strike-nail-2');
    if (nail3) nail3.classList.add('strike-nail-3');

    try {
      localStorage.setItem('tg_onboarding_viewed', 'true');
    } catch (e) {
      console.warn('[Три гвоздя] Ошибка доступа к LocalStorage:', e);
    }

    setTimeout(() => {
      onboardingModal.classList.add('modal-fade-out');
      setTimeout(() => {
        onboardingModal.classList.add('hidden');
        onboardingModal.classList.remove('modal-fade-out');
        resetNailsAnimation();
      }, 450);
    }, 750);
  }

  let isViewed = false;
  try {
    isViewed = localStorage.getItem('tg_onboarding_viewed') === 'true';
  } catch (e) {
    isViewed = false;
  }

  if (!isViewed) {
    showOnboardingModal();
  }

  startBtn.addEventListener('click', closeOnboardingWithHammerAnimation);

  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
      showOnboardingModal();
    });
  }
}

/**
 * ============================================================================
 * 4. ХРАНИЛИЩЕ ДАННЫХ LOCALSTORAGE (Шаг 2: tg_tasks и tg_secrets)
 * ============================================================================
 */
const STORAGE_KEYS = {
  TASKS: 'tg_tasks',
  SECRETS: 'tg_secrets',
  ONBOARDING: 'tg_onboarding_viewed'
};

const StorageAPI = {
  _read(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`[StorageAPI] Ошибка чтения ключа ${key}:`, e);
      return fallback;
    }
  },

  _write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`[StorageAPI] Ошибка записи ключа ${key}:`, e);
      return false;
    }
  },

  getTasks() {
    return this._read(STORAGE_KEYS.TASKS, []);
  },

  getTasksByDate(dateStr) {
    const tasks = this.getTasks();
    return tasks.filter(t => t.date === dateStr);
  },

  // Для будущего раздела «Невыполненные»: запись остаётся в общем хранилище
  // вместе с первоначальными данными и полной историей переносов/правок.
  getFailedTasks() {
    return this.getTasks().filter(task => task.failed === true);
  },

  getCompletedTasks() {
    return this.getTasks().filter(task => task.completed === true && task.failed !== true);
  },

  getTaskById(id) {
    const tasks = this.getTasks();
    return tasks.find(t => String(t.id) === String(id)) || null;
  },

  addTask({ title, date, time = null, priority = 'high' }) {
    if (!title || !date) {
      throw new Error('[StorageAPI] Название и дата задачи обязательны');
    }

    const tasks = this.getTasks();
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);

    const newTask = {
      id: String(Date.now() + Math.random().toString(36).substring(2, 7)),
      title: title.trim(),
      date,
      originalDate: date,
      originalTime: time ? time.trim() : null,
      createdAt: now.toISOString(),
      completedAt: null,
      time: time ? time.trim() : null,
      priority: ['high', 'medium', 'flexible'].includes(priority) ? priority : 'high',
      completed: false,
      failed: false,
      postponedHistory: [],
      editHistory: [
        {
          timestamp,
          type: 'text_edit',
          details: `Создана задача: "${title.trim()}"`
        }
      ]
    };

    tasks.push(newTask);
    this._write(STORAGE_KEYS.TASKS, tasks);
    return newTask;
  },

  updateTask(id, updates) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => String(t.id) === String(id));
    if (index === -1) return null;

    const task = tasks[index];
    // После появления 😈 дата, время и остальные свойства фиксируются.
    // Единственное допустимое изменение — отметить задачу выполненной
    // до окончания назначенного дня; нельзя обойти запрет через API.
    if (task.failed) return null;
    if (DateUtils.isDevilTask(task)) {
      if (!DateUtils.canCompleteDevilTask(task) || !updates ||
          Object.keys(updates).length !== 1 || updates.completed !== true) return null;
    } else if (task.completed && !DateUtils.isTaskEditable(task)) {
      // У обычной досрочно выполненной задачи редактирование до срока остаётся.
      return null;
    }
    if (!Array.isArray(task.postponedHistory)) task.postponedHistory = [];
    if (!Array.isArray(task.editHistory)) task.editHistory = [];
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);

    if (updates.title !== undefined && updates.title.trim() !== task.title) {
      const oldTitle = task.title;
      task.title = updates.title.trim();
      task.editHistory.push({
        timestamp,
        type: 'text_edit',
        details: `Текст изменён: "${oldTitle}" -> "${task.title}"`
      });
    }

    if (updates.date !== undefined && updates.date !== task.date) {
      // Исправлять дату можно и назад, но только в ещё не наступивший срок.
      if (!DateUtils.isValidISODate(updates.date) ||
          !DateUtils.isScheduledTimeAhead({ ...task, date: updates.date,
            time: updates.time !== undefined ? updates.time : task.time })) {
        return null;
      }
      const oldDate = task.date;
      const isCorrection = updates.date < oldDate || task.postponedHistory.length >= 4;
      if (!isCorrection) task.postponedHistory.push(oldDate);
      task.date = updates.date;
      task.editHistory.push({
        timestamp,
        type: isCorrection ? 'date_correction' : 'postponed',
        details: `${isCorrection ? 'Уточнение даты' : 'Сдвиг даты'}: с ${oldDate} на ${task.date}`
      });
    }

    if (updates.time !== undefined) {
      task.time = updates.time ? updates.time.trim() : null;
    }

    if (updates.priority !== undefined && ['high', 'medium', 'flexible'].includes(updates.priority)) {
      task.priority = updates.priority;
    }

    // Изменяем статус только при реальном переключении; перенос не создаётся.
    if (updates.completed === true && !task.completed) {
      task.completed = true;
      task.completedAt = now.toISOString();
      task.editHistory.push({
        timestamp,
        type: 'completed',
        details: 'Дело отмечено выполненным. До назначенного срока отметку можно снять.'
      });
    } else if (updates.completed === false && task.completed) {
      task.completed = false;
      task.completedAt = null;
      task.editHistory.push({
        timestamp,
        type: 'completion_cancelled',
        details: 'Отметка о выполнении снята до наступления срока.'
      });
    }

    tasks[index] = task;
    this._write(STORAGE_KEYS.TASKS, tasks);
    return task;
  },

  toggleTaskCompleted(id) {
    const task = this.getTaskById(id);
    if (!task || task.failed) return null;
    if (DateUtils.isDevilTask(task)) {
      // При 😈 разрешено только однократное выполнение до конца суток.
      if (!DateUtils.canCompleteDevilTask(task)) return null;
      return this.updateTask(id, { completed: true });
    }
    if (task.completed && !DateUtils.isTaskEditable(task)) return null;
    return this.updateTask(id, { completed: !task.completed });
  },

  deleteTask(id) {
    const tasks = this.getTasks();
    const target = tasks.find(t => String(t.id) === String(id));
    if (!target || target.completed || target.failed || !DateUtils.isTaskEditable(target)) return false;
    const filtered = tasks.filter(t => String(t.id) !== String(id));
    if (filtered.length === tasks.length) return false;
    this._write(STORAGE_KEYS.TASKS, filtered);
    return true;
  },

  // Новый перенос добавляет гвоздь; исправление будущей даты сохраняет прежний счётчик.
  transferTask(id, targetDate, reason = 'manual') {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => String(t.id) === String(id));
    if (index < 0) return null;
    const task = tasks[index];
    // Нельзя изменять уже наступивший срок или назначать задачу в прошлое.
    if (task.completed || task.failed || DateUtils.isDevilTask(task) ||
        !DateUtils.isTaskEditable(task) ||
        !DateUtils.isValidISODate(targetDate) || targetDate === task.date ||
        !DateUtils.isScheduledTimeAhead({ ...task, date: targetDate })) return null;

    const oldDate = task.date;
    if (!Array.isArray(task.postponedHistory)) task.postponedHistory = [];
    if (!Array.isArray(task.editHistory)) task.editHistory = [];
    // До 4-го переноса возврат на более раннюю будущую дату — исправление.
    // После 4-го переноса дата уже окончательно зафиксирована.
    const isCorrection = targetDate < oldDate || reason === 'correction';
    task.date = targetDate;
    if (!isCorrection) task.postponedHistory.push(oldDate);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const prefix = reason === 'auto' ? 'Автоматический перенос' : 'Ручной перенос';
    task.editHistory.push({
      timestamp,
      type: isCorrection ? 'date_correction' : 'postponed',
      details: isCorrection
        ? `Уточнение назначенной даты: с ${oldDate} на ${targetDate} (число переносов не изменено)`
        : `${prefix}: с ${oldDate} на ${targetDate}`
    });
    if (!this._write(STORAGE_KEYS.TASKS, tasks)) return null;
    return task;
  },

  // Обычные невыполненные дела переносим по наступлении назначенного часа,
  // не ожидая следующей полуночи. При возобновлении после пропуска дней
  // выбираем ближайший ещё не прошедший день с тем же временем и добавляем
  // только один перенос. Дело с 😈, напротив, ждёт до конца назначенных суток.
  rollOverUnfinishedTasks(todayISO = DateUtils.getTodayISO()) {
    if (!DateUtils.isValidISODate(todayISO)) return 0;
    const tasks = this.getTasks();
    let changed = 0;
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);
    tasks.forEach(task => {
      if (!task || task.completed || task.failed || !DateUtils.isValidISODate(task.date) || task.date > todayISO) return;
      if (!Array.isArray(task.postponedHistory)) task.postponedHistory = [];
      if (!Array.isArray(task.editHistory)) task.editHistory = [];

      if (task.postponedHistory.length >= 4) {
        // После четвёртого переноса — никакого дальнейшего автопереноса.
        // Невыполненной окончательно становится только на следующий день.
        if (task.date >= todayISO) return;
        task.failed = true;
        task.failedAt = `${task.date}T23:59:59`;
        task.editHistory.push({
          timestamp,
          type: 'failed',
          details: `Окончательно не выполнено: до конца ${task.date} задача не была закрыта. Переносов: ${task.postponedHistory.length}.`
        });
        changed++;
        return;
      }

      // У задачи без времени срок — конец дня, как и раньше.
      const scheduled = task.time
        ? new Date(`${task.date}T${task.time}:00`)
        : new Date(`${task.date}T23:59:59.999`);
      if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() > now.getTime()) return;

      // Если сегодня тот же час ещё впереди — переносим на сегодня;
      // иначе на завтра. История и количество гвоздей не дублируются.
      let targetDate = todayISO;
      if (task.time) {
        const todayScheduled = new Date(`${todayISO}T${task.time}:00`);
        if (!Number.isFinite(todayScheduled.getTime())) return;
        if (todayScheduled.getTime() <= now.getTime()) {
          targetDate = DateUtils.addDaysISO(todayISO, 1);
        }
      }
      if (!targetDate || targetDate <= task.date) return;
      const oldDate = task.date;
      task.date = targetDate;
      task.postponedHistory.push(oldDate);
      task.editHistory.push({
        timestamp,
        type: 'postponed',
        details: `Автоматический перенос по сроку: с ${oldDate} на ${targetDate}`
      });
      changed++;
    });
    if (!changed) return 0;
    return this._write(STORAGE_KEYS.TASKS, tasks) ? changed : 0;
  },

  getSecrets() {
    return this._read(STORAGE_KEYS.SECRETS, {});
  },

  getSecretsByDate(dateStr) {
    const all = this.getSecrets();
    return Array.isArray(all[dateStr]) ? all[dateStr] : [];
  },

  addSecret(dateStr, { icon, text = '' }) {
    if (!dateStr || !icon) {
      throw new Error('[StorageAPI] Дата и иконка обязательны для секрета');
    }

    const all = this.getSecrets();
    const daySecrets = Array.isArray(all[dateStr]) ? all[dateStr] : [];

    if (daySecrets.length >= 5) {
      console.warn(`[StorageAPI] Достигнут лимит (5) секретных напоминаний на дату ${dateStr}`);
      return null;
    }

    const newSecret = {
      id: String(Date.now() + Math.random().toString(36).substring(2, 6)),
      icon: icon.trim(),
      text: (text || '').trim()
    };

    daySecrets.push(newSecret);
    all[dateStr] = daySecrets;
    this._write(STORAGE_KEYS.SECRETS, all);
    return newSecret;
  },

  updateSecret(dateStr, secretId, { icon, text }) {
    const all = this.getSecrets();
    const daySecrets = Array.isArray(all[dateStr]) ? all[dateStr] : [];
    const index = daySecrets.findIndex(s => String(s.id) === String(secretId));
    if (index === -1) return null;

    if (icon !== undefined) daySecrets[index].icon = icon.trim();
    if (text !== undefined) daySecrets[index].text = text.trim();

    all[dateStr] = daySecrets;
    this._write(STORAGE_KEYS.SECRETS, all);
    return daySecrets[index];
  },

  deleteSecret(dateStr, secretId) {
    const all = this.getSecrets();
    if (!Array.isArray(all[dateStr])) return false;

    const initialLength = all[dateStr].length;
    all[dateStr] = all[dateStr].filter(s => String(s.id) !== String(secretId));

    if (all[dateStr].length === initialLength) return false;

    if (all[dateStr].length === 0) {
      delete all[dateStr];
    }

    this._write(STORAGE_KEYS.SECRETS, all);
    return true;
  },

  _clearAll() {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.SECRETS);
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING);
  }
};

/**
 * ============================================================================
 * 5. КАЛЕНДАРНАЯ МАТЕМАТИКА (DateUtils)
 * ============================================================================
 */
const DateUtils = {
  DAY_NAMES: [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
    'Воскресенье'
  ],

  MONTH_NAMES_GENITIVE: [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ],

  MONTH_NAMES_SHORT: [
    'янв', 'фев', 'мар', 'апр', 'май', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
  ],

  formatISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  getMonday(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0 - вс, 1 - пн, ..., 6 - сб
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  getWeekDays(mondayDate) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i);
      nextDay.setHours(0, 0, 0, 0);
      days.push(nextDay);
    }
    return days;
  },

  isValidISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  },

  addDaysISO(value, days) {
    if (!this.isValidISODate(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    return this.formatISO(new Date(y, m - 1, d + days));
  },

  getTodayISO() {
    return this.formatISO(new Date());
  },

  // Проверка официальных праздничных дней РФ (ст. 112 ТК РФ)
  isRussianHoliday(date) {
    const m = date.getMonth() + 1; // 1 - 12
    const d = date.getDate();

    if (m === 1 && d >= 1 && d <= 8) return true;
    if (m === 2 && d === 23) return true;
    if (m === 3 && d === 8) return true;
    if (m === 5 && d === 1) return true;
    if (m === 5 && d === 9) return true;
    if (m === 6 && d === 12) return true;
    if (m === 11 && d === 4) return true;

    return false;
  },

  // Строгая проверка назначенного времени: новую дату нельзя поставить в прошлое.
  isScheduledTimeAhead(task) {
    if (!task || !this.isValidISODate(task.date)) return false;
    const deadline = task.time
      ? new Date(`${task.date}T${task.time}:00`)
      : new Date(`${task.date}T23:59:59.999`);
    return Number.isFinite(deadline.getTime()) && deadline.getTime() > Date.now();
  },

  isDevilTask(task) {
    return Boolean(task && Array.isArray(task.postponedHistory) &&
      task.postponedHistory.length >= 4);
  },

  // С 😈 есть шанс только поставить галочку до полуночи назначенного дня.
  // Дату, время, текст и любые другие свойства править уже нельзя.
  canCompleteDevilTask(task) {
    if (!this.isDevilTask(task) || task.failed || task.completed ||
        !this.isValidISODate(task.date)) return false;
    const endOfDay = new Date(`${task.date}T23:59:59.999`).getTime();
    return Number.isFinite(endOfDay) && Date.now() <= endOfDay;
  },

  // Для обычных задач сохраняется редактирование до назначенного срока.
  isTaskEditable(task) {
    if (!task || task.failed || !this.isValidISODate(task.date) ||
        this.isDevilTask(task)) return false;
    return this.isScheduledTimeAhead(task);
  },

  // Сортировка дел дня в строгой хронологии от раннего времени к более позднему
  sortTasksForDay(tasks) {
    const priorityWeights = { high: 1, medium: 2, flexible: 3 };

    return [...tasks].sort((a, b) => {
      // Выполненные дела смещаются в конец списка
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Оба дела имеют время: сортируем по возрастанию времени (HH:MM)
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }

      // Дела со временем идут раньше дел без времени
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;

      // Дела без времени сортируются по приоритету: high -> medium -> flexible
      const pA = priorityWeights[a.priority] || 2;
      const pB = priorityWeights[b.priority] || 2;
      if (pA !== pB) return pA - pB;

      return String(a.id).localeCompare(String(b.id));
    });
  },

  formatRange(mondayDate) {
    const sundayDate = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + 6);
    const mDay = mondayDate.getDate();
    const sDay = sundayDate.getDate();
    const mMonth = this.MONTH_NAMES_GENITIVE[mondayDate.getMonth()];
    const sMonth = this.MONTH_NAMES_GENITIVE[sundayDate.getMonth()];
    const mYear = mondayDate.getFullYear();
    const sYear = sundayDate.getFullYear();

    if (mYear !== sYear) {
      return `${mDay} ${mMonth} ${mYear} г. - ${sDay} ${sMonth} ${sYear} г.`;
    }
    if (mondayDate.getMonth() !== sundayDate.getMonth()) {
      return `${mDay} ${mMonth} - ${sDay} ${sMonth} ${sYear} г.`;
    }
    return `${mDay} - ${sDay} ${mMonth} ${sYear} г.`;
  }
};

function showToast(message) {
  let toast = document.querySelector('.toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('toast-fade', 'hidden');

  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    toast.classList.add('toast-fade');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 400);
  }, 2600);
}

/**
 * ============================================================================
 * ШАГ 6. АРХИВЫ, РЕЗЕРВНЫЕ КОПИИ И ИТОГИ ДНЯ
 * ============================================================================
 */
const Step6 = {
  // Дата первого назначения не меняется при переносах. Для старых задач
  // восстанавливаем её из истории шагов 1–5, если поле ещё не существовало.
  originalDate(task) {
    if (DateUtils.isValidISODate(task.originalDate)) return task.originalDate;
    const history = Array.isArray(task.editHistory) ? task.editHistory : [];
    for (const item of history) {
      if (item && (item.type === 'postponed' || item.type === 'date_correction')) {
        const found = String(item.details || '').match(/с\s+(\d{4}-\d{2}-\d{2})\s+на/);
        if (found && DateUtils.isValidISODate(found[1])) return found[1];
      }
    }
    if (Array.isArray(task.postponedHistory) && task.postponedHistory.length &&
        DateUtils.isValidISODate(task.postponedHistory[0])) return task.postponedHistory[0];
    return task.date;
  },

  originalTime(task) {
    return typeof task.originalTime === 'string' ? task.originalTime : (task.time || '');
  },

  createdAt(task) {
    if (task.createdAt) return task.createdAt;
    const first = Array.isArray(task.editHistory) ? task.editHistory[0] : null;
    return first && first.timestamp ? first.timestamp : '';
  },

  finishedAt(task) {
    if (task.failed) return task.failedAt || '';
    if (task.completedAt && task.completed) return task.completedAt;
    const history = Array.isArray(task.editHistory) ? task.editHistory : [];
    const lastCompletion = [...history].reverse().find(item => item && item.type === 'completed');
    return lastCompletion ? (lastCompletion.timestamp || '') : '';
  },

  displayDate(iso) {
    if (!iso) return 'Не зафиксирована';
    const text = String(iso);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [y,m,d] = text.split('-');
      return `${d}.${m}.${y}`;
    }
    const parsed = new Date(text.includes('T') ? text : text.replace(' ', 'T') + 'Z');
    return Number.isFinite(parsed.getTime())
      ? parsed.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : text;
  },

  sortArchive(tasks) {
    return [...tasks].sort((a, b) => {
      const byDate = String(this.originalDate(b) || '').localeCompare(String(this.originalDate(a) || ''));
      if (byDate !== 0) return byDate;
      const byTime = String(this.originalTime(b) || '').localeCompare(String(this.originalTime(a) || ''));
      if (byTime !== 0) return byTime;
      const byCreated = String(this.createdAt(b) || '').localeCompare(String(this.createdAt(a) || ''));
      return byCreated || String(b.id).localeCompare(String(a.id));
    });
  },

  // Поздравление формируется только после полуночи завершившегося дня.
  // В этот день должны быть выполнены ВСЕ дела без единого переноса —
  // как из него, так и на него. Досрочное выполнение будущего дня
  // поздравления не вызывает.
  perfectDay(dateISO, allTasks) {
    if (!DateUtils.isValidISODate(dateISO) || dateISO >= DateUtils.getTodayISO()) return false;
    const assignedToDate = allTasks.filter(task => task.date === dateISO);
    const originallyAssigned = allTasks.filter(task => this.originalDate(task) === dateISO);
    if (assignedToDate.length === 0 || originallyAssigned.length === 0) return false;

    const noMoves = task =>
      (!Array.isArray(task.postponedHistory) || task.postponedHistory.length === 0) &&
      !(Array.isArray(task.editHistory) && task.editHistory.some(item =>
        item && (item.type === 'postponed' || item.type === 'date_correction')));
    const completedWithoutMoves = task =>
      task.completed === true && task.failed !== true && noMoves(task);

    // Все первоначально поставленные на этот день дела должны остаться
    // на нём и быть выполнены; все дела, оказавшиеся здесь, также должны
    // быть выполнены и никогда не переноситься.
    return originallyAssigned.every(task =>
      task.date === dateISO && completedWithoutMoves(task)) &&
      assignedToDate.every(completedWithoutMoves);
  },

  messageForDay(dateISO) {
    const messages = [
      'Отличная работа! Всё задуманное выполнено! 👍',
      'Все цели дня достигнуты. Так держать! 🌟',
      'Сегодня ты победил хаос! 🔨'
    ];
    const hash = [...dateISO].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return messages[hash % messages.length];
  },

  makeDownload(filename, content, type) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  makeBackup() {
    return {
      app: 'tri-gvozdya',
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: StorageAPI.getTasks(),
      secrets: StorageAPI.getSecrets()
    };
  },

  // Не доверяем загруженным данным: сначала проверяем всю структуру, затем
  // показываем предупреждение. Никакой eval, HTML из JSON не выполняется.
  validateBackup(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        data.app !== 'tri-gvozdya' || data.version !== 1 ||
        !Array.isArray(data.tasks) || !data.secrets ||
        typeof data.secrets !== 'object' || Array.isArray(data.secrets)) {
      throw new Error('Это не резервная копия планировщика «3 гвоздя».');
    }
    const ids = new Set();
    for (const task of data.tasks) {
      if (!task || typeof task !== 'object' || Array.isArray(task) ||
          !['string','number'].includes(typeof task.id) || !String(task.id).trim() ||
          ids.has(String(task.id)) || typeof task.title !== 'string' || !task.title.trim() ||
          !DateUtils.isValidISODate(task.date) || typeof task.completed !== 'boolean' ||
          (task.failed !== undefined && typeof task.failed !== 'boolean') ||
          !Array.isArray(task.postponedHistory) || !Array.isArray(task.editHistory)) {
        throw new Error('Файл содержит некорректные задачи. Данные не изменены.');
      }
      ids.add(String(task.id));
      if ((task.time != null && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(task.time))) ||
          task.postponedHistory.some(d => !DateUtils.isValidISODate(d)) ||
          task.editHistory.some(e => !e || typeof e !== 'object' || Array.isArray(e) ||
            typeof e.type !== 'string' || typeof e.details !== 'string' || typeof e.timestamp !== 'string') ||
          (task.originalDate !== undefined && !DateUtils.isValidISODate(task.originalDate)) ||
          (task.originalTime != null && task.originalTime !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.originalTime))) {
        throw new Error('Нарушена история или дата задачи. Данные не изменены.');
      }
    }
    for (const [date, reminders] of Object.entries(data.secrets)) {
      if (!DateUtils.isValidISODate(date) || !Array.isArray(reminders) || reminders.length > 10 ||
          reminders.some(s => !s || typeof s !== 'object' || Array.isArray(s) ||
            !['string','number'].includes(typeof s.id) ||
            typeof s.icon !== 'string' || !s.icon || typeof s.text !== 'string')) {
        throw new Error('Файл содержит некорректные напоминания. Данные не изменены.');
      }
    }
    return {tasks: data.tasks, secrets: data.secrets};
  },

  restoreBackup(data) {
    const clean = this.validateBackup(data);
    const oldTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    const oldSecrets = localStorage.getItem(STORAGE_KEYS.SECRETS);
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(clean.tasks));
      localStorage.setItem(STORAGE_KEYS.SECRETS, JSON.stringify(clean.secrets));
    } catch (e) {
      // Если сохранение второго ключа не удалось, откатываем оба значения.
      if (oldTasks === null) localStorage.removeItem(STORAGE_KEYS.TASKS);
      else localStorage.setItem(STORAGE_KEYS.TASKS, oldTasks);
      if (oldSecrets === null) localStorage.removeItem(STORAGE_KEYS.SECRETS);
      else localStorage.setItem(STORAGE_KEYS.SECRETS, oldSecrets);
      throw new Error('Не удалось записать данные в браузер. Старые данные восстановлены.');
    }
    WeekGridManager.expandedDays.clear();
    WeekGridManager.currentMonday = DateUtils.getMonday(new Date());
    // Не запускаем автоматический перенос в момент импорта: сначала
    // восстановить ровно те данные, которые были в файле.
    WeekGridManager.render();
  },

  clearPlanner() {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.SECRETS);
    WeekGridManager.expandedDays.clear();
    WeekGridManager.currentMonday = DateUtils.getMonday(new Date());
    WeekGridManager.render();
  },

  planForPeriod(start, end) {
    if (!DateUtils.isValidISODate(start) || !DateUtils.isValidISODate(end) || start > end) {
      throw new Error('Проверь начало и конец периода.');
    }
    const lines = [`3 ГВОЗДЯ — ПЛАН ЗА ПЕРИОД ${this.displayDate(start)} — ${this.displayDate(end)}`, `Создано: ${new Date().toLocaleString('ru-RU')}`, ''];
    const tasks = StorageAPI.getTasks().filter(t => t.date >= start && t.date <= end)
      .sort((a,b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')));
    const secrets = StorageAPI.getSecrets();
    const dateSet = new Set([...tasks.map(t=>t.date), ...Object.keys(secrets).filter(d=>d>=start && d<=end)]);
    const dates = [...dateSet].sort();
    if (!dates.length) lines.push('Записей за выбранный период нет.');
    for (const date of dates) {
      lines.push(`=== ${this.displayDate(date)} ===`);
      for (const task of tasks.filter(t=>t.date===date)) {
        const status = task.failed ? 'НЕ ВЫПОЛНЕНО 😈' : task.completed ? 'ВЫПОЛНЕНО' : 'ЗАПЛАНИРОВАНО';
        lines.push(`• ${task.time || 'без времени'} — ${task.title} [${status}]`);
        lines.push(`  Первоначальная дата: ${this.displayDate(this.originalDate(task))}; переносов: ${(task.postponedHistory || []).length}`);
        for (const item of (task.editHistory || [])) lines.push(`  - ${item.timestamp}: ${item.details}`);
      }
      for (const note of (Array.isArray(secrets[date]) ? secrets[date] : [])) {
        lines.push(`  Секретное напоминание ${note.icon}: ${note.text || 'без текста'}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  },

  init() {
    const menuButton = document.getElementById('dataMenuBtn');
    const menu = document.getElementById('dataDropdown');
    const hideMenu = () => {
      menu.classList.add('hidden');
      menuButton.setAttribute('aria-expanded', 'false');
    };
    menuButton.addEventListener('click', event => {
      event.stopPropagation();
      const opening = menu.classList.contains('hidden');
      menu.classList.toggle('hidden', !opening);
      menuButton.setAttribute('aria-expanded', String(opening));
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.data-menu-wrapper')) hideMenu();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { hideMenu(); this.closeArchive(); this.closePeriod(); this.closeConfirm(); } });
    menu.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
      hideMenu();
      const action = button.dataset.action;
      if (action === 'backup') {
        this.makeDownload(`3-gvozdya-backup-${DateUtils.getTodayISO()}.json`, JSON.stringify(this.makeBackup(), null, 2), 'application/json;charset=utf-8');
        showToast('Резервная копия JSON сохранена на компьютер.');
      } else if (action === 'period') this.openPeriod();
      else if (action === 'restore') document.getElementById('step6ImportInput').click();
      else if (action === 'clear') this.askConfirm('Полностью очистить планировщик?',
        'Все задачи, история, статусы и секретные напоминания будут удалены без возможности отмены. Лучше сначала сохранить резервную копию.',
        () => { this.clearPlanner(); showToast('Все данные планировщика очищены.'); });
    }));

    document.getElementById('archiveCompletedBtn').addEventListener('click', () => this.openArchive('completed'));
    document.getElementById('archiveFailedBtn').addEventListener('click', () => this.openArchive('failed'));
    document.getElementById('closeArchiveBtn').addEventListener('click', () => this.closeArchive());
    document.getElementById('archiveCloseBottomBtn').addEventListener('click', () => this.closeArchive());
    document.getElementById('archiveModal').addEventListener('click', e => {
      if (e.target.id === 'archiveModal') this.closeArchive();
    });

    document.getElementById('closePeriodBtn').addEventListener('click', () => this.closePeriod());
    document.getElementById('cancelPeriodBtn').addEventListener('click', () => this.closePeriod());
    document.getElementById('periodModal').addEventListener('click', e => {
      if (e.target.id === 'periodModal') this.closePeriod();
    });
    document.getElementById('periodForm').addEventListener('submit', e => {
      e.preventDefault();
      try {
        const start = document.getElementById('periodStart').value;
        const end = document.getElementById('periodEnd').value;
        const content = this.planForPeriod(start, end);
        this.makeDownload(`3-gvozdya-plan-${start}_${end}.txt`, '\uFEFF' + content, 'text/plain;charset=utf-8');
        this.closePeriod();
        showToast('План за период сохранён в текстовый файл.');
      } catch (err) { showToast(err.message); }
    });

    const fileInput = document.getElementById('step6ImportInput');
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      if (file.size > 25 * 1024 * 1024) return showToast('Файл слишком большой (максимум 25 МБ).');
      try {
        const parsed = JSON.parse(await file.text());
        const checked = this.validateBackup(parsed);
        this.askConfirm('Восстановить планировщик из файла?',
          `Файл: ${file.name}. Текущие задачи, история и секретные напоминания будут полностью заменены. Сначала сохрани текущую резервную копию, если она нужна.`,
          () => {
            try { this.restoreBackup({app:'tri-gvozdya', version:1, ...checked}); showToast('Данные успешно восстановлены.'); }
            catch (err) { showToast(err.message); }
          });
      } catch (err) { showToast(err instanceof SyntaxError ? 'Файл не является корректным JSON. Данные не изменены.' : err.message); }
    });

    document.getElementById('dataConfirmNoBtn').addEventListener('click', () => this.closeConfirm());
    document.getElementById('dataConfirmYesBtn').addEventListener('click', () => {
      const action = this.pendingConfirmation;
      this.closeConfirm();
      if (typeof action === 'function') action();
    });
    document.getElementById('dataConfirmModal').addEventListener('click', e => {
      if (e.target.id === 'dataConfirmModal') this.closeConfirm();
    });
  },

  openArchive(mode) {
    const tasks = mode === 'completed' ? StorageAPI.getCompletedTasks() : StorageAPI.getFailedTasks();
    const sorted = this.sortArchive(tasks);
    const box = document.getElementById('archiveList');
    const title = document.getElementById('archiveTitle');
    title.textContent = mode === 'completed' ? '👍 Выполненные дела' : '😈 Невыполненные дела';
    box.replaceChildren();
    if (!sorted.length) {
      const empty = document.createElement('p');
      empty.className = 'archive-empty';
      empty.textContent = mode === 'completed' ? 'Завершённых дел пока нет.' : 'Окончательно невыполненных дел пока нет.';
      box.appendChild(empty);
    }
    for (const task of sorted) {
      const item = document.createElement('article');
      item.className = 'archive-record';
      const headline = document.createElement('div');
      headline.className = 'archive-record-title';
      headline.textContent = task.title;
      const info = document.createElement('div');
      info.className = 'archive-record-info';
      const originally = this.originalDate(task);
      const n = Array.isArray(task.postponedHistory) ? task.postponedHistory.length : 0;
      const facts = [
        `Первоначально назначено: ${this.displayDate(originally)}${this.originalTime(task) ? ' в ' + this.originalTime(task) : ''}`,
        `Последний срок: ${this.displayDate(task.date)}${task.time ? ' в ' + task.time : ''}`,
        `${mode === 'completed' ? 'Отмечено выполненным' : 'Окончательно не выполнено'}: ${this.displayDate(this.finishedAt(task))}`,
        `Переносов: ${n}`
      ];
      facts.forEach(value => {
        const line = document.createElement('span');
        line.textContent = value;
        info.appendChild(line);
      });
      const historyButton = document.createElement('button');
      historyButton.type = 'button';
      historyButton.className = 'btn btn-secondary archive-history-btn';
      historyButton.textContent = '⭐ Вся история';
      historyButton.addEventListener('click', () => WeekGridManager.openHistoryModal(task.id));
      item.append(headline, info, historyButton);
      box.appendChild(item);
    }
    document.getElementById('archiveModal').classList.remove('hidden');
  },

  closeArchive() { document.getElementById('archiveModal').classList.add('hidden'); },
  openPeriod() {
    const monday = DateUtils.getMonday(new Date());
    document.getElementById('periodStart').value = DateUtils.formatISO(monday);
    document.getElementById('periodEnd').value = DateUtils.addDaysISO(DateUtils.formatISO(monday), 6);
    document.getElementById('periodModal').classList.remove('hidden');
  },
  closePeriod() { document.getElementById('periodModal').classList.add('hidden'); },
  pendingConfirmation: null,
  askConfirm(title, description, action) {
    this.pendingConfirmation = action;
    document.getElementById('dataConfirmTitle').textContent = title;
    document.getElementById('dataConfirmDescription').textContent = description;
    document.getElementById('dataConfirmModal').classList.remove('hidden');
  },
  closeConfirm() {
    document.getElementById('dataConfirmModal').classList.add('hidden');
    this.pendingConfirmation = null;
  }
};

/**
 * ============================================================================
 * ШАГ 7. СЕКРЕТНЫЕ НАПОМИНАНИЯ И ГОДОВОЙ КАЛЕНДАРЬ
 * ============================================================================
 */
const Step7 = {
  MAX_SECRETS: 5,
  MEDICAL_ICON: 'medical-cross',
  ICONS: ['💧', 'medical-cross', '❤️', '⭐', '🔥', '☕', '🌸', '🍀', '🎯', '💡'],
  MONTHS: ['Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  selectedDate: null,
  calendarYear: new Date().getFullYear(),
  activeSecret: null,
  editingSecret: null,
  selectedIcon: '💧',

  iconNode(icon) {
    if (icon === this.MEDICAL_ICON || icon === '❄️') {
      const wrap = document.createElement('span');
      wrap.className = 'secret-medical-icon';
      wrap.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="23" fill="#fff" stroke="#cbd5e1" stroke-width="0.7"/><path d="M20 11H28V20H37V28H28V37H20V28H11V20H20Z" fill="#d71920"/></svg>';
      return wrap;
    }
    const text = document.createElement('span');
    text.textContent = icon;
    text.className = 'secret-emoji';
    return text;
  },

  init() {
    const modal = document.getElementById('secretEditorModal');
    const form = document.getElementById('secretEditorForm');
    if (!modal || !form) return;
    const close = () => modal.classList.add('hidden');
    document.getElementById('closeSecretEditorBtn').addEventListener('click', close);
    document.getElementById('cancelSecretEditorBtn').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = document.getElementById('secretEditorText').value.trim();
      const target = this.editingSecret;
      if (!target || !this.selectedIcon) return;
      let saved;
      if (target.id === null) {
        saved = StorageAPI.addSecret(target.date, {icon: this.selectedIcon, text});
      } else {
        saved = StorageAPI.updateSecret(target.date, target.id, {icon: this.selectedIcon, text});
      }
      if (!saved) { showToast('Не удалось сохранить напоминание. Проверь лимит 5 секретов.'); return; }
      close();
      this.closePopover();
      WeekGridManager.expandedDays.add(target.date);
      WeekGridManager.render();
    });
    // Close the transient popover on an outside click or Escape.
    document.addEventListener('click', e => {
      const popup = document.getElementById('secretPopover');
      if (!popup || popup.classList.contains('hidden')) return;
      if (!popup.contains(e.target) && !e.target.closest('.secret-icon-button')) this.closePopover();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this.closePopover(); close(); }
    });
    window.addEventListener('resize', () => this.closePopover());
  },

  renderSecrets(container, date) {
    const secrets = StorageAPI.getSecretsByDate(date);
    const row = document.createElement('div');
    row.className = 'secret-icons-row';
    secrets.forEach(secret => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'secret-icon-button';
      btn.title = 'Посмотреть секретное напоминание';
      btn.setAttribute('aria-label', 'Секретное напоминание');
      btn.appendChild(this.iconNode(secret.icon));
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (this.activeSecret && String(this.activeSecret.id) === String(secret.id) &&
            this.activeSecret.date === date) this.closePopover();
        else this.openPopover(btn, date, secret);
      });
      row.appendChild(btn);
    });
    if (secrets.length < this.MAX_SECRETS) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'secret-add-button';
      if (secrets.length === 0) {
        add.append(document.createTextNode('+ '));
        const key = document.createElement('span');
        key.textContent = '🔑';
        add.appendChild(key);
        add.setAttribute('aria-label', 'Добавить первый секрет');
      } else {
        add.textContent = '+';
        add.setAttribute('aria-label', 'Добавить секрет');
      }
      add.addEventListener('click', e => { e.stopPropagation(); this.openEditor(date); });
      row.appendChild(add);
    }
    container.appendChild(row);
    container.addEventListener('click', e => {
      e.stopPropagation();
      if (!e.target.closest('button')) this.closePopover();
    });
  },

  closePopover() {
    document.getElementById('secretPopover')?.classList.add('hidden');
    this.activeSecret = null;
  },

  openPopover(anchor, date, secret) {
    const popup = document.getElementById('secretPopover');
    if (!popup) return;
    this.activeSecret = {date, id: secret.id};
    document.getElementById('secretPopoverText').textContent = secret.text || 'Без пояснения';
    document.getElementById('secretPopoverEdit').onclick = () => {
      this.closePopover();
      this.openEditor(date, secret);
    };
    document.getElementById('secretPopoverDelete').onclick = () => {
      if (!confirm('Удалить это секретное напоминание?')) return;
      StorageAPI.deleteSecret(date, secret.id);
      this.closePopover();
      WeekGridManager.render();
    };
    popup.classList.remove('hidden');
    // Fixed positioning prevents clipping inside a narrow day's scroll container.
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(290, window.innerWidth - 20);
    popup.style.width = `${width}px`;
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
    popup.style.left = `${left}px`;
    popup.style.top = `${Math.max(10, Math.min(rect.bottom + 7, window.innerHeight - popup.offsetHeight - 10))}px`;
  },

  openEditor(date, secret = null) {
    if (!secret && StorageAPI.getSecretsByDate(date).length >= this.MAX_SECRETS) {
      showToast('В одном дне допускается не более 5 секретов.');
      return;
    }
    this.closePopover();
    this.editingSecret = {date, id: secret ? secret.id : null};
    this.selectedIcon = secret ? (secret.icon === '❄️' ? this.MEDICAL_ICON : secret.icon) : '💧';
    document.getElementById('secretEditorTitle').textContent = secret ? 'Редактировать секрет' : 'Новый секрет';
    document.getElementById('secretEditorText').value = secret ? secret.text : '';
    const palette = document.getElementById('secretIconPalette');
    palette.replaceChildren();
    for (const icon of this.ICONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'secret-palette-button';
      btn.appendChild(this.iconNode(icon));
      btn.setAttribute('aria-label', icon === this.MEDICAL_ICON ? 'Медицинский крест' : icon);
      if (icon === this.selectedIcon) btn.classList.add('selected');
      btn.setAttribute('aria-pressed', icon === this.selectedIcon ? 'true' : 'false');
      btn.addEventListener('click', () => {
        this.selectedIcon = icon;
        for (const element of palette.children) {
          const chosen = element === btn;
          element.classList.toggle('selected', chosen);
          element.setAttribute('aria-pressed', String(chosen));
        }
      });
      palette.appendChild(btn);
    }
    document.getElementById('secretEditorModal').classList.remove('hidden');
    document.getElementById('secretEditorText').focus();
  },

  initCalendar() {
    const drawer = document.getElementById('yearDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const open = document.getElementById('openYearDrawerBtn');
    const close = document.getElementById('closeYearDrawerBtn');
    if (!drawer || !backdrop || !open || !close) return;
    open.addEventListener('click', () => {
      this.calendarYear = (this.selectedDate ? Number(this.selectedDate.slice(0,4)) :
        WeekGridManager.currentMonday.getFullYear());
      this.renderCalendar();
      drawer.classList.remove('closed');
      drawer.scrollTop = 0;
      drawer.setAttribute('aria-hidden','false');
      backdrop.classList.remove('hidden');
      open.setAttribute('aria-expanded', 'true');
    });
    close.addEventListener('click', () => this.closeCalendar());
    backdrop.addEventListener('click', () => this.closeCalendar());
    document.getElementById('prevYearBtn').addEventListener('click', () => {
      this.calendarYear -= 1;
      this.renderCalendar();
    });
    document.getElementById('nextYearBtn').addEventListener('click', () => {
      this.calendarYear += 1;
      this.renderCalendar();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !drawer.classList.contains('closed')) this.closeCalendar();
    });
  },

  closeCalendar() {
    document.getElementById('yearDrawer')?.classList.add('closed');
    document.getElementById('yearDrawer')?.setAttribute('aria-hidden', 'true');
    document.getElementById('drawerBackdrop')?.classList.add('hidden');
    document.getElementById('openYearDrawerBtn')?.setAttribute('aria-expanded', 'false');
  },

  isDrawerOpen() {
    const drawer = document.getElementById('yearDrawer');
    return Boolean(drawer && !drawer.classList.contains('closed'));
  },

  colorForDay(tasks) {
    if (!tasks || tasks.length === 0) return '';
    if (tasks.some(t => !t.completed && !t.failed)) return 'yellow';
    if (tasks.some(t => t.completed && !t.failed)) return 'green';
    if (tasks.some(t => t.failed)) return 'red';
    return '';
  },

  renderCalendar() {
    const grid = document.getElementById('yearMonthsGrid');
    if (!grid) return;
    document.getElementById('drawerYearLabel').textContent = String(this.calendarYear);
    grid.replaceChildren();
    const dateTasks = new Map();
    const dateSecrets = StorageAPI.getSecrets();
    for (const task of StorageAPI.getTasks()) {
      if (!DateUtils.isValidISODate(task.date)) continue;
      if (!dateTasks.has(task.date)) dateTasks.set(task.date, []);
      dateTasks.get(task.date).push(task);
    }
    for (let month = 0; month < 12; month++) {
      const container = document.createElement('section');
      container.className = 'year-month';
      const heading = document.createElement('h3');
      heading.className = 'year-month-title';
      heading.textContent = this.MONTHS[month];
      container.appendChild(heading);
      const monthGrid = document.createElement('div');
      monthGrid.className = 'year-month-days';
      for (const name of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']) {
        const label = document.createElement('span');
        label.className = 'year-weekday-label';
        label.textContent = name;
        monthGrid.appendChild(label);
      }
      const firstWeekday = (new Date(this.calendarYear, month, 1).getDay() + 6) % 7;
      for (let pad = 0; pad < firstWeekday; pad++) {
        const blank = document.createElement('span');
        blank.className = 'year-day-blank';
        monthGrid.appendChild(blank);
      }
      const numberOfDays = new Date(this.calendarYear, month + 1, 0).getDate();
      for (let day = 1; day <= numberOfDays; day++) {
        const iso = DateUtils.formatISO(new Date(this.calendarYear, month, day));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'year-date-button';
        button.textContent = String(day);
        const tasksForDate = dateTasks.get(iso);
        const color = this.colorForDay(tasksForDate);
        const hasTasks = Array.isArray(tasksForDate) && tasksForDate.length > 0;
        const hasSecrets = Array.isArray(dateSecrets[iso]) && dateSecrets[iso].length > 0;
        if (color) button.classList.add('year-date-' + color);
        if (!hasTasks && hasSecrets) {
          // Only a secret: white outline without a coloured task background.
          button.classList.add('year-date-secret-only');
        } else if (hasTasks && hasSecrets && color === 'yellow' && iso > DateUtils.getTodayISO()) {
          // Future active tasks + secret: yellow fill with a white outline.
          button.classList.add('year-date-task-and-secret');
        }
        // Selecting a date highlights the WEEK column, not the year-calendar circle.
        if (iso === DateUtils.getTodayISO()) button.classList.add('year-date-today');
        button.title = `${day} ${DateUtils.MONTH_NAMES_GENITIVE[month]} ${this.calendarYear} г.`;
        button.setAttribute('aria-label', button.title);
        button.addEventListener('click', () => {
          this.selectedDate = iso;
          WeekGridManager.expandedDays.add(iso);
          WeekGridManager.setWeekByDate(new Date(iso + 'T12:00:00'));
          this.closeCalendar();
        });
        monthGrid.appendChild(button);
      }
      container.appendChild(monthGrid);
      grid.appendChild(container);
    }
  }
};

/**
 * ============================================================================
 * 6. НЕДЕЛЬНАЯ СЕТКА: СВЕРНУТЫЕ СВЕРХУ КОЛОНКИ С РАЗВОРАЧИВАНИЕМ ВНИЗ
 * ============================================================================
 */
const WeekGridManager = {
  currentMonday: null,
  expandedDays: new Set(),
  deleteTargetTaskId: null,
  searchHighlightedTaskId: null,

  init() {
    this.currentMonday = DateUtils.getMonday(new Date());

    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');
    const todayBtn = document.getElementById('todayBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prevWeek());
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextWeek());
    }
    if (todayBtn) {
      todayBtn.addEventListener('click', () => this.goToToday());
    }

    this.initTaskModal();
    this.initDeleteModal();
    this.initHistoryModal();
    this.initTransferModal();
    this.initSearch();
    StorageAPI.rollOverUnfinishedTasks();
    this.render();
    // Каждые 30 секунд проверяем сроки и смену суток: после полуночи
    // показываем итог вчерашнего дня, даже если переносов не было.
    let lastRenderedDay = DateUtils.getTodayISO();
    const refreshOverdue = () => {
      const today = DateUtils.getTodayISO();
      const moved = StorageAPI.rollOverUnfinishedTasks();
      if (moved || today !== lastRenderedDay) this.render();
      lastRenderedDay = today;
    };
    setInterval(refreshOverdue, 30000);
    window.addEventListener('focus', refreshOverdue);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshOverdue();
    });
  },

  // Поиск во ВСЁМ сохранённом списке, а не только в открытой неделе.
  // Карточка остаётся в дне последнего назначения (в том числе после закрытия).
  initSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    const hide = () => {
      results.classList.add('hidden');
      results.replaceChildren();
      input.setAttribute('aria-expanded', 'false');
    };
    const show = () => {
      results.classList.remove('hidden');
      input.setAttribute('aria-expanded', 'true');
    };
    const refresh = () => {
      const query = input.value.trim().toLocaleLowerCase('ru-RU');
      results.replaceChildren();
      if (!query) return hide();
      const terms = query.split(/\s+/).filter(Boolean);
      const matches = StorageAPI.getTasks()
        .filter(task => task && typeof task.title === 'string' &&
          terms.every(term => task.title.toLocaleLowerCase('ru-RU').includes(term)))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) ||
          String(b.time || '').localeCompare(String(a.time || '')) ||
          String(b.id).localeCompare(String(a.id)));

      for (const task of matches.slice(0, 60)) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'search-result-item';
        item.setAttribute('role', 'option');
        const title = document.createElement('span');
        title.className = 'search-result-title';
        title.textContent = task.title;
        const meta = document.createElement('span');
        meta.className = 'search-result-meta';
        const when = Step6.displayDate(task.date) + (task.time ? ' · ' + task.time : '');
        const state = task.failed ? '😈 Не выполнено' : task.completed ? '✓ Выполнено' : '○ Запланировано';
        meta.textContent = when + '  ·  ' + state;
        item.append(title, meta);
        item.addEventListener('click', () => {
          const taskId = task.id;
          input.value = '';
          hide();
          this.navigateToSearchTask(taskId);
        });
        results.appendChild(item);
      }
      if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'search-result-empty';
        empty.textContent = 'Задачи не найдены';
        results.appendChild(empty);
      } else if (matches.length > 60) {
        const more = document.createElement('div');
        more.className = 'search-result-empty';
        more.textContent = `Найдено ${matches.length}. Показаны первые 60 — уточни запрос.`;
        results.appendChild(more);
      }
      show();
    };

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'searchResults');
    input.setAttribute('aria-expanded', 'false');
    results.setAttribute('role', 'listbox');
    input.addEventListener('input', refresh);
    input.addEventListener('focus', () => { if (input.value.trim()) refresh(); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        hide();
        return;
      }
      if (event.key === 'ArrowDown' && !results.classList.contains('hidden')) {
        const first = results.querySelector('.search-result-item');
        if (first) { event.preventDefault(); first.focus(); }
      }
      if (event.key === 'Enter' && !results.classList.contains('hidden')) {
        const first = results.querySelector('.search-result-item');
        if (first) { event.preventDefault(); first.click(); }
      }
    });
    results.addEventListener('keydown', event => {
      const items = [...results.querySelectorAll('.search-result-item')];
      const i = items.indexOf(document.activeElement);
      if (event.key === 'Escape') { hide(); input.focus(); }
      if (event.key === 'ArrowDown' && i >= 0) { event.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
      if (event.key === 'ArrowUp' && i >= 0) { event.preventDefault(); if (i === 0) input.focus(); else items[i - 1].focus(); }
    });
    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('.search-container')) hide();
    });
  },

  navigateToSearchTask(taskId) {
    // Снова читаем хранилище, поскольку задача могла измениться после поиска.
    const task = StorageAPI.getTaskById(taskId);
    if (!task || !DateUtils.isValidISODate(task.date)) {
      showToast('Задача больше не найдена.');
      return;
    }
    this.searchHighlightedTaskId = String(task.id);
    this.expandedDays.add(task.date);
    this.currentMonday = DateUtils.getMonday(new Date(`${task.date}T12:00:00`));
    this.render();
    // Раскрутить список нужного дня до конкретной карточки; саму карточку
    // не открываем для редактирования и не изменяем историю.
    requestAnimationFrame(() => {
      const card = [...document.querySelectorAll('#weekGrid .task-card')]
        .find(el => el.dataset.taskId === String(task.id));
      if (card) card.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'});
    });
  },

  prevWeek() {
    this.currentMonday.setDate(this.currentMonday.getDate() - 7);
    this.render();
  },

  nextWeek() {
    this.currentMonday.setDate(this.currentMonday.getDate() + 7);
    this.render();
  },

  goToToday() {
    this.currentMonday = DateUtils.getMonday(new Date());
    this.render();
  },

  setWeekByDate(targetDate) {
    this.currentMonday = DateUtils.getMonday(new Date(targetDate));
    this.render();
  },

  toggleDay(dateISO) {
    if (this.expandedDays.has(dateISO)) {
      this.expandedDays.delete(dateISO);
    } else {
      this.expandedDays.add(dateISO);
    }
    this.render();
  },

  // Открытие модального окна создания / редактирования задачи
    openTaskModal(dateISO, taskId = null) {
    const modal = document.getElementById('taskModal');
    const targetDateInput = document.getElementById('taskTargetDate');
    const editingIdInput = document.getElementById('taskEditingId');
    const titleInput = document.getElementById('taskInputTitle');
    const timeInput = document.getElementById('taskInputTime');
    const completedInput = document.getElementById('taskInputCompleted');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('taskForm');

    if (!modal || !targetDateInput) return;

    if (taskId) {
      // Режим редактирования существующей задачи
      const task = (typeof StorageAPI !== 'undefined') ? StorageAPI.getTaskById(taskId) : null;
      if (!task) return;

      if (!DateUtils.isTaskEditable(task)) {
        showToast('Редактирование недоступно: дата и время этого дела уже наступили.');
        return;
      }

      if (modalTitle) modalTitle.textContent = 'Редактировать дело';
      targetDateInput.value = task.date;
      if (editingIdInput) editingIdInput.value = task.id;
      // Восстанавливаем ранее введённый текст дела в поле ввода
      if (titleInput) titleInput.value = task.title;
      if (timeInput) timeInput.value = task.time || '';
      // Устанавливаем текущий статус выполнения в чекбокс модального окна
      if (completedInput) completedInput.checked = Boolean(task.completed);

      const priorityRadio = form ? form.querySelector(`input[name="taskPriority"][value="${task.priority}"]`) : null;
      if (priorityRadio) priorityRadio.checked = true;

    } else {
      // Режим создания нового дела
      if (modalTitle) modalTitle.textContent = 'Новое дело';
      targetDateInput.value = dateISO;
      if (editingIdInput) editingIdInput.value = '';
      if (titleInput) titleInput.value = '';
      if (timeInput) timeInput.value = '';
      if (completedInput) completedInput.checked = false;

      const defaultPriorityRadio = form ? form.querySelector('input[name="taskPriority"][value="high"]') : null;
      if (defaultPriorityRadio) defaultPriorityRadio.checked = true;
    }

    modal.classList.remove('hidden');
    if (titleInput) titleInput.focus();
  },

  closeTaskModal() {
    const modal = document.getElementById('taskModal');
    const editingIdInput = document.getElementById('taskEditingId');
    if (modal) {
      modal.classList.add('hidden');
    }
    if (editingIdInput) {
      editingIdInput.value = '';
    }
  },

  initTaskModal() {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeTaskModal());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeTaskModal());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeTaskModal();
      });
    }

        if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateISO = document.getElementById('taskTargetDate').value;
        const editingIdInput = document.getElementById('taskEditingId');
        const editingId = editingIdInput ? editingIdInput.value : '';
        const title = document.getElementById('taskInputTitle').value;
        const time = document.getElementById('taskInputTime').value;
        const completedInput = document.getElementById('taskInputCompleted');
        const isCompleted = Boolean(completedInput && completedInput.checked);
        const priorityEl = form.querySelector('input[name="taskPriority"]:checked');
        const priority = priorityEl ? priorityEl.value : 'high';

        if (!title || typeof StorageAPI === 'undefined') return;

        if (editingId) {
          const existingTask = StorageAPI.getTaskById(editingId);
          if (!DateUtils.isTaskEditable(existingTask)) {
            showToast('Время дела уже наступило, изменения не сохранены.');
            this.closeTaskModal();
            return;
          }

          StorageAPI.updateTask(editingId, {
            title: title.trim(),
            time: time ? time.trim() : null,
            priority,
            completed: isCompleted
          });
        } else {
          const newTask = StorageAPI.addTask({
            title: title.trim(),
            date: dateISO,
            time: time ? time.trim() : null,
            priority
          });
          if (isCompleted && newTask) {
            StorageAPI.updateTask(newTask.id, { completed: true });
          }
          this.expandedDays.add(dateISO);
        }

        this.closeTaskModal();
        this.render();
      });
    }
  },

  // Модальное окно подтверждения удаления (Шаг 4)
  openDeleteModal(taskId) {
    const modal = document.getElementById('confirmDeleteModal');
    const desc = document.getElementById('confirmDeleteText');
    if (!modal) return;

    const task = (typeof StorageAPI !== 'undefined') ? StorageAPI.getTaskById(taskId) : null;
    if (!task) return;

    if (task.completed || !DateUtils.isTaskEditable(task)) {
      showToast('Это дело нельзя удалить.');
      return;
    }
    this.deleteTargetTaskId = taskId;
    if (desc) {
      desc.textContent = `Вы действительно хотите удалить задачу: "${task.title}"?`;
    }
    modal.classList.remove('hidden');
  },

  closeDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.deleteTargetTaskId = null;
  },

  initDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    const yesBtn = document.getElementById('confirmDeleteYesBtn');
    const noBtn = document.getElementById('confirmDeleteNoBtn');

    if (noBtn) {
      noBtn.addEventListener('click', () => this.closeDeleteModal());
    }
    if (yesBtn) {
      yesBtn.addEventListener('click', () => {
        if (this.deleteTargetTaskId && typeof StorageAPI !== 'undefined') {
          const wasDeleted = StorageAPI.deleteTask(this.deleteTargetTaskId);
          if (!wasDeleted) showToast('Удаление недоступно: дело уже выполнено.');
          this.closeDeleteModal();
          this.render();
        }
      });
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeDeleteModal();
      });
    }
  },

  // Модальное окно истории изменений под звёздочкой ⭐ (Шаг 4)
  openHistoryModal(taskId) {
    const modal = document.getElementById('historyModal');
    const taskInfoEl = document.getElementById('historyTaskInfo');
    const listEl = document.getElementById('historyEntriesList');
    if (!modal) return;

    const task = (typeof StorageAPI !== 'undefined') ? StorageAPI.getTaskById(taskId) : null;
    if (!task) return;

    if (taskInfoEl) {
      taskInfoEl.textContent = `Дело: "${task.title}"`;
    }

    if (listEl) {
      listEl.innerHTML = '';
      const history = Array.isArray(task.editHistory) ? task.editHistory : [];

      if (history.length === 0) {
        listEl.innerHTML = '<div class="history-item">Записей в истории пока нет</div>';
      } else {
        history.forEach((entry) => {
          const item = document.createElement('div');
          item.className = 'history-item';
          if (entry.type === 'postponed') {
            item.classList.add('history-type-postponed');
          }

          const head = document.createElement('div');
          head.className = 'history-item-header';

          const timeSpan = document.createElement('span');
          timeSpan.textContent = entry.timestamp || '';

          const typeSpan = document.createElement('span');
          const historyLabels = {
            postponed: '📅 Перенос',
            date_correction: '📅 Исправление даты',
            completed: '✅ Отмечено выполненным',
            completion_cancelled: '↩️ Отмена выполнения',
            failed: '😈 Не выполнено',
            text_edit: '✏️ Редактирование'
          };
          typeSpan.textContent = historyLabels[entry.type] || '✏️ Изменение';

          head.appendChild(typeSpan);
          head.appendChild(timeSpan);

          const details = document.createElement('div');
          details.className = 'history-item-details';
          details.textContent = entry.details || '';

          item.appendChild(head);
          item.appendChild(details);
          listEl.appendChild(item);
        });
      }
    }

    modal.classList.remove('hidden');
  },

  closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  },

  initHistoryModal() {
    const modal = document.getElementById('historyModal');
    const closeBtn = document.getElementById('closeHistoryModalBtn');
    const bottomCloseBtn = document.getElementById('closeHistoryBottomBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeHistoryModal());
    if (bottomCloseBtn) bottomCloseBtn.addEventListener('click', () => this.closeHistoryModal());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeHistoryModal();
      });
    }
  },

  openTransferModal(taskId) {
    const task = StorageAPI.getTaskById(taskId);
    if (!task || task.completed || task.failed || DateUtils.isDevilTask(task)) {
      showToast('Перенос недоступен: после появления 😈 дата и время закреплены.');
      return;
    }
    const modal = document.getElementById('transferModal');
    const input = document.getElementById('transferDate');
    const idInput = document.getElementById('transferTaskId');
    if (!modal || !input || !idInput) return;
    // Разрешаем возвращать перенесённое дело на более ранний день,
    // но не в прошлое относительно текущих даты и времени.
    const todayISO = DateUtils.getTodayISO();
    const minimum = DateUtils.isScheduledTimeAhead({ ...task, date: todayISO })
      ? todayISO : DateUtils.addDaysISO(todayISO, 1);
    input.min = minimum;
    input.value = task.date;
    idInput.value = task.id;
    document.getElementById('transferTaskTitle').textContent = task.title;
    modal.classList.remove('hidden');
  },

  closeTransferModal() {
    const modal = document.getElementById('transferModal');
    if (modal) modal.classList.add('hidden');
    const input = document.getElementById('transferTaskId');
    if (input) input.value = '';
  },

  initTransferModal() {
    const modal = document.getElementById('transferModal');
    const form = document.getElementById('transferForm');
    const close = () => this.closeTransferModal();
    document.getElementById('closeTransferModalBtn')?.addEventListener('click', close);
    document.getElementById('cancelTransferBtn')?.addEventListener('click', close);
    modal?.addEventListener('click', event => { if (event.target === modal) close(); });
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const taskId = document.getElementById('transferTaskId').value;
      const targetDate = document.getElementById('transferDate').value;
      const before = StorageAPI.getTaskById(taskId);
      if (!before) return;
      if (targetDate === before.date) {
        showToast('Выбери другую дату, чтобы сохранить изменение.');
        return;
      }
      // После появления 😈 перенос закрыт, в том числе из уже открытого окна.
      if (DateUtils.isDevilTask(before)) {
        showToast('После появления 😈 изменить дату нельзя.');
        close();
        return;
      }
      const isCorrection = targetDate < before.date;
      const result = StorageAPI.transferTask(taskId, targetDate, isCorrection ? 'correction' : 'manual');
      if (!result) {
        showToast('Нельзя выбрать прошедшие дату или время. Проверь срок.');
        return;
      }
      close();
      this.expandedDays.add(result.date);
      this.setWeekByDate(new Date(result.date + 'T12:00:00'));
      showToast(isCorrection ? 'Дата уточнена. Количество переносов не изменилось.' : 'Дело перенесено. Гвоздь добавлен.');
    });
  },

  render() {
    const weekGrid = document.getElementById('weekGrid');
    const rangeLabel = document.getElementById('currentWeekRange');

    if (!weekGrid) return;

    if (rangeLabel) {
      rangeLabel.textContent = DateUtils.formatRange(this.currentMonday);
    }

    weekGrid.innerHTML = '';

    const weekDays = DateUtils.getWeekDays(this.currentMonday);
    const todayISO = DateUtils.getTodayISO();
    const allTasksForWeek = StorageAPI.getTasks();

    weekDays.forEach((dayDate, index) => {
      const dateISO = DateUtils.formatISO(dayDate);
      const isWeekend = index >= 5; // Сб, Вс
      const isToday = (dateISO === todayISO);
      const isPastDay = (dateISO < todayISO);
      const isHoliday = DateUtils.isRussianHoliday(dayDate);

      // Получаем задачи текущего дня из StorageAPI и сортируем по хронологии времени
      const rawTasks = (typeof StorageAPI !== 'undefined') ? StorageAPI.getTasksByDate(dateISO) : [];
      const tasks = DateUtils.sortTasksForDay(rawTasks);

      const hasTasks = tasks.length > 0;
      const isManuallyExpanded = this.expandedDays.has(dateISO);
      const hasSecrets = StorageAPI.getSecretsByDate(dateISO).length > 0;
      const isExpanded = hasTasks || hasSecrets || isManuallyExpanded;

      const col = document.createElement('div');
      col.className = 'day-column';
      if (isWeekend) col.classList.add('weekend');
      if (isToday) col.classList.add('today');
      if (Step7.selectedDate === dateISO) col.classList.add('calendar-selected-day');
      if (isPastDay) col.classList.add('past-day'); // Прошедшие неактивные дни уходят в серый тон
      if (isHoliday) col.classList.add('holiday');
      col.classList.add(isExpanded ? 'expanded' : 'collapsed');

      col.setAttribute('data-date', dateISO);
      col.setAttribute('data-day-index', String(index));

      // Клик по свободному месту активного дня открывает форму создания дела
      col.addEventListener('click', (e) => {
        if (!e.target.closest('.task-card') && !e.target.closest('button') && !e.target.closest('.day-header')) {
          if (isPastDay) {
            showToast('День уже прошёл: добавление новых дел недоступно.');
            return;
          }
          this.openTaskModal(dateISO);
        }
      });

      // Шапка дня: строго на единой верхней линии
      const header = document.createElement('div');
      header.className = 'day-header';

      const info = document.createElement('div');
      info.className = 'day-header-info';

      const nameEl = document.createElement('div');
      nameEl.className = 'day-name';
      nameEl.textContent = DateUtils.DAY_NAMES[index];

      const dateEl = document.createElement('div');
      dateEl.className = 'day-date';
      const dayNum = dayDate.getDate();
      const monthShort = DateUtils.MONTH_NAMES_SHORT[dayDate.getMonth()];
      dateEl.textContent = `${dayNum} ${monthShort}`;

      info.appendChild(nameEl);
      info.appendChild(dateEl);
      header.appendChild(info);

      // Кнопка-стрелка:
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn-toggle-col';
      toggleBtn.innerHTML = isExpanded ? '&#9650;' : '&#9660;';
      toggleBtn.title = isExpanded ? 'Свернуть колонку вверх' : 'Развернуть поле для ввода задач вниз';

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDay(dateISO);
      });

      header.appendChild(toggleBtn);
      col.appendChild(header);

      if (!isExpanded) {
        header.addEventListener('click', () => {
          this.toggleDay(dateISO);
        });
      }

      // Контейнер списка задач
      const tasksContainer = document.createElement('div');
      tasksContainer.className = 'day-tasks-container';
      tasksContainer.setAttribute('data-date', dateISO);

      tasksContainer.addEventListener('click', (e) => {
        if (!e.target.closest('.task-card') && !e.target.closest('button')) {
          if (isPastDay) {
            showToast('День уже прошёл: добавление новых дел недоступно.');
            return;
          }
          this.openTaskModal(dateISO);
        }
      });

            // Рендеринг задач дня: чётко видны время, значок важности (❗ / ☀️), полный текст дела и действия
      tasks.forEach((t) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = String(t.id);
        if (this.searchHighlightedTaskId === String(t.id)) {
          card.classList.add('search-task-highlight');
        }
        const postponements = Array.isArray(t.postponedHistory) ? t.postponedHistory.length : 0;
        // Финальный статус: в карточке только название и красный чёртик.
        // Дата и вся история при этом сохраняются в хранилище.
        if (t.failed) {
          card.classList.add('task-failed', 'devil-alert');
          // Карточка не редактируется, но историю можно открыть без лишних
          // кнопок и значков: мышью, касанием или с клавиатуры.
          card.title = 'Окончательно не выполнено. Нажмите, чтобы посмотреть историю.';
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          card.setAttribute('aria-label', `История невыполненной задачи: ${t.title}`);
          card.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openHistoryModal(t.id);
          });
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              this.openHistoryModal(t.id);
            }
          });
          const text = document.createElement('span');
          text.className = 'task-failed-title';
          text.textContent = t.title;
          const devil = document.createElement('span');
          devil.className = 'task-failed-devil';
          devil.textContent = '😈';
          devil.setAttribute('role', 'img');
          devil.setAttribute('aria-label', 'Не выполнено');
          card.appendChild(text);
          card.appendChild(devil);
          tasksContainer.appendChild(card);
          return;
        }
        if (postponements >= 4) card.classList.add('devil-alert');
        else if (postponements > 0) card.classList.add(`nails-${postponements}`);
        if (t.completed) {
          card.classList.add('is-completed'); // Спокойный фоновый серый тон
        }

        const isEditable = DateUtils.isTaskEditable(t);
        if (isEditable) {
          card.classList.add('editable');
          card.title = 'Кликните для редактирования дела';
        } else if (postponements >= 4) {
          // Не приглушаем срочное предупреждение, но и редактировать не даём.
          card.title = t.completed
            ? 'Выполнено. Дата и время зафиксированы; история через ⭐'
            : '😈 Последний шанс выполнить до конца дня; дата и время закреплены. История через ⭐';
        } else {
          card.classList.add('past-locked');
          card.title = t.completed ? 'Выполненное дело закреплено после наступления срока' : 'Срок дела уже наступил (редактирование закрыто)';
        }

        // 1. Верхняя строка карточки: Время + Значок важности слева, Звёздочка и Корзина справа
        const topRow = document.createElement('div');
        topRow.className = 'task-card-top';

        const metaDiv = document.createElement('div');
        metaDiv.className = 'task-card-meta';

        // Отображение времени (белый жирный шрифт в контрастной рамке)
        if (t.time) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'task-card-time';
          timeSpan.textContent = t.time;
          metaDiv.appendChild(timeSpan);
        }

        // Определение значка важности (только для "важно" и "средне")
        let priorityIcon = '';
        let priorityTitle = '';
        if (t.priority === 'high') {
          priorityIcon = '❗';
          priorityTitle = 'Важно';
        } else if (t.priority === 'medium') {
          priorityIcon = '☀️';
          priorityTitle = 'Средне';
        }

        if (priorityIcon) {
          const iconSpan = document.createElement('span');
          iconSpan.className = 'task-priority-icon';
          iconSpan.textContent = priorityIcon;
          iconSpan.title = priorityTitle;
          metaDiv.appendChild(iconSpan);
        }

        // Гвозди и единственный чёртик показываются только в нижней плашке.
        topRow.appendChild(metaDiv);

        // Блок действий: Звёздочка ⭐ (история) и Корзина 🗑️ (только для будущих/активных дел)
        const actionsBlock = document.createElement('div');
        actionsBlock.className = 'task-card-actions';

        // Звёздочка ⭐: история дела
        const historyBtn = document.createElement('button');
        historyBtn.type = 'button';
        historyBtn.className = 'btn-task-action btn-task-history';
        historyBtn.textContent = '⭐';
        historyBtn.title = 'История правок и переносов дела';
        historyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openHistoryModal(t.id);
        });
        actionsBlock.appendChild(historyBtn);

        // Корзина 🗑️: удаление дела (скрыта для дел ранее текущего времени)
        if (isEditable && !t.completed) {
          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'btn-task-action btn-task-delete';
          deleteBtn.title = 'Удалить задачу';
          deleteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
            </svg>
          `;
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDeleteModal(t.id);
          });
          actionsBlock.appendChild(deleteBtn);
        }

        // При 😈 галочка доступна до конца назначенного дня, а снять её
        // после выполнения уже нельзя. У обычных задач правила не меняем.
        if ((postponements >= 4 && DateUtils.canCompleteDevilTask(t)) ||
            (postponements < 4 && (!t.completed || isEditable))) {
          const doneBtn = document.createElement('button');
          doneBtn.type = 'button';
          doneBtn.className = 'btn-task-action btn-task-done';
          doneBtn.textContent = t.completed ? '☑' : '✓';
          doneBtn.title = t.completed
            ? 'Снять отметку о выполнении до наступления срока'
            : 'Отметить дело выполненным';
          doneBtn.setAttribute('aria-label', t.completed ? 'Снять отметку о выполнении' : 'Отметить выполненным');
          doneBtn.addEventListener('click', event => {
            event.stopPropagation();
            const updated = StorageAPI.toggleTaskCompleted(t.id);
            if (updated) {
              this.render();
              showToast(updated.completed ? 'Дело отмечено выполненным!' : 'Отметка снята. Дело снова активно.');
            } else {
              this.render(); // на случай наступления срока после отображения карточки
              showToast('Изменение статуса недоступно после наступления срока.');
            }
          });
          actionsBlock.insertBefore(doneBtn, historyBtn);
        }
        topRow.appendChild(actionsBlock);
        card.appendChild(topRow);

        // 2. Тело карточки: полный текст дела
        const bodyRow = document.createElement('div');
        bodyRow.className = 'task-card-body';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'task-card-title';
        titleDiv.textContent = t.title;
        bodyRow.appendChild(titleDiv);
        card.appendChild(bodyRow);

        // Нижняя строка: кнопки слева, красный индикатор переносов справа.
        // Выполненные дела не переносятся, но прежние переносы остаются видимы.
        if (!t.completed || postponements > 0) {
          const transferActions = document.createElement('div');
          transferActions.className = 'task-transfer-actions';
          if (!t.completed && postponements < 4) {
            const tomorrowBtn = document.createElement('button');
            tomorrowBtn.type = 'button';
            tomorrowBtn.className = 'btn-task-transfer';
            tomorrowBtn.textContent = '→ Завтра';
            tomorrowBtn.title = 'Перенести на следующий календарный день от даты дела';
            tomorrowBtn.addEventListener('click', e => {
              e.stopPropagation();
              const nextDate = DateUtils.addDaysISO(t.date, 1);
              const moved = StorageAPI.transferTask(t.id, nextDate);
              if (!moved) return showToast('Перенос недоступен.');
              this.expandedDays.add(moved.date);
              this.setWeekByDate(new Date(moved.date + 'T12:00:00'));
              showToast('Перенесено на завтра. Гвоздь добавлен.');
            });
            const chooseBtn = document.createElement('button');
            chooseBtn.type = 'button';
            chooseBtn.className = 'btn-task-transfer';
            chooseBtn.textContent = '📅 Дата';
            chooseBtn.title = 'Выбрать другую будущую дату переноса';
            chooseBtn.addEventListener('click', e => {
              e.stopPropagation();
              this.openTransferModal(t.id);
            });
            transferActions.appendChild(tomorrowBtn);
            transferActions.appendChild(chooseBtn);
          }
          if (postponements > 0) {
            const badge = document.createElement('span');
            badge.className = 'task-transfer-badge';
            const icon = document.createElement('span');
            icon.className = 'task-transfer-badge-icons';
            icon.setAttribute('aria-hidden', 'true');
            if (postponements >= 4) {
              badge.classList.add('task-transfer-badge-devil');
              icon.textContent = '😈';
            } else {
              for (let i = 0; i < postponements; i++) {
                const nail = document.createElement('span');
                nail.className = 'metal-nail';
                icon.appendChild(nail);
              }
            }
            const label = document.createElement('span');
            label.className = 'task-transfer-badge-label';
            if (postponements < 4) {
              label.textContent = `${postponements} ${postponements === 1 ? 'гвоздь' : 'гвоздя'}`;
              badge.appendChild(icon);
              badge.appendChild(label);
            } else {
              // Внешне только 😈: без числа и без текстовой подписи.
              badge.appendChild(icon);
            }
            badge.title = 'История переносов доступна через ⭐';
            badge.setAttribute('aria-label', postponements >= 4 ? 'Чёртик: 4 или более переносов' : `${postponements} переносов`);
            transferActions.appendChild(badge);
          }
          card.appendChild(transferActions);
        }

        // У карточки с 😈 редактирование закрыто; клик показывает историю.
        card.addEventListener('click', (e) => {
          if (!e.target.closest('button')) {
            e.stopPropagation();
            if (postponements >= 4) {
              this.openHistoryModal(t.id);
            } else if (isEditable) {
              this.openTaskModal(dateISO, t.id);
            } else {
              showToast('Редактирование недоступно: дата и время этого дела уже наступили.');
            }
          }
        });

        tasksContainer.appendChild(card);
      });

      // Кнопка быстрого добавления дела (только если день не в прошлом)
      if (!isPastDay) {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-add-task-quick';
        addBtn.textContent = '+ Дело';
        addBtn.title = 'Добавить дело на этот день';
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openTaskModal(dateISO);
        });

        tasksContainer.appendChild(addBtn);
      }

      col.appendChild(tasksContainer);

      if (Step6.perfectDay(dateISO, allTasksForWeek)) {
        const celebration = document.createElement('div');
        celebration.className = 'day-perfect-message';
        celebration.setAttribute('role', 'status');
        celebration.textContent = Step6.messageForDay(dateISO);
        celebration.addEventListener('click', e => e.stopPropagation());
        col.appendChild(celebration);
      }

      // Контейнер секретных напоминаний дня
      const secretContainer = document.createElement('div');
      secretContainer.className = 'day-secret-container';
      secretContainer.setAttribute('data-date', dateISO);
      Step7.renderSecrets(secretContainer, dateISO);
      col.appendChild(secretContainer);

      weekGrid.appendChild(col);
    });

    Step7.closePopover();
    if (Step7.isDrawerOpen()) Step7.renderCalendar();
    console.log('[Три гвоздя] Шаг 7: неделя, секреты и календарь отрисованы.');
  }
};

/**
 * ============================================================================
 * 7. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  initThemeScheduler();
  initOnboarding();
  WeekGridManager.init();
  initDrawerHandlers();
  Step7.init();
  Step6.init();
  console.log('[Три гвоздя] Приложение успешно инициализировано (Шаги 1–6).');
});

if (typeof window !== 'undefined') {
  window.StorageAPI = StorageAPI;
  window.DateUtils = DateUtils;
  window.WeekGridManager = WeekGridManager;
  window.Step6 = Step6;
  window.Step7 = Step7;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getUrbanThemeForHour,
    initOnboarding,
    StorageAPI,
    STORAGE_KEYS,
    DateUtils,
    WeekGridManager,
    Step6,
    Step7
  };
}
