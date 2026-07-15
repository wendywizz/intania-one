import { router, useLocalSearchParams } from 'expo-router';
import { navReplace } from '@/utils/navigation';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { TEXT } from '@/constants/text';

import { LoadingAnimate } from '@/components/loading-animate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';

export default function LoginCallbackScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
    state?: string;
  }>();
  const [errorMessage, setErrorMessage] = useState('');
  const processedCallbackRef = useRef('');
  const { completeWebSignIn } = useAuth();
  const completeWebSignInRef = useRef(completeWebSignIn);

  useEffect(() => {
    completeWebSignInRef.current = completeWebSignIn;
  }, [completeWebSignIn]);

  useEffect(() => {
    let isMounted = true;
    const callbackKey = [params.code, params.error, params.state].filter(Boolean).join(':');

    async function completeLogin() {
      if (callbackKey && processedCallbackRef.current === callbackKey) {
        return;
      }

      processedCallbackRef.current = callbackKey;

      try {
        await completeWebSignInRef.current({
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

    if (callbackKey) {
      completeLogin();
    }

    return () => {
      isMounted = false;
    };
  }, [params.code, params.error, params.error_description, params.state]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {errorMessage ? (
          <>
            <ThemedText type="subtitle">{TEXT.AUTH_LOGIN_FAILED}</ThemedText>
            <ThemedText style={[styles.message, styles.errorText]}>{errorMessage}</ThemedText>
          </>
        ) : (
          <LoadingAnimate title={TEXT.AUTH_SIGNING_IN_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
        )}
        {errorMessage ? (
          <Pressable accessibilityRole="button" onPress={() => navReplace('/')} style={styles.button}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_BACK_TO_HOME_THAI}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
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
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: c.danger,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: c.info,
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
