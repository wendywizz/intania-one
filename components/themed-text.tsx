import { StyleSheet, Text, type TextProps } from 'react-native';

import { AppFonts } from '@/constants/fonts';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  defaultSemiBold: {
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontFamily: AppFonts.psuBold,
    fontSize: 24,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: AppFonts.psuBold,
    fontSize: 17,
    lineHeight: 22,
  },
  link: {
    fontFamily: AppFonts.psuRegular,
    lineHeight: 20,
    fontSize: 14,
    color: '#0A6E8A',
  },
});
