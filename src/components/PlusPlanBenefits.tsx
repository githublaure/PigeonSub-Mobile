import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from './ui/Page';

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }> = [
  { icon: 'infinite-outline', title: 'Abonnements actifs illimités', detail: 'Au-delà des 5 abonnements inclus gratuitement.' },
  { icon: 'notifications-outline', title: 'Rappels sur tous vos abonnements', detail: 'Dates de sûreté et rappels au-delà de vos 5 abonnements gratuits.' },
  { icon: 'people-outline', title: 'Mode Famille', detail: 'Places, contributions reçues et reste à charge.' },
  { icon: 'stats-chart-outline', title: 'Comparaisons pour trouver quoi résilier', detail: 'Sans les peu utilisés, sans les notes 1–2 étoiles et vue combinée.' },
  { icon: 'images-outline', title: '10 justificatifs par abonnement', detail: 'Au lieu de 5 photos incluses gratuitement.' },
  { icon: 'cloud-upload-outline', title: 'Import CSV groupé', detail: 'Ajoutez plusieurs abonnements confirmés en une seule fois.' },
  { icon: 'image-outline', title: 'Icônes personnalisées', detail: 'Utilisez vos propres images pour reconnaître vos abonnements.' },
  { icon: 'time-outline', title: 'Historique de vos décisions', detail: 'Retrouvez vos choix de conservation et de résiliation.' },
];

export function PlusPlanBenefits({ compact = false }: { compact?: boolean }) {
  const { colors: c } = useTheme();
  const ui = useUI();
  return <View testID="plus-plan-benefits" style={compact ? { gap: 9 } : [ui.card, { borderColor: c.goldBorder, backgroundColor: c.goldSurface }]}>
    {!compact && <Text style={[ui.heading, { color: c.gold }]}>Tout ce qui est inclus avec Plus</Text>}
    {BENEFITS.map(item => <View key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
      <Ionicons name={item.icon} size={18} color={c.gold} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[ui.body, { color: c.text, fontWeight: '700' }]}>{item.title}</Text>
        {!compact && <Text style={ui.small}>{item.detail}</Text>}
      </View>
    </View>)}
  </View>;
}
