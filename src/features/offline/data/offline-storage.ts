import AsyncStorage from '@react-native-async-storage/async-storage';
import { createOfflineStorage } from '../domain/offline-storage';

export const offlineStorage = createOfflineStorage(AsyncStorage);
