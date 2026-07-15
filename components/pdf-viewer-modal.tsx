import {
    cacheDirectory,
    downloadAsync,
    EncodingType,
    readAsStringAsync,
} from "expo-file-system/legacy";
import * as WebBrowser from "expo-web-browser";
import { Printer, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Linking,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/themed-text";

// Renders a PDF's pages to canvases with pdf.js — used on Android, whose WebView
// can't display a raw PDF inline.
function buildPdfViewerHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#525659}
    #pages{padding:6px}
    canvas{display:block;width:100%!important;margin-bottom:6px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}
    #msg{color:#fff;padding:20px;text-align:center;font-family:sans-serif;font-size:14px}
  </style>
</head>
<body>
  <div id="msg">กำลังโหลดเอกสาร...</div>
  <div id="pages"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var raw=atob('${base64}'),buf=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++)buf[i]=raw.charCodeAt(i);
    pdfjsLib.getDocument({data:buf}).promise.then(function(pdf){
      document.getElementById('msg').remove();
      var el=document.getElementById('pages'),n=1,total=pdf.numPages;
      (function next(){
        if(n>total)return;
        pdf.getPage(n++).then(function(p){
          var sc=window.innerWidth/p.getViewport({scale:1}).width;
          var vp=p.getViewport({scale:sc});
          var c=document.createElement('canvas');
          c.width=vp.width;c.height=vp.height;
          el.appendChild(c);
          p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise.then(next);
        });
      })();
    }).catch(function(){
      document.getElementById('msg').textContent='ไม่สามารถโหลดเอกสารได้';
    });
  </script>
</body>
</html>`;
}

type PdfViewerModalProps = {
  url: string;
  title?: string;
  /** Whether to show the header Print action. Defaults to true. */
  showPrint?: boolean;
  onClose: () => void;
};

/**
 * Full-screen PDF viewer (WebView) with a Print action. Mirrors the meeting
 * module's viewer: web/iOS load the URL directly; Android downloads and renders
 * via pdf.js since its WebView can't show a raw PDF inline.
 */
export function PdfViewerModal({ url, title = "เอกสาร PDF", showPrint = true, onClose }: PdfViewerModalProps) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [webSource, setWebSource] = useState<
    { uri: string } | { html: string } | null
  >(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [webLoaded, setWebLoaded] = useState(false);

  useEffect(() => {
    setWebSource(null);
    setWebLoaded(false);
    setProgress(0);

    if (Platform.OS !== "android") {
      setWebSource({ uri: url });
      return;
    }

    setDownloading(true);
    const localUri = `${cacheDirectory ?? ""}pdf_${Date.now()}.pdf`;

    downloadAsync(url, localUri)
      .then(({ uri: saved }) =>
        readAsStringAsync(saved, { encoding: EncodingType.Base64 }),
      )
      .then((base64) => {
        setWebSource({ html: buildPdfViewerHtml(base64) });
      })
      .catch(() => {
        setWebSource({ uri: url });
      })
      .finally(() => setDownloading(false));
  }, [url]);

  const handlePrint = () => {
    // Cross-origin PDFs can't be printed from an embedded frame, so open the PDF
    // where the platform's own viewer offers a print action.
    if (Platform.OS === "web") {
      window.open(url, "_blank");
      return;
    }
    WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
  };

  const showProgress = downloading || (!webLoaded && webSource !== null);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.sheet,
          { paddingTop: insets.top > 0 ? insets.top : 8, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle} numberOfLines={1}>
            {title}
          </ThemedText>
          <View style={styles.headerActions}>
            {showPrint ? (
              <Pressable onPress={handlePrint} style={styles.printBtn} accessibilityRole="button">
                <Printer size={15} color="#FFFFFF" />
                <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" style={styles.printBtnText}>
                  พิมพ์
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10} accessibilityRole="button">
              <X size={18} color={c.textMuted} />
            </Pressable>
          </View>
        </View>
        <View style={styles.progressTrack}>
          {showProgress && (
            <View
              style={[
                styles.progressFill,
                {
                  width: downloading
                    ? "25%"
                    : (`${Math.round(progress * 100)}%` as `${number}%`),
                },
              ]}
            />
          )}
        </View>
        {webSource && (
          <WebView
            source={webSource}
            style={styles.webview}
            onLoadStart={() => setWebLoaded(false)}
            onLoadEnd={() => setWebLoaded(true)}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            allowsInlineMediaPlayback
            javaScriptEnabled
          />
        )}
      </View>
    </Modal>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: c.surface,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d7d3ce",
    marginTop: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: c.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: c.info,
  },
  printBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: c.surfaceMuted,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "#e8e6ea",
  },
  progressFill: {
    height: 3,
    backgroundColor: c.info,
  },
  webview: {
    flex: 1,
    backgroundColor: "#525659",
  },
});
