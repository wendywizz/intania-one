import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';

type PhotoViewerModalProps = {
  visible: boolean;
  /** Photo sources tried in order; falls back to the next on load error. */
  sources: string[];
  initialIndex?: number;
  onClose: () => void;
  accessibilityLabel?: string;
  /** Optional caption shown at the bottom (e.g. the person's name). */
  caption?: string;
};

/** Full-screen photo viewer: dark scrim, contained image, tap anywhere to close. */
export function PhotoViewerModal({
  visible,
  sources,
  initialIndex = 0,
  onClose,
  accessibilityLabel,
  caption,
}: PhotoViewerModalProps) {
  const insets = useSafeAreaInsets();
  const sourcesKey = sources.join('|');
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex, sourcesKey]);

  const uri = sources[index] ?? '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={TEXT.CLOSE}
      >
        {uri ? (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={accessibilityLabel}
            contentFit="contain"
            onError={() => setIndex((current) => current + 1)}
            source={{ uri }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {caption ? (
          <View style={[styles.captionWrap, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
            <ThemedText style={styles.caption} numberOfLines={2}>
              {caption}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={TEXT.CLOSE}
        hitSlop={8}
        style={[styles.closeButton, { top: insets.top + 12 }]}
      >
        <X size={22} color="#fff" />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  captionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  caption: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: AppFonts.psuBold,
  },
});
