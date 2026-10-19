/**
 * The provider is what ties the React tree to the module-level language: it loads the
 * stored choice before the first frame, and a switch must change what `TEXT` returns
 * and persist for the next launch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { TEXT } from '@/constants/text';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { setCurrentLanguage } from '@/i18n/language';
import { TH } from '@/i18n/th';
import { EN } from '@/i18n/en';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// React's act() environment flag, so the renderer does not warn.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let api: ReturnType<typeof useLanguage>;

function Probe() {
  api = useLanguage();
  return <Text>{TEXT.CANCEL}</Text>;
}

async function mount(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
  });
  return tree;
}

const shown = (tree: ReactTestRenderer) => tree.root.findByType(Text).props.children;

beforeEach(async () => {
  await AsyncStorage.clear();
  setCurrentLanguage('th');
  moment.locale('th');
});

it('starts in Thai when nothing is stored, and renders nothing until it has looked', async () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
  });
  expect(tree.toJSON()).toBeNull();
  await act(async () => {});
  expect(shown(tree)).toBe(TH.CANCEL);
});

it('switches the text, the moment locale and the stored choice', async () => {
  const tree = await mount();
  expect(shown(tree)).toBe(TH.CANCEL);

  await act(async () => {
    api.setLanguage('en');
  });

  expect(api.language).toBe('en');
  expect(shown(tree)).toBe(EN.CANCEL);
  expect(moment().locale()).toBe('en');
  expect(moment.locale()).toBe('en');
  expect(await AsyncStorage.getItem('@app_language')).toBe('en');
});

it('opens in the stored language', async () => {
  await AsyncStorage.setItem('@app_language', 'en');
  const tree = await mount();
  expect(api.language).toBe('en');
  expect(shown(tree)).toBe(EN.CANCEL);
});

it('opens in Thai on a fresh install and does not write it down', async () => {
  const tree = await mount();
  expect(api.language).toBe('th');
  expect(shown(tree)).toBe(TH.CANCEL);
  expect(await AsyncStorage.getItem('@app_language')).toBeNull();
});

it('ignores a stored value it does not know', async () => {
  await AsyncStorage.setItem('@app_language', 'fr');
  const tree = await mount();
  expect(api.language).toBe('th');
  expect(shown(tree)).toBe(TH.CANCEL);
});
