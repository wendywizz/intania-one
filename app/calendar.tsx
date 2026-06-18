import { ChevronDown, MapPin } from 'lucide-react-native';
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
import { Calendar, type DateData } from "react-native-calendars";
import type { MarkedDates } from "react-native-calendars/src/types";

import { LoadingAnimate } from "@/components/loading-animate";
import { NavTopBar } from "@/components/nav-top-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import {
    getCalendarEventsOfMonth,
    getExecutiveCalendarSources,
    type CalendarEvent,
    type CalendarSource,
} from "@/services/executiveCalendarService";

const EVENT_COLORS = ["#585E6D", "#DFBFBD", "#922124"] as const;

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
  });
}

function getEventColor(isAllDay: boolean, index: number): string {
  if (isAllDay) return "#922124";
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

export default function CalendarScreen() {
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
      acc[event.date] = { marked: true, dotColor: "#922124" };
      return acc;
    }, {});
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: "#922124",
      selectedTextColor: "#FFFFFF",
    };
    return marks;
  }, [events, selectedDate]);

  const selectedEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
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

    return (
      <View style={[styles.eventCard, { borderLeftColor: color }]}>
        <View style={styles.eventRow}>
          <View style={styles.timeCol}>
            {item.isAllDay ? (
              <ThemedText style={styles.allDayLabel}>ALL DAY</ThemedText>
            ) : (
              <>
                {startTime ? (
                  <ThemedText style={styles.startTime}>{startTime}</ThemedText>
                ) : null}
                {endTime ? (
                  <ThemedText style={styles.endTime}>{endTime}</ThemedText>
                ) : null}
              </>
            )}
          </View>
          <View style={styles.eventBody}>
            <ThemedText style={styles.eventTitle} numberOfLines={2}>
              {item.title || "—"}
            </ThemedText>
            {item.location ? (
              <View style={styles.locationRow}>
                <MapPin size={12} color="#584140" />
                <ThemedText style={styles.locationText} numberOfLines={2}>
                  {item.location}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  if (loadingSources) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.CALENDAR_TITLE} backHref="/" />
        <LoadingAnimate
          title="Loading calendar"
          desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT}
        />
      </ThemedView>
    );
  }

  const sourceLoadFailed = !sources.length && Boolean(errorMessage);
  if (sourceLoadFailed) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.CALENDAR_TITLE} backHref="/" />
        <View style={styles.centerError}>
          <View style={styles.errorBox}>
            <ThemedText style={[styles.errorTitle, { textAlign: "center" }]}>
              {TEXT.SHARED_UNABLE_TO_COMPLETE}
            </ThemedText>
            <ThemedText style={[styles.errorDetail, { textAlign: "center" }]}>
              {errorMessage}
            </ThemedText>
            <Pressable style={[styles.retryBtn, { alignSelf: "center" }]} onPress={loadSources}>
              <ThemedText style={styles.retryBtnText}>{TEXT.SHARED_RETRY}</ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  const eventLoadFailed = Boolean(errorMessage);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.CALENDAR_TITLE} backHref="/" />

      {/* Fixed calendar panel */}
      <View style={styles.calendarPane}>
        {/* Source selector card */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setSourceModalOpen(true)}
          style={styles.sourceCard}
        >
          <ThemedText
            style={[styles.sourceText, !selectedSource && styles.sourcePlaceholder]}
            numberOfLines={1}
          >
            {selectedSource?.name || "Select calendar"}
          </ThemedText>
          <ChevronDown size={24} color="#922124" />
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
                      return (
                        <Pressable
                          key={`${String(source.source)}-${index}`}
                          accessibilityRole="button"
                          onPress={() => handleSelectSource(source)}
                          style={[styles.option, active && styles.optionActive]}
                        >
                          <ThemedText
                            style={[styles.optionText, active && styles.optionActiveText]}
                          >
                            {source.name}
                          </ThemedText>
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

        {/* Calendar + date header */}
        {!eventLoadFailed && (
          <>
            <View style={styles.calendarCard}>
              <Calendar
                current={selectedDate}
                markedDates={markedDates}
                markingType="dot"
                onDayPress={(date) => setSelectedDate(date.dateString)}
                onMonthChange={handleMonthChange}
                theme={calendarTheme}
              />
            </View>
            <View style={styles.dateHeader}>
              <ThemedText style={styles.dateHeaderText}>
                {formatSelectedDate(selectedDate)}
              </ThemedText>
            </View>
          </>
        )}
      </View>

      {/* Scrollable events list */}
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
            tintColor="#922124"
            colors={["#922124"]}
          />
        }
        ListHeaderComponent={
          loadingEvents ? (
            <LoadingAnimate
              fill={false}
              title="Loading events"
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
            <View style={styles.emptyWrap}>
              <ThemedText style={styles.emptyTitle} type="defaultSemiBold">
                {TEXT.SHARED_EMPTY_DATA}
              </ThemedText>
              <ThemedText style={styles.emptyMessage}>
                No schedule for this date
              </ThemedText>
            </View>
          )
        }
      />
    </ThemedView>
  );
}

