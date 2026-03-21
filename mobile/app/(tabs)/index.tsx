import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useApp } from '@/lib/AppContext';
import { apiRequest, getApiUrl } from '@/lib/query-client';

const DARK = '#0A0A0A';
const CARD = '#141414';
const CARD2 = '#1A1A1A';
const GOLD = '#F59E0B';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#FFFFFF';
const MUTED = '#9CA3AF';
const GREEN = '#22C55E';

const KARATS = ['24', '21', '18'];
const CURRENCIES = ['يمني', 'دولار', 'ريال'];

interface StoreSettings { name: string; contacts: string; branches: string; group_link: string; }
interface LivePrice { price_usd_per_gram: number; }
interface GoldPrice { id: number; buy_price: string; sell_price: string; karat: string; currency: string; }
interface GenerateResponse { message: string; ai_used?: boolean; }

export default function GeneratorScreen() {
  const insets = useSafeAreaInsets();
  const { setGeneratedMessage, selectedImage, setSelectedImage, setLastPriceId } = useApp();

  const [sellPrice, setSellPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [karat, setKarat] = useState('21');
  const [currency, setCurrency] = useState('يمني');
  const [note, setNote] = useState('');
  const [liveHint, setLiveHint] = useState('');

  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings'),
  });

  const liveMutation = useMutation({
    mutationFn: () => apiRequest<LivePrice>('/api/gold-price/live'),
    onSuccess: (data) => {
      setLiveHint(`السعر الدولي: ${data.price_usd_per_gram.toFixed(2)} $/غ`);
    },
    onError: () => Alert.alert('خطأ', 'تعذر جلب السعر الدولي'),
  });

  const savePriceMutation = useMutation({
    mutationFn: (data: object) => apiRequest<GoldPrice>('/api/gold-prices', 'POST', data),
    onSuccess: (data) => setLastPriceId(data.id),
  });

  const generateMutation = useMutation({
    mutationFn: (data: object) => apiRequest<GenerateResponse>('/api/generate-message', 'POST', data),
    onSuccess: async (data) => {
      setGeneratedMessage(data.message);
      if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await savePriceMutation.mutateAsync({
        buy_price: buyPrice, sell_price: sellPrice, karat, currency,
      });
      router.push('/(tabs)/preview');
    },
    onError: (err) => {
      Alert.alert('خطأ', err.message || 'تعذر توليد الرسالة');
    },
  });

  const handleGenerate = () => {
    if (!sellPrice || !buyPrice) {
      Alert.alert('تنبيه', 'يرجى إدخال سعر البيع وسعر الشراء');
      return;
    }
    generateMutation.mutate({
      sell_price: sellPrice,
      buy_price: buyPrice,
      karat,
      currency,
      note,
      store_name: settings?.name,
      branches: settings?.branches,
      contacts: settings?.contacts,
      group_link: settings?.group_link,
    });
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('الإذن مطلوب', 'نحتاج إذن الوصول للصور');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

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
        <Text style={styles.sectionTitle}>أسعار الذهب</Text>

        <View style={styles.priceRow}>
          <View style={styles.priceField}>
            <Text style={styles.label}>سعر البيع</Text>
            <TextInput
              style={styles.priceInput}
              value={sellPrice}
              onChangeText={setSellPrice}
              placeholder="0"
              placeholderTextColor={MUTED}
              keyboardType="decimal-pad"
              textAlign="center"
            />
          </View>
          <View style={styles.priceField}>
            <Text style={styles.label}>سعر الشراء</Text>
            <TextInput
              style={styles.priceInput}
              value={buyPrice}
              onChangeText={setBuyPrice}
              placeholder="0"
              placeholderTextColor={MUTED}
              keyboardType="decimal-pad"
              textAlign="center"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.liveBtn}
          onPress={() => liveMutation.mutate()}
          disabled={liveMutation.isPending}
        >
          {liveMutation.isPending ? (
            <ActivityIndicator color={GOLD} size="small" />
          ) : (
            <Ionicons name="globe-outline" size={16} color={GOLD} />
          )}
          <Text style={styles.liveBtnText}>
            {liveHint || 'السعر الدولي الحالي'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.rowSection}>
          <View style={styles.halfSection}>
            <Text style={styles.label}>العيار</Text>
            <View style={styles.pillGroup}>
              {KARATS.map(k => (
                <TouchableOpacity
                  key={k}
                  style={[styles.pill, karat === k && styles.pillActive]}
                  onPress={() => setKarat(k)}
                >
                  <Text style={[styles.pillText, karat === k && styles.pillTextActive]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.halfSection}>
            <Text style={styles.label}>العملة</Text>
            <View style={styles.pillGroup}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pill, currency === c && styles.pillActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.pillText, currency === c && styles.pillTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ملاحظة اختيارية</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          value={note}
          onChangeText={setNote}
          placeholder="مثال: خصم خاص على المصاغة اليوم..."
          placeholderTextColor={MUTED}
          multiline
          numberOfLines={3}
          textAlign="right"
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>صورة (اختياري)</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color={MUTED} />
              <Text style={styles.imagePickerText}>اختر صورة</Text>
            </>
          )}
        </TouchableOpacity>
        {selectedImage && (
          <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close-circle" size={16} color={MUTED} />
            <Text style={styles.removeImageText}>إزالة الصورة</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.generateBtn, generateMutation.isPending && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={generateMutation.isPending}
      >
        {generateMutation.isPending ? (
          <>
            <ActivityIndicator color="#0A0A0A" />
            <Text style={styles.generateBtnText}>جاري التوليد...</Text>
          </>
        ) : (
          <>
            <Ionicons name="sparkles-outline" size={20} color="#0A0A0A" />
            <Text style={styles.generateBtnText}>توليد الرسالة</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  content: { padding: 16 },
  section: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT, textAlign: 'right', marginBottom: 14 },
  label: { fontSize: 12, color: MUTED, textAlign: 'right', marginBottom: 8, fontWeight: '500' },
  priceRow: { flexDirection: 'row-reverse', gap: 12 },
  priceField: { flex: 1 },
  priceInput: {
    backgroundColor: CARD2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  liveBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${GOLD}40`,
    backgroundColor: `${GOLD}10`,
  },
  liveBtnText: { color: GOLD, fontSize: 13, fontWeight: '600' },
  rowSection: { flexDirection: 'row-reverse', gap: 16 },
  halfSection: { flex: 1 },
  pillGroup: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: CARD2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pillActive: { backgroundColor: GOLD, borderColor: GOLD },
  pillText: { fontSize: 13, fontWeight: '600', color: MUTED },
  pillTextActive: { color: '#0A0A0A' },
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
  noteInput: { minHeight: 80, paddingTop: 12 },
  imagePicker: {
    height: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CARD2,
    overflow: 'hidden',
  },
  imagePickerText: { color: MUTED, fontSize: 14 },
  selectedImage: { width: '100%', height: '100%' },
  removeImageBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  removeImageText: { color: MUTED, fontSize: 12 },
  generateBtn: {
    backgroundColor: GOLD,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnText: { color: '#0A0A0A', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});
