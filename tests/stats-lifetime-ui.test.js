const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

// Component/event contract harness: execute the real screen and descendants,
// replacing only native hosts, service hooks and React hook storage. This is
// not a browser, a layout engine or a substitute for on-device visual review.
function harness(platform, width, scheme) {
  const state = new Map(), cache = new Map(), routes = [];
  let frame, scope = 'guest', plus = true;
  const data = [
    { id: 1, name: 'Musique', price: '20', frequency: 'monthly', category: 'music', isActive: true, isTrial: false, rating: 5, nextRenewal: '2026-11-01' },
    { id: 2, name: 'Outil à vie', price: '120', frequency: 'lifetime', category: 'custom_tools', isActive: true, isTrial: false, purchaseDate: '2026-10-01', usageFrequency: 'rarely_used', rating: 1 },
    { id: 3, name: 'Sans date', price: '60', frequency: 'lifetime', category: 'other', isActive: true, isTrial: false, purchaseDate: null },
  ];
  const catalog = { custom: [{ id: 'custom_tools', name: 'Outils', icon: null }], overrides: {}, hidden: [] };
  const follow = {};
  const FixedDate = class extends Date {
    constructor(...args) { super(...(args.length ? args : [2026, 9, 12, 12])); }
  };
  const hooks = { ...React, useEffect(effect, deps) {
    const key = `${frame.path}:effect:${frame.index++}`;
    const previous = state.get(key);
    if (!previous || deps.some((value, i) => value !== previous[i])) { state.set(key, deps); effect(); }
  }, useState(initial) {
    const key = `${frame.path}:${frame.index++}`;
    if (!state.has(key)) state.set(key, typeof initial === 'function' ? initial() : initial);
    return [state.get(key), value => state.set(key, typeof value === 'function' ? value(state.get(key)) : value)];
  } };
  const colors = load('src/theme/colors.ts');
  const hosts = { Platform: { OS: platform }, useWindowDimensions: () => ({ width, height: 844 }),
    Image: 'Image', Pressable: 'Pressable', Switch: 'Switch', Text: 'Text', View: 'View' };
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText;
    const requireLocal = name => {
      if (name.endsWith('/shared/family-sharing')) return require('../shared/family-sharing');
      if (name === 'react') return hooks;
      if (name === 'react-native') return hosts;
      if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', LinearGradient: 'LinearGradient', Line: 'Line', Path: 'Path', Stop: 'Stop', Text: 'SvgText' };
      if (name === '@expo/vector-icons') return { Ionicons: 'Icon' };
      if (name === 'expo-router') return { useRouter: () => ({ push: route => routes.push(route) }) };
      if (name.endsWith('/ThemeContext')) return { useTheme: () => ({ colors: scheme === 'dark' ? colors.DarkColors : colors.LightColors }) };
      if (name.endsWith('/AuthContext')) return { useAuth: () => ({ scope }) };
      if (name.endsWith('/BillingContext')) return { useBilling: () => ({ canUsePlus: plus }) };
      if (name.endsWith('/useCategoryCatalog')) return { useCategoryCatalog: () => catalog };
      if (name.endsWith('/useSubscriptionData')) return { useSubscriptionData: () => ({ data, follow, loading: false, error: '', reload() {} }) };
      if (name.endsWith('/ui/Page')) return { Page: 'Page', useUI: () => ({}) };
      for (const component of ['Button', 'PlusBadge', 'BudgetPanel', 'LoadingScreen', 'ErrorState'])
        if (name.endsWith('/' + component)) return { [component]: component };
      if (name.endsWith('/GuideScrollView')) return { GuideAnchor: 'GuideAnchor' };
      if (name.endsWith('.png')) return name;
      assert(name.startsWith('.'), `Unexpected dependency ${name}`);
      const base = path.resolve(path.dirname(file), name);
      const target = ['.ts', '.tsx'].map(ext => base + ext).find(f => fs.existsSync(f));
      assert(target, `Missing ${base}`);
      return load(target);
    };
    vm.runInThisContext(`(function(require,module,exports,Date){${source}\n})`, { filename: file })(requireLocal, module, module.exports, FixedDate);
    return module.exports;
  }
  function resolve(element, parent = 'root') {
    if (element === null || element === undefined || typeof element === 'boolean') return null;
    if (Array.isArray(element)) return element.map((child, i) => resolve(child, `${parent}/${child?.key ?? i}`));
    if (typeof element !== 'object') return element;
    const here = `${parent}/${element.key ?? ''}:${element.type.name || element.type.toString()}`;
    if (typeof element.type === 'function') {
      const previous = frame;
      frame = { path: here, index: 0 };
      const result = element.type(element.props);
      frame = previous;
      return resolve(result, here);
    }
    return { type: element.type, props: element.props, children: resolve(element.props.children, here) };
  }
  const Screen = load('app/(tabs)/stats.tsx').default;
  const render = () => resolve(React.createElement(Screen));
  return { render, routes, data, catalog, follow, setScope: value => { scope = value; }, setPlus: value => { plus = value; } };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.children)] : [];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  return tree && typeof tree === 'object' ? text(tree.children) : tree == null ? '' : String(tree);
}
const byId = (tree, id) => nodes(tree).find(node => node.props.testID === id);
const byLabel = (tree, label) => nodes(tree).find(node => node.props.accessibilityLabel?.startsWith(label));
const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

