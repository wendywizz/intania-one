import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { LoadingAnimate } from "@/components/loading-animate";
import { ScreenHeader } from "@/components/screen-header";
import { SectionCard } from "@/components/section-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DetailInfoCard } from "@/components/ui/detail-info-card";
import { UserAvatar } from "@/components/user-avatar";
import { AppFonts } from "@/constants/fonts";
import { TEXT } from "@/constants/text";
import { type AppColors, useScreenGutter, useThemedStyles } from "@/constants/theme";
import {
  TYPE_ABSENCE_BIRTH,
  TYPE_ABSENCE_BUSINESS,
  TYPE_ABSENCE_HAJJ,
  TYPE_ABSENCE_HELPMATE,
  TYPE_ABSENCE_RELAX,
  TYPE_ABSENCE_SICK,
} from "@/constants/types";
import type { absence } from "@/models/types";
import { getabsenceData } from "@/services/absenceService";
import { formatDateRange } from "@/utils/date-format";
import { navPush } from "@/utils/navigation";

const absenceTypeLabels: Record<string, string> = {
  [TYPE_ABSENCE_SICK]: TEXT.ABSENCE_SICK_TITLE,
  [TYPE_ABSENCE_BUSINESS]: TEXT.ABSENCE_BUSINESS_TITLE,
  [TYPE_ABSENCE_BIRTH]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_RELAX]: TEXT.ABSENCE_RELAX_TITLE,
  [TYPE_ABSENCE_HELPMATE]: TEXT.ABSENCE_BIRTH_TITLE,
  [TYPE_ABSENCE_HAJJ]: TEXT.ABSENCE_HAJJ_TITLE,
};

const absenceTypeNameFields = ["absentTypeName", "absenceTypeName", "typeName", "type_name"];

function getText(item: absence, fields: string[]) {
  for (const field of fields) {
    const value = item[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function parseItem(value?: string | string[]): absence {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw)) as absence;
  } catch {
    return {};
  }
}

function getHalfDayLabel(value: string) {
  switch (value) {
    case "1": return TEXT.ABSENCE_HALF_DAY_FIRST_MORNING;
    case "2": return TEXT.ABSENCE_HALF_DAY_FIRST_AFTERNOON;
    case "3": return TEXT.ABSENCE_HALF_DAY_LAST_MORNING;
    case "4": return TEXT.ABSENCE_HALF_DAY_FIRST_AFTERNOON_LAST_MORNING;
    default: return "";
  }
}

function getDisplayHalfDay(value: string) {
  const v = value.trim();
  if (!v || v === "0") return "";
  return getHalfDayLabel(v);
}

function getDisplayText(value: string) {
  const v = value.trim();
  return v && v !== "0" ? v : "";
}

function getStaffName(staff: object): string {
  const s = staff as absence;
  const fullName = getText(s, ["staffFullName", "staff_full_name", "fullname", "fullName", "staffName", "staff_name", "name"]);
  if (fullName) return fullName;
  const prefix = getText(s, ["prefixNameTH", "prefix_name_th", "PREFIX_NAME_TH", "prefix"]);
  const firstName = getText(s, ["firstNameTH", "first_name_th", "FIRST_NAME_TH", "firstName", "first_name"]);
  const lastName = getText(s, ["lastNameTH", "last_name_th", "LAST_NAME_TH", "lastName", "last_name"]);
  return [prefix, firstName, lastName].filter(Boolean).join(" ");
}

function getStaffPosition(staff: object): string {
  return getText(staff as absence, ["positionName", "position_name", "POSITION_NAME", "position"]);
}

// Profile photos are keyed by UNI_STAFF_ID.
function getStaffId(staff: object): string {
  return getText(staff as absence, ["uniStaffId", "uni_staff_id", "UNI_STAFF_ID"]);
}

type StaffEntry = { name: string; position: string; staffId?: string };

function getRequesterInfo(item: absence): StaffEntry {
  const record = item as Record<string, unknown>;
  const req = record.requester;
  if (req && typeof req === "object" && !Array.isArray(req)) {
    return { name: getStaffName(req), position: getStaffPosition(req), staffId: getStaffId(req) };
  }
  return {
    name: getText(item, ["name", "fullname", "staffName", "staff_name"]),
    position: "",
    staffId: getText(item, ["uniStaffId", "uni_staff_id"]),
  };
}

