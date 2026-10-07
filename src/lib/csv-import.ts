import type { Subscription } from './api';
import { dayKey, nextRenewal, parseDay } from './subscription-math';

export const MAX_CSV_LENGTH = 500_000;
export const CSV_EXAMPLE = 'Date;Libellé;Montant\n01/05/2026;Musique exemple;-9,99\n01/06/2026;Musique exemple;-9,99\n01/07/2026;Musique exemple;-9,99\n04/05/2026;Vidéo exemple;-12,99\n04/06/2026;Vidéo exemple;-12,99\n04/07/2026;Vidéo exemple;-14,99\n06/07/2026;Courses ponctuelles;-42,50\n08/07/2026;Remboursement;9,99';
export type CsvTable = { headers: string[]; rows: string[][]; delimiter: string };
export type CsvMapping = { date: number; label: number; amount: number; debits: 'negative' | 'positive' };
export type ImportCandidate = { id: string; name: string; price: string; frequency: 'weekly' | 'monthly' | 'yearly'; nextRenewal: string; occurrences: number; variable: boolean };
export const normalizedName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim();

export function parseCsv(text: string): CsvTable {
  if (!text.trim()) throw new Error('Le fichier est vide.');
  if (text.length > MAX_CSV_LENGTH) throw new Error('Choisissez un CSV de moins de 500 Ko.');
  text = text.replace(/^\uFEFF/, '');
  let delimiter = '';
  const sep = /^sep=([;,\t])\r?\n/i.exec(text);
  if (sep) { delimiter = sep[1]; text = text.slice(sep[0].length); }
  if (!delimiter) {
    const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '"') { if (quoted && text[i + 1] === '"') i++; else quoted = !quoted; }
      else if (!quoted && /[\r\n]/.test(text[i])) break;
      else if (!quoted && text[i] in counts) counts[text[i]]++;
    }
    delimiter = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    if (!counts[delimiter]) throw new Error('Le CSV doit contenir une ligne d’en-têtes et au moins trois colonnes.');
  }
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, closed = false;
  const pushCell = () => { row.push(cell.trim()); cell = ''; closed = false; if (row.length > 50) throw new Error('Le CSV contient trop de colonnes (50 maximum).'); };
  const pushRow = () => { pushCell(); if (row.some(Boolean)) rows.push(row); row = []; if (rows.length > 2001) throw new Error('Le prototype accepte 2 000 lignes maximum.'); };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
      else cell += ch;
    } else if (ch === delimiter) pushCell();
    else if (ch === '\r' || ch === '\n') { if (ch === '\r' && text[i + 1] === '\n') i++; pushRow(); }
    else if (ch === '"' && !cell && !closed) quoted = true;
    else { if (closed && ch.trim() || ch === '"') throw new Error('Guillemets CSV invalides. Vérifiez le fichier.'); cell += ch; }
  }
  if (quoted) throw new Error('Une cellule entre guillemets n’est pas fermée.');
  if (cell || row.length || closed) pushRow();
  const headers = rows.shift();
  if (!headers || headers.length < 3 || !rows.length) throw new Error('Ajoutez des en-têtes et au moins une ligne de transactions.');
  if (rows.some(r => r.length !== headers.length)) throw new Error('Les lignes n’ont pas toutes le même nombre de colonnes. Vérifiez le séparateur et les guillemets.');
  return { headers, rows, delimiter };
}

