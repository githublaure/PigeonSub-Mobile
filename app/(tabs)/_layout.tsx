import { useTheme } from '../../src/contexts/ThemeContext';
import type { Palette } from '../../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Image, ImageSourcePropType } from 'react-native';

type IoniconName = keyof typeof Ionicons.glyphMap;
type PigeonTabIconPair = {
  filled: ImageSourcePropType;
  outline: ImageSourcePropType;
};

const DASHBOARD_ICONS: PigeonTabIconPair = {
  filled: require('../../assets/icons/navigation/plume-tab-filled.png'),
  outline: require('../../assets/icons/navigation/plume-tab-outline.png'),
};

const CALENDAR_ICONS: PigeonTabIconPair = {
  filled: require('../../assets/icons/navigation/security-calendar-filled.png'),
  outline: require('../../assets/icons/navigation/security-calendar-outline.png'),
};

function tabIcon(
  Colors: Palette,
  focused: boolean,
  name: IoniconName,
  outlineName: IoniconName,
) {
  return (
    <Ionicons
      name={focused ? name : outlineName}
      size={24}
      color={focused ? Colors.primary : Colors.textMuted}
    />
  );
}

function pigeonTabIcon(focused: boolean, icons: PigeonTabIconPair) {
  return (
    <Image
      accessible={false}
      source={focused ? icons.filled : icons.outline}
      resizeMode="contain"
      style={{ width: 24, height: 24 }}
    />
  );
}

export default function TabsLayout() {
  const { colors: Colors } = useTheme();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => pigeonTabIcon(focused, DASHBOARD_ICONS),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: 'Abos',
          tabBarIcon: ({ focused }) =>
            tabIcon(Colors, focused, 'list', 'list-outline'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused }) => pigeonTabIcon(focused, CALENDAR_ICONS),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) =>
            tabIcon(Colors, focused, 'bar-chart', 'bar-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="coupons"
        options={{
          title: 'Coupons',
          tabBarIcon: ({ focused }) =>
            tabIcon(Colors, focused, 'ticket', 'ticket-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) =>
            tabIcon(Colors, focused, 'person-circle', 'person-circle-outline'),
        }}
      />
      {/* Hidden screens — accessible via navigation but not shown in tab bar */}
      <Tabs.Screen
        name="voice"
        options={{ href: null, title: 'Voice Reminders' }}
      />
      <Tabs.Screen name="roadmap" options={{ href: null, title: "Évolutions" }} />
      <Tabs.Screen name="reminders" options={{ href: null, title: "Notifications" }} />
      <Tabs.Screen name="premium" options={{ href: null, title: 'Premium' }} />
      <Tabs.Screen name="savings" options={{ href: null, title: 'Calcul des économies' }} />
      <Tabs.Screen
        name="privacy"
        options={{ href: null, title: 'Confidentialité' }}
      />
    </Tabs>
  );
}