const calendarTheme = {
  backgroundColor: "#FFFFFF",
  calendarBackground: "#FFFFFF",
  textSectionTitleColor: "#8B716F",
  selectedDayBackgroundColor: "#922124",
  selectedDayTextColor: "#FFFFFF",
  todayTextColor: "#B33939",
  dayTextColor: "#191C1F",
  textDisabledColor: "rgba(88, 65, 64, 0.3)",
  dotColor: "#922124",
  selectedDotColor: "#FFFFFF",
  arrowColor: "#8B716F",
  monthTextColor: "#191C1F",
  textDayFontFamily: AppFonts.psuRegular,
  textMonthFontFamily: AppFonts.psuBold,
  textDayHeaderFontFamily: AppFonts.psuBold,
  textDayFontSize: 12,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 12,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FD",
  },

  // ─── Calendar pane ───────────────────────────────────────────────
  calendarPane: {
    backgroundColor: "#F8F9FD",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sourceText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#191C1F",
    fontFamily: AppFonts.psuBold,
  },
  sourcePlaceholder: {
    color: "#8A969C",
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dateHeader: {
    paddingBottom: 4,
  },
  dateHeaderText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#584140",
    fontFamily: AppFonts.psuRegular,
  },

  // ─── Events list ─────────────────────────────────────────────────
  eventList: {
    flex: 1,
  },
  eventListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  eventSeparator: {
    height: 12,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  eventRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  timeCol: {
    width: 55,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  allDayLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuBold,
    color: "#922124",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  startTime: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuBold,
    color: "#585E6D",
  },
  endTime: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: AppFonts.psuRegular,
    color: "rgba(88, 64, 64, 0.6)",
  },
  eventBody: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: AppFonts.psuBold,
    color: "#191C1F",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#584140",
    fontFamily: AppFonts.psuRegular,
  },

  // ─── Empty / error states ────────────────────────────────────────
  emptyWrap: {
    paddingTop: 32,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyTitle: {
    textAlign: "center",
    color: "#584140",
  },
  emptyMessage: {
    marginTop: 4,
    color: "#8B716F",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    marginVertical: 16,
    marginHorizontal: 0,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0C9CE",
    backgroundColor: "#FFF8F8",
    padding: 16,
    gap: 6,
  },
  errorTitle: {
    color: "#C44D58",
    fontFamily: AppFonts.psuBold,
    fontSize: 14,
    lineHeight: 20,
  },
  errorDetail: {
    color: "#584140",
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#922124",
  },
  retryBtnText: {
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    padding: 16,
    shadowColor: "#000",
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
    color: "#191C1F",
  },
  closeBtn: {
    height: 36,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#F2F3F7",
    paddingHorizontal: 12,
  },
  closeBtnText: {
    color: "#584140",
  },
  optionScroll: {
    maxHeight: 360,
  },
  optionScrollContent: {
    gap: 8,
  },
  option: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDEEF2",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionActive: {
    borderColor: "#922124",
    backgroundColor: "#922124",
  },
  optionText: {
    color: "#191C1F",
    lineHeight: 20,
  },
  optionActiveText: {
    color: "#FFFFFF",
  },
  optionEmpty: {
    color: "#584140",
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
});
