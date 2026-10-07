import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { MAX_ICON_LENGTH } from './subscription-icon-store';

export async function prepareIcon(asset: ImagePickerAsset): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  let image;
  try {
    // Also crop on web, where the native picker's editing UI is unavailable.
    const side = Math.min(asset.width, asset.height);
    if (!Number.isFinite(side) || side <= 0) throw new Error('Image illisible. Choisissez une autre photo.');
    context.crop({ originX: Math.floor((asset.width - side) / 2), originY: Math.floor((asset.height - side) / 2), width: side, height: side });
    context.resize({ width: 256, height: 256 });
    image = await context.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
    const uri = result.base64 ? `data:image/jpeg;base64,${result.base64}` : '';
    if (!uri || uri.length > MAX_ICON_LENGTH) throw new Error('Image trop volumineuse. Choisissez une autre photo.');
    return uri;
  } finally { image?.release(); context.release(); }
}
