import { hasSevenDayTrial } from '../../src/lib/billing-policy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useBilling } from '../../src/contexts/BillingContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/components/ui/Button';
import { Page, ui } from '../../src/components/ui/Page';
import { Colors } from '../../src/theme/colors';
const PLANS = [
  {
    type: 'ANNUAL',
    title: 'Plus annuel',
    price: '19,99 € / an',
    detail: 'Soit environ 1,67 € / mois',
    badge: 'L’offre recommandée',
  },
  {
    type: 'MONTHLY',
    title: 'Plus mensuel',
    price: '2,99 € / mois',
    detail: 'Facturation mensuelle',
    badge: '',
  },
  {
    type: 'LIFETIME',
    title: 'Fondateur à vie',
    price: '34,99 € une fois',
    detail: 'Un achat unique pour les fonctions Plus',
    badge: 'Offre de lancement',
  },
];
export default function PremiumScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { mode } = useAuth();
  const billing = useBilling();
  const [selected, setSelected] = useState('ANNUAL');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const item = billing.packages.find((p) => p.packageType === selected);
  const trial = hasSevenDayTrial(item, billing.trialEligible);
  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
  const validPrivacyUrl = !!privacyUrl && /^https:\/\//.test(privacyUrl);
  const action = async (restore = false) => {
    setBusy(true);
    setMessage('');
    try {
      const success = restore
        ? await billing.restore()
        : item
          ? await billing.purchase(item)
          : false;
      setMessage(
        success
          ? 'PigeonSub Plus est actif. Vos fonctionnalités sont débloquées.'
          : restore
            ? 'Aucun achat Plus actif à restaurer avec ce compte Store.'
            : 'Achat en attente de validation. Plus sera activé après confirmation de la boutique.',
      );
    } catch (e) {
      if (
        !(e && typeof e === 'object' && 'userCancelled' in e && e.userCancelled)
      )
        setMessage(
          e instanceof Error ? e.message : 'L’achat n’a pas abouti. Réessayez.',
        );
    } finally {
      setBusy(false);
    }
  };
  const exit = () => router.back();
  return (
    <Page
      title="Gardez la main avant le jour J."
      subtitle={
        reason === 'limit'
          ? 'Vos 5 abonnements gratuits restent accessibles. Passez à Plus pour en suivre davantage.'
          : 'Une date de sûreté à votre rythme. Moins d’oublis, des économies suivies.'
      }
    >
      <Button
        title="Continuer gratuitement"
        variant="ghost"
        onPress={exit}
        disabled={busy}
      />
      {mode === 'demo' && (
        <Text style={[ui.body, ui.warning]}>
          Aperçu des offres. Aucun achat n’est possible en démo.
        </Text>
      )}
      <View style={ui.card}>
        <Text style={ui.heading}>Gratuit · 0 €</Text>
        <Text style={ui.body}>
          5 abonnements actifs · totaux mensuel et annuel · calendrier · un
          rappel standard par abonnement · premier bilan d’économies.
        </Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Avec PigeonSub Plus</Text>
        <Text style={ui.body}>
          ✓ Abonnements illimités{'\n'}✓ Avance de rappel personnalisée{'\n'}✓
          Preuves et historique de vos résiliations{'\n'}✓ Suivi des économies
          potentielles et confirmées
        </Text>
      </View>
      {PLANS.filter(
        (plan) =>
          !billing.ready ||
          plan.type !== 'LIFETIME' ||
          billing.packages.some((p) => p.packageType === 'LIFETIME'),
      ).map((plan) => {
        const pkg = billing.packages.find((p) => p.packageType === plan.type);
        const price = pkg
          ? `${pkg.product.priceString}${plan.type === 'ANNUAL' ? ' / an' : plan.type === 'MONTHLY' ? ' / mois' : ' une fois'}`
          : plan.price;
        const detail =
          plan.type === 'ANNUAL' && pkg
            ? `Soit environ ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: pkg.product.currencyCode }).format(pkg.product.price / 12)} / mois, facturé à l’année`
            : plan.detail;
        return (
          <Pressable
            key={plan.type}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === plan.type }}
            onPress={() => setSelected(plan.type)}
            style={[
              ui.card,
              selected === plan.type && {
                borderColor: Colors.primary,
                borderWidth: 2,
                backgroundColor: '#261544',
              },
            ]}
          >
            {!!plan.badge && (
              <Text style={[ui.label, { color: Colors.textSecondary }]}>
                {plan.badge}
              </Text>
            )}
            <Text style={ui.heading}>{plan.title}</Text>
            <Text style={ui.heading}>{price}</Text>
            <Text style={ui.small}>{detail}</Text>
            {!pkg && (
              <Text style={ui.small}>
                Tarif prévu · offre indisponible dans cette version
              </Text>
            )}
          </Pressable>
        );
      })}
      {billing.isPlus ? (
        <Text style={[ui.heading, ui.success]}>
          Votre accès Plus est actif.
        </Text>
      ) : (
        <>
          {trial && (
            <Text style={ui.body}>
              7 jours gratuits, puis {item?.product.priceString}
              {selected === 'ANNUAL' ? ' par an' : ' par mois'}. Offre réservée
              aux comptes éligibles.
            </Text>
          )}
          <Button
            title={
              trial
                ? 'Essayer 7 jours gratuitement'
                : selected === 'LIFETIME'
                  ? 'Choisir Fondateur à vie'
                  : 'Passer à Plus'
            }
            loading={busy || billing.loading}
            disabled={
              !item || !billing.ready || !validPrivacyUrl || mode === 'demo'
            }
            onPress={() => void action()}
          />
        </>
      )}
      {!!billing.error && <Text style={ui.small}>{billing.error}</Text>}
      {!!billing.error &&
        (billing.ready || billing.error.includes('connexion')) && (
          <Button
            title="Réessayer la boutique"
            variant="secondary"
            disabled={busy || billing.loading}
            onPress={billing.retry}
          />
        )}
      {!validPrivacyUrl && (
        <Text style={ui.small}>
          Les achats seront ouverts lorsque les informations de l’offre seront
          finalisées. Le mode gratuit est disponible.
        </Text>
      )}
      <Text style={ui.small}>
        {selected === 'LIFETIME'
          ? 'Achat unique, sans renouvellement. Offre proposée tant qu’elle est disponible dans la boutique.'
          : 'Paiement via votre compte Store. Renouvellement automatique sauf annulation au moins 24 h avant la fin de la période en cours ou de l’essai. Gérez ou annulez dans les abonnements de votre compte Store.'}
      </Text>
      <Text style={ui.small}>
        Les tarifs affichés par la boutique et son écran de confirmation font
        foi. Aucun essai ne démarre sans validation de l’achat.
      </Text>
      <Button
        title="Restaurer mes achats"
        variant="secondary"
        disabled={!billing.ready || busy || mode === 'demo'}
        onPress={() => void action(true)}
      />
      <Button
        title="Gérer mon abonnement"
        variant="ghost"
        onPress={() =>
          void Linking.openURL(
            Platform.OS === 'ios'
              ? 'https://apps.apple.com/account/subscriptions'
              : 'https://play.google.com/store/account/subscriptions',
          )
        }
      />
      {message ? (
        <Text accessibilityRole="alert" style={ui.body}>
          {message}
        </Text>
      ) : null}
      <View style={ui.row}>
        <Button
          title="Confidentialité"
          variant="ghost"
          onPress={() =>
            validPrivacyUrl
              ? void Linking.openURL(privacyUrl!)
              : router.push('/(tabs)/privacy')
          }
        />
        <Button
          title="Conditions d’utilisation"
          variant="ghost"
          onPress={() =>
            void Linking.openURL(
              'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
            )
          }
        />
      </View>
      <Button
        title="Revenir à mes abonnements"
        variant="secondary"
        onPress={exit}
        disabled={busy}
      />
    </Page>
  );
}
