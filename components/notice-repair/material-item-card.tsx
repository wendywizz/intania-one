import { ThemedText } from '@/components/themed-text';
import { StyleSheet, View } from 'react-native';

/** Format a number/string as Thai baht: "1,234.56". Falls back to "-". */
export function formatBaht(v: string | number | undefined | null): string {
  if (v === undefined || v === null || v === '') return '-';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (Number.isNaN(n)) return String(v);
  const [intPart, decPart] = n.toFixed(2).split('.');
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decPart}`;
}

function hasValue(v: string | number | undefined | null): boolean {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

/** One label/value line inside a material card. */
function MatDetailRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.matDetailRow}>
      <ThemedText style={styles.matDetailLabel}>{label}</ThemedText>
      <ThemedText style={[styles.matDetailValue, emphasize && styles.matDetailValueEmphasis]} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * A single requisition material as a card: name + amount/unit, and price rows
 * only when there is price data (price/unit and/or total). Used on the repair
 * detail and the supply-list screen.
 */
export function MaterialItemCard({
  index, name, priceUnit, amount, unit, total, statusLabel, isDraft,
}: {
  index: number;
  name: string;
  priceUnit?: string | number;
  amount?: string | number;
  unit?: string;
  total?: string | number;
  statusLabel?: string;
  isDraft?: boolean;
}) {
  const amountText = hasValue(amount) ? String(amount) : '-';
  const showPriceUnit = hasValue(priceUnit);
  const showTotal = hasValue(total);
  return (
    <View style={[styles.matItem, isDraft && styles.matItemDraft]}>
      <View style={styles.matItemHead}>
        <ThemedText style={styles.matItemName} numberOfLines={2}>{`${index}. ${name || '-'}`}</ThemedText>
        {isDraft ? (
          <View style={styles.draftTagCell}><ThemedText style={styles.draftTag}>ใหม่</ThemedText></View>
        ) : statusLabel ? (
          <View style={styles.matStatusTag}><ThemedText style={styles.matStatusTagText}>{statusLabel}</ThemedText></View>
        ) : null}
      </View>
      <View style={styles.matItemRows}>
        {showPriceUnit ? <MatDetailRow label="ราคา/หน่วย" value={`${formatBaht(priceUnit)} บาท`} /> : null}
        <MatDetailRow label="จำนวน" value={amountText} />
        <MatDetailRow label="หน่วย" value={unit || '-'} />
        {showTotal ? <MatDetailRow label="ราคารวม" value={`${formatBaht(total)} บาท`} emphasize /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  matItem: {
    borderWidth: 1, borderColor: '#EEF2F7', borderRadius: 14,
    backgroundColor: '#FFFFFF', padding: 12, gap: 10,
  },
  matItemDraft: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  matItemHead: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
  },
  matItemName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 20 },
  matStatusTag: {
    backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
  },
  matStatusTagText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  matItemRows: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', paddingTop: 8, gap: 6,
  },
  matDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  matDetailLabel: { fontSize: 13, color: '#6B7280' },
  matDetailValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', color: '#1F2937' },
  matDetailValueEmphasis: { fontSize: 15, fontWeight: '700', color: '#B33939' },
  draftTagCell: { alignItems: 'center', justifyContent: 'center' },
  draftTag: {
    fontSize: 11, fontWeight: '700', color: '#C2410C',
    backgroundColor: '#FFEDD5', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden',
  },
});
