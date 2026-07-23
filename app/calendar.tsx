import { ChevronDown, ChevronLeft, ChevronRight, CalendarX, X } from 'lucide-react-native';
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { Calendar, LocaleConfig, type DateData } from "react-native-calendars";
import type { MarkedDates } from "react-native-calendars/src/types";

// Render the library calendar in Thai (weekday names row). Month/year come from
// the custom header, but the Su–Sa row uses these — matching the timestamp and
// absence calendars' Thai abbreviations.
LocaleConfig.locales.th = {
  monthNames: [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ],
  monthNamesShort: [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ],
  dayNames: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"],
  dayNamesShort: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],
  today: "วันนี้",
};
LocaleConfig.defaultLocale = "th";

import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { UserAvatar } from "@/components/user-avatar";
import { ThemedView } from "@/components/themed-view";
import { EventTimelineItem } from "@/components/ui";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { useTheme } from "@/context/ThemeContext";
import {
    getCalendarEventsOfMonth,
    getExecutiveCalendarSources,
    type CalendarEvent,
    type CalendarSource,
} from "@/services/executiveCalendarService";

const todayKey = toDateKey(new Date());

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKey(dateKey: string) {
  return `${dateKey.slice(0, 7)}-01`;
}

function formatSelectedDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonthTitle(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("th-TH", {
    month: "long",
  });
}

function formatYearTitle(dateKey: string) {
  // Plain Buddhist-era year (no "พ.ศ." prefix), matching the timestamp calendar.
  return String(new Date(`${dateKey}T00:00:00`).getFullYear() + 543);
}

// Split the source name into the executive position and the parenthetical
// person name, e.g. "คณบดี (ผศ.ดร. …)" → { position: "คณบดี", person: "(ผศ.ดร. …)" }.
function splitSourceName(name: string) {
  const openIndex = name.indexOf("(");
  if (openIndex <= 0) {
    return { position: name.trim(), person: "" };
  }
  return {
    position: name.slice(0, openIndex).trimEnd(),
    person: name.slice(openIndex).trim(),
  };
}

