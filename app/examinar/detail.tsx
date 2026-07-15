import {
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  Hash,
  Users,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppFonts } from '@/constants/fonts';
import { TEXT } from '@/constants/text';
import type { ExamDetail, ExamStaff, ExamSubject } from '@/models/types';
import { PHOTO_BASE_URL } from '@/constants/endpoints';
import { getExamDetail } from '@/services/examinarService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getField(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function getTermLabel(term: string): string {
  switch (term) {
    case '1': return TEXT.EXAMINAR_TERM_1;
    case '2': return TEXT.EXAMINAR_TERM_2;
    default: return term;
  }
}

function getPeriodLabel(period: string): string {
  switch (period.toLowerCase()) {
    case 'mid': return TEXT.EXAMINAR_PERIOD_MIDTERM_FULL;
    case 'final': return TEXT.EXAMINAR_PERIOD_FINAL_FULL;
    default: return period;
  }
}

function parseMins(raw: string): number {
  const clean = raw.replace(':', '');
  if (clean.length < 3) return NaN;
  const h = parseInt(clean.slice(0, -2), 10);
  const m = parseInt(clean.slice(-2), 10);
  return isNaN(h) || isNaN(m) ? NaN : h * 60 + m;
}

function calcDuration(from: string, to: string): string {
  const a = parseMins(from);
  const b = parseMins(to);
  if (isNaN(a) || isNaN(b) || b <= a) return '';
  const diff = b - a;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h} ${TEXT.EXAMINAR_DURATION_HOUR} ${m} ${TEXT.EXAMINAR_DURATION_MINUTE}`;
  if (h > 0) return `${h} ${TEXT.EXAMINAR_DURATION_HOUR}`;
  return `${m} ${TEXT.EXAMINAR_DURATION_MINUTE}`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroSection({
  detail,
  year,
  term,
  period,
}: {
  detail: ExamDetail;
  year: string;
  term: string;
  period: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const roomName = getField(detail as Record<string, unknown>, 'room_name', 'room', 'room_id') || TEXT.SHARED_EMPTY_DATA;
  const date = getField(detail as Record<string, unknown>, 'date_label', 'date', 'exam_date');
  const timeFrom = getField(detail as Record<string, unknown>, 'time_from_label', 'time_from', 'timeFrom', 'start_time');
  const timeTo = getField(detail as Record<string, unknown>, 'time_to_label', 'time_to', 'timeTo', 'end_time');
  const rawTimeFrom = getField(detail as Record<string, unknown>, 'time_from', 'timeFrom', 'start_time');
  const rawTimeTo = getField(detail as Record<string, unknown>, 'time_to', 'timeTo', 'end_time');
  const timeRange = timeTo ? `${timeFrom} - ${timeTo}` : timeFrom;
  const duration = calcDuration(rawTimeFrom, rawTimeTo);
  const termLabel = getTermLabel(detail.term ?? term);
  const periodLabel = getPeriodLabel(detail.period ?? period);
  const yearValue = detail.year ?? year;

  return (
    <View style={styles.hero}>
      <View style={styles.heroVenueLabelRow}>
        <View style={styles.heroIconBox}>
          <Building2 size={18} color={c.primary} />
        </View>
        <ThemedText style={styles.heroVenueLabel}>{TEXT.EXAMINAR_VENUE_LABEL}</ThemedText>
      </View>

      <ThemedText style={styles.heroRoomName}>{roomName}</ThemedText>

      <View style={styles.heroMetaContainer}>
        {date || timeRange ? (
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaIconBox}>
              <CalendarDays size={16} color={c.primary} />
            </View>
            <View style={styles.heroMetaTexts}>
              {date ? <ThemedText style={styles.heroMetaMain}>{date}</ThemedText> : null}
              {timeRange ? (
                <ThemedText style={styles.heroMetaSub}>
                  {timeRange}{duration ? ` (${duration})` : ''}
                </ThemedText>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.heroMetaRow, styles.heroMetaRowBordered]}>
          <View style={styles.heroMetaIconBox}>
            <Clock size={16} color={c.primary} />
          </View>
          <View style={styles.heroMetaTexts}>
            <ThemedText style={styles.heroMetaMain}>{`${yearValue} | ${termLabel}`}</ThemedText>
            <ThemedText style={styles.heroMetaSub}>{periodLabel}</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

function SubjectItem({ subject, isFirst }: { subject: ExamSubject; isFirst: boolean }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const obj = subject as Record<string, unknown>;
  const subjectId = getField(obj, 'subject_id', 'subjectid', 'subject_code', 'course_id', 'courseid', 'code');
  const subjectName = getField(obj, 'subject_name', 'subjectname', 'course_name', 'coursename', 'name', 'title');
  const studentCount = (obj.std_count ?? obj.nstd ?? obj.n_std ?? obj.num_std ?? obj.count_std
    ?? obj.students_count ?? obj.students) as number | undefined;
  const section = getField(obj, 'sec', 'section', 'section_no');

  return (
    <View style={[styles.subjectItem, !isFirst && styles.subjectItemBordered]}>
      <View style={styles.subjectTopRow}>
        <View style={styles.subjectInfo}>
          {subjectId ? (
            <ThemedText style={styles.subjectId}>{subjectId}</ThemedText>
          ) : null}
          <ThemedText style={styles.subjectName} numberOfLines={2}>{subjectName || TEXT.SHARED_EMPTY_DATA}</ThemedText>
        </View>
        <ChevronRight size={14} color="#c22c27" />
      </View>

      <View style={styles.subjectMeta}>
        {studentCount !== undefined ? (
          <View style={styles.subjectMetaItem}>
            <Users size={13} color={c.textMuted} />
            <ThemedText style={styles.subjectMetaText}>{studentCount}{TEXT.EXAMINAR_STUDENTS_SUFFIX}</ThemedText>
          </View>
        ) : null}
        {section ? (
          <View style={styles.subjectMetaItem}>
            <Hash size={13} color={c.textMuted} />
            <ThemedText style={styles.subjectMetaText}>{TEXT.EXAMINAR_SECTION_PREFIX}{section}</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StaffItem({ staff, isFirst }: { staff: ExamStaff; isFirst: boolean }) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const obj = staff as Record<string, unknown>;
  const firstName = getField(obj, 'fname', 'firstname', 'first_name', 'fname_th');
  const lastName = getField(obj, 'lname', 'lastname', 'last_name', 'lname_th');
  const fullName = getField(obj, 'name_th', 'fullname_th', 'fullname', 'name_en', 'fullname_en', 'name', 'staff_name', 'full_name');
  const name = fullName || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);
  const dept = getField(obj, 'dep_name', 'dept_name', 'department', 'dept', 'faculty', 'unit', 'dep');
  const staffId = getField(obj, 'staff_id', 'staffid', 'staffId', 'id');
  const photoUrl = staffId ? `${PHOTO_BASE_URL}${staffId}.jpg` : null;
  const initials = getInitials(name || 'S');
  const [imgError, setImgError] = useState(false);

  return (
    <View style={[styles.staffItem, !isFirst && styles.staffItemBordered]}>
      <View style={styles.staffAvatar}>
        {photoUrl && !imgError ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.staffAvatarImage}
            onError={() => setImgError(true)}
          />
        ) : (
          <ThemedText style={styles.staffInitials}>{initials}</ThemedText>
        )}
      </View>
      <View style={styles.staffInfo}>
        <ThemedText style={styles.staffName}>{name || TEXT.SHARED_EMPTY_DATA}</ThemedText>
        {dept ? <ThemedText style={styles.staffDept}>{dept}</ThemedText> : null}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExaminarDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    year: string;
    term: string;
    period: string;
    date: string;
    time_from: string;
    room_id: string;
  }>();

  const { year = '', term = '', period = '', date = '', time_from = '', room_id = '' } = params;

  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    getExamDetail({ year, term, period, date, time_from, room_id })
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : TEXT.EXAMINAR_UNABLE_TO_LOAD);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, term, period, date, time_from, room_id]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.EXAMINAR_DETAIL_HEADER_TITLE} showBackButton onBackPress={() => router.back()} />
        <LoadingAnimate title={TEXT.EXAMINAR_LOADING} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      </ThemedView>
    );
  }

  if (error || !detail) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <NavTopBar title={TEXT.EXAMINAR_DETAIL_HEADER_TITLE} showBackButton onBackPress={() => router.back()} />
        <View style={styles.centerWrap}>
          <View style={styles.errorCard}>
            <ThemedText style={styles.errorTitle}>{TEXT.SHARED_SOMETHING_WENT_WRONG}</ThemedText>
            <ThemedText style={styles.errorMessage}>{error || TEXT.EXAMINAR_UNABLE_TO_LOAD}</ThemedText>
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

  const d = detail as Record<string, unknown>;
  const subjects: ExamSubject[] = (Array.isArray(d.class_data) ? d.class_data : []) as ExamSubject[];
  const staffList: ExamStaff[] = (Array.isArray(d.staff_data) ? d.staff_data : []) as ExamStaff[];

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="light" />
      <NavTopBar title={TEXT.EXAMINAR_DETAIL_HEADER_TITLE} showBackButton onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <HeroSection detail={detail} year={year} term={term} period={period} />

        {/* Subject List */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <ThemedText style={styles.sectionHeading}>{TEXT.EXAMINAR_SUBJECT_LIST_HEADING}</ThemedText>
            {subjects.length > 0 ? (
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>{subjects.length}{TEXT.EXAMINAR_SUBJECTS_COUNT}</ThemedText>
              </View>
            ) : null}
          </View>

          {subjects.length > 0 ? (
            <View style={styles.card}>
              {subjects.map((subject, i) => (
                <SubjectItem key={i} subject={subject} isFirst={i === 0} />
              ))}
            </View>
          ) : (
            <ThemedText style={styles.emptySection}>{TEXT.EXAMINAR_NO_SUBJECTS}</ThemedText>
          )}
        </View>

        {/* Staff List */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <ThemedText style={styles.sectionHeading}>{TEXT.EXAMINAR_PARTNERS_HEADING}</ThemedText>
            {staffList.length > 0 ? (
              <View style={styles.countBadge}>
                <ThemedText style={styles.countBadgeText}>{staffList.length}{TEXT.EXAMINAR_STAFF_COUNT}</ThemedText>
              </View>
            ) : null}
          </View>

          {staffList.length > 0 ? (
            <View style={styles.card}>
              {staffList.map((staff, i) => (
                <StaffItem key={i} staff={staff} isFirst={i === 0} />
              ))}
            </View>
          ) : (
            <ThemedText style={styles.emptySection}>{TEXT.EXAMINAR_NO_STAFF}</ThemedText>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollContent: { paddingBottom: 40 },

  // Hero
  hero: {
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    padding: 20,
    paddingTop: 16,
    gap: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
  },
  heroVenueLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroVenueLabel: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: c.textMuted,
  },
  heroRoomName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 28,
    lineHeight: 36,
    color: c.text,
  },
  heroMetaContainer: { gap: 0 },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  heroMetaRowBordered: {
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  heroMetaIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  heroMetaTexts: { flex: 1, gap: 2 },
  heroMetaMain: {
    fontFamily: AppFonts.psuBold,
    fontSize: 16,
    lineHeight: 22,
    color: c.text,
  },
  heroMetaSub: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
  },

  // Section
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontFamily: AppFonts.psuBold,
    fontSize: 16,
    color: c.text,
  },
  countBadge: {
    backgroundColor: c.surfaceMuted,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    color: c.textMuted,
  },

  // Card
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },

  // Subject item
  subjectItem: { padding: 16, gap: 8 },
  subjectItemBordered: { borderTopWidth: 1, borderTopColor: c.border },
  subjectTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectInfo: { flex: 1, gap: 2 },
  subjectId: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    color: c.primary,
  },
  subjectName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
  },
  subjectMeta: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  subjectMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  subjectMetaText: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    color: c.textMuted,
  },

  // Staff item
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  staffItemBordered: { borderTopWidth: 1, borderTopColor: c.border },
  staffAvatar: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  staffAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 9999,
  },
  staffInitials: {
    fontFamily: AppFonts.psuBold,
    fontSize: 16,
    color: c.primary,
  },
  staffInfo: { flex: 1, gap: 2 },
  staffName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 20,
    color: c.text,
  },
  staffDept: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 13,
    color: c.textMuted,
  },

  // Empty / Error
  emptySection: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  centerWrap: { flex: 1, padding: 16, justifyContent: 'center' },
  errorCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 191, 189, 0.3)',
    padding: 20,
    gap: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
  },
  errorTitle: { fontFamily: AppFonts.psuBold, fontSize: 15, color: c.primary },
  errorMessage: {
    fontFamily: AppFonts.psuRegular,
    fontSize: 14,
    lineHeight: 20,
    color: c.textMuted,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: c.primary,
  },
  retryText: { color: c.textOnPrimary, fontFamily: AppFonts.psuBold, fontSize: 14 },
});
