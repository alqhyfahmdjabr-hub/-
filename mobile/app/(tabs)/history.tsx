import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { apiRequest } from '@/lib/query-client';

const DARK = '#0A0A0A';
const CARD = '#141414';
const CARD2 = '#1A1A1A';
const GOLD = '#F59E0B';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#FFFFFF';
const MUTED = '#9CA3AF';
const RED = '#EF4444';

interface SavedMessage {
  id: number;
  content: string;
  created_at: string;
  gold_price_id: number | null;
}

interface GoldPrice {
  id: number;
  buy_price: string;
  sell_price: string;
  karat: string;
  currency: string;
  created_at: string;
}

type HistoryTab = 'messages' | 'prices';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

function MessageCard({ item, onDelete }: { item: SavedMessage; onDelete: () => void }) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(item.content);
  };
  const handleWhatsApp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(item.content)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
    else await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(item.content)}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={handleWhatsApp} style={styles.actionBtn}>
            <Ionicons name="logo-whatsapp" size={18} color="#22C55E" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopy} style={styles.actionBtn}>
            <Ionicons name="copy-outline" size={18} color={GOLD} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color={RED} />
          </TouchableOpacity>
        </View>
        <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
      </View>
      <Text style={styles.messageText} numberOfLines={4}>
        {item.content}
      </Text>
    </View>
  );
}

function PriceCard({ item, onDelete }: { item: GoldPrice; onDelete: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={18} color={RED} />
        </TouchableOpacity>
        <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
      </View>
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>سعر البيع</Text>
          <Text style={styles.priceValue}>{item.sell_price}</Text>
          <Text style={styles.priceCurrency}>{item.currency}</Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>سعر الشراء</Text>
          <Text style={styles.priceValue}>{item.buy_price}</Text>
          <Text style={styles.priceCurrency}>{item.currency}</Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>العيار</Text>
          <Text style={[styles.priceValue, { color: GOLD }]}>{item.karat}</Text>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<HistoryTab>('messages');

  const { data: messages = [], isLoading: loadingMsg } = useQuery<SavedMessage[]>({
    queryKey: ['/api/messages'],
    queryFn: () => apiRequest('/api/messages'),
  });

  const { data: prices = [], isLoading: loadingPrices } = useQuery<GoldPrice[]>({
    queryKey: ['/api/gold-prices'],
    queryFn: () => apiRequest('/api/gold-prices'),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/messages/${id}`, 'DELETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/messages'] }),
    onError: () => Alert.alert('خطأ', 'تعذر حذف الرسالة'),
  });

  const deletePriceMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/gold-prices/${id}`, 'DELETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/gold-prices'] }),
    onError: () => Alert.alert('خطأ', 'تعذر حذف السعر'),
  });

  const confirmDelete = (type: 'message' | 'price', id: number) => {
    Alert.alert('حذف', 'هل تريد حذف هذا العنصر؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: () => type === 'message' ? deleteMessageMutation.mutate(id) : deletePriceMutation.mutate(id),
      },
    ]);
  };

  const isLoading = activeTab === 'messages' ? loadingMsg : loadingPrices;
  const isEmpty = activeTab === 'messages' ? messages.length === 0 : prices.length === 0;
  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: webTop }]}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'prices' && styles.tabBtnActive]}
          onPress={() => setActiveTab('prices')}
        >
          <Text style={[styles.tabText, activeTab === 'prices' && styles.tabTextActive]}>
            الأسعار
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'messages' && styles.tabBtnActive]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
            الرسائل
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      ) : isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={56} color={MUTED} />
          <Text style={styles.emptyText}>
            {activeTab === 'messages' ? 'لا توجد رسائل محفوظة' : 'لا توجد أسعار محفوظة'}
          </Text>
        </View>
      ) : activeTab === 'messages' ? (
        <FlatList
          data={messages}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <MessageCard item={item} onDelete={() => confirmDelete('message', item.id)} />
          )}
          contentContainerStyle={[styles.list, {
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16),
          }]}
          scrollEnabled={!!messages.length}
        />
      ) : (
        <FlatList
          data={prices}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <PriceCard item={item} onDelete={() => confirmDelete('price', item.id)} />
          )}
          contentContainerStyle={[styles.list, {
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16),
          }]}
          scrollEnabled={!!prices.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  tabBar: {
    flexDirection: 'row-reverse',
    margin: 16,
    marginBottom: 8,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabBtnActive: { backgroundColor: GOLD },
  tabText: { fontSize: 14, fontWeight: '600', color: MUTED },
  tabTextActive: { color: '#0A0A0A' },
  list: { padding: 16, paddingTop: 8 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    padding: 8,
    backgroundColor: CARD2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  timeText: { fontSize: 12, color: MUTED },
  messageText: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  priceItem: { flex: 1, alignItems: 'center' },
  priceLabel: { fontSize: 11, color: MUTED, marginBottom: 4 },
  priceValue: { fontSize: 20, fontWeight: '700', color: TEXT },
  priceCurrency: { fontSize: 11, color: MUTED, marginTop: 2 },
  priceDivider: { width: 1, height: 40, backgroundColor: BORDER },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: MUTED, textAlign: 'center' },
});
