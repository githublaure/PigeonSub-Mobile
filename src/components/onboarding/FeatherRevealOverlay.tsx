import { SplashScreen } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const REVEAL_MASK = require('../../../assets/branding/plume-reveal-mask.png');

const MASK_WIDTH = 1254;
const MASK_HEIGHT = 1904;

// This rectangle was measured from the PNG alpha channel. It sits entirely
// inside the feather cutout and works for both tall and wide phone ratios.
const TRANSPARENT_BOUNDS = {
  left: 424,
  top: 845,
  right: 520,
  bottom: 1041,
} as const;

const REVEAL_ANCHOR = {
  x: (TRANSPARENT_BOUNDS.left + TRANSPARENT_BOUNDS.right) / 2,
  y: (TRANSPARENT_BOUNDS.top + TRANSPARENT_BOUNDS.bottom) / 2,
} as const;

const INITIAL_OVERSCAN = 1.02;
const FINAL_SCALE_SAFETY = 1.06;
const REVEAL_DURATION_MS = 940;
const FADE_DURATION_MS = 100;

interface FeatherRevealOverlayProps {
  contentReady: boolean;
  enabled: boolean;
}

function getRevealGeometry(viewportWidth: number, viewportHeight: number) {
  const width = Math.max(viewportWidth, 1);
  const height = Math.max(viewportHeight, 1);

  // Keep every opaque edge outside the viewport while the reveal anchor is
  // fixed at its centre. This prevents an uncovered strip on the first frame.
  const maskScale =
    Math.max(
      width / (2 * REVEAL_ANCHOR.x),
      width / (2 * (MASK_WIDTH - REVEAL_ANCHOR.x)),
      height / (2 * REVEAL_ANCHOR.y),
      height / (2 * (MASK_HEIGHT - REVEAL_ANCHOR.y))
    ) * INITIAL_OVERSCAN;

  const renderedWidth = MASK_WIDTH * maskScale;
  const renderedHeight = MASK_HEIGHT * maskScale;
  const originX = REVEAL_ANCHOR.x * maskScale;
  const originY = REVEAL_ANCHOR.y * maskScale;
  const transparentWidth =
    (TRANSPARENT_BOUNDS.right - TRANSPARENT_BOUNDS.left) * maskScale;
  const transparentHeight =
    (TRANSPARENT_BOUNDS.bottom - TRANSPARENT_BOUNDS.top) * maskScale;

  const finalScale =
    Math.max(width / transparentWidth, height / transparentHeight) *
    FINAL_SCALE_SAFETY;

  return {
    finalScale,
    height: renderedHeight,
    left: width / 2 - originX,
    originX,
    originY,
    top: height / 2 - originY,
    width: renderedWidth,
  };
}

export function FeatherRevealOverlay({
  contentReady,
  enabled,
}: FeatherRevealOverlayProps) {
  const { width, height } = useWindowDimensions();
  const geometry = useMemo(
    () => getRevealGeometry(width, height),
    [height, width]
  );
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [maskLoaded, setMaskLoaded] = useState(false);
  const [maskFailed, setMaskFailed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!enabled || !contentReady || !maskLoaded) return;

    let cancelled = false;
    let firstFrame: number | undefined;
    let secondFrame: number | undefined;
    let animation: Animated.CompositeAnimation | undefined;

    const startReveal = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(
        () => false
      );
      if (cancelled) return;

      // Two frames ensure the fully opaque cache has been committed before the
      // native splash disappears.
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(async () => {
          if (cancelled) return;

          await SplashScreen.hideAsync().catch(() => undefined);
          if (cancelled) return;

          if (reduceMotion || maskFailed) {
            setVisible(false);
            return;
          }

          animation = Animated.sequence([
            Animated.timing(scale, {
              toValue: geometry.finalScale,
              duration: REVEAL_DURATION_MS,
              easing: Easing.bezier(0.45, 0, 0.2, 1),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: FADE_DURATION_MS,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]);

          animation.start(({ finished }) => {
            if (finished && !cancelled) setVisible(false);
          });
        });
      });
    };

    void startReveal();

    return () => {
      cancelled = true;
      if (firstFrame !== undefined) cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      animation?.stop();
    };
  }, [
    contentReady,
    enabled,
    geometry.finalScale,
    maskFailed,
    maskLoaded,
    opacity,
    scale,
  ]);

  if (!enabled || !visible) return null;

  return (
    <View pointerEvents="none" style={styles.overlay} testID="feather-reveal-overlay">
      <Animated.Image
        onError={() => {
          setMaskFailed(true);
          setMaskLoaded(true);
        }}
        onLoadEnd={() => setMaskLoaded(true)}
        resizeMode="stretch"
        source={REVEAL_MASK}
        style={[
          styles.mask,
          {
            height: geometry.height,
            left: geometry.left,
            opacity,
            top: geometry.top,
            transform: [{ scale }],
            transformOrigin: [geometry.originX, geometry.originY, 0],
            width: geometry.width,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 1000,
  },
  mask: {
    position: 'absolute',
  },
});
