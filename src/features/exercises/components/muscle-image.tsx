import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { MuscleGroup } from '../domain/exercise';
import { useAppTheme } from '@/hooks/use-app-theme';

// Schematic muscle map, bundled as vectors so every exercise has reliable art.
export function MuscleImage({ muscle, size = 64 }: { muscle: MuscleGroup; size?: number }) {
  const { colors } = useAppTheme();
  const shade = (group: MuscleGroup) => group === muscle ? colors.primary : colors.border;
  return (
    <Svg width={size} height={size} viewBox="0 0 80 100" accessibilityLabel={muscle + ' muscle illustration'}>
      <Rect width="80" height="100" rx="18" fill={colors.surfaceMuted} />
      <Circle cx="40" cy="14" r="8" fill={colors.border} />
      <Path d="M28 25 Q40 21 52 25 L52 56 L47 67 H33 L28 56 Z" fill={shade('back')} />
      <Path d="M28 27 L39 28 V39 L28 37 Z M41 28 L52 27 V37 L41 39 Z" fill={shade('chest')} />
      <Path d="M27 24 Q18 23 18 36 L27 35 Z M53 24 Q62 23 62 36 L53 35 Z" fill={shade('shoulders')} />
      <Path d="M18 38 L25 37 L24 51 L17 50 Z M55 37 L62 38 L63 50 L56 51 Z" fill={shade('biceps')} />
      <Path d="M16 51 L23 52 L20 67 L14 66 Z M57 52 L64 51 L66 66 L60 67 Z" fill={shade('triceps')} />
      <Path d="M33 42 H47 V58 L40 64 L33 58 Z" fill={shade('core')} />
      <Path d="M29 61 L39 66 L36 91 H27 Z M41 66 L51 61 L53 91 H44 Z" fill={shade('legs')} />
    </Svg>
  );
}
