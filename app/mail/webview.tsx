import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import WebView from 'react-native-webview';
import {LoadingAnimate} from '@/components/loading-animate';
import {NavTopBar} from '@/components/nav-top-bar';
import {ThemedText} from '@/components/themed-text';
import {ThemedView} from '@/components/themed-view';
import {MAIL_AUTH} from '@/constants/mailAuth';
import {ABSOLUTE_FILL} from '@/constants/layout';
import {TEXT} from '@/constants/text';
import {type AppColors, useThemedStyles} from '@/constants/theme';
import * as mailAuthService from '@/services/mailAuthService';

/**
 * The Android in-app WebView redirect handler for the mail module's OAuth
 * flow — a sibling of app/openid-webview.tsx rather than a shared/parametrized
 * reuse of it.
 *
 * That file is hardcoded to psusso's AUTH config and authService. Branching it
 * between two OAuth configs would couple mail's native-redirect handling to
 * psusso's, putting both flows' correctness behind one shared file — the
 * wrong trade for a module meant to be additive and independent. This is
 * ~90% identical boilerplate (the loading shim, timeout/retry state machine)
 * with two differences: the callback matcher checks MAIL_AUTH.redirectUrl
 * only (mail has no web redirect to also match), and on success it calls
 * mailAuthService.completeAndroidWebViewLogin, not authService's.
 */
const CUSTOM_ELEMENTS_GET_NAME_SHIM = `
(function () {
  if (!window.customElements || window.customElements.getName) {
    return true;
  }

  var definedNames = new WeakMap();
  var originalDefine = window.customElements.define.bind(window.customElements);

  window.customElements.define = function (name, constructor, options) {
    definedNames.set(constructor, name);
    return originalDefine(name, constructor, options);
  };

  window.customElements.getName = function (constructor) {
    return definedNames.get(constructor) || null;
  };

  return true;
})();
true;
`;

/** See app/openid-webview.tsx's own comment on this same constant. */
const LOAD_TIMEOUT_MS = 25000;

function isMailCallbackUrl(url: string) {
  return url.toLowerCase().startsWith(MAIL_AUTH.redirectUrl.toLowerCase());
}

export default function MailWebViewScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{authUrl?: string | string[]}>();
  const authUrl = Array.isArray(params.authUrl) ? params.authUrl[0] : params.authUrl;
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const completedRef = useRef(false);

  const failLoad = useCallback((message: string) => {
    setErrorMessage(message);
    setCanRetry(true);
  }, []);

  useEffect(() => {
    if (hasLoaded || errorMessage) {
      return undefined;
    }

    const timeout = setTimeout(() => failLoad(TEXT.MAIL_CONNECT_PAGE_TIMEOUT), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [attempt, errorMessage, failLoad, hasLoaded]);

  const finishLogin = useCallback(async (url: string) => {
    if (completedRef.current || !isMailCallbackUrl(url)) {
      return false;
    }

    completedRef.current = true;

    try {
      await mailAuthService.completeAndroidWebViewLogin(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setCanRetry(false);
    }

    return true;
  }, []);

  const cancelLogin = useCallback(() => {
    mailAuthService.cancelAndroidWebViewLogin();
    router.replace('/mail/connect');
  }, []);

  const retryLogin = useCallback(() => {
    completedRef.current = false;
    setErrorMessage('');
    setCanRetry(false);
    setHasLoaded(false);
    setAttempt((previous) => previous + 1);
  }, []);

  if (!authUrl) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.MAIL_CONNECT_HEADER_TITLE} onBackPress={cancelLogin} showHomeButton={false} />
        <View style={styles.messageContent}>
          <ThemedText type="subtitle">{TEXT.MAIL_CONNECT_FAILED}</ThemedText>
          <ThemedText style={styles.message}>Authorization URL is missing.</ThemedText>
          <Pressable accessibilityRole="button" onPress={cancelLogin} style={styles.button}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_BACK_TO_HOME_THAI}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.MAIL_CONNECT_HEADER_TITLE} onBackPress={cancelLogin} showHomeButton={false} />
      {errorMessage ? (
        <View style={styles.messageContent}>
          <ThemedText type="subtitle">{TEXT.MAIL_CONNECT_FAILED}</ThemedText>
          <ThemedText style={[styles.message, styles.errorText]}>{errorMessage}</ThemedText>
          {canRetry ? (
            <>
              <Pressable accessibilityRole="button" onPress={retryLogin} style={styles.button}>
                <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                  {TEXT.SHARED_RETRY}
                </ThemedText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={cancelLogin} style={styles.secondaryButton}>
                <ThemedText type="defaultSemiBold">{TEXT.SHARED_BACK_TO_HOME_THAI}</ThemedText>
              </Pressable>
            </>
          ) : (
            <Pressable accessibilityRole="button" onPress={cancelLogin} style={styles.button}>
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                {TEXT.SHARED_BACK_TO_HOME_THAI}
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <WebView
          key={attempt}
          source={{uri: authUrl}}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          startInLoadingState
          injectedJavaScriptBeforeContentLoaded={CUSTOM_ELEMENTS_GET_NAME_SHIM}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
          injectedJavaScript={CUSTOM_ELEMENTS_GET_NAME_SHIM}
          injectedJavaScriptForMainFrameOnly={false}
          renderLoading={() => (
            <View style={styles.loading}>
              <LoadingAnimate title={TEXT.MAIL_CONNECT_CONNECTING} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            void finishLogin(request.url);
            return !isMailCallbackUrl(request.url);
          }}
          onNavigationStateChange={(navigationState) => {
            void finishLogin(navigationState.url);
          }}
          onLoadEnd={() => setHasLoaded(true)}
          onHttpError={(event) => {
            if (event.nativeEvent.url !== authUrl) {
              return;
            }

            failLoad(`${TEXT.SHARED_SOMETHING_WENT_WRONG} (HTTP ${event.nativeEvent.statusCode})`);
          }}
          onError={(event) => {
            if (event.nativeEvent.url && isMailCallbackUrl(event.nativeEvent.url)) {
              void finishLogin(event.nativeEvent.url);
              return;
            }

            failLoad(event.nativeEvent.description || TEXT.SHARED_SOMETHING_WENT_WRONG);
          }}
        />
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    ...ABSOLUTE_FILL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  messageContent: {
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
    backgroundColor: c.pomegranate,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginTop: 12,
    paddingHorizontal: 16,
  },
});
