export function cancellationUrl(value: string): string {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' && !url.username && !url.password)
      return url.href;
  } catch {}
  throw new Error(
    'Saisissez un lien https:// valide, sans identifiant ni mot de passe.',
  );
}
