const { chromium } = require(process.env.PIGEONSUB_PLAYWRIGHT || 'playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const assert = require('assert/strict');
const repo = require('node:path').resolve(__dirname, '..');
const origin = 'http://127.0.0.1:8108';
const server = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--web', '--port', '8108'], { cwd: repo, env: { ...process.env, CI: '1', EXPO_PUBLIC_API_BASE_URL: origin + '/api' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '', browser, page;
for (const stream of [server.stdout, server.stderr]) stream.on('data', d => logs += d);
const errors = [];
async function open(path) {
  await page.goto(origin + path);
  await page.getByTestId('feather-reveal-overlay').waitFor({ state: 'hidden', timeout: 90000 });
}
async function snap(name, target) {
  if (process.env.PIGEONSUB_SKIP_SCREENSHOTS) return;
  if (target) await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await page.screenshot({ path: repo + '/docs/previews/guide-' + name + '.png' });
}
async function step(n) { await page.getByText('GUIDE · ' + n + '/13', { exact: true }).waitFor(); }
async function next(n) { await page.getByTestId('product-guide').getByRole('button', { name: 'Suivant', exact: true }).click(); await step(n); }
(async () => {
  for (let i = 0; i < 120; i++) { try { if ((await fetch(origin + '/status')).ok) break; } catch {} await new Promise(r => setTimeout(r, 500)); }
  browser = await chromium.launch({ executablePath: process.env.PIGEONSUB_CHROMIUM || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /cannot contain|descendant|hydration|unique.*key|Invalid hook/i.test(m.text())) errors.push(m.text()); });
  await open('/');
  await page.getByRole('button', { name: 'Passer l’introduction', exact: true }).click();
  await page.getByTestId('guide-welcome').waitFor();
  await snap('invitation');
  await page.getByRole('button', { name: 'Me guider', exact: true }).click();
  await step(1);
  await snap('first-step');
  await next(2); await next(3); await next(4); await next(5);
  await page.getByTestId('subscription-proof-preview').waitFor();
  assert(!page.url().endsWith('/new'), 'tour uses existing demo proofs');
  assert.equal(await page.evaluate(() => localStorage.getItem('pigeonsub.sessionMode')), 'guest');
  await next(6);
  await page.getByTestId('guide-anchor-subscription-safety').waitFor();
  await page.getByRole('button', { name: 'Terminer le guide plus tard', exact: true }).click();
  await open('/');
  await page.getByRole('button', { name: 'Reprendre le guide', exact: true }).click();
  await step(6);
  for (let i = 7; i <= 13; i++) {
    await next(i);
    if (i === 8) await page.getByRole('button', { name: 'Ajouter un essai gratuit', exact: true }).waitFor();
    if (i === 9) await page.getByRole('button', { name: '+ Ajouter une offre', exact: true }).waitFor();
    if (i === 11) {
      await page.getByTestId('product-guide').getByRole('button', { name: 'Découvrir Premium, option disponible en démo', exact: true }).click();
      await page.getByTestId('premium-feature-context').waitFor();
      assert((await page.getByTestId('premium-feature-context').innerText()).includes('vue combinée'));
      await page.getByRole('button', { name: 'Reprendre le guide', exact: true }).click();
      await step(11);
    }
  }
  await page.getByTestId('product-guide').getByRole('button', { name: 'Terminer', exact: true }).click();
  await page.getByTestId('product-guide').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Explorer la démo', exact: true }).waitFor();
  const guidedGuest = await page.evaluate(() => JSON.parse(localStorage.getItem('pigeonsub.v2.guest.data')));
  assert(!guidedGuest || guidedGuest.subscriptions.length === 0, 'tour never creates a personal subscription');
  assert.equal(await page.evaluate(() => localStorage.getItem('pigeonsub.sessionMode')), 'guest');
  await open('/profile');
  assert.equal(await page.getByTestId('guide-welcome').count(), 0, 'completed tour stays completed');
  await page.getByRole('button', { name: 'Explorer la démo', exact: true }).click();
  await open('/');
  await page.getByText('Bonjour Camille', { exact: true }).waitFor();
  await snap('home-budget');
  const carousel = page.getByTestId('review-carousel');
  await carousel.scrollIntoViewIfNeeded();
  const initial = await carousel.innerText();
  await page.getByRole('button', { name: 'Abonnement à éviter suivant', exact: true }).click();
  assert.notEqual(await carousel.innerText(), initial);
  await page.getByRole('button', { name: 'Abonnement à éviter précédent', exact: true }).click();
  assert.equal(await carousel.innerText(), initial);
  await snap('review-carousel', carousel);
  await page.getByRole('button', { name: 'Me le rappeler', exact: true }).click();
  await page.getByTestId('guide-anchor-subscription-safety').waitFor();
  await page.waitForFunction(() => { const box = document.querySelector('[data-testid="guide-anchor-subscription-safety"]')?.getBoundingClientRect(); return box && box.y >= 0 && box.y < 400; });
  const safetyBox = await page.getByTestId('guide-anchor-subscription-safety').boundingBox();
  assert(safetyBox.y >= 0 && safetyBox.y < 400, 'reminder opens at safety settings');
  await open('/subscriptions');
  await page.getByTestId('subscription-view-tags').waitFor();
  await snap('subscription-views');
  await page.getByRole('radio', { name: 'Vue Peu utilisés', exact: true }).click();
  assert.equal(await page.getByTestId('subscription-results').getByRole('button').count(), 4);
  await page.getByRole('radio', { name: 'Vue Archives', exact: true }).click();
  assert.equal(await page.getByTestId('subscription-results').getByRole('button').count(), 2);
  await page.getByRole('radio', { name: 'Vue Essais', exact: true }).click();
  assert.equal(await page.getByTestId('subscription-results').getByRole('button').count(), 4);
  await page.getByRole('button', { name: 'Découvrir Premium pour les abonnements illimités', exact: true }).click();
  await page.getByTestId('premium-feature-context').waitFor();
  assert((await page.getByTestId('premium-feature-context').innerText()).includes('illimité'));
  assert(await page.getByRole('button', { name: 'Passer à Plus', exact: true }).isDisabled(), 'no purchase in demo');
  await open('/stats');
  await page.getByTestId('stats-cost').waitFor();
  await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
  assert((await page.getByTestId('stats-cost').innerText()).includes('130,66'));
  await snap('stats-redesign');
  await page.getByRole('radio', { name: 'Projection 12 mois', exact: true }).click();
  assert((await page.getByTestId('stats-cost').innerText()).includes('12 prochains mois'));
  await page.getByRole('button', { name: 'Choisir une vue des statistiques', exact: true }).click();
  await page.getByTestId('stats-view-menu').getByRole('button', { name: 'Découvrir Premium, option disponible en démo', exact: true }).first().click();
  await page.getByTestId('premium-feature-context').waitFor();
  await page.getByRole('button', { name: 'Continuer gratuitement', exact: true }).click();
  assert((await page.getByTestId('stats-cost').innerText()).includes('COÛT ACTUEL'), 'feather did not also select the scenario');
  await page.getByRole('radio', { name: 'Sans les peu utilisés', exact: true }).click();
  assert((await page.getByTestId('stats-cost').innerText()).includes('COÛT SIMULÉ'));
  await page.getByTestId('budget-panel').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Modifier le budget', exact: true }).click();
  await page.getByRole('textbox', { name: 'Budget mensuel en euros', exact: true }).fill('150');
  await page.getByRole('button', { name: 'Enregistrer le budget', exact: true }).click();
  await snap('budget-comparison', page.getByTestId('budget-panel'));
  await open('/');
  assert((await page.getByTestId('budget-panel').innerText()).includes('150,00'));
  await open('/profile');
  await snap('premium-settings');
  await page.getByRole('button', { name: 'Revoir le guide pas à pas', exact: true }).click();
  await step(1);
  for (let i = 2; i <= 13; i++) {
    await next(i);
    if (i === 5) await page.getByTestId('subscription-proof-preview').waitFor();
    if (i === 12) await page.getByTestId('guide-anchor-subscription-history').waitFor();
  }
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await page.getByRole('radio', { name: 'Thème sombre', exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await open('/stats');
  await page.getByTestId('stats-cost').waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth) <= 320);
  await snap('stats-dark-narrow');
  const seed = await page.evaluate(() => JSON.parse(localStorage.getItem('pigeonsub.v2.demo.data')));
  await open('/profile');
  await page.getByRole('button', { name: 'Quitter la démo et retrouver mes données', exact: true }).click();
  await page.evaluate(seed => localStorage.setItem('pigeonsub.v2.guest.data', JSON.stringify({ ...seed, subscriptions: seed.subscriptions.slice(0, 5), nextId: 6 })), seed);
  await open('/stats');
  await page.getByRole('button', { name: 'Choisir une vue des statistiques', exact: true }).click();
  await page.getByRole('radio', { name: 'Sans les notes 1–2 étoiles', exact: true }).click();
  await page.getByTestId('premium-feature-context').waitFor();
  assert((await page.getByTestId('premium-feature-context').innerText()).includes('notes'));
  await snap('free-paywall');
  await open('/subscriptions');
  await page.getByRole('button', { name: 'Ajouter un abonnement', exact: true }).click();
  await page.getByTestId('premium-feature-context').waitFor();
  assert((await page.getByTestId('premium-feature-context').innerText()).includes('5 abonnements actifs'));
  await open('/subscriptions/2');
  await page.getByRole('button', { name: 'Historique des résiliations avec Plus', exact: true }).click();
  await page.getByTestId('premium-feature-context').waitFor();
  assert((await page.getByTestId('premium-feature-context').innerText()).includes('historique'));
  await page.evaluate(() => {
    const demoIndex = JSON.parse(localStorage.getItem('pigeonsub.photos.demo.index'));
    const uri = localStorage.getItem('pigeonsub.photos.demo.' + demoIndex['1'][0].id);
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: 'proof-test-' + i, label: 'Justificatif test ' + i }));
    rows.forEach(row => localStorage.setItem('pigeonsub.photos.guest.' + row.id, uri));
    localStorage.setItem('pigeonsub.photos.guest.index', JSON.stringify({ 1: rows }));
  });
  await open('/subscriptions/1/edit');
  await page.getByTestId('form-photos').waitFor();
  assert(await page.getByTestId('form-photos').getByRole('button', { name: 'Ajouter une photo', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Plus de photos avec Plus', exact: true }).click();
  await page.getByTestId('premium-feature-context').waitFor();
  assert((await page.getByTestId('premium-feature-context').innerText()).includes('5 photos'));
  // Replaying from a filled personal space must return to exactly that space.
  const personalSnapshot = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.includes('.guest.')).sort().map(k => [k, localStorage.getItem(k)])));
  const beforePersonal = await personalSnapshot();
  await open('/profile');
  await page.getByRole('button', { name: 'Revoir le guide pas à pas', exact: true }).click();
  await step(1);
  await next(2);
  await page.getByRole('button', { name: 'Modifier le budget', exact: true }).click();
  await page.getByRole('textbox', { name: 'Budget mensuel en euros', exact: true }).fill('999');
  await page.getByRole('button', { name: 'Enregistrer le budget', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer le guide plus tard', exact: true }).click();
  await page.getByTestId('product-guide').waitFor({ state: 'hidden' });
  assert.deepEqual(await personalSnapshot(), beforePersonal, 'tour changes stay in demo');

  // A locally mocked signed-in account verifies session restoration without
  // contacting an actual backend or using any real credentials.
  const accountRequests = [];
  const accountSub = { ...seed.subscriptions[0], id: 77, userId: 42, name: 'Abonnement personnel' };
  await page.route(origin + '/api/**', route => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api', '');
    accountRequests.push({ method: req.method(), path });
    let json;
    if (path === '/auth/me') json = { id: 42, name: 'Compte test', email: 'test@example.invalid' };
    else if (path === '/subscriptions') json = [accountSub];
    else if (path === '/settings') json = { budgetCap: '75', monthlyOverrides: null };
    else if (path.startsWith('/subscriptions/')) json = accountSub;
    else throw new Error('Unexpected mocked account request: ' + path);
    return route.fulfill({ json });
  });
  await page.evaluate(() => {
    sessionStorage.setItem('pigeonsub_jwt', 'guide-local-test-token');
    localStorage.setItem('pigeonsub.sessionMode', 'account');
    localStorage.setItem('pigeonsub.lastAccountScope', 'account:42');
    localStorage.setItem('pigeonsub.guide.v1', JSON.stringify({ status: 'done', index: 12 }));
  });
  await open('/profile');
  await page.getByText('Compte test', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Revoir le guide pas à pas', exact: true }).click();
  await step(1);
  await page.getByText('Bonjour Camille', { exact: true }).waitFor();
  const requestCount = accountRequests.length;
  for (let i = 2; i <= 13; i++) await next(i);
  assert.equal(accountRequests.length, requestCount, 'tour only reads demo data');
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await page.getByText('Compte test', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem('pigeonsub_jwt')), 'guide-local-test-token');
  assert.equal(await page.evaluate(() => localStorage.getItem('pigeonsub.sessionMode')), 'account');
  assert(accountRequests.every(r => r.method === 'GET'), 'tour never writes to personal account');

  // Reload mid-tour returns to the original account; resume opens demo again.
  await page.getByRole('button', { name: 'Revoir le guide pas à pas', exact: true }).click();
  await step(1); await next(2);
  await open('/');
  await page.getByText('Bonjour Compte test', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reprendre le guide', exact: true }).click();
  await step(2);
  await page.getByText('Bonjour Camille', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Terminer le guide plus tard', exact: true }).click();
  await page.getByText('Bonjour Compte test', { exact: true }).waitFor();
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: first-run guide on populated demo, unchanged guest session, pause/resume, 13-step replay with demo proofs/history, feather/paywall/resume, budget persistence, carousel, views, charts, free limits, filled guest isolation and signed-in account restoration.');
})().catch(async e => { console.error(e); if (page) { console.error(await page.locator('body').innerText().catch(() => '')); await page.screenshot({ path: '/tmp/guide-stats-failure.png' }).catch(() => {}); } console.error(logs.slice(-2500)); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.kill(); fs.writeFileSync('/tmp/guide-stats-metro.log', logs); });
