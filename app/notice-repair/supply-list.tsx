import { MaterialItemCard } from '@/components/notice-repair/material-item-card';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import type { NoticeRepairDetail } from '@/models/types';
import { getFullDetail } from '@/services/noticeRepairService';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

export default function SupplyListScreen() {
  const { repair_id, staff_id: paramStaff } = useLocalSearchParams<{ repair_id: string; staff_id: string }>();
  const { user } = useAuth();
  const staffId = paramStaff ?? user?.staffId ?? '';

  const [detail, setDetail] = useState<NoticeRepairDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!repair_id) return;
    setIsLoading(true);
    getFullDetail(Number(repair_id), staffId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดรายการได้'))
      .finally(() => setIsLoading(false));
  }, [repair_id, staffId]);

  const requisitions = detail?.requisitions ?? [];

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title={TEXT.NOTICE_REPAIR_SUPPLY_LIST_TITLE} showHomeButton />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#B33939" />
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {detail?.repair_number ? (
            <ThemedText style={styles.subhead}>เลขที่คำร้อง {detail.repair_number}</ThemedText>
          ) : null}

          {requisitions.length > 0 ? (
            requisitions.map((r, i) => (
              <MaterialItemCard
                key={i}
                index={i + 1}
                name={r.name ?? ''}
                priceUnit={r.price_unit}
                amount={r.number}
                unit={r.unit}
                total={r.price}
                statusLabel={
                  r.status === 'd' ? 'จัดหาเอง' : r.status === 'c' ? 'หน่วยอาคารฯ' : undefined
                }
              />
            ))
          ) : (
            <ThemedText style={styles.empty}>ไม่มีรายการจัดหาวัสดุ</ThemedText>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loader: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#DC2626', textAlign: 'center' },
  scroll: { padding: 16, gap: 12 },
  subhead: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 },
  empty: { marginTop: 24, fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
