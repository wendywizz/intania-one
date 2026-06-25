import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  X,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import {
  cacheDirectory,
  downloadAsync,
  readAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { ENDPOINTS } from '@/constants/endpoints';
import { TEXT } from '@/constants/text';
import type { MeetingAgendaItem, MeetingSubtopic, MeetingTopic } from '@/models/types';
import { getMeetingTopics } from '@/services/meetingService';
import { formatMeetingDetailDate } from '@/utils/date-format';

function toPdfProxyUrl(url: string): string {
  return `${ENDPOINTS.meetingPdf}?url=${encodeURIComponent(url)}`;
}

// ─── PDF Viewer Modal ─────────────────────────────────────────────────────────

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

function PdfViewerModal({ url, onClose }: { url: string; onClose: () => void }) {
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

    if (Platform.OS !== 'android') {
      setWebSource({ uri: url });
      return;
    }

    setDownloading(true);
    const localUri = `${cacheDirectory ?? ''}pdf_${Date.now()}.pdf`;

    downloadAsync(url, localUri)
      .then(({ uri: saved }) =>
        readAsStringAsync(saved, { encoding: EncodingType.Base64 })
      )
      .then((base64) => {
        setWebSource({ html: buildPdfViewerHtml(base64) });
      })
      .catch(() => {
        setWebSource({ uri: url });
      })
      .finally(() => setDownloading(false));
  }, [url]);

  const showProgress = downloading || (!webLoaded && webSource !== null);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[pdfStyles.sheet, { paddingTop: insets.top > 0 ? insets.top : 8, paddingBottom: insets.bottom }]}>
        <View style={pdfStyles.handle} />
        <View style={pdfStyles.header}>
          <ThemedText style={pdfStyles.headerTitle} numberOfLines={1}>เอกสาร PDF</ThemedText>
          <Pressable onPress={onClose} style={pdfStyles.closeBtn} hitSlop={10}>
            <X size={18} color="#584140" />
          </Pressable>
        </View>
        <View style={pdfStyles.progressTrack}>
          {showProgress && (
            <View
              style={[
                pdfStyles.progressFill,
                { width: downloading ? '25%' : (`${Math.round(progress * 100)}%` as `${number}%`) },
              ]}
            />
          )}
        </View>
        {webSource && (
          <WebView
            source={webSource}
            style={pdfStyles.webview}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPdfFilename(url: string): string {
  try {
    const last = url.split('/').pop()?.split('?')[0];
    return last || 'document.pdf';
  } catch {
    return 'document.pdf';
  }
}

// ─── Shared Components ────────────────────────────────────────────────────────

function NumberBadge({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <View style={[styles.numberBadge, dim && styles.numberBadgeDim]}>
      <ThemedText style={[styles.numberBadgeText, dim && styles.numberBadgeTextDim]}>{label}</ThemedText>
    </View>
  );
}

function PdfCard({
  index,
  title,
  pdfUrl,
  pdfPages,
  expandable,
  expanded,
  onPress,
}: {
  index?: string;
  title: string;
  pdfUrl: string;
  pdfPages?: number;
  expandable?: boolean;
  expanded?: boolean;
  onPress: () => void;
}) {
  const filename = getPdfFilename(pdfUrl);
  return (
    <Pressable style={styles.pdfCard} onPress={onPress} accessibilityRole="button">
      <View style={styles.pdfBadge}>
        <ThemedText style={styles.pdfBadgeText}>PDF</ThemedText>
      </View>
      <View style={styles.pdfCardBody}>
        <ThemedText style={styles.pdfCardTitle} numberOfLines={0}>
          {index ? `${index} ` : ''}{title}
        </ThemedText>
        <ThemedText style={styles.pdfCardMeta} numberOfLines={1}>
          {filename}{typeof pdfPages === 'number' ? ` • ${pdfPages} หน้า` : ''}
        </ThemedText>
      </View>
      {expandable
        ? (expanded ? <ChevronDown size={16} color="#8B716F" /> : <ChevronRight size={16} color="#8B716F" />)
        : <ChevronRight size={16} color="#8B716F" />}
    </Pressable>
  );
}

// ─── 3rd level: items inside a subtopic ──────────────────────────────────────

function AgendaItemRow({
  item,
  onOpenPdf,
}: {
  item: MeetingAgendaItem;
  onOpenPdf: (url: string) => void;
}) {
  const hasPdf = !!(item.has_pdf && item.pdf_url);

  if (hasPdf) {
    return (
      <PdfCard
        index={item.index}
        title={item.topic ?? ''}
        pdfUrl={item.pdf_url!}
        pdfPages={item.pdf_pages}
        onPress={() => onOpenPdf(item.pdf_url!)}
      />
    );
  }

  return (
    <View style={styles.itemRow}>
      <NumberBadge label={item.index ?? '?'} />
      <ThemedText style={[styles.rowText, styles.itemText]} numberOfLines={0}>
        {item.topic ?? ''}
      </ThemedText>
    </View>
  );
}

// ─── 2nd level: subtopics ─────────────────────────────────────────────────────

function SubtopicRow({
  sub,
  onOpenPdf,
}: {
  sub: MeetingSubtopic;
  onOpenPdf: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const items = sub.items ?? [];
  const hasItems = items.length > 0;
  const hasPdf = !!(sub.has_pdf && sub.pdf_url);

  if (hasPdf) {
    return (
      <View>
        <PdfCard
          index={sub.index}
          title={sub.topic ?? ''}
          pdfUrl={sub.pdf_url!}
          pdfPages={sub.pdf_pages}
          expandable={hasItems}
          expanded={open}
          onPress={() => {
            if (hasItems) setOpen(v => !v);
            else onOpenPdf(sub.pdf_url!);
          }}
        />
        {open && items.map((item, i) => (
          <AgendaItemRow key={item.record_id ?? i} item={item} onOpenPdf={onOpenPdf} />
        ))}
      </View>
    );
  }

  return (
    <View>
      <Pressable
        style={styles.subtopicRow}
        onPress={() => { if (hasItems) setOpen(v => !v); }}
        accessibilityRole="button"
        disabled={!hasItems}
      >
        <NumberBadge label={sub.index ?? '?'} />
        <ThemedText style={[styles.rowText, styles.subtopicText]} numberOfLines={0}>
          {sub.topic ?? ''}
        </ThemedText>
        {hasItems
          ? (open ? <ChevronDown size={15} color="#8B716F" /> : <ChevronRight size={15} color="#8B716F" />)
          : null}
      </Pressable>
      {open && items.map((item, i) => (
        <AgendaItemRow key={item.record_id ?? i} item={item} onOpenPdf={onOpenPdf} />
      ))}
    </View>
  );
}

// ─── 1st level: topics ───────────────────────────────────────────────────────

function TopicRow({
  topic,
  isFirst,
  onOpenPdf,
}: {
  topic: MeetingTopic;
  isFirst: boolean;
  onOpenPdf: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const subtopics = topic.subtopics ?? [];
  const hasChildren = subtopics.length > 0;
  const hasPdf = !!(topic.has_pdf && topic.pdf_url);
  const isEmpty = !hasChildren && !hasPdf;

  return (
    <View style={!isFirst ? styles.topicBorder : undefined}>
      <Pressable
        style={styles.topicRow}
        onPress={() => {
          if (hasChildren) setOpen(v => !v);
          else if (hasPdf && topic.pdf_url) onOpenPdf(topic.pdf_url);
        }}
        accessibilityRole="button"
        disabled={isEmpty}
      >
        <NumberBadge label={topic.index ?? '?'} dim={isEmpty} />
        <ThemedText style={[styles.rowText, styles.topicText, isEmpty && styles.topicTextDim]} numberOfLines={0}>
          {topic.topic ?? ''}
        </ThemedText>
        {hasChildren ? (
          open
            ? <ChevronDown size={18} color="#8B716F" />
            : <ChevronRight size={18} color="#8B716F" />
        ) : hasPdf ? (
          <ThemedText style={styles.viewDocText}>ดูเอกสาร</ThemedText>
        ) : null}
      </Pressable>

      {open && subtopics.map((sub, i) => (
        <SubtopicRow key={sub.record_id ?? i} sub={sub} onOpenPdf={onOpenPdf} />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MeetingDetailScreen() {
  const { m_id = '', main_id = '', name = '', date = '', room = '', meeting_no = '' } =
    useLocalSearchParams<{
      m_id: string;
      main_id: string;
      name: string;
      date: string;
      room: string;
      meeting_no: string;
    }>();

  const [topics, setTopics] = useState<MeetingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  function handleOpenPdf(rawUrl: string) {
    setPdfUrl(toPdfProxyUrl(rawUrl));
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    getMeetingTopics(m_id, main_id)
      .then((data) => { if (!cancelled) setTopics(data); })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : TEXT.MEETING_UNABLE_TO_LOAD_AGENDA);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [m_id, main_id]);

  const formattedDate = date ? formatMeetingDetailDate(date) : '';

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.MEETING_AGENDA_TITLE} showBackButton onBackPress={() => router.back()} />
        <LoadingAnimate title={TEXT.MEETING_LOADING_AGENDA} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.MEETING_AGENDA_TITLE} showBackButton onBackPress={() => router.back()} />
        <View style={styles.centerWrap}>
          <View style={styles.errorCard}>
            <ThemedText style={styles.errorTitle}>{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
            <ThemedText style={styles.errorMessage}>{error}</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.retryButton}
            >
              <ThemedText style={styles.retryText}>{TEXT.SHARED_GO_BACK}</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.MEETING_AGENDA_TITLE} showBackButton onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBody}>
            {meeting_no ? (
              <View style={styles.meetingNoChip}>
                <ThemedText style={styles.meetingNoText}>ครั้งที่ {meeting_no}</ThemedText>
              </View>
            ) : null}
            <ThemedText style={styles.heroTitle}>{name || 'ไม่ระบุชื่อ'}</ThemedText>
            {(formattedDate || room) ? (
              <View style={styles.heroMeta}>
                {formattedDate ? (() => {
                  const [datePart, timePart] = formattedDate.split(' • ');
                  return (
                    <>
                      <View style={styles.heroMetaRow}>
                        <CalendarDays size={14} color="#922124" />
                        <ThemedText style={styles.heroMetaLabel}>วันที่</ThemedText>
                        <ThemedText style={styles.heroMetaValue}>{datePart}</ThemedText>
                      </View>
                      {timePart ? (
                        <View style={styles.heroMetaRow}>
                          <Clock size={14} color="#922124" />
                          <ThemedText style={styles.heroMetaLabel}>เวลา</ThemedText>
                          <ThemedText style={styles.heroMetaValue}>{timePart}</ThemedText>
                        </View>
                      ) : null}
                    </>
                  );
                })() : null}
                {room ? (
                  <View style={styles.heroMetaRow}>
                    <MapPin size={14} color="#922124" />
                    <ThemedText style={styles.heroMetaLabel}>สถานที่</ThemedText>
                    <ThemedText style={styles.heroMetaValue}>{room}</ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Agenda */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>{TEXT.MEETING_AGENDA_SECTION}</ThemedText>
            {(() => {
              const activeCount = topics.filter(
                t => (t.subtopics?.length ?? 0) > 0 || !!(t.has_pdf && t.pdf_url)
              ).length;
              return activeCount > 0 ? (
                <View style={styles.countBadge}>
                  <ThemedText style={styles.countBadgeText}>
                    {activeCount}{TEXT.MEETING_TOPICS_COUNT}
                  </ThemedText>
                </View>
              ) : null;
            })()}
          </View>

          {topics.length > 0 ? (
            <View style={styles.card}>
              {topics.map((topic, i) => (
                <TopicRow
                  key={topic.record_id ?? i}
                  topic={topic}
                  isFirst={i === 0}
                  onOpenPdf={handleOpenPdf}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <BookOpen size={36} color="#DADFF0" />
              <ThemedText style={styles.emptyText}>{TEXT.MEETING_NO_AGENDA}</ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      {pdfUrl ? (
        <PdfViewerModal url={pdfUrl} onClose={() => setPdfUrl(null)} />
      ) : null}
    </ThemedView>
  );
}

// ─── PDF Modal Styles ─────────────────────────────────────────────────────────

const pdfStyles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    flex: 1,
    fontFamily: AppFonts.psuBold,
    fontSize: 16,
    color: '#191C1F',
    marginRight: 12,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 2,
    backgroundColor: '#F3F4F6',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#922124',
  },
  webview: {
    flex: 1,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  scrollContent: { paddingBottom: 48 },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFBFBD',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroBody: {
    padding: 16,
    gap: 10,
  },
  meetingNoChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5E8E8',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  meetingNoText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    color: '#922124',
  },
  heroTitle: {
    fontFamily: AppFonts.psuBold,
    fontSize: 20,
    lineHeight: 28,
    color: '#191C1F',
  },
  heroMeta: {
    borderTopWidth: 1,
    borderTopColor: '#F5E8E8',
    paddingTop: 12,
    gap: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  heroMetaLabel: {
    fontFamily: AppFonts.psuBold,
    fontSize: 13,
    lineHeight: 20,
    color: '#584140',
    width: 76,
    flexShrink: 0,
  },
  heroMetaValue: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    lineHeight: 20,
    color: '#191C1F',
    flex: 1,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: AppFonts.psuBold,
    fontSize: 16,
    color: '#191C1F',
  },
  countBadge: {
    backgroundColor: '#E7E8EC',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    color: '#584140',
  },

  // ── Card container ────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DFBFBD',
    overflow: 'hidden',
  },

  // ── Number badge (shared across all levels) ───────────────────────────────
  numberBadge: {
    backgroundColor: '#2E3134',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    flexShrink: 0,
  },
  numberBadgeDim: {
    backgroundColor: '#D1D5DB',
  },
  numberBadgeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  numberBadgeTextDim: {
    color: '#9CA3AF',
  },

  // ── Topic row (level 1) ───────────────────────────────────────────────────
  topicBorder: { borderTopWidth: 1, borderTopColor: '#DFBFBD' },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  topicText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    color: '#191C1F',
  },
  topicTextDim: {
    color: '#9CA3AF',
  },
  viewDocText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    color: '#922124',
    flexShrink: 0,
  },

  // ── PDF card (subtopic/item with PDF) ─────────────────────────────────────
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E1E2E6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  pdfBadge: {
    backgroundColor: '#922124',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    minWidth: 38,
  },
  pdfBadgeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  pdfCardBody: {
    flex: 1,
    gap: 3,
  },
  pdfCardTitle: {
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    color: '#191C1F',
    lineHeight: 20,
  },
  pdfCardMeta: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 12,
    color: '#8B716F',
  },

  // ── Subtopic row without PDF (level 2) ────────────────────────────────────
  subtopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E1E2E6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  subtopicText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    color: '#3D4048',
  },

  // ── Agenda item row without PDF (level 3) ─────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 28,
    gap: 10,
  },
  itemText: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    color: '#585E6D',
    lineHeight: 20,
  },

  // ── Shared ────────────────────────────────────────────────────────────────
  rowText: { flex: 1, lineHeight: 22 },

  // ── Empty / Error ─────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    color: '#585E6D',
  },
  centerWrap: { flex: 1, padding: 16, justifyContent: 'center' },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223,191,189,0.4)',
    padding: 20,
    gap: 8,
  },
  errorTitle: { fontFamily: AppFonts.psuBold, fontSize: 15, color: '#B33939' },
  errorMessage: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    color: '#584140',
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#B33939',
  },
  retryText: { color: '#FFFFFF', fontFamily: AppFonts.psuBold, fontSize: 14 },
});
