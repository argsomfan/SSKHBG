import { Image } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';

import { BrandImages } from '../theme/brand';

type BrandMarkProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function BrandMark({ size = 48, style }: BrandMarkProps) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={BrandImages.startIcon}
      style={[{ height: size, width: size }, style]}
    />
  );
}
