import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { MAX_PHOTO_LENGTH } from './subscription-photos';

/** Persist the actual JPEG, never the picker's temporary cache URI. */
export async function preparePhoto(asset: ImagePickerAsset): Promise<string> {
  for (const [size, quality] of [
    [1600, 0.75],
    [1200, 0.6],
    [900, 0.5],
  ]) {
    const context = ImageManipulator.manipulate(asset.uri);
    let image;
    try {
      if (Math.max(asset.width, asset.height) > size)
        context.resize(
          asset.width >= asset.height ? { width: size } : { height: size },
        );
      image = await context.renderAsync();
      const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: quality,
        base64: true,
      });
      if (result.base64) {
        const data = `data:image/jpeg;base64,${result.base64}`;
        if (data.length <= MAX_PHOTO_LENGTH) return data;
      }
    } finally {
      image?.release();
      context.release();
    }
  }
  throw new Error(
    'Cette photo est trop volumineuse. Essayez un cadrage plus serré.',
  );
}
