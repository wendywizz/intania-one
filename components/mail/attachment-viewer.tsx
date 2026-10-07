import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { buildPdfViewerHtml } from '@/components/pdf-viewer-modal';
import { ThemedText } from '@/components/themed-text';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { getAttachmentBase64, type MailAttachment } from '@/services/mailService';

export type AttachmentKind = 'pdf' | 'sheet' | 'word' | 'image' | 'other';

export function attachmentKind(a: Pick<MailAttachment, 'name' | 'contentType'>): AttachmentKind {
  const name = a.name.toLowerCase();
  const type = a.contentType.toLowerCase();
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (/\.(xlsx|xls|csv)$/.test(name) || type.includes('spreadsheet') || type.includes('excel') || type === 'text/csv')
    return 'sheet';
  if (name.endsWith('.docx') || type.includes('wordprocessingml')) return 'word';
  if (type.startsWith('image/')) return 'image';
  return 'other';
}

const SHELL = (body: string, head = '') => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=4">
<style>body{margin:0;padding:12px;font-family:sans-serif;font-size:14px;color:#222;background:#fff}
table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px;font-size:13px}
img{max-width:100%;height:auto}h3{margin:16px 0 6px}#msg{padding:20px;text-align:center}</style>${head}
</head><body>${body}</body></html>`;

function buildHtml(kind: AttachmentKind, base64: string, contentType: string): string {
  if (kind === 'pdf') return buildPdfViewerHtml(base64);
  if (kind === 'image') return SHELL(`<img src="data:${contentType};base64,${base64}">`);
  if (kind === 'sheet') {
    return SHELL(
      `<div id="msg">${TEXT.MAIL_ATTACHMENT_LOADING}</div><div id="out"></div>
<script>try{var wb=XLSX.read('${base64}',{type:'base64'});var h='';
wb.SheetNames.forEach(function(n){h+='<h3>'+n+'</h3><div style="overflow-x:auto">'+XLSX.utils.sheet_to_html(wb.Sheets[n],{header:'',footer:''})+'</div>';});
document.getElementById('msg').remove();document.getElementById('out').innerHTML=h;}
catch(e){document.getElementById('msg').textContent='${TEXT.MAIL_ATTACHMENT_OPEN_FAILED}';}</script>`,
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>',
    );
  }
  return SHELL(
    `<div id="msg">${TEXT.MAIL_ATTACHMENT_LOADING}</div><div id="out"></div>
<script>try{var r=atob('${base64}'),b=new Uint8Array(r.length);for(var i=0;i<r.length;i++)b[i]=r.charCodeAt(i);
mammoth.convertToHtml({arrayBuffer:b.buffer}).then(function(x){document.getElementById('msg').remove();document.getElementById('out').innerHTML=x.value;})
.catch(function(){document.getElementById('msg').textContent='${TEXT.MAIL_ATTACHMENT_OPEN_FAILED}';});}
catch(e){document.getElementById('msg').textContent='${TEXT.MAIL_ATTACHMENT_OPEN_FAILED}';}</script>`,
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>',
  );
}

/** Bottom-sheet viewer for a mail attachment — same shape as the meeting module's PDF sheet. */
export function AttachmentViewer({
  messageId,
  attachment,
  onClose,
}: {
  messageId: string;
  attachment: MailAttachment;
  onClose: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState('');
  const kind = attachmentKind(attachment);

  useEffect(() => {
    let cancelled = false;
    if (kind === 'other') {
      setError(TEXT.MAIL_ATTACHMENT_UNSUPPORTED);
      return undefined;
    }
    getAttachmentBase64(messageId, attachment.id)
      .then((b64) => {
        if (!cancelled) setHtml(buildHtml(kind, b64, attachment.contentType));
      })
      .catch(() => {
        if (!cancelled) setError(TEXT.MAIL_ATTACHMENT_OPEN_FAILED);
      });
    return () => {
      cancelled = true;
    };
  }, [messageId, attachment, kind]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingTop: insets.top > 0 ? insets.top : 8, paddingBottom: insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {attachment.name}
          </ThemedText>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10} accessibilityRole="button">
            <X size={18} color={c.textMuted} />
          </Pressable>
        </View>
        {error ? (
          <View style={styles.center}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : html ? (
          <WebView source={{ html }} style={styles.webview} javaScriptEnabled originWhitelist={['*']} />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={c.primary} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    sheet: { flex: 1, backgroundColor: c.surface },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#d7d3ce', marginTop: 6 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    title: { flex: 1, fontFamily: AppFonts.psuBold, fontSize: 16, lineHeight: 24, color: c.text },
    closeBtn: {
      width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
      borderRadius: 17, backgroundColor: c.surfaceMuted,
    },
    webview: { flex: 1, backgroundColor: '#ffffff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { fontFamily: AppFonts.psuRegular, fontSize: 14, lineHeight: 21, color: c.textMuted, textAlign: 'center' },
  });
