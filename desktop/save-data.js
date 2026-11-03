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
  window.nailsDesktop.where().then(({program, data}) => {
    const dialog = document.getElementById('appLocationDialog');
    if (!dialog) return;
    const block = document.createElement('p');
    block.style.cssText = 'font-size:.89rem;line-height:1.6;overflow-wrap:anywhere;';
    const strong1 = document.createElement('strong');
    strong1.textContent = 'Программа установлена:';
    const strong2 = document.createElement('strong');
    strong2.textContent = 'Файл с задачами на этом компьютере:';
    block.append(strong1, document.createElement('br'), document.createTextNode(program),
      document.createElement('br'), strong2, document.createElement('br'),
      document.createTextNode(data));
    dialog.insertBefore(block, document.getElementById('appLocationClose'));
  }).catch(console.warn);
  save();
})();
