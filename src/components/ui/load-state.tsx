import { ActivityIndicator, View } from 'react-native';
import { AppText } from './app-text';
import { GlassButton } from './glass-button';

export function LoadState({ loading, error, retry }: { loading?: boolean; error?: unknown; retry?: () => void }) {
  if (loading) return <ActivityIndicator accessibilityLabel="Loading" />;
  if (!error) return null;
  return <View style={{ gap: 12 }}><AppText color="danger">We couldn’t load your data. Check your connection and try again.</AppText>{retry && <GlassButton label="Try again" variant="secondary" onPress={retry} />}</View>;
}
