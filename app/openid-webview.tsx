import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import WebView from 'react-native-webview';
import {LoadingAnimate} from '@/components/loading-animate';
import {NavTopBar} from '@/components/nav-top-bar';
import {ThemedText} from '@/components/themed-text';
import {ThemedView} from '@/components/themed-view';
import {AUTH} from '@/constants/auth';
import {ABSOLUTE_FILL} from '@/constants/layout';
import {TEXT} from '@/constants/text';
import {type AppColors, useThemedStyles} from '@/constants/theme';
import * as authService from '@/services/authService';

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

/**
 * How long the PSU SSO page gets to finish loading before we call it a failure.
 *
 * Without this the screen has no failure state at all: `onError` only fires for
 * the main document, so a page whose scripts never arrive — an emulator that
 * cannot do QUIC, a half-open VPN — leaves `startInLoadingState`'s spinner
 * covering a blank WebView with no way back except the OS back gesture.
 * Generous on purpose; the flow interface is a large bundle over the campus VPN.
 */
const LOAD_TIMEOUT_MS = 25000;

function isOpenIdCallbackUrl(url: string) {
  const normalizedUrl = url.toLowerCase();
  return (
    normalizedUrl.startsWith(AUTH.nativeRedirectUrl.toLowerCase()) ||
    normalizedUrl.startsWith(AUTH.webRedirectUrl.toLowerCase())
  );
}

export default function OpenIdWebViewScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{authUrl?: string | string[]}>();
  const authUrl = Array.isArray(params.authUrl) ? params.authUrl[0] : params.authUrl;
  const [errorMessage, setErrorMessage] = useState('');
  // Bumped by the retry button to remount the WebView — reloading is what the
  // user is asking for, and a fresh instance is the only way to drop whatever
  // half-loaded state the failed attempt left behind.
  const [attempt, setAttempt] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Only a page that failed to load can be retried. Once the callback has been
  // handed to authService the pending session is spent either way, so reloading
  // would sit on a spinner nothing can ever resolve — those failures get the
  // way home instead.
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

    const timeout = setTimeout(() => failLoad(TEXT.AUTH_LOGIN_PAGE_TIMEOUT), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [attempt, errorMessage, failLoad, hasLoaded]);

  const finishLogin = useCallback(async (url: string) => {
    if (completedRef.current || !isOpenIdCallbackUrl(url)) {
      return false;
    }

    completedRef.current = true;

    try {
      await authService.completeAndroidWebViewLogin(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setCanRetry(false);
    }

    return true;
  }, []);

  const cancelLogin = useCallback(() => {
    authService.cancelAndroidWebViewLogin();
    router.replace('/');
  }, []);

  // Deliberately does not touch the pending auth session: it is still the same
  // login attempt, so cancelling it here would reject the promise the home
  // screen is waiting on and pop an error modal over this retry.
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
        <NavTopBar title={TEXT.AUTH_LOGIN} onBackPress={cancelLogin} showHomeButton={false} />
        <View style={styles.messageContent}>
          <ThemedText type="subtitle">{TEXT.AUTH_LOGIN_FAILED}</ThemedText>
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
      <NavTopBar title={TEXT.AUTH_LOGIN} onBackPress={cancelLogin} showHomeButton={false} />
      {errorMessage ? (
        <View style={styles.messageContent}>
          <ThemedText type="subtitle">{TEXT.AUTH_LOGIN_FAILED}</ThemedText>
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
              <LoadingAnimate title={TEXT.AUTH_SIGNING_IN_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
            </View>
          )}
          onShouldStartLoadWithRequest={(request) => {
            void finishLogin(request.url);
            return !isOpenIdCallbackUrl(request.url);
          }}
          onNavigationStateChange={(navigationState) => {
            void finishLogin(navigationState.url);
          }}
          onLoadEnd={() => setHasLoaded(true)}
          onHttpError={(event) => {
            // Only the page we asked for. SSO pulls in assets from other hosts,
            // and one of those 404ing is not a reason to abandon a login that is
            // otherwise about to render.
            if (event.nativeEvent.url !== authUrl) {
              return;
            }

            failLoad(`${TEXT.SHARED_SOMETHING_WENT_WRONG} (HTTP ${event.nativeEvent.statusCode})`);
          }}
          onError={(event) => {
            if (event.nativeEvent.url && isOpenIdCallbackUrl(event.nativeEvent.url)) {
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
  // Giving up is the second choice here, so it carries no fill — retrying is
  // what usually works, and two solid buttons would make them look equivalent.
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
