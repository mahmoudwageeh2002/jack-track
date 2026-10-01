import { createContext, type RefObject } from 'react';
import type { View } from 'react-native';

export const BlurTargetContext = createContext<RefObject<View | null> | undefined>(undefined);
