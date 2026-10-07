import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Image, Modal, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useTheme } from './ThemeContext';
import { subscriptions } from '../lib/api';
import { GUIDE_KEY, guideSteps, readGuideProgress, type GuideProgress, type GuideStep } from '../lib/product-guide';
import { Button } from '../components/ui/Button';
import { PlusBadge } from '../components/ui/PlusBadge';

type GuideValue = { active: boolean; step: GuideStep; start: () => void; resume: () => void; onRoute: boolean };
export const GuideContext = createContext<GuideValue | null>(null);
export const useGuide = () => useContext(GuideContext);
let writes: Promise<unknown> = Promise.resolve();

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const { colors: c } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [progress, setProgress] = useState<GuideProgress>({ status: 'new', index: 0 });
  const [offer, setOffer] = useState(false);
  const [active, setActive] = useState(false);
  const [subId, setSubId] = useState<number>();
  const [error, setError] = useState('');
  const steps = guideSteps(subId);
  const step = steps[progress.index];
  const onRoute = pathname.replace(/\/$/, '') === step.route.split('?')[0].replace('/(tabs)', '').replace(/\/$/, '');
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(GUIDE_KEY).then(raw => {
      if (!alive) return;
      const saved = readGuideProgress(raw);
      setProgress(saved);
      setOffer(saved.status === 'new' || saved.status === 'paused');
    }).catch(() => { if (alive) setOffer(true); });
    return () => { alive = false; };
  }, []);
  const persist = (next: GuideProgress) => {
    setProgress(next);
    writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(GUIDE_KEY, JSON.stringify(next)));
    void writes.catch(() => setError('La progression du guide n’a pas pu être enregistrée.'));
  };
  const open = (index: number, list = steps) => router.navigate(list[index].route as Href);
  const begin = async (index: number) => {
    const all = await subscriptions.list(true).catch(() => []);
    const id = all.find(s => s.isActive)?.id ?? all[0]?.id;
    setSubId(id);
    setOffer(false);
    setActive(true);
    persist({ status: 'paused', index });
    open(index, guideSteps(id));
  };
  const start = () => { void begin(0); };
  const resume = () => { setActive(true); open(progress.index); };
  const move = (delta: number) => {
    const index = progress.index + delta;
    if (index >= steps.length) {
      persist({ status: 'done', index: steps.length - 1 });
      setActive(false);
    } else {
      persist({ status: 'paused', index });
      open(index);
    }
  };
  const buttonText = { color: c.text, fontSize: 15, lineHeight: 21 };
  return <GuideContext.Provider value={{ active, step, start, resume, onRoute }}>
    <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
    {active && onRoute && <View testID="product-guide" accessibilityLiveRegion="polite" style={{ backgroundColor: c.surface, padding: height < 750 ? 12 : 18, paddingBottom: Math.max(12, insets.bottom), gap: 8, borderTopWidth: 2, borderTopColor: c.primary }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>GUIDE · {progress.index + 1}/{steps.length}</Text>
        <Text style={[buttonText, { flex: 1, fontWeight: '700' }]}>{step.title}</Text>
      </View>
      <Text style={buttonText}>{step.body}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <PlusBadge compact reason={step.reason} />
        <Text style={{ color: c.gold, fontSize: 12, lineHeight: 17, flex: 1 }}>{step.plus}</Text>
      </View>
      {!!error && <Text style={{ color: c.danger, fontSize: 12 }}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Précédent" variant="ghost" disabled={progress.index === 0} onPress={() => move(-1)} style={{ flex: 1 }} />
        <Button title={progress.index === steps.length - 1 ? 'Terminer' : 'Suivant'} onPress={() => move(1)} style={{ flex: 1 }} />
        <Button title="Fermer" accessibilityLabel="Terminer le guide plus tard" variant="ghost" onPress={() => { setActive(false); persist({ status: 'paused', index: progress.index }); }} />
      </View>
    </View>}
    {active && !onRoute && <View style={{ padding: 8, backgroundColor: c.surface }}><Button title="Reprendre le guide" variant="secondary" onPress={resume} /></View>}
    <Modal visible={offer} transparent animationType="fade" onRequestClose={() => { setOffer(false); persist({ status: 'dismissed', index: progress.index }); }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,10,30,.55)' }}>
        <View testID="guide-welcome" style={{ padding: 24, borderRadius: 26, gap: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
          <Image source={require('../../assets/icons/navigation/plume-tab-filled.png')} style={{ width: 40, height: 40 }} accessible={false} />
          <Text style={{ color: c.text, fontSize: 24, fontWeight: '800' }}>{progress.status === 'paused' ? 'Reprendre la visite ?' : 'Découvrez PigeonSub'}</Text>
          <Text style={buttonText}>Économies, budget, dates de sûreté et options Premium : parcourez les écrans à votre rythme.</Text>
          <Button title={progress.status === 'paused' ? 'Reprendre le guide' : 'Me guider'} onPress={() => void begin(progress.status === 'paused' ? progress.index : 0)} />
          <Button title="Plus tard" variant="ghost" onPress={() => { setOffer(false); persist({ status: 'dismissed', index: progress.index }); }} />
          <Text style={{ color: c.textSecondary, fontSize: 12 }}>Le guide reste disponible dans Profil.</Text>
        </View>
      </View>
    </Modal>
  </GuideContext.Provider>;
}
