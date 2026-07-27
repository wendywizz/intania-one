import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { addDraftMaterial, requestScrollToMaterials } from '@/stores/draftMaterials';
import { TEXT } from '@/constants/text';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { type AppColors, useColors, useThemedStyles } from '@/constants/theme';

export default function AddMaterialScreen() {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const { repair_id, staff_id, role, source } = useLocalSearchParams<{
    repair_id: string;
    staff_id: string;
    role?: string;
    source?: string;
  }>();

  // Build back href with query params
  const backHref = useMemo(() => {
    const params = new URLSearchParams();
    if (repair_id) params.set('repair_id', repair_id);
    if (staff_id) params.set('staff_id', staff_id);
    if (role) params.set('role', role);
    if (source) params.set('source', source);
    const queryString = params.toString();
    return queryString ? `/notice-repair/detail?${queryString}` : '/notice-repair/detail';
  }, [repair_id, staff_id, role, source]);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  // ราคาประมาณ (บาท) = จำนวน × ราคาประมาณ/หน่วย — always derived from the two
  // inputs so it stays in sync (no stale-state timers).
  const totalPrice = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const total = qty * price;
    return total > 0 ? total.toFixed(2) : '';
  }, [quantity, unitPrice]);

  // Stage the material into client-side state (NOT the database) and return to
  // the detail screen, which scrolls to the materials section and offers Save.
  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('กรุณากรอกชื่อรายการวัสดุ');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('กรุณากรอกจำนวนที่มากกว่า 0');
      return;
    }
    if (!unit.trim()) {
      Alert.alert('กรุณากรอกหน่วย');
      return;
    }
    if (!repair_id || !staff_id) {
      Alert.alert(TEXT.NOTICE_REPAIR_ACTION_FAILED, 'ไม่พบข้อมูลใบแจ้งซ่อม');
      return;
    }

    addDraftMaterial(repair_id, {
      name: name.trim(),
      number: quantity.trim(),
      unit: unit.trim(),
      price_unit: unitPrice.trim(),
      price: totalPrice,
    });
    requestScrollToMaterials(repair_id);

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(backHref as Parameters<typeof router.replace>[0]);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title="เพิ่มรายการวัสดุ" backHref={backHref} showHomeButton tone="primary" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.cardInner}>
              {/* Material Name */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>ชื่อรายการวัสดุ *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="กรอกชื่อรายการวัสดุ"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Quantity */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>จำนวน *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="กรอกจำนวน"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Unit */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>หน่วย *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="กรอกหน่วย (เช่น ชิ้น, อัน, เมตร)"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Unit Price */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>ราคาประมาณ/หน่วย (บาท)</ThemedText>
                <TextInput
                  style={styles.input}
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  placeholder="กรอกราคาต่อหน่วย"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Total Price */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>ราคาประมาณ (บาท)</ThemedText>
                <View style={styles.readOnlyBox}>
                  <ThemedText style={styles.readOnlyText}>
                    {totalPrice || '0.00'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable style={styles.submitBtn} onPress={handleSave}>
            <ThemedText style={styles.submitBtnText}>เพิ่มรายการ</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const makeStyles = (c: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surfaceAlt },
  flex: { flex: 1 },
  scroll: { padding: 20, gap: 20 },

  card: {
    backgroundColor: c.surface,
    borderRadius: 24,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInner: { padding: 20, gap: 20 },

  fieldGroup: { gap: 8 },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textMuted,
  },

  input: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.text,
  },

  readOnlyBox: {
    backgroundColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  readOnlyText: {
    fontSize: 16,
    color: c.textMuted,
  },

  submitBtn: {
    backgroundColor: c.pomegranate,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },

  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textOnPrimary,
  },
});
