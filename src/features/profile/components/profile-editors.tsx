import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, UserRound } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { container } from '@/app/container';
import { AppText } from '@/components/ui/app-text';
import { GlassButton } from '@/components/ui/glass-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { createMeasurement, saveMeasurements, saveProfile } from '../data/profile-data';
import { mergeMeasurement, parseMeasurements, type BodyMeasurement, type UserProfile } from '../domain/profile';
import { ProfileSheet, SheetField } from './profile-sheet';

export function ProfileAvatar({ uri, size = 96 }: { uri?: string | null; size?: number }) {
  const { colors } = useAppTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softMint }}>
    {uri ? <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" accessibilityLabel="Profile photo" /> : <UserRound size={size * 0.46} color={colors.primary} />}
  </View>;
}

type EditorProps = { uid: string; profile: UserProfile; onClose: () => void };

export function EditProfileSheet({ uid, profile, onClose }: EditorProps) {
  const client = useQueryClient();
  const { colors } = useAppTheme();
  const [name, setName] = useState(profile.displayName ?? '');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadedURL, setUploadedURL] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [permissionBlocked, setPermissionBlocked] = useState(false);

  const pickPhoto = async () => {
    setError('');
    setPermissionBlocked(false);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted && permission.accessPrivileges !== 'limited') {
          setPermissionBlocked(!permission.canAskAgain);
          setError('Allow photo access to choose a profile picture.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.75 });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) throw new Error('Choose a photo smaller than 10 MB.');
        setPhoto(asset);
        setUploadedURL(undefined);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open your photos.'); }
  };

  const save = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      let photoURL = uploadedURL;
      if (photo && !photoURL) {
        const uploaded = await container.mediaService.uploadImage(photo.uri, {
          mimeType: photo.mimeType ?? undefined, fileName: photo.fileName ?? undefined,
          file: photo.file, folder: 'jack-track/avatars',
        });
        photoURL = uploaded.url;
        setUploadedURL(photoURL);
      }
      await saveProfile(uid, name, photoURL);
      client.setQueryData<UserProfile>(['profile', uid], (old) => ({ ...(old ?? profile), displayName: name.trim(), photoURL: photoURL ?? old?.photoURL ?? profile.photoURL }));
      void client.invalidateQueries({ queryKey: ['profile', uid] });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your profile.'); }
    finally { setBusy(false); }
  };

  return <ProfileSheet title="Edit profile" busy={busy} onClose={onClose}>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose profile photo" disabled={busy} onPress={() => void pickPhoto()} style={{ alignSelf: 'center', alignItems: 'center', gap: 10 }}>
      <ProfileAvatar uri={photo?.uri ?? profile.photoURL} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Camera size={18} color={colors.primary} /><AppText color="primary" weight="semibold">Change photo</AppText></View>
    </Pressable>
    <SheetField label="Name" value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" editable={!busy} returnKeyType="done" />
    {!!error && <AppText color="danger" accessibilityRole="alert">{error}</AppText>}
    {permissionBlocked && <GlassButton label="Open device settings" variant="secondary" onPress={() => { void Linking.openSettings().catch(() => setError('Open your device settings and allow photo access for Jack Track.')); }} />}
    <GlassButton label="Save changes" loading={busy} disabled={!name.trim()} onPress={() => void save()} />
  </ProfileSheet>;
}

export function MeasurementsSheet({ uid, profile, onClose }: EditorProps) {
  const client = useQueryClient();
  const [weight, setWeight] = useState(profile.weightKg?.toString() ?? '');
  const [height, setHeight] = useState(profile.heightCm?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pendingEntry = useRef<BodyMeasurement | null>(null);
  const saving = useRef(false);
  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true); setError('');
    try {
      const values = parseMeasurements(weight, height);
      if (!pendingEntry.current || pendingEntry.current.weightKg !== values.weightKg || pendingEntry.current.heightCm !== values.heightCm) {
        pendingEntry.current = createMeasurement(uid, weight, height);
      }
      const entry = pendingEntry.current;
      await saveMeasurements(uid, entry);
      await Promise.all([client.cancelQueries({ queryKey: ['profile', uid] }), client.cancelQueries({ queryKey: ['measurements', uid] })]);
      client.setQueryData<UserProfile>(['profile', uid], (old) => ({ ...(old ?? profile), ...values }));
      client.setQueryData<BodyMeasurement[]>(['measurements', uid], (old) => mergeMeasurement(old ?? [], entry));
      void client.invalidateQueries({ queryKey: ['profile', uid] });
      void client.invalidateQueries({ queryKey: ['measurements', uid] });
      Toast.show({ type: 'success', text1: 'Check-in added', text2: 'Your history and graph are updated.' });
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your measurements.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <ProfileSheet title="Add a check-in" busy={busy} onClose={onClose}>
    <AppText color="muted">Record your weight and height. Each check-in is saved to your history, even on the same day.</AppText>
    <SheetField label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 75" maxLength={6} editable={!busy} />
    <SheetField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="e.g. 175" maxLength={6} editable={!busy} />
    {!!error && <AppText color="danger" accessibilityRole="alert">{error}</AppText>}
    <GlassButton label="Save check-in" loading={busy} disabled={!weight.trim() || !height.trim()} onPress={() => void save()} />
  </ProfileSheet>;
}
