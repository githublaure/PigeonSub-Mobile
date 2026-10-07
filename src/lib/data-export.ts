import { getSubscriptionIcon } from './subscription-icon-store';
import { Platform } from 'react-native';
import { subscriptions, settings, roadmapVotes } from './api';
import { getDataSession, getFollowUps, getSavedOffers } from './local-data';
import { getPhotos } from './subscription-photos';

export async function exportMyData(includePhotos = false): Promise<string> {
  const session = getDataSession();
  if (session.mode === 'none')
    throw new Error('Ouvrez votre espace avant d’exporter.');
  const [rows, follow, offers, preferences, votes] = await Promise.all([
    subscriptions.list(true),
    getFollowUps(session.scope),
    getSavedOffers(session.scope),
    settings.get(),
    roadmapVotes.get(),
  ]);
  const photos: Record<string, Awaited<ReturnType<typeof getPhotos>>> = {};
  const icons: Record<string, string> = {};
  if (includePhotos)
    for (const sub of rows) {
      photos[sub.id] = await getPhotos(session.scope, sub);
      const icon = await getSubscriptionIcon(session.scope, sub.id);
      if (icon) icons[sub.id] = icon;
    }
  if (
    getDataSession().scope !== session.scope ||
    getDataSession().mode !== session.mode
  )
    throw new Error(
      'La session a changé. Relancez l’export depuis votre espace.',
    );
  // Explicit data sources only: never export tokens, purchase credentials, or another account's storage.
  const content = JSON.stringify(
    {
      format: 'pigeonsub-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      mode: session.mode,
      subscriptions: rows.map((sub) => ({
        ...sub,
        purchaseProofImage: includePhotos ? sub.purchaseProofImage : null,
        unsubscribeProofImage: includePhotos ? sub.unsubscribeProofImage : null,
      })),
      followUps: follow,
      offers,
      roadmapVotes: votes,
      settings: preferences,
      photosIncluded: includePhotos,
      ...(includePhotos ? { photos, icons } : {}),
      notes:
        'Données déclaratives. Les anciennes pièces jointes par URL restent des liens. L’import automatique n’est pas disponible dans cette version.',
    },
    null,
    2,
  );
  const filename = `pigeonsub-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(
      new Blob([content], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return 'Téléchargement demandé. Vérifiez le fichier dans vos téléchargements.';
  }
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      'Le partage de fichiers est indisponible sur cet appareil.',
    );
  const file = new File(Paths.cache, filename);
  try {
    file.create();
    file.write(content);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Enregistrer mes données PigeonSub',
    });
    return 'Vérifiez que vous avez enregistré le fichier dans Fichiers ou à l’emplacement choisi.';
  } finally {
    if (file.exists) file.delete();
  }
}