for (const [platform, width, scheme] of [['ios', 320, 'light'], ['ios', 390, 'dark'], ['web', 1280, 'light'], ['web', 320, 'dark']]) {
  test(`${platform} ${width}px ${scheme}: Family and lifetime combine independently and reset after Plus loss/session change`, () => {
    const h = harness(platform, width, scheme);
    h.data[0].familySharing = { shareable: true, totalSeats: 4, occupiedSeats: 2, receivedContribution: '5', estimatedContribution: '5', frequency: 'monthly' };
    h.data[1].familySharing = { shareable: true, totalSeats: 4, occupiedSeats: 2, receivedContribution: '60', estimatedContribution: '20', frequency: 'lifetime' };
    let tree = h.render();
    byId(tree, 'stats-family-toggle').props.onValueChange(true);
    tree = h.render();
    assert.equal(text(byId(tree, 'stats-category-total')), money(15));
    assert(text(byId(tree, 'stats-family-summary')).includes('hypothétique'));
    byId(tree, 'stats-lifetime-toggle').props.onValueChange(true);
    tree = h.render();
    assert.equal(text(byId(tree, 'stats-category-total')), money(20));
    assert.equal(text(byId(tree, 'stats-current-amount')), money(20));
    assert.equal(text(byId(tree, 'stats-confirmed-amount')), money(0));
    byLabel(tree, 'Voir les abonnements : Outils').props.onPress();
    tree = h.render();
    assert(text(byId(tree, 'stats-category-preview')).includes(`${money(120)} payés une fois`));
    assert(text(byId(tree, 'stats-category-preview')).includes(`reste à charge : ${money(5)}`));
    h.setPlus(false);
    tree = h.render();
    assert.equal(byId(tree, 'stats-family-toggle').props.value, false);
    assert.equal(byId(tree, 'stats-family-toggle').props.disabled, true);
    assert.equal(text(byId(tree, 'stats-category-total')), money(30));
    h.setPlus(true);
    tree = h.render();
    assert.equal(byId(tree, 'stats-family-toggle').props.value, false);
    byId(tree, 'stats-family-toggle').props.onValueChange(true);
    h.setScope('account:second');
    tree = h.render();
    assert.equal(byId(tree, 'stats-family-toggle').props.value, false);
    assert.equal(byId(tree, 'stats-lifetime-toggle').props.value, false);
  });
  test(`${platform} ${width}px ${scheme}: toggle, ring, amounts, details and correction links use one basis`, () => {
    const h = harness(platform, width, scheme);
    const original = JSON.stringify(h.data);
    let tree = h.render();
    assert.equal(byId(tree, 'stats-lifetime-toggle').props.value, false);
    assert.equal(text(byId(tree, 'stats-category-total')), money(20));
    assert(!byId(tree, 'stats-lifetime-missing-dates'));
    byId(tree, 'stats-lifetime-toggle').props.onValueChange(true);
    tree = h.render();
    assert.equal(text(byId(tree, 'stats-category-total')), money(30));
    assert.equal(text(byId(tree, 'stats-current-amount')), money(20), 'recurring headline is unchanged');
    assert.equal(text(byId(tree, 'stats-confirmed-amount')), money(0));
    assert.equal(nodes(tree).find(n => n.type === 'BudgetPanel').props.current, 20);
    assert(byId(tree, 'stats-lifetime-missing-dates'));
    const ring = byId(tree, 'stats-category-ring');
    assert(ring.props.accessibilityLabel.includes('67 %'));
    assert(ring.props.accessibilityLabel.includes('33 %'));
    const arcs = nodes(ring).filter(n => n.type === 'Circle' && n.props.strokeDasharray);
    const lengths = arcs.map(n => Number(n.props.strokeDasharray.split(' ')[0]));
    assert(Math.abs(lengths.reduce((a, b) => a + b, 0) - 2 * Math.PI * 56) < 1e-10);
    assert(Math.abs(lengths[0] / lengths[1] - 2) < 1e-10);
    let category = byLabel(tree, 'Voir les abonnements : Outils');
    assert.equal(category.props.style.minHeight, 44);
    category.props[platform === 'web' ? 'onHoverIn' : 'onPress']();
    tree = h.render();
    assert(byId(tree, 'stats-category-preview'));
    const detail = text(byId(tree, 'stats-category-preview'));
    assert(detail.includes(`${money(120)} payés une fois`));
    assert(detail.includes(`${money(10)}/mois amortis`));
    assert(detail.includes('Aucun prélèvement récurrent'));
    // Focus followed by click must not immediately close a newly opened detail.
    category = byLabel(tree, 'Voir les abonnements : Outils');
    category.props.onFocus(); category.props.onPress();
    tree = h.render();
    assert(byId(tree, 'stats-category-preview'));
    byLabel(tree, 'Voir Outil à vie.').props.onPress();
    assert.equal(h.routes.at(-1), '/(tabs)/subscriptions/2');
    byLabel(tree, 'Renseigner la date d’achat de Sans date').props.onPress();
    assert.equal(h.routes.at(-1), '/(tabs)/subscriptions/3/edit');
    byLabel(tree, 'Fermer les détails').props.onPress();
    tree = h.render();
    assert(!byId(tree, 'stats-category-preview'));
    byId(tree, 'stats-lifetime-toggle').props.onValueChange(false);
    tree = h.render();
    assert.equal(text(byId(tree, 'stats-category-total')), money(20));
    assert(!byLabel(tree, 'Voir les abonnements : Outils'));
    assert.equal(JSON.stringify(h.data), original);
  });
}

