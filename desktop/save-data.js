// Save a readable copy of all tasks in Documents/Три гвоздя automatically.
(() => {
  if (!window.nailsDesktop || !window.StorageAPI || !window.Step6) return;
  let lastErrorShown = false;
  const save = () => window.nailsDesktop.save(Step6.makeBackup()).then(() => {
    lastErrorShown = false;
  }).catch(error => {
    console.error('[Три гвоздя] Ошибка сохранения в Документы:', error);
    if (!lastErrorShown) {
      lastErrorShown = true;
      window.alert('Не удалось сохранить копию задач в папку «Документы/Три гвоздя». Проверь доступ к папке. Задачи всё ещё сохранены в приложении.');
    }
  });
  const write = StorageAPI._write;
  StorageAPI._write = function (...args) {
    const result = write.apply(this, args);
    if (result) save();
    return result;
  };
  for (const key of ['restoreBackup', 'clearPlanner']) {
    const original = Step6[key];
    Step6[key] = function (...args) {
      const result = original.apply(this, args);
      save();
      return result;
    };
  }
  // In the installed Windows app, show only the two LOCAL paths. Web links and
  // PWA explanations are irrelevant and confusing once an EXE is installed.
  const locationDialog = document.getElementById('appLocationDialog');
  const locationTitle = document.getElementById('appLocationTitle');
  const locationClose = document.getElementById('appLocationClose');
  if (locationDialog && locationTitle && locationClose) {
    locationTitle.textContent = '📂 Где хранятся программа и задачи';
    for (const child of Array.from(locationDialog.children)) {
      if (child !== locationTitle && child !== locationClose) child.classList.add('hidden');
    }
    const locations = document.createElement('div');
    locations.style.cssText = 'font-size:.91rem;line-height:1.65;overflow-wrap:anywhere;margin:10px 0 18px';
    const makeRow = (label, value) => {
      const row = document.createElement('p');
      row.style.margin = '0 0 16px';
      const heading = document.createElement('strong');
      heading.textContent = label;
      const pathLine = document.createElement('span');
      pathLine.style.cssText = 'display:block;overflow-wrap:anywhere;user-select:text;';
      pathLine.textContent = value;
      row.append(heading, pathLine);
      return row;
    };
    locationDialog.insertBefore(locations, locationClose);
    window.nailsDesktop.where().then(({program, data}) => {
      locations.replaceChildren(
        makeRow('Программа установлена:', program),
        makeRow('Файл с задачами на этом компьютере:', data)
      );
    }).catch(error => {
      console.warn('[Три гвоздя] Не удалось определить местоположение:', error);
      locations.textContent = 'Не удалось определить расположение программы и файла задач.';
    });
  }
  save();
})();
