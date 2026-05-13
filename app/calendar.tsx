import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/services/calendarService";

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
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getEventTimeLabel(event: CalendarEvent) {
  if (event.isAllDay || !event.startTime) {
    return "All day";
  }

  if (event.endTime && event.endTime !== event.startTime) {
    return `${event.startTime} - ${event.endTime}`;
  }

  return event.startTime;
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

  const loadSources = useCallback(async () => {
    setLoadingSources(true);
    setErrorMessage("");

    try {
      const result = await getExecutiveCalendarSources();
      setSources(result);
      setSelectedSource((current) => current ?? result[0]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : TEXT.SOMETHING_WENT_WRONG,
      );
    } finally {
      setLoadingSources(false);
    }
  }, []);

  const loadEvents = useCallback(
    async (source: CalendarSource, monthKey: string) => {
      setLoadingEvents(true);
      setErrorMessage("");

      try {
        const result = await getCalendarEventsOfMonth(source.source, monthKey);
        setEvents(result);
      } catch (error) {
        setEvents([]);
        setErrorMessage(
          error instanceof Error ? error.message : TEXT.SOMETHING_WENT_WRONG,
        );
      } finally {
        setLoadingEvents(false);
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
      acc[event.date] = {
        marked: true,
        dotColor: "#D89A2B",
      };
      return acc;
    }, {});

    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: "#0A6E8A",
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

  const renderEvent = ({ item }: { item: CalendarEvent }) => (
    <ThemedView
      style={styles.eventItem}
      lightColor="#FFFFFF"
      darkColor="#151718"
    >
      <View style={styles.timeBlock}>
        <ThemedText type="defaultSemiBold" style={styles.timeText}>
          {getEventTimeLabel(item)}
        </ThemedText>
      </View>
      <View style={styles.eventContent}>
        <ThemedText type="defaultSemiBold" style={styles.eventTitle}>
          {item.title || "-"}
        </ThemedText>
        {item.location ? (
          <ThemedText style={styles.location}>{item.location}</ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );

  if (loadingSources) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.TEXT_19} backHref="/" />
        <LoadingAnimate
          title="Loading calendar"
          desc={TEXT.PLEASE_WAIT_A_MOMENT}
        />
      </ThemedView>
    );
  }

  const sourceLoadFailed = !sources.length && Boolean(errorMessage);
  if (sourceLoadFailed) {
    return (
      <ThemedView style={styles.container}>
        <NavTopBar title={TEXT.TEXT_19} backHref="/" />
        <View style={styles.centerErrorWrap}>
          <ThemedView
            style={styles.messageBox}
            lightColor="#FFF8F8"
            darkColor="#2A171A"
          >
            <ThemedText type="defaultSemiBold" style={[styles.errorTitle, styles.centerText]}>
              {TEXT.UNABLE_TO_COMPLETE}
            </ThemedText>
            <ThemedText style={[styles.errorMessage, styles.centerText]}>
              {errorMessage}
            </ThemedText>
            <Pressable style={styles.centerRetryButton} onPress={loadSources}>
              <ThemedText type="defaultSemiBold" style={styles.retryText}>
                {TEXT.RETRY}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.TEXT_19} backHref="/" />
      <FlatList
        data={selectedEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.sourceField}>
              <ThemedText type="defaultSemiBold">Calendar</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSourceModalOpen(true)}
                style={styles.selectButton}
              >
                <ThemedText
                  style={[styles.selectText, !selectedSource ? styles.placeholder : undefined]}
                  numberOfLines={1}
                >
                  {selectedSource?.name || "Select calendar"}
                </ThemedText>
                <ThemedText style={styles.chevron}>v</ThemedText>
              </Pressable>
            </View>

            <Modal
              transparent
              visible={sourceModalOpen}
              animationType="fade"
              onRequestClose={() => setSourceModalOpen(false)}
            >
              <Pressable style={styles.backdrop} onPress={() => setSourceModalOpen(false)}>
                <Pressable>
                  <ThemedView
                    style={styles.selectModal}
                    lightColor="#FFFFFF"
                    darkColor="#151718"
                  >
                    <View style={styles.selectModalHeader}>
                      <ThemedText type="defaultSemiBold" style={styles.selectModalTitle}>
                        Calendar
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setSourceModalOpen(false)}
                        style={styles.closeButton}
                      >
                        <ThemedText type="defaultSemiBold">{TEXT.TEXT_2}</ThemedText>
                      </Pressable>
                    </View>

                    <ScrollView style={styles.optionScroll} contentContainerStyle={styles.optionScrollContent}>
                      {sources.length ? (
                        sources.map((source) => {
                          const active = selectedSource?.source === source.source;
                          return (
                            <Pressable
                              key={source.source}
                              accessibilityRole="button"
                              onPress={() => handleSelectSource(source)}
                              style={[styles.option, active ? styles.selectedOption : undefined]}
                            >
                              <ThemedText
                                lightColor={active ? "#FFFFFF" : undefined}
                                darkColor={active ? "#FFFFFF" : undefined}
                                style={styles.optionText}
                              >
                                {source.name}
                              </ThemedText>
                            </Pressable>
                          );
                        })
                      ) : (
                        <ThemedText style={styles.emptyOption}>{TEXT.TEXT_3}</ThemedText>
                      )}
                    </ScrollView>
                  </ThemedView>
                </Pressable>
              </Pressable>
            </Modal>

            {errorMessage ? (
              <ThemedView
                style={styles.messageBox}
                lightColor="#FFF8F8"
                darkColor="#2A171A"
              >
                <ThemedText type="defaultSemiBold" style={styles.errorTitle}>
                  {TEXT.UNABLE_TO_COMPLETE}
                </ThemedText>
                <ThemedText style={styles.errorMessage}>
                  {errorMessage}
                </ThemedText>
                <Pressable style={styles.retryButton} onPress={handleRefresh}>
                  <ThemedText type="defaultSemiBold" style={styles.retryText}>
                    {TEXT.RETRY}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}

            <ThemedView
              style={styles.calendarWrap}
              lightColor="#FFFFFF"
              darkColor="#151718"
            >
              <Calendar
                current={selectedDate}
                markedDates={markedDates}
                markingType="dot"
                onDayPress={(date) => setSelectedDate(date.dateString)}
                onMonthChange={handleMonthChange}
                theme={calendarTheme}
              />
            </ThemedView>

            <View style={styles.selectedDateHeader}>
              <ThemedText type="subtitle">Events for selected date</ThemedText>
              <ThemedText
                type="defaultSemiBold"
                style={styles.selectedDateText}
              >
                {formatSelectedDate(selectedDate)}
              </ThemedText>
            </View>

            {loadingEvents ? (
              <LoadingAnimate
                fill={false}
                title="Loading events"
                desc={TEXT.PLEASE_WAIT_A_MOMENT}
              />
            ) : null}
          </>
        }
        ListEmptyComponent={
          loadingEvents ? null : (
            <ThemedView
              style={styles.emptyState}
              lightColor="#F6FAFC"
              darkColor="#151718"
            >
              <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
                {TEXT.TEXT_3}
              </ThemedText>
              <ThemedText style={styles.emptyMessage}>
                No schedule for this date
              </ThemedText>
            </ThemedView>
          )
        }
      />
    </ThemedView>
  );
}