test('view selection, Plus downgrade, category updates and session remount keep the simulation coherent', () => {
  const h = harness('web', 320, 'dark');
  let tree = h.render();
  byId(tree, 'stats-lifetime-toggle').props.onValueChange(true);
  tree = h.render();
  byLabel(tree, 'Choisir une vue des statistiques').props.onPress();
  tree = h.render();
  byLabel(tree, 'Sans les peu utilisés').props.onPress();
  tree = h.render();
  assert.equal(byId(tree, 'stats-lifetime-toggle').props.value, true);
  assert.equal(text(byId(tree, 'stats-category-total')), money(20));
  assert(text(byId(tree, 'stats-excluded')).includes('Achat unique · aucun prélèvement évitable'));
  h.setPlus(false);
  tree = h.render();
  assert.equal(text(byId(tree, 'stats-category-total')), money(30));
  h.catalog.custom[0].name = 'Outils renommés';
  tree = h.render();
  assert(byLabel(tree, 'Voir les abonnements : Outils renommés'));
  h.data[1].category = 'music';
  tree = h.render();
  assert(!byLabel(tree, 'Voir les abonnements : Outils renommés'));
  assert.equal(text(byId(tree, 'stats-category-total')), money(30));
  assert(byId(tree, 'stats-category-ring').props.accessibilityLabel.includes('100 %'));
  h.setScope('account:2');
  tree = h.render();
  assert.equal(byId(tree, 'stats-lifetime-toggle').props.value, false);
  assert.equal(text(byId(tree, 'stats-category-total')), money(20));
});

test('lifetime-only empty state becomes analytical; old and undated purchases never create recurring spending', () => {
  const h = harness('ios', 320, 'light');
  h.data.splice(0, 1);
  let tree = h.render();
  assert.equal(text(byId(tree, 'stats-category-empty')), 'Aucune dépense récurrente dans cette vue.');
  byId(tree, 'stats-lifetime-toggle').props.onValueChange(true);
  tree = h.render();
  assert.equal(text(byId(tree, 'stats-category-total')), money(10));
  assert.equal(text(byId(tree, 'stats-current-amount')), money(0));
  h.data[0].purchaseDate = '2025-10-12';
  tree = h.render();
  assert(text(byId(tree, 'stats-category-empty')).includes('ni achat à vie amortissable'));
  assert(!byId(tree, 'stats-category-ring'));
  assert(!byId(tree, 'stats-category-insight'));
  assert(byId(tree, 'stats-lifetime-missing-dates'));
});