function getAgentEntries(item: absence): StaffEntry[] {
  const rawValue =
    item.selectedAgents ?? item.selected_agents ?? item.agents ?? item.agentList ?? item.agentStaffIds ?? item.agent_staff_ids;

  const toEntry = (agent: unknown): StaffEntry | null => {
    if (typeof agent === "string" || typeof agent === "number") {
      const name = String(agent).trim();
      return name ? { name, position: "" } : null;
    }
    if (agent && typeof agent === "object") {
      const name = getStaffName(agent);
      if (name) return { name, position: getStaffPosition(agent), staffId: getStaffId(agent) };
    }
    return null;
  };

  const collect = (list: unknown[]) => list.map(toEntry).filter(Boolean) as StaffEntry[];

  if (Array.isArray(rawValue)) return collect(rawValue);
  if (rawValue && typeof rawValue === "object") {
    const nested =
      (rawValue as Record<string, unknown>).item ??
      (rawValue as Record<string, unknown>).items ??
      (rawValue as Record<string, unknown>).data ??
      (rawValue as Record<string, unknown>).list;
    if (Array.isArray(nested)) return collect(nested);
    return collect(Object.values(rawValue as Record<string, unknown>));
  }

  const text = getText(item, ["selectedAgents", "agents", "agentNames", "agent_names", "agentList", "agent_list"]);
  if (text) {
    return text.split(",").map((p) => p.trim()).filter(Boolean).map((name) => ({ name, position: "" }));
  }
  return [];
}

function getStatusBadge(status: string): { bg: string; color: string } {
  const lower = status.toLowerCase();
  if (lower.includes("อนุมัติแล้ว") || lower.includes("approved")) return { bg: "#D1FAE5", color: "#065F46" };
  if (lower.includes("รออนุมัติ") || lower.includes("pending") || lower.includes("waiting")) return { bg: "#FEF3C7", color: "#92400E" };
  if (lower.includes("ไม่อนุมัติ") || lower.includes("reject")) return { bg: "#FEE2E2", color: "#991B1B" };
  return { bg: "#FDECEC", color: "#B33939" };
}

// Avatar + name + position row — same look as the requester/delegate cards on
// the absence detail (own-view) screen, so both screens read as one pattern.
function PersonRow({ name, position, staffId }: StaffEntry) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.personCard}>
      <UserAvatar staffId={staffId} size={44} />
      <View style={styles.personText}>
        <ThemedText style={styles.personName}>{name}</ThemedText>
        {position ? <ThemedText style={styles.personPosition}>{position}</ThemedText> : null}
      </View>
    </View>
  );
}

