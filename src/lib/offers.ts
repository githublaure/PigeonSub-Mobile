import { addDays, dayKey, parseDay } from './subscription-math';

export interface SavedOffer {
  id: string;
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
  return [
    {
      id: 'demo-voice',
      provider: 'ElevenLabs',
      title: 'Offre temporaire à suivre',
      code: '',
      url: '',
      expiresOn: dayKey(addDays(now, 6)),
      notes:
        'Exemple fictif. Dates, formule éligible et tarif après l’offre à vérifier chez le fournisseur.',
      used: false,
      demo: true,
    },
    {
      id: 'demo-design',
      provider: 'Studio créatif',
      title: '30 % sur la première année',
      code: 'EXEMPLE30',
      url: '',
      expiresOn: dayKey(addDays(now, 14)),
      notes: 'Coupon fictif pour découvrir le suivi.',
      used: false,
      demo: true,
    },
  ];
}
