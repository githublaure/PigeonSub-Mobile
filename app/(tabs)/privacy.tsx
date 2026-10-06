import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { exportMyData } from '../../src/lib/data-export';
import { Text, View, Switch } from 'react-native';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
export default function PrivacyScreen() {
  const ui = useUI();

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState(false);
  const [message, setMessage] = useState('');
  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      setMessage(await exportMyData(photos));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Export impossible.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page title="Vos données dans PigeonSub">
      <Text style={ui.body}>
        Sans compte, vos abonnements, décisions et réglages de rappel sont
        enregistrés sur cet appareil. La démo utilise des données fictives
        séparées. Leur suppression ou la désinstallation de l’app peut les
        effacer.
      </Text>
      <Text style={ui.body}>
        Avec un compte, vos informations de compte et vos abonnements sont
        transmis au serveur PigeonSub. Les données créées sans compte restent séparées et ne sont pas importées automatiquement. Les décisions de résiliation et les
        réglages de rappel de cette version restent sur cet appareil. La
        suppression de compte est disponible dans Profil.
      </Text>
      <Text style={ui.body}>
        Les notifications locales nécessitent votre autorisation et peuvent
        afficher le nom d’un abonnement sur votre écran verrouillé. Vous pouvez
        les désactiver dans les réglages de l’appareil.
      </Text>
      <Text style={ui.body}>
        Les achats sont traités par votre boutique et RevenueCat pour vérifier
        votre accès Plus. PigeonSub ne reçoit pas votre numéro de carte
        bancaire. Aucun achat n’est effectué dans la démo.
      </Text>
      <Text style={ui.body}>
        PigeonSub ne se connecte pas à votre banque et ne résilie pas vos
        contrats. Les coûts et économies sont calculés à partir des informations
        que vous saisissez.
      </Text>
      <View style={ui.card}>
        <Text style={ui.heading}>Exporter mes données · gratuit</Text>
        <Text style={ui.body}>
          Récupérez vos abonnements, archives, décisions, réglages et coupons
          dans un fichier JSON lisible. Seul l’espace actuellement ouvert est
          exporté.
        </Text>
        <View style={ui.row}>
          <Switch
            accessibilityLabel="Inclure mes photos dans l’export"
            value={photos}
            onValueChange={setPhotos}
            disabled={busy}
          />
          <Text style={[ui.body, { flex: 1 }]}>
            Inclure les photos enregistrées sur cet appareil
          </Text>
        </View>
        <Text style={ui.small}>
          Le fichier contient vos données personnelles : choisissez où le
          conserver. Les anciennes photos accessibles par un lien restent des
          liens. L’import automatique n’est pas encore disponible.
        </Text>
        <Button
          title="Exporter mes données"
          loading={busy}
          onPress={() => void save()}
        />
        {message ? (
          <Text accessibilityRole="alert" style={ui.body}>
            {message}
          </Text>
        ) : null}
      </View>
      <Button title="Retour" onPress={() => router.back()} />
    </Page>
  );
}
