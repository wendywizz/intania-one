import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';

export default function LoginCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    state?: string;
  }>();
  const [errorMessage, setErrorMessage] = useState('');
  const { completeWebSignIn } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function completeLogin() {
      try {
        await completeWebSignIn({
          code: params.code,
          error: params.error,
          errorDescription: params.error_description,
          state: params.state,
        });

        if (isMounted) {
          router.replace('/');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      }
    }

    completeLogin();

    return () => {
      isMounted = false;
    };
  }, [completeWebSignIn, params.code, params.error, params.error_description, params.state]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {errorMessage ? (
          <>
            <ThemedText type="subtitle">เข้าสู่ระบบไม่สำเร็จ</ThemedText>
            <ThemedText style={[styles.message, styles.errorText]}>{errorMessage}</ThemedText>
          </>
        ) : (
          <LoadingAnimate title="กำลังเข้าสู่ระบบ" desc="กรุณารอสักครู่" />
        )}
        {errorMessage ? (
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.button}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              กลับหน้าหลัก
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
  message: {
    marginTop: 10,
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#B42318',
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
