import { ChevronDown, ChevronLeft, ChevronRight, MapPin, CalendarX } from 'lucide-react-native';
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';
import { Calendar, type DateData } from "react-native-calendars";
import type { MarkedDates } from "react-native-calendars/src/types";

import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { UserAvatar } from "@/components/user-avatar";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { useTheme } from "@/context/ThemeContext";
import {
    getCalendarEventsOfMonth,
    getExecutiveCalendarSources,
    type CalendarEvent,
    type CalendarSource,
} from "@/services/executiveCalendarService";

// Rotating accent dots for the event list — a small, tasteful set that reads
// clearly against the white panel (brand red, amber, green).
const EVENT_COLORS = ["#B33939", "#E8842B", "#2E9E7B"] as const;

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

function getEventColor(isAllDay: boolean, index: number): string {
  if (isAllDay) return EVENT_COLORS[0];
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

function formatMonthTitle(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("th-TH", {
    month: "long",
  });
}

function formatYearTitle(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("th-TH", {
    year: "numeric",
  });
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
  const { height } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);
  // Scale the screen title with the device height (clamped) so it feels
  // proportional on both short and tall screens.
  const titleSize = Math.round(Math.min(26, Math.max(20, height * 0.028)));
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
    const marks = events.reduce<MarkedDates>((acc, event) => {
      acc[event.date] = { marked: true, dotColor: c.primary };
      return acc;
    }, {});
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      // Hide the event dot while the day is selected — the filled circle is
      // enough; the dot under it looks noisy.
      marked: false,
      selectedColor: c.primary,
      selectedTextColor: c.textOnPrimary,
    };
    return marks;
  }, [events, selectedDate, c.primary, c.textOnPrimary]);

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
      monthTextColor: c.text,
      textDayFontFamily: AppFonts.psuRegular,
      textMonthFontFamily: AppFonts.psuBold,
      textDayHeaderFontFamily: AppFonts.psuBold,
      textDayFontSize: 13,
      textMonthFontSize: 18,
      textDayHeaderFontSize: 12,
    }),
    [c],
  );

  const renderCalendarHeader = useCallback(
    () => (
      <View style={styles.calHeader}>
        <ThemedText style={styles.calHeaderMonth}>
          {formatMonthTitle(visibleMonth)}
        </ThemedText>
        <ThemedText style={styles.calHeaderYear}>
          {formatYearTitle(visibleMonth)}
        </ThemedText>
      </View>
    ),
    [styles, visibleMonth],
  );

  const renderCalendarArrow = useCallback(
    (direction: "left" | "right") => (
      <View style={styles.calArrow}>
        {direction === "left" ? (
          <ChevronLeft size={18} color={c.textMuted} />
        ) : (
          <ChevronRight size={18} color={c.textMuted} />
        )}
      </View>
    ),
    [styles, c.textMuted],
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

  const renderEvent = ({ item, index }: { item: CalendarEvent; index: number }) => {
    const color = getEventColor(item.isAllDay, index);
    const startTime = !item.isAllDay && item.startTime ? item.startTime : null;
    const endTime =
      !item.isAllDay && item.endTime && item.endTime !== item.startTime
        ? item.endTime
        : null;
    const timeLabel = item.isAllDay
      ? "ALL DAY"
      : [startTime, endTime].filter(Boolean).join(" - ");

    return (
      <View style={styles.eventRow}>
        <View style={styles.eventMetaRow}>
          <View style={[styles.eventDot, { backgroundColor: color }]} />
          <ThemedText style={styles.eventTime}>{timeLabel || "—"}</ThemedText>
        </View>
        <ThemedText style={styles.eventTitle} numberOfLines={2}>
          {item.title || "—"}
        </ThemedText>
        {item.location ? (
          <View style={styles.locationRow}>
            <MapPin size={12} color={c.textMuted} style={styles.locationIcon} />
            <ThemedText style={styles.locationText} numberOfLines={2}>
              {item.location}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  };

  if (loadingSources) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <NavTopBar
          title=""
          backHref="/"
          backgroundColor={c.background}
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
          title=""
          backHref="/"
          backgroundColor={c.background}
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
      <StatusBar style="light" />
      <NavTopBar
        title=""
        backHref="/"
        backgroundColor={c.background}
        contentColor={c.text}
      />

      {/* Fixed calendar panel */}
      <View style={styles.calendarPane}>
        {/* Screen title, shown in the content instead of the top bar */}
        <ThemedText style={[styles.pageTitle, { fontSize: titleSize, lineHeight: titleSize + 6 }]}>
          {TEXT.CALENDAR_TITLE}
        </ThemedText>

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
            <Pressable>
              <View style={styles.selectModal}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle} type="defaultSemiBold">
                    Calendar
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSourceModalOpen(false)}
                    style={styles.closeBtn}
                  >
                    <ThemedText style={styles.closeBtnText} type="defaultSemiBold">
                      {TEXT.SHARED_CLOSE_THAI}
                    </ThemedText>
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
              markingType="dot"
              onDayPress={(date) => setSelectedDate(date.dateString)}
              onMonthChange={handleMonthChange}
              renderHeader={renderCalendarHeader}
              renderArrow={renderCalendarArrow}
              theme={calendarTheme}
            />
          </View>
        )}
      </View>

      {/* Scrollable events list — a single card (outer view holds the shadow,
          inner clips content so only one border ever shows) */}
      <View style={styles.eventCardShadow}>
        <View style={styles.eventCard}>
          {/* Selected-date header, now part of the events section */}
          <View style={styles.dateHeader}>
            <ThemedText style={styles.dateHeaderText}>
              {formatSelectedDate(selectedDate)}
            </ThemedText>
          </View>
          <FlatList
            style={styles.eventList}
            data={selectedEvents}
            keyExtractor={(item, index) => `${String(item.id || "event")}-${index}`}
            renderItem={renderEvent}
            contentContainerStyle={styles.eventListContent}
            ItemSeparatorComponent={() => <View style={styles.eventSeparator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={c.primary}
                colors={[c.primary]}
              />
            }
            ListHeaderComponent={
              loadingEvents ? (
                <LoadingAnimate
                  fill={false}
                  title={TEXT.SHARED_LOADING_DATA_TITLE}
                  desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
                />
              ) : null
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
    paddingTop: 8,
    gap: 12,
  },
  pageTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: c.text,
    fontFamily: AppFonts.psuBold,
    marginBottom: 16,
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
  calHeaderMonth: {
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
    fontFamily: AppFonts.psuRegular,
  },
  calHeaderYear: {
    fontSize: 11,
    lineHeight: 14,
    color: c.textFaint,
    fontFamily: AppFonts.psuRegular,
  },
  calArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surfaceMuted,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  dateHeaderText: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
    fontFamily: AppFonts.psuBold,
  },

  // ─── Events list ─────────────────────────────────────────────────
  // One card: the outer view carries the soft shadow + rounded background, the
  // inner view clips the list to the radius so only its single border shows
  // (no doubled edge where dividers/content meet the card border).
  eventCardShadow: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: c.surface,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  eventCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: "hidden",
  },
  eventList: {
    flex: 1,
  },
  eventListContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 6,
  },
  eventSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
  eventRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  eventMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventTime: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
    letterSpacing: 0.3,
  },
  eventTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: AppFonts.psuRegular,
    color: c.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  locationIcon: {
    marginTop: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
    fontFamily: AppFonts.psuRegular,
  },

  // ─── Empty / error states ────────────────────────────────────────
  errorBox: {
    marginVertical: 16,
    marginHorizontal: 16,
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
    padding: 40,
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
    height: 36,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    paddingHorizontal: 12,
  },
  closeBtnText: {
    color: c.textMuted,
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
