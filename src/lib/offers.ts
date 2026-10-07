import { normalizeCategory } from './categories';
import { addDays, dayKey, parseDay } from './subscription-math';

export interface SavedOffer {
  id: string;
  category?: string;
  provider: string;
  title: string;
  code: string;
  url: string;
  expiresOn: string;
  notes: string;
  used: boolean;
  demo?: boolean;
}
export type OfferDraft = Omit<SavedOffer, 'id' | 'used' | 'demo'>;
export const emptyOffer = (): OfferDraft => ({
  category: 'other',
  provider: '',
  title: '',
  code: '',
  url: '',
  expiresOn: '',
  notes: '',
});
export function validateOffer(draft: OfferDraft): OfferDraft {
  const next = Object.fromEntries(
    Object.keys(emptyOffer()).map((key) => [
      key,
      String(draft[key as keyof OfferDraft] ?? '').trim(),
    ]),
  ) as unknown as OfferDraft;
  next.category = normalizeCategory(next.category);
  if (!next.provider || !next.title)
    throw new Error('Indiquez le service et la description de l’offre.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.expiresOn) || !parseDay(next.expiresOn))
    throw new Error('Indiquez une date de fin valide au format AAAA-MM-JJ.');
  if (next.url) {
    let url: URL;
    try {
      url = new URL(next.url);
    } catch {
      throw new Error('Le lien doit commencer par https://.');
    }
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password
    )
      throw new Error('Utilisez un lien HTTPS sans identifiants.');
  }
  return next;
}
export function offerDays(
  offer: Pick<SavedOffer, 'expiresOn'>,
  now = new Date(),
): number {
  const end = parseDay(offer.expiresOn);
  if (!end) return -1;
  return Math.round(
    (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000,
  );
}
export function offerLabel(offer: SavedOffer, now = new Date()): string {
  if (offer.used) return 'Utilisée';
  const days = offerDays(offer, now);
  return days < 0
    ? 'Expirée'
    : days === 0
      ? 'Dernier jour'
      : `Encore ${days} j`;
}
export function demoOffers(now = new Date()): SavedOffer[] {
  const examples = [
    ['demo-voice', 'Voix IA', 'Un mois de découverte', '', 6, false, 'Essai fictif : puis 5 € / mois si conservé.'],
    ['demo-design', 'Studio créatif', '30 % sur la première année', 'DEMO30', 14, false, 'Exemple : 84 € au lieu de 120 €, puis tarif annuel normal.'],
    ['demo-sport', 'Salle de sport', 'Frais d’inscription offerts', 'DEMOSPORT', 0, false, 'Dernier jour fictif. Ne modifie pas le prix mensuel.'],
    ['demo-books', 'Livres audio', 'Deux mois à moitié prix', 'DEMOLIRE', 3, false, 'Exemple : 4,98 € / mois pendant deux mois, puis 9,95 €.'],
    ['demo-cloud', 'Stockage photo', 'Trois mois offerts', 'DEMONUAGE', 21, false, 'Offre fictive pour les nouveaux comptes uniquement.'],
    ['demo-learn', 'Atelier langues', 'Deux semaines d’essai', '', 5, false, 'Essai à activer ; pensez à enregistrer sa date de fin une fois commencé.'],
    ['demo-used', 'Musique', 'Premier mois à prix réduit', 'DEMOMUSIC', 10, true, 'Exemple déjà marqué utilisé dans le carnet.'],
    ['demo-expired', 'Presse numérique', '20 % sur un abonnement annuel', 'DEMOPRESSE', -3, false, 'Exemple expiré, conservé dans Toutes.'],
  ] as const;
  return examples.map(([id, provider, title, code, days, used, notes]) => ({
    id, provider, title, code, url: '', expiresOn: dayKey(addDays(now, days)),
    notes, used, demo: true, category: ({ 'demo-voice': 'productivity', 'demo-design': 'design', 'demo-sport': 'health', 'demo-books': 'entertainment', 'demo-cloud': 'cloud', 'demo-learn': 'education', 'demo-used': 'music', 'demo-expired': 'news' } as Record<string, string>)[id],
  }));
}
