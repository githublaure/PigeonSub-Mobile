const COPY: Record<string, { title: string; free: string; plus: string }> = {
  limit: { title: 'Suivez tous vos abonnements', free: '5 abonnements actifs, essais compris, sont inclus gratuitement.', plus: 'Plus permet de suivre un nombre illimité d’abonnements et d’essais.' },
  import: { title: 'Ajoutez vos abonnements en une fois', free: 'Analyse locale du CSV et ajout individuel dans la limite de vos 5 abonnements actifs gratuits.', plus: 'Plus permet d’importer plusieurs abonnements confirmés en une fois. Le prototype CSV ne fait aucun ajout sans votre validation.' },
  icons: { title: 'Donnez votre style à vos abonnements', free: 'Une icône par défaut accompagne chaque abonnement.', plus: 'Plus permet d’importer vos propres photos comme icônes d’abonnement.' },
  photos: { title: 'Gardez davantage de justificatifs', free: '5 photos sont incluses pour chacun de vos 5 abonnements gratuits.', plus: 'Plus permet davantage de photos par abonnement, sur tous vos abonnements.' },
  safety: { title: 'Protégez toutes vos échéances', free: 'Les dates de sûreté personnalisées et rappels sont inclus pour vos 5 abonnements gratuits.', plus: 'Plus étend ces réglages à tous vos abonnements. Les notifications nécessitent votre autorisation sur l’appareil.' },
  history: { title: 'Retrouvez vos décisions', free: 'Vous pouvez conserver, demander une résiliation et confirmer son arrêt gratuitement.', plus: 'Plus donne accès à l’historique des décisions et résiliations de chaque abonnement.' },
  stats: { title: 'Comparez vos budgets possibles', free: 'Budget, projection, catégories et vue après résiliations sont gratuits.', plus: 'Plus ajoute les vues sans les peu utilisés, sans les notes de 1 à 2 étoiles et la vue combinée.' },
};
export function premiumCopy(reason?: string) {
  return COPY[reason ?? ''] ?? { title: 'Passez à PigeonSub Plus', free: 'Le suivi de 5 abonnements, le budget, les essais et les coupons restent gratuits.', plus: 'Abonnements illimités, simulations avancées, icônes photo, davantage de justificatifs et historique de vos décisions.' };
}
