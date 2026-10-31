import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const checks = [];
const ok = (name, result) => {
  assert.ok(result, name);
  checks.push('OK: ' + name);
};

try {
  for (const width of [390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 }, isMobile: true, hasTouch: true,
      locale: 'ru-RU', timezoneId: 'Asia/Yekaterinburg',
      serviceWorkers: 'block'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-31T04:00:00+05:00') });
    await page.goto('http://127.0.0.1:8765/index.html', {waitUntil:'domcontentloaded'});
    await page.locator('#startAppBtn').click();
    await page.locator('#onboardingModal.hidden').waitFor();
    await page.locator('.day-column').first().waitFor();
    const actual = await page.locator('.day-column').evaluateAll(ds => ds.map(d => d.dataset.date));
    ok(width + 'px: dates 26.10–01.11', JSON.stringify(actual) === JSON.stringify([
      '2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'
    ]));

    // «Сегодня» возвращает дату и подсвечивает текущий день, даже при повторном нажатии.
    await page.locator('#nextWeekBtn').click();
    ok(width + 'px: next week opens', await page.locator('.day-column[data-date="2026-11-02"]').count() === 1);
    await page.locator('#todayBtn').click();
    ok(width + 'px: today button returns to 31.10 week', await page.locator('.day-column[data-date="2026-10-31"]').count() === 1);
    ok(width + 'px: today button visually highlights today', await page.locator('.day-column[data-date="2026-10-31"].mobile-today-focus').count() === 1);
    await page.locator('#todayBtn').click();
    ok(width + 'px: today button gives repeat-click feedback', await page.locator('#todayBtn.mobile-today-pressed').count() === 1);

    const past = page.locator('.day-column[data-date="2026-10-28"]');
    ok(width + 'px: past disabled', await past.getAttribute('aria-disabled') === 'true');
    ok(width + 'px: past secret controls hidden', await past.locator('.day-secret-container').evaluate(el => getComputedStyle(el).display === 'none'));
    ok(width + 'px: past arrow hidden', await past.locator('.btn-toggle-col').evaluate(el => getComputedStyle(el).display === 'none'));
    const before = await page.evaluate(() => Array.from(WeekGridManager.expandedDays));
    await past.locator('.day-header').dispatchEvent('click');
    const after = await page.evaluate(() => Array.from(WeekGridManager.expandedDays));
    ok(width + 'px: past click cannot toggle', JSON.stringify(before) === JSON.stringify(after));
    ok(width + 'px: no past modal', await page.locator('#taskModal').getAttribute('class').then(c => c.includes('hidden')));

    const future = page.locator('.day-column[data-date="2026-11-01"]');
    ok(width + 'px: future enabled', await future.getAttribute('aria-disabled') !== 'true');
    await future.locator('.mobile-add-day').click();
    await page.locator('#taskModal:not(.hidden)').waitFor();
    ok(width + 'px: future + opens date', await page.locator('#taskTargetDate').inputValue() === '2026-11-01');
    await page.locator('#taskInputTitle').fill('ТЕСТ — проверка будущего дня');
    await page.locator('#taskForm button[type=submit]').click();
    ok(width + 'px: task created', await page.evaluate(() => StorageAPI.getTasksByDate('2026-11-01').some(t => t.title === 'ТЕСТ — проверка будущего дня')));
    await future.locator('.btn-task-done').first().click();
    ok(width + 'px: future task completed', await page.evaluate(() => StorageAPI.getTasksByDate('2026-11-01').every(t => t.completed)));
    ok(width + 'px: motivation under completed day', await future.locator('.day-completion-note').count() === 1);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.day-column').first().waitFor();
    ok(width + 'px: reload keeps completed task', await page.evaluate(() => StorageAPI.getTasksByDate('2026-11-01').some(t => t.completed)));
    ok(width + 'px: page scripts no error', errors.length === 0);
    await context.close();
  }
  console.log('\n' + checks.join('\n'));
  console.log('PASSED: ' + checks.length + ' tests');
} finally {
  await browser.close();
}