export default function CalendarScreen() {
  const c = useColors();
  const { isDarkMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<CalendarSource>();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(getMonthKey(todayKey));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const eventRequestIdRef = useRef(0);

  const loadSources = useCallback(async () => {
    setLoadingSources(true);
    setErrorMessage("");
    try {
      const result = await getExecutiveCalendarSources();
      setSources(result);
      setSelectedSource((current) => current ?? result[0]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG,
      );
    } finally {
      setLoadingSources(false);
    }
  }, []);

  const loadEvents = useCallback(
    async (source: CalendarSource, monthKey: string) => {
      const requestId = eventRequestIdRef.current + 1;
      eventRequestIdRef.current = requestId;
      setLoadingEvents(true);
      setErrorMessage("");
      try {
        const result = await getCalendarEventsOfMonth(source.source, monthKey);
        if (eventRequestIdRef.current === requestId) {
          setEvents(result);
        }
      } catch (error) {
        if (eventRequestIdRef.current === requestId) {
          setEvents([]);
          setErrorMessage(
            error instanceof Error ? error.message : TEXT.SHARED_SOMETHING_WENT_WRONG,
          );
        }
      } finally {
        if (eventRequestIdRef.current === requestId) {
          setLoadingEvents(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  useEffect(() => {
    if (selectedSource) {
      loadEvents(selectedSource, visibleMonth);
    }
  }, [loadEvents, selectedSource, visibleMonth]);

  const markedDates = useMemo<MarkedDates>(() => {
    // Days with events get a soft filled cell + a dot, mirroring the timestamp
    // calendar (whose status days are a soft background pill + dot).
    const marks = events.reduce<MarkedDates>((acc, event) => {
      acc[event.date] = {
        marked: true,
        dotColor: c.primary,
        customStyles: {
          container: { backgroundColor: c.primarySoft, borderRadius: 10 },
        },
      };
      return acc;
    }, {});
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      // Hide the event dot while the day is selected — the filled cell is
      // enough; the dot under it looks noisy.
      marked: false,
      customStyles: {
        container: { backgroundColor: c.primary, borderRadius: 10 },
        text: { color: c.textOnPrimary },
      },
    };
    return marks;
  }, [events, selectedDate, c.primary, c.primarySoft, c.textOnPrimary]);

  const selectedEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
  );

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: c.surface,
      calendarBackground: c.surface,
      textSectionTitleColor: c.textMuted,
      selectedDayBackgroundColor: c.primary,
      selectedDayTextColor: c.textOnPrimary,
      todayTextColor: c.primary,
      dayTextColor: c.text,
      textDisabledColor: c.textFaint,
      dotColor: c.primary,
      selectedDotColor: c.textOnPrimary,
      arrowColor: c.textMuted,
      // Drop the library's default 10px padding around each arrow so the header
      // band height matches the timestamp calendar (arrow circle + band padding
      // only, no extra hit-area padding inflating the row).
      arrowStyle: { padding: 0 },
      monthTextColor: c.text,
      textDayFontFamily: AppFonts.psuRegular,
      textMonthFontFamily: AppFonts.psuBold,
      textDayHeaderFontFamily: AppFonts.psuBold,
      textDayFontSize: 13,
      textMonthFontSize: 18,
      textDayHeaderFontSize: 12,
      // Color ONLY the month/arrows row (the library's inner `header` sub-style)
      // primary — the weekday-names row below stays on the white card, matching
      // the timestamp calendar. `marginHorizontal:-5` cancels the calendar
      // container's 5px side padding so the band reaches the card edge (clipped
      // flush by the card's overflow:hidden).
      "stylesheet.calendar.header": {
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: c.primary,
          marginTop: 0,
          marginHorizontal: -5,
          paddingHorizontal: 12,
          paddingVertical: 12,
        },
      },
      // Make each day a full-width rounded cell (not the library's default narrow
      // 32×32 box) so the event fill spans the column and contains the dot inside
      // it — matching the timestamp calendar's day pills.
      "stylesheet.day.basic": {
        base: {
          width: "90%",
          height: 36,
          alignItems: "center",
          justifyContent: "center",
        },
        text: {
          marginTop: 0,
          fontSize: 13,
          fontFamily: AppFonts.psuRegular,
          color: c.text,
        },
      },
    }),
    [c],
  );

  const renderCalendarHeader = useCallback(
    () => (
      <View style={styles.calHeader}>
        <ThemedText style={styles.calHeaderLabel}>
          {`${formatMonthTitle(visibleMonth)} ${formatYearTitle(visibleMonth)}`}
        </ThemedText>
      </View>
    ),
    [styles, visibleMonth],
  );

  const renderCalendarArrow = useCallback(
    (direction: "left" | "right") => (
      <View style={styles.calArrow}>
        {direction === "left" ? (
          <ChevronLeft size={20} color={c.textOnPrimary} />
        ) : (
          <ChevronRight size={20} color={c.textOnPrimary} />
        )}
      </View>
    ),
    [styles, c.textOnPrimary],
  );

  const handleMonthChange = (date: DateData) => {
    setVisibleMonth(getMonthKey(date.dateString));
  };

  const handleSelectSource = (source: CalendarSource) => {
    if (selectedSource?.source === source.source) {
      setSourceModalOpen(false);
      return;
    }
    eventRequestIdRef.current += 1;
    setEvents([]);
    setErrorMessage("");
    setLoadingEvents(true);
    setSelectedSource(source);
    setSelectedDate(todayKey);
    setVisibleMonth(getMonthKey(todayKey));
    setSourceModalOpen(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (selectedSource) {
        await loadEvents(selectedSource, visibleMonth);
      } else {
        await loadSources();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const renderEvent = ({ item }: { item: CalendarEvent }) => {
    // Gutter time: start on top, end below as a compact range; all-day events
    // show the localized "ทั้งวัน" label instead.
    const startTime = !item.isAllDay && item.startTime ? item.startTime : null;
    const endTime =
      !item.isAllDay && item.endTime && item.endTime !== item.startTime
        ? item.endTime
        : null;
    const timeLabel = item.isAllDay
      ? TEXT.CALENDAR_ALL_DAY
      : [startTime, endTime].filter(Boolean).join("\n");

    return (
      <EventTimelineItem
        time={timeLabel}
        title={item.title || "—"}
        location={item.location}
      />
    );
  };

  if (loadingSources) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <NavTopBar
          title={TEXT.CALENDAR_HEADER_TITLE}
          titleStyle={{ fontSize: 20, lineHeight: 26 }}
          backHref="/"
          backgroundColor={c.surface}
          contentColor={c.text}
        />
        <LoadingAnimate
          title={TEXT.SHARED_LOADING_DATA_TITLE}
          desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
        />
      </ThemedView>
    );
  }

  const sourceLoadFailed = !sources.length && Boolean(errorMessage);
  if (sourceLoadFailed) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <NavTopBar
          title={TEXT.CALENDAR_HEADER_TITLE}
          titleStyle={{ fontSize: 20, lineHeight: 26 }}
          backHref="/"
          backgroundColor={c.surface}
          contentColor={c.text}
        />
        <ErrorState
          title={TEXT.SHARED_UNABLE_TO_COMPLETE}
          message={errorMessage}
          onRetry={loadSources}
        />
      </ThemedView>
    );
  }

  const eventLoadFailed = Boolean(errorMessage);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <NavTopBar
        title={TEXT.CALENDAR_TITLE}
        titleStyle={{ fontSize: 20, lineHeight: 26 }}
        backHref="/"
        backgroundColor={c.surface}
        contentColor={c.text}
      />

      {/* Fixed calendar panel */}
      <View style={styles.calendarPane}>
        {/* Source selector card */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setSourceModalOpen(true)}
          style={styles.sourceCard}
        >
          {selectedSource ? (
            <UserAvatar staffId={selectedSource.uniId} size={32} />
          ) : null}
          <ThemedText
            style={[styles.sourceText, !selectedSource && styles.sourcePlaceholder]}
            numberOfLines={1}
          >
            {selectedSource?.name || "Select calendar"}
          </ThemedText>
          <ChevronDown size={24} color={c.primary} />
        </Pressable>

        {/* Source picker modal */}
        <Modal
          transparent
          visible={sourceModalOpen}
          animationType="fade"
          onRequestClose={() => setSourceModalOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setSourceModalOpen(false)}>
            <Pressable style={styles.modalWrap}>
              <View style={styles.selectModal}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle} type="defaultSemiBold">
                    Calendar
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={TEXT.SHARED_CLOSE_THAI}
                    onPress={() => setSourceModalOpen(false)}
                    style={styles.closeBtn}
                  >
                    <X size={20} color={c.text} />
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.optionScroll}
                  contentContainerStyle={styles.optionScrollContent}
                >
                  {sources.length ? (
                    sources.map((source, index) => {
                      const active = selectedSource?.source === source.source;
                      const { position, person } = splitSourceName(source.name);
                      return (
                        <Pressable
                          key={`${String(source.source)}-${index}`}
                          accessibilityRole="button"
                          onPress={() => handleSelectSource(source)}
                          style={[styles.option, active && styles.optionActive]}
                        >
                          <UserAvatar staffId={source.uniId} size={40} />
                          <View style={styles.optionTextCol}>
                            <ThemedText
                              numberOfLines={2}
                              style={[styles.optionPosition, active && styles.optionActiveText]}
                            >
                              {position}
                            </ThemedText>
                            {person ? (
                              <ThemedText
                                numberOfLines={2}
                                style={[styles.optionPerson, active && styles.optionActiveText]}
                              >
                                {person}
                              </ThemedText>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })
                  ) : (
                    <ThemedText style={styles.optionEmpty}>{TEXT.SHARED_EMPTY_DATA}</ThemedText>
                  )}
                </ScrollView>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Calendar */}
        {!eventLoadFailed && (
          <View style={styles.calendarCard}>
            <Calendar
              current={selectedDate}
              markedDates={markedDates}
              markingType="custom"
              onDayPress={(date) => setSelectedDate(date.dateString)}
              onMonthChange={handleMonthChange}
              renderHeader={renderCalendarHeader}
              renderArrow={renderCalendarArrow}
              theme={calendarTheme}
            />
          </View>
        )}
      </View>

      {/* Selected-date events — timeline rows on the background, matching the
          meeting lists (shared EventTimelineItem). */}
      <View style={styles.eventsPane}>
        <FlatList
          style={styles.eventList}
          data={selectedEvents}
          keyExtractor={(item, index) => `${String(item.id || "event")}-${index}`}
          renderItem={renderEvent}
          contentContainerStyle={styles.eventListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.dateHeader}>
                <ThemedText style={styles.dateHeaderText}>
                  {formatSelectedDate(selectedDate)}
                </ThemedText>
              </View>
              {loadingEvents ? (
                <LoadingAnimate
                  fill={false}
                  title={TEXT.SHARED_LOADING_DATA_TITLE}
                  desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
                />
              ) : null}
            </>
          }
          ListEmptyComponent={
            loadingEvents ? null : errorMessage ? (
              <View style={styles.errorBox}>
                <ThemedText style={styles.errorTitle}>
                  {TEXT.SHARED_UNABLE_TO_COMPLETE}
                </ThemedText>
                <ThemedText style={styles.errorDetail}>{errorMessage}</ThemedText>
                <Pressable style={styles.retryBtn} onPress={handleRefresh}>
                  <ThemedText style={styles.retryBtnText}>{TEXT.SHARED_RETRY}</ThemedText>
                </Pressable>
              </View>
            ) : (
              <EmptyState icon={CalendarX} message={TEXT.SHARED_EMPTY_DATA} />
            )
          }
        />
      </View>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  // ─── Calendar pane ───────────────────────────────────────────────
  calendarPane: {
    backgroundColor: c.background,
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  sourceText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
  },
  sourcePlaceholder: {
    color: c.textFaint,
  },
  calendarCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingBottom: 4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  // ─── Calendar header (month / year + arrows) ─────────────────────
  calHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  // Single-line "month year" label matching the timestamp calendar header.
  calHeaderLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: c.textOnPrimary,
    fontFamily: AppFonts.psuBold,
  },
  calArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.primaryDeep,
  },
  // Date label above the timeline — same size/weight/colour as the meeting
  // date headers.
  dateHeader: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateHeaderText: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
    fontFamily: AppFonts.psuBold,
  },

  // ─── Events list (shared EventTimelineItem on the background) ─────
  eventsPane: {
    flex: 1,
    paddingHorizontal: 16,
  },
  eventList: {
    flex: 1,
  },
  eventListContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  // ─── Empty / error states ────────────────────────────────────────
  errorBox: {
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.primarySoft,
    padding: 16,
    gap: 6,
  },
  errorTitle: {
    color: c.primary,
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
  },
  errorDetail: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  retryBtnText: {
    color: c.textOnPrimary,
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
  },

  // ─── Center error (source load fail) ─────────────────────────────
  centerError: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 56,
  },

  // ─── Modal ───────────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: 24,
  },
  modalWrap: {
    width: "100%",
    maxWidth: 460,
  },
  selectModal: {
    width: "100%",
    maxHeight: 520,
    borderRadius: 16,
    backgroundColor: c.surface,
    padding: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    color: c.text,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: `${c.text}14`,
  },
  optionScroll: {
    maxHeight: 360,
  },
  optionScrollContent: {
    gap: 8,
  },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionActive: {
    borderColor: c.primary,
    backgroundColor: c.primary,
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionPosition: {
    color: c.text,
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 20,
  },
  optionPerson: {
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 19,
  },
  optionActiveText: {
    color: c.textOnPrimary,
  },
  optionEmpty: {
    color: c.textMuted,
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
});
