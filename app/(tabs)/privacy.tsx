import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { Page, useUI } from '../../src/components/ui/Page';
import { Button } from '../../src/components/ui/Button';
export default function PrivacyScreen() {
  const ui = useUI();

  const router = useRouter();
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
        transmis au serveur PigeonSub. Les décisions de résiliation et les
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
      <Button title="Retour" onPress={() => router.back()} />
    </Page>
  );
}
