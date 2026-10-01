import { Image, StyleSheet, View } from 'react-native';

type Props = { size?: number };

export function BrandMark({ size = 72 }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Image
        accessibilityLabel="Jack Track"
        resizeMode="contain"
        source={require('../../../icon.png')}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({ image: { width: '100%', height: '100%' } });
