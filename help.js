/* Ознакомительная инструкция «Три гвоздя»: пять независимых сворачиваемых разделов. */
(function () {
  'use strict';
  const nail = '<svg viewBox="0 0 18 36" width="13" height="30" aria-hidden="true"><defs><linearGradient id="helpNailGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#64748b"/><stop offset="48%" stop-color="#f1f5f9"/><stop offset="100%" stop-color="#94a3b8"/></linearGradient></defs><rect x="1" y="2" width="16" height="4" rx="1" fill="url(#helpNailGradient)" stroke="#475569" stroke-width=".6"/><path d="M7 6H11L10.5 27L9 35L7.5 27Z" fill="url(#helpNailGradient)" stroke="#64748b" stroke-width=".8"/></svg>';
  const nails = (n) => '<span class="tg-help-nails" aria-label="' + n + ' гвоздя">' + nail.repeat(n) + '</span>';
  const sections = [
    ['1. Запланируй дело. А мы проследим за его судьбой.', `<p>Выбери день, нажми «+ Дело», напиши, что собираешься совершить, и при желании укажи время.</p>
<p>А теперь реши, насколько это важно:</p>
<ul><li>❗ <strong>Важно</strong> — откладывать нежелательно.</li><li>☀️ <strong>Средний приоритет</strong> — хорошо бы сделать, но мир подождёт.</li><li><strong>Свободно</strong> — сделаю, когда появится время и вдохновение.</li></ul>
<p>Вот и всё. Дело записано. Теперь главное — не делать вид, что его не существует.</p>`],
    ['2. Не сделал? Знакомься с тремя гвоздями!', `<p>Если срок наступил, а дело не выполнено, оно автоматически переходит на следующий день.</p>
<p><strong>А если планы изменились, ты всегда можешь перенести дело самостоятельно — на любую другую дату, которую сочтёшь для себя более удобной.</strong></p>
<p>Каждый перенос вперёд — ещё один гвоздь.</p>
<div class="tg-help-nail-list">
<div>${nails(1)}<span><strong>Первый гвоздь</strong> — ну, бывает!</span></div>
<div>${nails(2)}<span><strong>Второй гвоздь</strong> — опять откладываем?</span></div>
<div>${nails(3)}<span><strong>Третий гвоздь</strong> — может, пора разобраться?</span></div></div>
<p>А после четвёртого переноса появляется 😈 <strong>чёртик</strong>.</p>
<p>Он не ругается. Просто смотрит на тебя и спрашивает: «Тебе точно это надо?»</p>
<p>Теперь дата закреплена. У тебя есть последний шанс выполнить дело до конца назначенного дня. Иначе оно отправится в архив невыполненных.</p>
<p>А если всё сделал — нажми ✓. Победы тоже нужно отмечать!</p>`],
    ['3. Секретки 🔑. Крестик на руке, только умнее.', `<p>Помнишь, как в детстве мама ставила крестик на руке, чтобы ты чего-нибудь не забыл?</p>
<p>А потом смотришь на этот крестик и думаешь: «А что я вообще должен был помнить?»</p>
<p>Вот для этого у нас есть <strong>секретки</strong>.</p>
<p>Выбери день, нажми «+ 🔑» и поставь подходящий значок — 💧, ❤️, ☕, 🎯 или другой.</p>
<p>И самое главное — можешь написать к нему своё пояснение.</p>
<p>Например, поставила 💧 на четыре дня подряд. Для всех это просто капельки, а для тебя — четыре дня, занятые важным событием, о котором совсем не обязательно рассказывать или писать в календаре. <strong>Ты знаешь, что они означают, — и этого достаточно.</strong></p>
<p>Захочешь вспомнить, что означает значок, — нажми на него, и секрет откроется.</p>
<p><strong>Значок виден. Его смысл знаешь только ты.</strong> Ну и твой планировщик, конечно.</p>`],
    ['4. А если хочется посмотреть на всё сразу?', `<p>Открой годовой календарь — увидишь, где дела запланированы, выполнены или окончательно не выполнены, а где тебя уже поджидают секретки.</p>
<p>Нужен бумажный план? Выбери «Печать», укажи месяц и распечатай.</p>
<p>Если дел много, планировщик сам распределит их по нескольким листам А4, сохраняя недели.</p>
<p>И не переживай: комментарии к секреткам на бумагу не попадут. Секрет есть секрет.</p>`],
    ['5. Зелёная кнопка — гордись! Красная — задумайся!', `<p class="tg-help-archive-head"><span class="tg-help-archive-icon tg-help-green" aria-hidden="true">👍</span><strong>Хочешь вспомнить свои победы?</strong></p>
<p>Нажми зелёную кнопку и загляни в архив выполненных дел.</p>
<p>Посмотри, сколько всего удалось сделать. Похвали себя! Особенно приятно видеть дела, которым не понадобилось ни одного лишнего гвоздя.</p>
<p>Пусть эти достижения вдохновят тебя на новые цели и смелые решения. <strong>Каждое завершённое дело — ещё одна ступень к завтрашним победам.</strong> Ставь новые задачи: ты уже доказал себе, что умеешь доводить начатое до конца!</p>
<hr>
<p class="tg-help-archive-head"><span class="tg-help-archive-icon tg-help-red" aria-hidden="true">😈</span><strong>А теперь немного смелости!</strong></p>
<p>Нажми красную кнопку и посмотри на дела, которым даже три гвоздя не помогли стать выполненными.</p>
<p>Но не спеши себя ругать. Возможно, они были не так важны, как казалось. А может, наоборот — заслуживают особого внимания.</p>
<p>Переосмысли их, сформулируй по-новому. Если дело действительно важно для твоей работы или жизни — верни его в планы и доведи до конца!</p>
<p><strong>Ведь искусство планирования — не только выполнять задуманное, но и понимать, что действительно заслуживает твоего времени.</strong></p>`]
  ];
  function init() {
    const openButton = document.getElementById('openDetailedHelpBtn');
    const onboarding = document.getElementById('onboardingModal');
    if (!openButton || !onboarding || document.getElementById('tgHelpModal')) return;
    openButton.removeAttribute('title');
    const modal = document.createElement('div');
    modal.id = 'tgHelpModal';
    modal.className = 'modal-overlay hidden tg-help-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tgHelpTitle');
    modal.innerHTML = '<div class="tg-help-card">' +
      '<div class="tg-help-header"><div><h2 id="tgHelpTitle">🔨 Ну что, познакомимся поближе?</h2>' +
      '<p>Краткая инструкция по укрощению хаоса</p><small>Нажми на интересующий раздел</small></div>' +
      '<button type="button" class="tg-help-close" aria-label="Закрыть инструкцию">×</button></div>' +
      '<div class="tg-help-list">' + sections.map(([heading, body]) =>
        '<details class="tg-help-section"><summary>' + heading + '<span class="tg-help-chevron" aria-hidden="true"></span></summary>' +
        '<div class="tg-help-section-body">' + body + '</div></details>').join('') + '</div>' +
      '<div class="tg-help-footer"><strong>Наша цель — не забить побольше гвоздей, а наконец прибить хаос к плану!</strong>' +
      '<button type="button" class="btn btn-urban-volumetric tg-help-done">Всё понятно, за дело! 🔨</button></div></div>';
    document.body.appendChild(modal);
    let previousFocus = null;
    function close() {
      modal.classList.add('hidden');
      onboarding.classList.remove('hidden');
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    }
    openButton.addEventListener('click', function () {
      previousFocus = document.activeElement;
      modal.querySelectorAll('details').forEach(d => { d.open = false; });
      onboarding.classList.add('hidden');
      modal.classList.remove('hidden');
      modal.querySelector('.tg-help-close').focus();
    });
    modal.querySelector('.tg-help-close').addEventListener('click', close);
    modal.querySelector('.tg-help-done').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();