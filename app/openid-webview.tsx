import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import WebView from 'react-native-webview';
import {LoadingAnimate} from '@/components/loading-animate';
import {NavTopBar} from '@/components/nav-top-bar';
import {ThemedText} from '@/components/themed-text';
import {ThemedView} from '@/components/themed-view';
import {AUTH} from '@/constants/auth';
import {TEXT} from '@/constants/text';
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

function isOpenIdCallbackUrl(url: string) {
  const normalizedUrl = url.toLowerCase();
  return (
    normalizedUrl.startsWith(AUTH.nativeRedirectUrl.toLowerCase()) ||
    normalizedUrl.startsWith(AUTH.webRedirectUrl.toLowerCase())
  );
}

export default function OpenIdWebViewScreen() {
  const params = useLocalSearchParams<{authUrl?: string | string[]}>();
  const authUrl = Array.isArray(params.authUrl) ? params.authUrl[0] : params.authUrl;
  const [errorMessage, setErrorMessage] = useState('');
  const completedRef = useRef(false);

  const finishLogin = useCallback(async (url: string) => {
    if (completedRef.current || !isOpenIdCallbackUrl(url)) {
      return false;
    }

    completedRef.current = true;

    try {
      await authService.completeAndroidWebViewLogin(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }

    return true;
  }, []);

  const cancelLogin = useCallback(() => {
    authService.cancelAndroidWebViewLogin();
    router.replace('/');
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
          <Pressable accessibilityRole="button" onPress={cancelLogin} style={styles.button}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.SHARED_BACK_TO_HOME_THAI}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <WebView
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
          onError={(event) => {
            if (event.nativeEvent.url && isOpenIdCallbackUrl(event.nativeEvent.url)) {
              void finishLogin(event.nativeEvent.url);
              return;
            }

            setErrorMessage(event.nativeEvent.description || TEXT.SHARED_SOMETHING_WENT_WRONG);
            authService.cancelAndroidWebViewLogin();
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  messageContent: {
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
