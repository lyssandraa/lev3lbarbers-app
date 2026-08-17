import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// Thin, defensive wrapper around expo-image-picker — the picker is only
// ever invoked from a button press (never at module/mount time), matching
// the established pattern for native-touching APIs in this app after this
// session's crash history with native modules exercised too eagerly.
export async function pickImages({ multiple = false } = {}) {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to choose a photo.');
      return [];
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsMultipleSelection: multiple,
      selectionLimit: multiple ? 10 : 1,
    });
    if (result.canceled || !result.assets?.length) return [];
    return result.assets;
  } catch (err) {
    console.warn('pickImages failed', err);
    Alert.alert('Error', 'Could not open photo library.');
    return [];
  }
}

// Shapes a picked asset for a React Native FormData multipart upload.
export function assetToFormFile(asset, fallbackName = 'photo.jpg') {
  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    type: asset.mimeType || 'image/jpeg',
  };
}
