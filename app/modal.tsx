import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { TEXT } from '@/constants/text';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">{TEXT.MODAL_TITLE}</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">{TEXT.SHARED_BACK_TO_HOME_THAI}</ThemedText>
      </Link>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
