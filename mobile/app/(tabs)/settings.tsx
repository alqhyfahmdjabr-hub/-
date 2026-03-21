import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/query-client';

const DARK = '#0A0A0A';
const CARD = '#141414';
const CARD2 = '#1A1A1A';
const GOLD = '#F59E0B';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#FFFFFF';
const MUTED = '#9CA3AF';

interface StoreSettings {
  name: string;
  contacts: string;
  branches: string;
  group_link: string;
}

interface ScheduleConfig {
  time_hour: number;
  time_minute: number;
  is_active: boolean;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings'),
  });

  const { data: schedule } = useQuery<ScheduleConfig>({
    queryKey: ['/api/schedule'],
    queryFn: () => apiRequest('/api/schedule'),
  });

  const [form, setForm] = useState<StoreSettings>({
    name: 'مجوهرات بابل', contacts: '', branches: '', group_link: '',
  });
  const [schedForm, setSchedForm] = useState<ScheduleConfig>({
    time_hour: 9, time_minute: 0, is_active: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings?.name) setForm(settings);
  }, [settings]);
  useEffect(() => {
    if (schedule) setSchedForm(schedule);
  }, [schedule]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest('/api/settings', 'PUT', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => Alert.alert('خطأ', 'تعذر حفظ الإعدادات'),
  });

  const schedMutation = useMutation({
    mutationFn: () => apiRequest('/api/schedule', 'PUT', schedForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/schedule'] });
      Alert.alert('تم', schedForm.is_active ? 'تم تفعيل الجدولة' : 'تم إيقاف الجدولة');
    },
  });

  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {
        paddingTop: 16 + webTop,
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16),
      }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات المحل</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>اسم المحل</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={v => setForm(p => ({ ...p, name: v }))}
            placeholder="مجوهرات بابل"
            placeholderTextColor={MUTED}
            textAlign="right"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>أرقام التواصل</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.contacts}
            onChangeText={v => setForm(p => ({ ...p, contacts: v }))}
            placeholder="07xxxxxxxx&#10;07xxxxxxxx"
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={3}
            textAlign="right"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>الفروع</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.branches}
            onChangeText={v => setForm(p => ({ ...p, branches: v }))}
            placeholder="الفرع الرئيسي - شارع الكذا"
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={3}
            textAlign="right"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>رابط مجموعة واتساب</Text>
          <TextInput
            style={styles.input}
            value={form.group_link}
            onChangeText={v => setForm(p => ({ ...p, group_link: v }))}
            placeholder="https://chat.whatsapp.com/..."
            placeholderTextColor={MUTED}
            textAlign="right"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.savedBtn]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <>
              <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={18} color="#0A0A0A" />
              <Text style={styles.saveBtnText}>{saved ? 'تم الحفظ' : 'حفظ الإعدادات'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الجدولة التلقائية</Text>
        <Text style={styles.sectionSub}>إرسال تحديث الأسعار تلقائياً كل يوم</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>تفعيل الجدولة</Text>
          <TouchableOpacity
            style={[styles.toggle, schedForm.is_active && styles.toggleActive]}
            onPress={() => setSchedForm(p => ({ ...p, is_active: !p.is_active }))}
          >
            <View style={[styles.toggleThumb, schedForm.is_active && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <Text style={styles.label}>الساعة</Text>
            <TextInput
              style={styles.timeInput}
              value={String(schedForm.time_hour)}
              onChangeText={v => setSchedForm(p => ({ ...p, time_hour: parseInt(v) || 0 }))}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
          </View>
          <Text style={styles.timeSep}>:</Text>
          <View style={styles.timeField}>
            <Text style={styles.label}>الدقيقة</Text>
            <TextInput
              style={styles.timeInput}
              value={String(schedForm.time_minute).padStart(2, '0')}
              onChangeText={v => setSchedForm(p => ({ ...p, time_minute: parseInt(v) || 0 }))}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.schedBtn}
          onPress={() => schedMutation.mutate()}
          disabled={schedMutation.isPending}
        >
          {schedMutation.isPending ? (
            <ActivityIndicator color={GOLD} />
          ) : (
            <>
              <Ionicons name="alarm-outline" size={18} color={GOLD} />
              <Text style={styles.schedBtnText}>حفظ الجدولة</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  content: { padding: 16 },
  section: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT, textAlign: 'right', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: MUTED, textAlign: 'right', marginBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: MUTED, textAlign: 'right', marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: CARD2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    writingDirection: 'rtl',
  },
  multiline: { minHeight: 80, paddingTop: 12 },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  savedBtn: { backgroundColor: '#22C55E' },
  saveBtnText: { color: '#0A0A0A', fontSize: 16, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: GOLD },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#9CA3AF',
  },
  toggleThumbActive: { backgroundColor: '#0A0A0A', alignSelf: 'flex-end' },
  timeRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 12, marginBottom: 20 },
  timeField: { flex: 1 },
  timeInput: {
    backgroundColor: CARD2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 10,
  },
  timeSep: { color: GOLD, fontSize: 28, fontWeight: '700', paddingBottom: 8 },
  schedBtn: {
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  schedBtnText: { color: GOLD, fontSize: 15, fontWeight: '600' },
});
