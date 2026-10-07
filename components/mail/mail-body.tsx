import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { type AppColors, useThemedStyles } from '@/constants/theme';
import { htmlToBlocks, type MailBlock, type MailRun } from '@/utils/mail-html';

function Runs({ runs, styles, base }: { runs: MailRun[]; styles: ReturnType<typeof makeStyles>; base?: object }) {
  return (
    <ThemedText style={[styles.text, base]}>
      {runs.map((run, i) => (
        <ThemedText
          key={i}
          onPress={run.href ? () => Linking.openURL(run.href as string).catch(() => undefined) : undefined}
          style={[
            styles.text,
            base,
            run.bold ? styles.bold : null,
            run.href ? styles.link : null,
          ]}
        >
          {run.text}
        </ThemedText>
      ))}
    </ThemedText>
  );
}

/** The message body drawn with the app's own fonts (no WebView). */
export function MailBody({ html, text }: { html?: string; text?: string }) {
  const styles = useThemedStyles(makeStyles);
  const blocks: MailBlock[] = html
    ? htmlToBlocks(html)
    : (text ?? '')
        .split(/\n{2,}/)
        .map((t) => ({ kind: 'p' as const, runs: [{ text: t.trim() }] }))
        .filter((b) => b.runs[0].text);

  return (
    <View style={styles.wrap}>
      {blocks.map((block, i) => {
        if (block.kind === 'li') {
          return (
            <View key={i} style={styles.listRow}>
              <ThemedText style={styles.bullet}>•</ThemedText>
              <View style={styles.flex}>
                <Runs runs={block.runs} styles={styles} />
              </View>
            </View>
          );
        }
        if (block.kind === 'quote') {
          return (
            <View key={i} style={styles.quote}>
              <Runs runs={block.runs} styles={styles} base={styles.quoteText} />
            </View>
          );
        }
        return <Runs key={i} runs={block.runs} styles={styles} base={block.kind === 'h' ? styles.heading : undefined} />;
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: { gap: 12 },
    flex: { flex: 1 },
    text: { fontFamily: AppFonts.psuRegular, fontSize: 16, lineHeight: 26, color: c.text },
    bold: { fontFamily: AppFonts.psuBold },
    heading: { fontFamily: AppFonts.psuBold, fontSize: 18, lineHeight: 28 },
    link: { color: c.primary, textDecorationLine: 'underline' },
    listRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
    bullet: { fontFamily: AppFonts.psuRegular, fontSize: 16, lineHeight: 26, color: c.textMuted },
    quote: { borderLeftWidth: 3, borderLeftColor: c.border, paddingLeft: 12 },
    quoteText: { color: c.textMuted },
  });
