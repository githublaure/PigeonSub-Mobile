import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_ICON_LENGTH = 180_000;
const prefix = (scope: string) => `pigeonsub.icons.${encodeURIComponent(scope)}.`;
const key = (scope: string, id: number) => `${prefix(scope)}${id}`;
export const getSubscriptionIcon = (scope: string, id: number) => AsyncStorage.getItem(key(scope, id));
export const writeSubscriptionIcon = (scope: string, id: number, uri: string | null) =>
  uri === null ? AsyncStorage.removeItem(key(scope, id)) : AsyncStorage.setItem(key(scope, id), uri);
export async function clearSubscriptionIcons(scope: string, id?: number) {
  if (id !== undefined) await AsyncStorage.removeItem(key(scope, id));
  else for (const name of await AsyncStorage.getAllKeys())
    if (name.startsWith(prefix(scope))) await AsyncStorage.removeItem(name);
}