export function suggestCsvMapping(headers: string[]): CsvMapping {
  const normalized = headers.map(normalizedName);
  const find = (choices: string[]) => normalized.findIndex(h => choices.includes(h));
  const amount = find(['montant', 'amount', 'debit', 'debits', 'montant eur', 'montant (eur)']);
  return { date: find(['date', 'date operation', "date d'operation", 'date de transaction', 'transaction date']), label: find(['libelle', 'label', 'description', 'operation', 'nom', 'name']), amount, debits: normalized[amount]?.includes('debit') ? 'positive' : 'negative' };
}
export function parseTransactionAmount(value: string): number | null {
  let s = value.trim().replace(/(?:EUR|€)/gi, '').replace(/[\s\u00a0\u202f]/g, '');
  if (/^\(.*\)$/.test(s)) s = '-' + s.slice(1, -1);
  if (/^[+-]?\d{1,3}(?:\.\d{3})+,\d{2}$/.test(s)) s = s.replace(/\./g, '');
  else if (/^[+-]?\d{1,3}(?:,\d{3})+\.\d{2}$/.test(s)) s = s.replace(/,/g, '');
  if (!/^[+-]?\d+(?:[.,]\d{1,2})?$/.test(s)) return null;
  const number = Number(s.replace(',', '.'));
  return Number.isFinite(number) && Math.abs(number) <= 1_000_000 ? number : null;
}
export function parseTransactionDate(value: string): string | null {
  const raw = value.trim(), fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  const iso = fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : raw;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && parseDay(iso) ? iso : null;
}
export function analyzeCsv(table: CsvTable, mapping: CsvMapping, now = new Date()) {
  const columns = [mapping.date, mapping.label, mapping.amount];
  if (columns.some(v => !Number.isInteger(v) || v < 0 || v >= table.headers.length) || new Set(columns).size !== 3)
    throw new Error('Choisissez trois colonnes distinctes : date, libellé et montant.');
  const currencyColumn = table.headers.findIndex(header => ['devise', 'currency', 'currency code'].includes(normalizedName(header)));
  const groups = new Map<string, { name: string; transactions: { date: string; amount: number }[] }>();
  const seen = new Set<string>();
  let invalid = 0, credits = 0, duplicates = 0;
  for (const row of table.rows) {
    const date = parseTransactionDate(row[mapping.date]), amount = parseTransactionAmount(row[mapping.amount]), name = row[mapping.label].trim();
    if ((currencyColumn >= 0 && !['EUR', '€'].includes(row[currencyColumn].trim().toUpperCase())) || !date || date > dayKey(now) || amount === null || !name || name.length > 120) { invalid++; continue; }
    if (amount === 0 || (mapping.debits === 'negative' ? amount > 0 : amount < 0)) { credits++; continue; }
    const label = normalizedName(name), identity = JSON.stringify([label, date, amount]);
    if (seen.has(identity)) { duplicates++; continue; }
    seen.add(identity);
    if (!groups.has(label)) groups.set(label, { name, transactions: [] });
    groups.get(label)!.transactions.push({ date, amount: Math.abs(amount) });
  }
  const candidates: ImportCandidate[] = [];
  let notRecurring = 0;
  for (const [id, group] of groups) {
    const items = group.transactions.sort((a, b) => a.date.localeCompare(b.date));
    const intervals = items.slice(1).map((item, i) => (Date.parse(item.date) - Date.parse(items[i].date)) / 86400000);
    const frequency = intervals.length && intervals.every(d => d >= 6 && d <= 8) ? 'weekly'
      : intervals.length && intervals.every(d => d >= 26 && d <= 35) ? 'monthly'
      : intervals.length && intervals.every(d => d >= 350 && d <= 380) ? 'yearly' : null;
    if (!frequency) { notRecurring++; continue; }
    const last = items[items.length - 1];
    const next = nextRenewal({ frequency, nextRenewal: last.date, isActive: true, isTrial: false } as Subscription, now);
    candidates.push({ id, name: group.name, price: last.amount.toFixed(2), frequency, nextRenewal: next ? dayKey(next) : '', occurrences: items.length, variable: items.some(item => item.amount !== last.amount) });
  }
  return { candidates, invalid, credits, duplicates, notRecurring };
}
export function matchesExisting(candidate: Pick<ImportCandidate, 'name' | 'price' | 'frequency'>, subscriptions: Subscription[]) {
  return subscriptions.some(sub => normalizedName(sub.name) === normalizedName(candidate.name) && sub.frequency === candidate.frequency && Math.abs(Number(sub.price.replace(',', '.')) - Number(candidate.price.replace(',', '.'))) < 0.005);
}
export function validateImportCandidate(candidate: ImportCandidate) {
  const amount = parseTransactionAmount(candidate.price), date = parseTransactionDate(candidate.nextRenewal);
  if (!candidate.name.trim() || candidate.name.trim().length > 120 || amount === null || amount <= 0 || !date || !['weekly', 'monthly', 'yearly'].includes(candidate.frequency))
    throw new Error('Vérifiez le nom, un prix positif, la fréquence et la prochaine échéance de chaque abonnement sélectionné.');
  return { name: candidate.name.trim(), price: amount.toFixed(2), frequency: candidate.frequency, nextRenewal: date, category: 'other', categoryColor: '#7C3AED', usageFrequency: 'used', isActive: true, isTrial: false, useSafetyDate: false, safetyDate: null };
}
