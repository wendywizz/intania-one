import { Image } from "expo-image";
import { User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { ENDPOINTS } from "@/constants/endpoints";
import { useColors } from "@/constants/theme";

// Circular staff photo (personnel photo API) with a person-icon fallback when
// the id is missing or the photo fails to load.
export function UserAvatar({
  staffId,
  size = 44,
  style,
}: {
  staffId?: string | number | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const [failed, setFailed] = useState(false);
  const id = staffId != null ? String(staffId).trim() : "";
  const uri = id ? `${ENDPOINTS.photoBase}${encodeURIComponent(id)}.jpg` : "";

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const circle = { width: size, height: size, borderRadius: size / 2 };
  const showPhoto = Boolean(uri) && !failed;

  return (
    <View style={[styles.circle, { backgroundColor: c.primarySoft }, circle, style]}>
      {showPhoto ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit="cover"
          onError={() => setFailed(true)}
          source={{ uri }}
          style={circle}
          transition={200}
        />
      ) : (
        <User size={Math.round(size * 0.5)} color={c.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
});
