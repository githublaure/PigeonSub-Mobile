import React, { useEffect, useState } from 'react';
import { Linking, Text, TextInput, View } from 'react-native';
import { updateFollowUp } from '../lib/local-data';
import { cancellationUrl } from '../lib/cancellation-url';
import { Button } from './ui/Button';
import { useUI } from './ui/Page';
export function CancellationLink({
  id,
  saved = '',
}: {
  id: number;
  saved?: string;
}) {
  const ui = useUI();
  const [url, setUrl] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setUrl(saved), [id, saved]);
  const run = async (open: boolean) => {
    setBusy(true);
    setMessage('');
    try {
      const checked = cancellationUrl(open ? saved : url);
      if (open && checked) await Linking.openURL(checked);
      else {
        await updateFollowUp(id, { cancellationUrl: checked });
        setMessage('Lien enregistré sur cet appareil.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.body}>
        Lien pour gérer ou annuler l’essai (facultatif)
      </Text>
      <TextInput
        accessibilityLabel="Lien pour gérer ou annuler l’essai"
        style={ui.input}
        value={url}
        onChangeText={setUrl}
        placeholder="https://…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        maxLength={2000}
      />
      <Button
        title="Enregistrer le lien"
        variant="secondary"
        loading={busy}
        onPress={() => void run(false)}
      />
      {!!saved && (
        <Button
          title="Ouvrir le site du service"
          variant="secondary"
          disabled={busy}
          onPress={() => void run(true)}
        />
      )}
      {message ? <Text style={ui.small}>{message}</Text> : null}
    </View>
  );
}
