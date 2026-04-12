import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Platform, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/query-client';

const TELEGRAM_BOT_LINK = 'https://t.me/babel120_bot';

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

interface BotStats {
  subscriber_count: number;
  last_broadcast: string | null;
  recent_activity: { action: string; first_name: string | null; username: string | null; created_at: string }[];
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

  const { data: botStats, refetch: refetchStats } = useQuery<BotStats>({
    queryKey: ['/api/bot/stats'],
    queryFn: () => apiRequest('/api/bot/stats'),
    refetchInterval: 30000,
  });

  const broadcastMutation = useMutation({
    mutationFn: () => apiRequest<{ sent_to: number }>('/api/bot/broadcast', 'POST'),
    onSuccess: (data) => {
      refetchStats();
      Alert.alert('تم الإرسال', `تم بث الأسعار لـ ${data.sent_to} مشترك في تيليجرام ✅`);
    },
    onError: () => Alert.alert('خطأ', 'تعذر إرسال البث'),
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

      {/* Telegram Bot Card */}
      <View style={styles.telegramSection}>
        <View style={styles.telegramHeader}>
          <View style={styles.telegramDot} />
          <Text style={styles.telegramTitle}>بوت تيليجرام — التحديثات التلقائية</Text>
        </View>
        <Text style={styles.telegramSub}>
          عند تحديث السعر في التطبيق يُرسَل تلقائياً للمشتركين. وعندما يطلب عميل السعر يردّ البوت فوراً.
        </Text>

        {/* Bot identity row */}
        <View style={styles.telegramCard}>
          <View style={styles.botAvatar}>
            <Text style={{ fontSize: 22 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.botUsername}>@babel120_bot</Text>
            <View style={styles.activeBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.activeText}>مفعّل ويعمل الآن</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.openMiniBtn}
            onPress={() => Linking.openURL(TELEGRAM_BOT_LINK)}
          >
            <Ionicons name="open-outline" size={16} color="#93C5FD" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{botStats?.subscriber_count ?? '—'}</Text>
            <Text style={styles.statLabel}>مشترك</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber} numberOfLines={1}>
              {botStats?.last_broadcast
                ? new Date(botStats.last_broadcast).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })
                : '—'}
            </Text>
            <Text style={styles.statLabel}>آخر بث</Text>
          </View>
        </View>

        {/* Broadcast button */}
        <TouchableOpacity
          style={[styles.broadcastBtn, broadcastMutation.isPending && styles.disabledBtn]}
          onPress={() => broadcastMutation.mutate()}
          disabled={broadcastMutation.isPending}
        >
          {broadcastMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={{ fontSize: 18 }}>📢</Text>
          )}
          <Text style={styles.broadcastText}>
            {broadcastMutation.isPending ? 'جاري الإرسال...' : 'بث الأسعار الآن لجميع المشتركين'}
          </Text>
        </TouchableOpacity>

        {/* Recent price requests */}
        {botStats && botStats.recent_activity.filter(a => a.action === 'price_request').length > 0 && (
          <View style={styles.activityBox}>
            <Text style={styles.activityTitle}>آخر طلبات من تيليجرام:</Text>
            {botStats.recent_activity.filter(a => a.action === 'price_request').slice(0, 4).map((a, i) => (
              <View key={i} style={styles.activityRow}>
                <Text style={styles.activityName}>
                  {a.first_name || a.username || 'مجهول'}
                  {a.username ? ` (@${a.username})` : ''}
                </Text>
                <Text style={styles.activityTime}>
                  {new Date(a.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Open bot button */}
        <TouchableOpacity
          style={styles.openBotBtn}
          onPress={() => Linking.openURL(TELEGRAM_BOT_LINK)}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
          <Text style={styles.openBotText}>فتح البوت في تيليجرام</Text>
        </TouchableOpacity>

        <View style={styles.keywordsBox}>
          <Text style={styles.keywordsLabel}>الكلمات التي تُشغّل البوت:</Text>
          <View style={styles.keywordsRow}>
            {['سعر الذهب', 'أسعار', 'كم السعر', 'عيار 21', 'اليوم'].map(kw => (
              <View key={kw} style={styles.keywordChip}>
                <Text style={styles.keywordText}>{kw}</Text>
              </View>
            ))}
          </View>
        </View>
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
  telegramSection: {
    backgroundColor: '#0F1A2E',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  telegramHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  telegramDot: { width: 6, height: 22, borderRadius: 3, backgroundColor: '#3B82F6' },
  telegramTitle: { fontSize: 16, fontWeight: '700', color: '#93C5FD', textAlign: 'right' },
  telegramSub: { fontSize: 13, color: MUTED, textAlign: 'right', marginBottom: 16, lineHeight: 20 },
  telegramCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    marginBottom: 14,
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botUsername: { color: '#93C5FD', fontSize: 15, fontWeight: '700', textAlign: 'right' },
  activeBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 3 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  activeText: { color: '#86EFAC', fontSize: 12 },
  openMiniBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.1)',
  },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#93C5FD' },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 2 },
  broadcastBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  broadcastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  disabledBtn: { opacity: 0.55 },
  activityBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    gap: 6,
  },
  activityTitle: { fontSize: 11, color: MUTED, textAlign: 'right', marginBottom: 4 },
  activityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityName: { fontSize: 12, color: TEXT },
  activityTime: { fontSize: 11, color: MUTED },
  openBotBtn: {
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  openBotText: { color: '#93C5FD', fontSize: 14, fontWeight: '600' },
  keywordsBox: { gap: 8 },
  keywordsLabel: { fontSize: 12, color: MUTED, textAlign: 'right' },
  keywordsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  keywordChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
  },
  keywordText: { color: '#93C5FD', fontSize: 12 },
});
