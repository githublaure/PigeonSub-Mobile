import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme/colors';

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(focused: boolean, name: IoniconName, outlineName: IoniconName) {
  return <Ionicons name={focused ? name : outlineName} size={24} color={focused ? Colors.primary : Colors.textMuted} />;
}

export default function TabsLayout() {
  return (
    <Tabs
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: 'Subs',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'list', 'list-outline'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'calendar', 'calendar-outline'),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'bar-chart', 'bar-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'person-circle', 'person-circle-outline'),
        }}
      />
      {/* Hidden screens — accessible via navigation but not shown in tab bar */}
      <Tabs.Screen name="voice" options={{ href: null, title: 'Voice Reminders' }} />
      <Tabs.Screen name="premium" options={{ href: null, title: 'Premium' }} />
      <Tabs.Screen name="coupons" options={{ href: null, title: 'Trials & Suspects' }} />
    </Tabs>
  );
}
