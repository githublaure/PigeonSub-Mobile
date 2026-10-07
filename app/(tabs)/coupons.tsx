import { GuideAnchor } from '../../src/components/guide/GuideScrollView';
import { DatePickerField } from '../../src/components/forms/DatePickerField';
import { useLocalSearchParams } from 'expo-router';
import { TrialsList } from '../../src/components/TrialsList';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
import { LoadingScreen } from '../../src/components/ui/LoadingScreen';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { useSavedOffers } from '../../src/hooks/useSavedOffers';
import { changeOffer, saveOffer } from '../../src/lib/local-data';
import {
  emptyOffer,
  offerDays,
  offerLabel,
  validateOffer,
  type OfferDraft,
  type SavedOffer,
} from '../../src/lib/offers';
import { parseDay, shortDate } from '../../src/lib/subscription-math';

type Filter = 'saved' | 'soon' | 'all';
export default function CouponsScreen() {
  const ui = useUI();
  const { colors: c } = useTheme();
  const { scope, mode } = useAuth();
  const { offers, loading, error, reload } = useSavedOffers();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [section, setSection] = useState(
    view === 'trials' ? 'trials' : 'coupons',
  );
  useEffect(() => {
    if (view === 'trials' || view === 'coupons') setSection(view);
  }, [view]);
  const [filter, setFilter] = useState<Filter>('saved');
  const [draft, setDraft] = useState<OfferDraft | null>(null);
  const [editing, setEditing] = useState<string>();
  const [removing, setRemoving] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  useEffect(() => {
    setDraft(null);
    setEditing(undefined);
    setRemoving(undefined);
    setNotice('');
    setFailure('');
  }, [scope]);
  const run = async (task: () => Promise<void>, message = '') => {
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await task();
      setNotice(message);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };
  const edit = (offer?: SavedOffer) => {
    setEditing(offer?.id);
    setDraft(
      offer
        ? {
            provider: offer.provider,
            title: offer.title,
            code: offer.code,
            url: offer.url,
            expiresOn: offer.expiresOn,
            notes: offer.notes,
          }
        : emptyOffer(),
    );
    setFailure('');
    setNotice('');
  };
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const available = offers.filter((o) => !o.used && offerDays(o) >= 0);
  const rows = offers
    .filter(
      (o) =>
        filter === 'all' ||
        (!o.used &&
          offerDays(o) >= 0 &&
          (filter !== 'soon' || offerDays(o) <= 7)),
    )
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  return (
    <Page
      title={
        draft
          ? editing
            ? 'Modifier l’offre'
            : 'Ajouter une offre'
          : 'Essais & coupons'
      }
      subtitle={
        draft
          ? 'Un code ou une offre temporaire à garder en vue.'
          : section === 'trials'
            ? 'Anticipez la fin de vos périodes gratuites.'
            : 'Des réductions sur ce que vous gardez vraiment.'
      }
    >
      {!draft && (
        <GuideAnchor id="offers-content"><View style={ui.row}>
          <Button
            title="Essais gratuits"
            variant={section === 'trials' ? 'primary' : 'secondary'}
            onPress={() => setSection('trials')}
            style={{ flex: 1 }}
          />
          <Button
            title="Coupons"
            variant={section === 'coupons' ? 'primary' : 'secondary'}
            onPress={() => setSection('coupons')}
            style={{ flex: 1 }}
          />
        </View></GuideAnchor>
      )}
      {!draft && section === 'trials' ? (
        <TrialsList />
      ) : draft ? (
        <>
          {(
            [
              ['provider', 'Service', 'Ex. ElevenLabs'],
              ['title', 'Offre', 'Ex. Deux semaines offertes'],
              ['expiresOn', 'Date de fin', ''],
              ['code', 'Code promo (facultatif)', 'Votre code'],
              ['url', 'Lien de l’offre (facultatif)', 'https://…'],
              [
                'notes',
                'Conditions et tarif après l’offre',
                'Formule éligible, renouvellement, préavis…',
              ],
            ] as const
          ).map(([field, label, placeholder]) =>
            field === 'expiresOn' ? (
              <DatePickerField
                key={field}
                label={label}
                value={draft.expiresOn}
                onChange={(value) => setDraft({ ...draft, expiresOn: value })}
              />
            ) : (
              <View key={field} style={{ gap: 7 }}>
                <Text style={ui.label}>{label}</Text>
                <TextInput
                  accessibilityLabel={label}
                  value={draft[field]}
                  onChangeText={(value) =>
                    setDraft({ ...draft, [field]: value })
                  }
                  placeholder={placeholder}
                  placeholderTextColor={c.textMuted}
                  style={ui.input}
                  autoCapitalize={field === 'url' ? 'none' : 'sentences'}
                  autoCorrect={field !== 'url' && field !== 'code'}
                  keyboardType={field === 'url' ? 'url' : 'default'}
                  multiline={field === 'notes'}
                  maxLength={field === 'notes' ? 1000 : 500}
                />
              </View>
            ),
          )}
          {!!failure && (
            <Text accessibilityRole="alert" style={ui.error}>
              {failure}
            </Text>
          )}
          <Button
            title="Enregistrer l’offre"
            loading={busy}
            onPress={() =>
              void run(async () => {
                await saveOffer(draft, editing);
                setDraft(null);
                setFilter('all');
              }, 'Offre enregistrée.')
            }
          />
          <Button
            title="Annuler"
            variant="ghost"
            disabled={busy}
            onPress={() => setDraft(null)}
          />
        </>
      ) : (
        <>
          <View
            style={[
              ui.card,
              {
                backgroundColor: c.goldSurface,
                borderColor: c.goldBorder,
                flexDirection: 'row',
                alignItems: 'center',
              },
            ]}
          >
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={[ui.label, { color: c.gold }]}>
                VOTRE CARNET D’OFFRES
              </Text>
              <Text style={[ui.value, { color: c.gold }]}>
                {available.length}{' '}
                <Text style={{ fontSize: 18 }}>à suivre</Text>
              </Text>
              <Text style={ui.small}>
                Gardez les bonnes dates, sans multiplier les abonnements.
              </Text>
            </View>
            <Image
              source={require('../../assets/mascots/pigeon-money-bag.png')}
              style={{ width: 80, height: 95 }}
              resizeMode="contain"
              accessible={false}
            />
          </View>
          <Button title="+ Ajouter une offre" onPress={() => edit()} />
          <View style={[ui.row, { gap: 5 }]}>
            {(
              [
                ['saved', 'À suivre'],
                ['soon', 'Fin sous 7 j'],
                ['all', 'Toutes'],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ checked: filter === value }}
                aria-checked={filter === value}
                onPress={() => setFilter(value)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 18,
                  backgroundColor:
                    filter === value ? c.primary : c.surfaceRaised,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: filter === value ? c.white : c.textSecondary,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {!!notice && (
            <Text
              accessibilityLiveRegion="polite"
              style={[ui.small, ui.success]}
            >
              {notice}
            </Text>
          )}
          {!!failure && (
            <Text accessibilityRole="alert" style={ui.error}>
              {failure}
            </Text>
          )}
          {!rows.length && (
            <View style={ui.card}>
              <Ionicons name="ticket-outline" size={30} color={c.primary} />
              <Text style={ui.heading}>Aucune offre ici pour le moment.</Text>
              <Text style={ui.body}>
                Enregistrez une offre repérée avec sa date limite, même si elle
                n’a pas de code promo.
              </Text>
            </View>
          )}
          {rows.map((offer) => {
            const expired = offerDays(offer) < 0;
            return (
              <View
                key={offer.id}
                style={[
                  ui.card,
                  (expired || offer.used) && {
                    backgroundColor: c.archiveBackground,
                    borderColor: c.archiveBorder,
                  },
                ]}
              >
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <Text style={[ui.heading, { flexShrink: 1 }]}>
                    {offer.provider}
                  </Text>
                  <Text
                    style={[
                      ui.pill,
                      {
                        color: expired || offer.used ? c.archiveText : c.gold,
                        backgroundColor:
                          expired || offer.used
                            ? c.archiveBackground
                            : c.goldSoft,
                      },
                    ]}
                  >
                    {offerLabel(offer)}
                  </Text>
                </View>
                {offer.demo && (
                  <Text style={[ui.small, { color: c.primary }]}>
                    Démo · offre fictive
                  </Text>
                )}
                <Text style={ui.body}>{offer.title}</Text>
                <Text style={ui.small}>
                  Fin de l’offre : {shortDate(parseDay(offer.expiresOn))}{' '}
                  {offer.expiresOn.slice(0, 4)}
                </Text>
                {!!offer.code && (
                  <View
                    style={[
                      ui.row,
                      {
                        padding: 10,
                        backgroundColor: c.goldSoft,
                        borderRadius: 12,
                      },
                    ]}
                  >
                    <Text
                      selectable
                      style={[ui.heading, { flex: 1, fontSize: 16 }]}
                    >
                      {offer.code}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Copier le code ${offer.code}`}
                      disabled={busy}
                      onPress={() =>
                        void run(async () => {
                          const ok = await Clipboard.setStringAsync(offer.code);
                          if (!ok)
                            throw new Error(
                              'Copie indisponible : sélectionnez le code pour le copier.',
                            );
                        }, 'Code copié.')
                      }
                      style={{ padding: 10 }}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={21}
                        color={c.primary}
                      />
                    </Pressable>
                  </View>
                )}
                {!!offer.notes && <Text style={ui.small}>{offer.notes}</Text>}
                {!!offer.url && (
                  <Button
                    title="Voir l’offre"
                    variant="secondary"
                    disabled={busy}
                    onPress={() =>
                      void run(async () => {
                        validateOffer(offer);
                        await Linking.openURL(offer.url);
                      })
                    }
                  />
                )}
                <View style={ui.row}>
                  {!expired && (
                    <Button
                      title={
                        offer.used ? 'À suivre de nouveau' : 'Marquer utilisée'
                      }
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onPress={() =>
                        void run(() =>
                          changeOffer(offer.id, offer.used ? 'saved' : 'used'),
                        )
                      }
                    />
                  )}
                  <Button
                    title="Modifier"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    accessibilityLabel={`Modifier l’offre ${offer.provider}`}
                    onPress={() => edit(offer)}
                  />
                  <Button
                    title="Supprimer"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    accessibilityLabel={`Supprimer l’offre ${offer.provider}`}
                    onPress={() => setRemoving(offer.id)}
                  />
                </View>
                {removing === offer.id && (
                  <View style={{ gap: 8 }}>
                    <Text style={ui.body}>
                      Supprimer cette offre du carnet ?
                    </Text>
                    <Button
                      title="Confirmer la suppression"
                      variant="danger"
                      disabled={busy}
                      onPress={() =>
                        void run(async () => {
                          await changeOffer(offer.id, 'delete');
                          setRemoving(undefined);
                        })
                      }
                    />
                    <Button
                      title="Conserver cette offre"
                      variant="ghost"
                      onPress={() => setRemoving(undefined)}
                    />
                  </View>
                )}
              </View>
            );
          })}
          <Text style={ui.small}>
            {mode === 'demo'
              ? 'Ces exemples sont fictifs.'
              : 'Offres enregistrées sur cet appareil, séparément pour chaque compte.'}{' '}
            Les conditions sont à vérifier chez le fournisseur. Marquer une
            offre utilisée ne valide pas une économie. Les dates sont suivies
            ici ; aucune notification automatique n’est envoyée.
          </Text>
        </>
      )}
    </Page>
  );
}
