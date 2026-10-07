import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useColors } from '@/constants/theme';
import { getSenderPhoto } from '@/services/mailSenderPhoto';

/** Stable per-sender palette, so the same address always lands on the same
 * colour across the inbox list and the detail screen — no lookup, no
 * storage, just a hash of the address. Drawn from the app's flat-UI accent
 * set, deliberately excluding the red family (`primary`/`danger`/
 * `pomegranate`/`alizarin`), which stays reserved for brand chrome and error
 * states elsewhere in the app so an avatar never reads as a warning. */
function paletteOf(c: AppColors) {
  return [
    c.peterRiver, c.nephritis, c.amethyst, c.belizeHole, c.carrot,
    c.wisteria, c.greenSea, c.pumpkin, c.turquoise, c.sunFlower,
  ];
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * A colored initial circle for an email sender — the same idea as iOS Mail's
 * per-contact avatar colour, standing in for a photo this app has no way to
 * fetch for an arbitrary external sender.
 */
export function SenderAvatar({
  name,
  address,
  size = 40,
}: {
  name?: string;
  address?: string;
  size?: number;
}) {
  const c = useColors();
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setPhoto(null);
    getSenderPhoto(address).then((uri) => {
      if (!cancelled) setPhoto(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);
  const label = (name || address || '').trim();
  const initial = label ? label[0]!.toUpperCase() : '?';
  const key = (address || name || '').trim().toLowerCase() || initial;
  const palette = paletteOf(c);
  const background = palette[hashString(key) % palette.length];

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
      ]}
    >
      <ThemedText style={[styles.initial, { fontSize: size * 0.42, color: c.textOnPrimary }]}>
        {initial}
      </ThemedText>
      {photo ? (
        <Image
          source={{ uri: photo }}
          onError={() => setPhoto(null)}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { overflow: "hidden", alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  initial: { fontFamily: AppFonts.psuBold },
});