export default function ApproveDetailScreen() {
  const styles = useThemedStyles(makeStyles);
  const gutter = useScreenGutter();
  const params = useLocalSearchParams<{ item?: string }>();
  const fallback = useMemo(() => parseItem(params.item), [params.item]);

  // Encoded "absence_id:approve_id:type:progress" used by the save endpoint.
  const detailId = getText(fallback, ["id"]);
  const absenceId = getText(fallback, ["absenceId", "absence_id"]);
  const routeType = getText(fallback, ["absenceType", "absence_type", "absentType"]);

  const [data, setData] = useState<absence | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!absenceId || !routeType) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await getabsenceData(absenceId, routeType);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [absenceId, routeType]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const item = data ?? fallback;

  const typeLabel =
    getText(item, absenceTypeNameFields) ||
    getText(fallback, ["approveName"]) ||
    absenceTypeLabels[routeType] ||
    TEXT.ABSENCE_TITLE;

  const startDate = getText(item, ["startDate", "start_date"]);
  const endDate = getText(item, ["endDate", "end_date"]);
  const dateText = formatDateRange(startDate, endDate);
  const leaveDay = getText(item, ["numDays", "num_days", "absentDays", "absent_days", "days", "lastest_num_days"]);
  const halfDay = getDisplayHalfDay(getText(item, ["partFlag", "part_flag", "half_day", "halfDay"]));
  const reason = getText(item, ["reason", "detail", "description"]);
  const contact = getText(item, ["contact", "contactChannel", "contact_channel", "phone"]);
  const travelDetail = getDisplayText(getText(item, ["travelDetail", "travel_detail"]));
  const requester = getRequesterInfo(item);
  const agentEntries = getAgentEntries(item);

  const statusName = getText(item, ["statusName", "status_name"]);
  const statusCode = getText(item, ["status"]);
  const statusLabel = statusName || (statusCode && statusCode !== "0" ? statusCode : TEXT.ABSENCE_PENDING_BADGE);
  const statusBadge = getStatusBadge(statusLabel);

  const goToDecision = (status: "1" | "2") => {
    navPush({
      pathname: "/absence/approve-reason",
      // `detail` is encoded and carries no staff_id, so the requester's is
      // forwarded separately — it is what the decision notification is sent to.
      params: { detail: detailId, status, requestStaffId: requester.staffId ?? "" },
    } as Parameters<typeof navPush>[0]);
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={typeLabel} backHref="/absence/approve-leave" titleInNavBar tone="primary" />

      {isLoading ? (
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_LOADING_DESCRIPTION} />
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: gutter }]} showsVerticalScrollIndicator={false}>
            {/* Leave-info card — same titled card + icon/label/value rows as the
                requester's own absence detail and the timestamp history detail. */}
            <DetailInfoCard
              title={TEXT.ABSENCE_DETAIL_INFO_SECTION}
              trailing={
                statusLabel ? (
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                    <ThemedText style={[styles.statusText, { color: statusBadge.color }]}>
                      {statusLabel}
                    </ThemedText>
                  </View>
                ) : null
              }
              rows={[
                { label: TEXT.ABSENCE_LEAVE_DATE_LABEL, value: dateText, icon: "calendar" },
                {
                  label: TEXT.ABSENCE_LEAVE_DAY_COUNT_LABEL,
                  value: leaveDay ? `${leaveDay} ${TEXT.ABSENCE_DAY_UNIT}` : "",
                  icon: "calendar-range",
                },
                { label: TEXT.ABSENCE_HALF_DAY_LABEL, value: halfDay, icon: "calendar-clock" },
                { label: TEXT.ABSENCE_REASON_LABEL, value: reason, icon: "list.bullet" },
                { label: TEXT.ABSENCE_CONTACT_CHANNEL_LABEL, value: contact, icon: "phone.fill" },
                { label: TEXT.ABSENCE_TRAVEL_DETAIL_LABEL, value: travelDetail, icon: "mappin" },
              ]}
            />

            {/* Requester card */}
            {requester.name ? (
              <SectionCard title={TEXT.ABSENCE_REQUESTER_LABEL}>
                <PersonRow name={requester.name} position={requester.position} staffId={requester.staffId} />
              </SectionCard>
            ) : null}

            {/* Delegate card */}
            {agentEntries.length ? (
              <SectionCard title={TEXT.ABSENCE_DELEGATE_LABEL}>
                {agentEntries.map((agent, index) => (
                  <PersonRow
                    key={`${agent.name}-${index}`}
                    name={agent.name}
                    position={agent.position}
                    staffId={agent.staffId}
                  />
                ))}
              </SectionCard>
            ) : null}
          </ScrollView>

          <View style={styles.bottomBar}>
            <Pressable
              accessibilityRole="button"
              onPress={() => goToDecision("1")}
              style={[styles.actionButton, styles.acceptButton]}
            >
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                {TEXT.ABSENCE_APPROVE_ACCEPT}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => goToDecision("2")}
              style={[styles.actionButton, styles.rejectButton]}
            >
              <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                {TEXT.ABSENCE_APPROVE_REJECT}
              </ThemedText>
            </Pressable>
          </View>
        </>
      )}
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 40,
    gap: 12,
  },
  statusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  statusText: {
    fontFamily: AppFonts.psuBold,
    fontSize: 12,
    lineHeight: 16,
  },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
  },
  personText: {
    flex: 1,
    gap: 3,
  },
  personName: {
    fontFamily: AppFonts.psuBold,
    fontSize: 15,
    lineHeight: 21,
    color: c.text,
  },
  personPosition: {
    fontSize: 13,
    lineHeight: 18,
    color: c.textMuted,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  acceptButton: {
    backgroundColor: c.success,
  },
  rejectButton: {
    backgroundColor: "#B42318",
  },
});