const calendarTheme = {
  backgroundColor: "#FFFFFF",
  calendarBackground: "#FFFFFF",
  textSectionTitleColor: "#687076",
  selectedDayBackgroundColor: "#0A6E8A",
  selectedDayTextColor: "#FFFFFF",
  todayTextColor: "#D89A2B",
  dayTextColor: "#11181C",
  textDisabledColor: "#B8C7CE",
  dotColor: "#D89A2B",
  selectedDotColor: "#FFFFFF",
  arrowColor: "#0A6E8A",
  monthTextColor: "#11181C",
  textDayFontFamily: AppFonts.psuRegular,
  textMonthFontFamily: AppFonts.psuBold,
  textDayHeaderFontFamily: AppFonts.psuBold,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  centerErrorWrap: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 56,
  },
  centerText: {
    textAlign: "center",
  },
  centerRetryButton: {
    alignSelf: "center",
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sourceField: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BFD2DA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  selectText: {
    flex: 1,
    color: "#11181C",
  },
  placeholder: {
    color: "#8A969C",
  },
  chevron: {
    color: "#0A6E8A",
    fontSize: 16,
    lineHeight: 20,
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 24,
  },
  selectModal: {
    width: "100%",
    maxWidth: 420,
    maxHeight: 460,
    borderRadius: 8,
    padding: 16,
  },
  selectModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  selectModalTitle: {
    flex: 1,
    fontSize: 16,
  },
  closeButton: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#E4F0F6",
    paddingHorizontal: 14,
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
    borderColor: "#D7E6EC",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedOption: {
    borderColor: "#0A6E8A",
    backgroundColor: "#0A6E8A",
  },
  optionText: {
    color: "#11181C",
    lineHeight: 20,
  },
  emptyOption: {
    color: "#687076",
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: "center",
  },
  messageBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0C9CE",
    padding: 14,
  },
  errorTitle: {
    color: "#C44D58",
  },
  errorMessage: {
    marginTop: 4,
    color: "#687076",
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#0A6E8A",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: "#FFFFFF",
  },
  calendarWrap: {
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    overflow: "hidden",
  },
  selectedDateHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  selectedDateText: {
    marginTop: 2,
    color: "#0A6E8A",
  },
  eventItem: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D7E6EC",
    paddingVertical: 14,
  },
  timeBlock: {
    width: 92,
    paddingRight: 12,
  },
  timeText: {
    color: "#0A6E8A",
    fontSize: 13,
    lineHeight: 18,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  location: {
    marginTop: 4,
    color: "#687076",
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D7E6EC",
    padding: 18,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyMessage: {
    marginTop: 4,
    color: "#687076",
    textAlign: "center",
  },
});
