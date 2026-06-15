import AsyncStorage from '@react-native-async-storage/async-storage';
import { navReplace } from '@/utils/navigation';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AUTH } from '@/constants/auth';
import * as authService from '@/services/authService';

const authKeys = [
  AUTH.storageKeys.user,
  AUTH.storageKeys.accessToken,
  AUTH.storageKeys.refreshToken,
  AUTH.storageKeys.loggedIn,
  AUTH.storageKeys.oauthState,
];

async function clearBrowserAuthStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  authKeys.forEach((key) => {
    window.localStorage.removeItem(key);
    window.localStorage.removeItem(`@${key}`);
    window.sessionStorage.removeItem(key);
    window.sessionStorage.removeItem(`@${key}`);
  });

  if (window.indexedDB?.databases) {
    const databases = await window.indexedDB.databases();
    await Promise.all(
      databases
        .filter((database) => database.name && /async|storage|auth|openid|oauth/i.test(database.name))
        .map(
          (database) =>
            new Promise<void>((resolve) => {
              const request = window.indexedDB.deleteDatabase(database.name ?? '');
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            }),
        ),
    );
  }
}

export default function ClearAuthScreen() {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('Clearing OpenID session...');

  useEffect(() => {
    let isMounted = true;

    async function clearAuth() {
      try {
        await authService.logout();
        await AsyncStorage.multiRemove(authKeys);
        await clearBrowserAuthStorage();

        if (isMounted) {
          setMessage('OpenID session cleared.');
          setDone(true);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : String(error));
          setDone(true);
        }
      }
    }

    clearAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="subtitle">{message}</ThemedText>
        {done ? (
          <Pressable accessibilityRole="button" onPress={() => navReplace('/')} style={styles.button}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Back to home
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
