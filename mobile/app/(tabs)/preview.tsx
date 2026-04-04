import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/AppContext';
import { apiRequest } from '@/lib/query-client';

const DARK = '#0A0A0A';
const CARD = '#141414';
const CARD2 = '#1A1A1A';
const GOLD = '#F59E0B';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT = '#FFFFFF';
const MUTED = '#9CA3AF';

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const { generatedMessage, setGeneratedMessage, selectedImage, lastGenerationParams } = useApp();
  const [copied, setCopied] = useState(false);

  const regenMutation = useMutation({
    mutationFn: (data: object) => apiRequest<{ message: string }>('/api/generate-message', 'POST', data),
    onSuccess: (data) => setGeneratedMessage(data.message),
  });

  const handleCopy = async () => {
    if (!generatedMessage) return;
    await Clipboard.setStringAsync(generatedMessage);
    if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = async () => {
    if (!generatedMessage) return;
    const url = `whatsapp://send?text=${encodeURIComponent(generatedMessage)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(generatedMessage)}`);
    }
  };

  const handleRegenerate = () => {
    if (!lastGenerationParams) return;
    regenMutation.mutate({ ...lastGenerationParams, is_regenerate: true });
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;

  if (!generatedMessage) {
    return (
      <View style={[styles.container, styles.emptyContainer, { paddingTop: webTop }]}>
        <View style={styles.emptyCard}>
          <Ionicons name="eye-outline" size={64} color={MUTED} />
          <Text style={styles.emptyTitle}>لا توجد رسالة بعد</Text>
          <Text style={styles.emptySubtitle}>
            اذهب إلى شاشة الإنشاء وأدخل الأسعار لتوليد رسالة
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: webTop }]}>
      <ScrollView
        contentContainerStyle={[styles.content, {
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90),
        }]}
      >
        {selectedImage && (
          <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
        )}

        <View style={styles.messageCard}>
          <View style={styles.messageHeader}>
            <View style={styles.goldDot} />
            <Text style={styles.messageLabel}>رسالة واتساب</Text>
          </View>
          <Text style={styles.messageText}>{generatedMessage}</Text>
        </View>
      </ScrollView>

      <View style={[styles.actionBar, {
        paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8),
      }]}>
        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={handleWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
          <Text style={styles.whatsappText}>إرسال واتساب</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconActionBtn, copied && styles.copiedBtn]}
          onPress={handleCopy}
        >
          <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={20} color={copied ? '#22C55E' : GOLD} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconActionBtn, !lastGenerationParams && styles.disabledBtn]}
          onPress={handleRegenerate}
          disabled={regenMutation.isPending || !lastGenerationParams}
        >
          {regenMutation.isPending ? (
            <ActivityIndicator color={GOLD} size="small" />
          ) : (
            <Ionicons name="refresh-outline" size={20} color={lastGenerationParams ? GOLD : MUTED} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: TEXT, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22 },
  content: { padding: 16 },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  messageCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  messageHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  goldDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },
  messageLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  messageText: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    gap: 10,
    padding: 16,
    paddingTop: 12,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  whatsappText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  iconActionBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: CARD2,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedBtn: { borderColor: '#22C55E' },
  disabledBtn: { opacity: 0.4 },
});
