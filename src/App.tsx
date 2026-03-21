import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  MessageCircle,
  RefreshCw,
  Share2,
  Sparkles,
  X,
  Settings,
  PenTool,
  Eye,
  Store,
  Phone,
  MapPin,
  History,
  Trash2,
  TrendingUp,
  Clock,
  Globe,
  Bell,
  BellOff,
  Save,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

type Tab = 'generator' | 'preview' | 'history' | 'settings';

interface StoreSettings {
  id?: number;
  name: string;
  contacts: string;
  branches: string;
  group_link: string;
}

interface GoldPrice {
  id: number;
  buy_price: string;
  sell_price: string;
  karat: string;
  currency: string;
  note: string;
  created_at: string;
}

interface SavedMessage {
  id: number;
  content: string;
  gold_price_id: number | null;
  image_data: string | null;
  created_at: string;
}

interface ScheduleConfig {
  time_hour: number;
  time_minute: number;
  is_active: boolean;
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1000&auto=format&fit=crop';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generator');

  // Generator State
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [karat, setKarat] = useState('21');
  const [currency, setCurrency] = useState('يمني');
  const [note, setNote] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(!!process.env.GEMINI_API_KEY);

  // Store Settings
  const [storeInfo, setStoreInfo] = useState<StoreSettings>({
    name: 'مجوهرات بابل',
    contacts: '',
    branches: '',
    group_link: 'https://chat.whatsapp.com/BabelJewelryGroup',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Output
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastSavedPriceId, setLastSavedPriceId] = useState<number | null>(null);

  // History
  const [goldPrices, setGoldPrices] = useState<GoldPrice[]>([]);
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);
  const [historyView, setHistoryView] = useState<'prices' | 'messages'>('messages');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Live Price
  const [livePrice, setLivePrice] = useState<{ price_usd_per_gram: number } | null>(null);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [livePriceError, setLivePriceError] = useState('');

  // Schedule
  const [schedule, setSchedule] = useState<ScheduleConfig>({ time_hour: 9, time_minute: 0, is_active: false });
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Load initial data ---
  useEffect(() => {
    loadSettings();
    loadSchedule();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && data.name) setStoreInfo(data);
      }
    } catch (_) {}
  };

  const loadSchedule = async () => {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
      }
    } catch (_) {}
  };

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [pricesRes, messagesRes] = await Promise.all([
        fetch('/api/gold-prices'),
        fetch('/api/messages'),
      ]);
      if (pricesRes.ok) setGoldPrices(await pricesRes.json());
      if (messagesRes.ok) setSavedMessages(await messagesRes.json());
    } catch (_) {}
    setLoadingHistory(false);
  }, []);

  const saveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeInfo),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (_) {}
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
    } catch (_) {}
    setSavingSchedule(false);
  };

  const fetchLiveGoldPrice = async () => {
    setFetchingLive(true);
    setLivePriceError('');
    try {
      const res = await fetch('/api/gold-price/live');
      if (res.ok) {
        const data = await res.json();
        setLivePrice(data);
      } else {
        setLivePriceError('تعذّر جلب السعر الدولي.');
      }
    } catch (_) {
      setLivePriceError('تعذّر الاتصال بالخادم.');
    }
    setFetchingLive(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFormattedDateTime = () => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const generateMessage = async (isRegenerate = false) => {
    if (!buyPrice || !sellPrice) {
      setError('يرجى إدخال سعر البيع وسعر الشراء أولاً.');
      return;
    }
    setError('');
    setIsGenerating(true);
    const { date, time } = getFormattedDateTime();

    // Save price to DB first
    let priceId: number | null = null;
    try {
      const priceRes = await fetch('/api/gold-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buy_price: buyPrice, sell_price: sellPrice, karat, currency, note }),
      });
      if (priceRes.ok) {
        const saved = await priceRes.json();
        priceId = saved.id;
        setLastSavedPriceId(saved.id);
      }
    } catch (_) {}

    if (useAI) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
          أنت مدير حسابات تواصل اجتماعي محترف لشركة مجوهرات راقية تُدعى "${storeInfo.name}".
          قم بصياغة رسالة واتساب تسويقية، جذابة، وأنيقة لتحديث الزبائن بأسعار الذهب اليوم.
          
          استخدم المعلومات التالية حصراً:
          - سعر البيع: ${sellPrice} ${currency} للغرام
          - سعر الشراء: ${buyPrice} ${currency} للغرام
          - العيار: ${karat}
          - التاريخ: ${date}
          - الوقت: ${time}
          - ملاحظة إضافية من الإدارة: ${note ? note : 'لا توجد ملاحظات إضافية، رحب بالزبائن فقط.'}
          - فروعنا: ${storeInfo.branches ? storeInfo.branches : 'غير محدد'}
          - أرقام التواصل: ${storeInfo.contacts ? storeInfo.contacts : 'غير محدد'}
          
          يجب أن تتضمن الرسالة في نهايتها هذا الرابط الثابت لمجموعة الواتساب:
          ${storeInfo.group_link}
          
          الشروط:
          - اجعل النبرة فخمة، مرحبة، وتبعث على الثقة.
          - اذكر اسم المحل "${storeInfo.name}" بوضوح.
          - اذكر الفروع وأرقام التواصل بشكل مرتب وأنيق.
          - استخدم إيموجي مناسبة للمجوهرات والذهب (مثل ✨، 💎، 👑، 📍، 📞).
          - نسق النص بشكل مريح للعين.
          - لا تضف أي روابط أخرى غير المذكور.
          - أخرج النص النهائي الجاهز للنسخ مباشرة بدون أي مقدمات أو شروحات إضافية.
          ${isRegenerate ? 'ملاحظة: هذه إعادة صياغة، حاول استخدام أسلوب مختلف مع الحفاظ على الفخامة.' : ''}
        `;
        const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
        const text = response.text || '';
        setGeneratedMessage(text);
        await saveMessageToDB(text, priceId);
        setActiveTab('preview');
      } catch (err) {
        console.error('AI Error:', err);
        setError('حدث خطأ في الذكاء الاصطناعي. سيتم استخدام القالب الافتراضي.');
        const text = generateStandardMessage(date, time);
        await saveMessageToDB(text, priceId);
        setActiveTab('preview');
      }
    } else {
      const text = generateStandardMessage(date, time);
      await saveMessageToDB(text, priceId);
      setActiveTab('preview');
    }

    setIsGenerating(false);
  };

  const saveMessageToDB = async (content: string, gold_price_id: number | null) => {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, gold_price_id, image_data: image }),
      });
    } catch (_) {}
  };

  const generateStandardMessage = (date: string, time: string) => {
    const template = `✨ ${storeInfo.name} ✨

أسعار الذهب لهذا اليوم:
العيار: ${karat}
سعر البيع: ${sellPrice} ${currency} للغرام
سعر الشراء: ${buyPrice} ${currency} للغرام

${note ? `📌 ${note}\n` : ''}📅 التاريخ: ${date}
⏰ الوقت: ${time}

📍 فروعنا:
${storeInfo.branches || 'لم يتم تحديد الفروع'}

📞 للتواصل:
${storeInfo.contacts || 'لم يتم تحديد أرقام التواصل'}

💎 نسعد بخدمتكم دائماً ونتمنى لكم تسوقاً ممتعاً!

🔗 انضموا لمجموعتنا ليصلكم كل جديد:
${storeInfo.group_link}`;
    setGeneratedMessage(template);
    return template;
  };

  const copyToClipboard = async (text?: string) => {
    const toCopy = text || generatedMessage;
    if (!toCopy) return;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const shareToWhatsApp = (text?: string) => {
    const toShare = text || generatedMessage;
    if (!toShare) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(toShare)}`, '_blank');
  };

  const deletePriceRecord = async (id: number) => {
    try {
      await fetch(`/api/gold-prices/${id}`, { method: 'DELETE' });
      setGoldPrices((prev) => prev.filter((p) => p.id !== id));
    } catch (_) {}
  };

  const deleteMessage = async (id: number) => {
    try {
      await fetch(`/api/messages/${id}`, { method: 'DELETE' });
      setSavedMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (_) {}
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500/30 pb-12">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-white/5 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
                {storeInfo.name || 'مجوهرات بابل'}
              </h1>
              <p className="text-xs text-zinc-400">مولد رسائل التحديث اليومي</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 flex gap-4 overflow-x-auto no-scrollbar border-t border-white/5 mt-2">
          {[
            { key: 'generator', icon: PenTool, label: 'إنشاء الرسالة' },
            { key: 'preview', icon: Eye, label: 'المعاينة' },
            { key: 'history', icon: History, label: 'السجل' },
            { key: 'settings', icon: Settings, label: 'الإعدادات' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as Tab)}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* --- GENERATOR TAB --- */}
          {activeTab === 'generator' && (
            <motion.section
              key="generator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
            >
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                بيانات التحديث اليومي
              </h2>

              {/* Live Gold Price */}
              <div className="mb-6 p-4 bg-zinc-950 border border-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-500" />
                    سعر الذهب الدولي (عيار 24 - دولار)
                  </p>
                  <button
                    onClick={fetchLiveGoldPrice}
                    disabled={fetchingLive}
                    className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${fetchingLive ? 'animate-spin' : ''}`} />
                    {fetchingLive ? 'جاري الجلب...' : 'جلب السعر الآن'}
                  </button>
                </div>
                {livePrice ? (
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <p className="text-emerald-400 font-bold text-lg">${livePrice.price_usd_per_gram} / غرام</p>
                    <span className="text-xs text-zinc-500">(للاستئناس فقط - يختلف عن السعر المحلي)</span>
                  </div>
                ) : livePriceError ? (
                  <p className="text-red-400 text-sm">{livePriceError}</p>
                ) : (
                  <p className="text-zinc-500 text-sm">اضغط "جلب السعر الآن" لعرض السعر الدولي الفوري</p>
                )}
              </div>

              <div className="space-y-6">
                {/* Prices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 block">سعر البيع للغرام *</label>
                    <input
                      type="number"
                      value={sellPrice}
                      onChange={(e) => { setSellPrice(e.target.value); setError(''); }}
                      placeholder="مثال: 36000"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 block">سعر الشراء للغرام *</label>
                    <input
                      type="number"
                      value={buyPrice}
                      onChange={(e) => { setBuyPrice(e.target.value); setError(''); }}
                      placeholder="مثال: 35000"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                  </div>
                </div>

                {/* Currency & Karat */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 block">العملة</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-all appearance-none"
                    >
                      <option value="يمني">يمني</option>
                      <option value="سعودي">سعودي</option>
                      <option value="دولار">دولار</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 block">العيار</label>
                    <div className="flex gap-3 h-[50px]">
                      {['24', '21', '18'].map((k) => (
                        <button
                          key={k}
                          onClick={() => setKarat(k)}
                          className={`flex-1 rounded-xl border transition-all ${
                            karat === k
                              ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-medium'
                              : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/20'
                          }`}
                        >
                          عيار {k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400 block">ملاحظة إضافية (اختياري)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثال: وصول تشكيلة جديدة من الأطقم الخليجية..."
                    rows={3}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-all resize-none"
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400 block">صورة العرض (اختياري)</label>
                  {!image ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-white/10 hover:border-amber-500/50 bg-zinc-950 rounded-xl py-8 flex flex-col items-center justify-center gap-3 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-900 group-hover:bg-amber-500/10 flex items-center justify-center transition-colors">
                        <Camera className="w-5 h-5 text-zinc-500 group-hover:text-amber-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-zinc-300">اضغط لرفع صورة</p>
                        <p className="text-xs text-zinc-500 mt-1">سيتم حفظها مع السجل</p>
                      </div>
                    </button>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 group h-48">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={removeImage} className="bg-red-500/90 text-white p-2 rounded-full hover:bg-red-500 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>

                {/* AI Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Sparkles className={`w-5 h-5 ${useAI ? 'text-amber-500' : 'text-zinc-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">صياغة بالذكاء الاصطناعي</p>
                      <p className="text-xs text-zinc-500">تحسين النص وجعله أكثر جاذبية</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseAI(!useAI)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${useAI ? 'bg-amber-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${useAI ? 'left-1' : 'left-7'}`} />
                  </button>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm">
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={() => generateMessage(false)}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold py-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                  {isGenerating ? 'جاري الصياغة والحفظ...' : 'إنشاء الرسالة وحفظها'}
                </button>
              </div>
            </motion.section>
          )}

          {/* --- PREVIEW TAB --- */}
          {activeTab === 'preview' && (
            <motion.section
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                الرسالة النهائية
              </h2>

              {generatedMessage ? (
                <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="relative h-64 bg-zinc-950 border-b border-white/5">
                    <img src={image || DEFAULT_IMAGE} alt="Babel Jewelry" className="w-full h-full object-cover" />
                    {!image && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                        صورة افتراضية
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-emerald-600/80 backdrop-blur-md text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      محفوظة في السجل
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed font-sans">
                      {generatedMessage}
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950/50 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => copyToClipboard()}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors text-sm font-medium"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'تم النسخ!' : 'نسخ النص'}
                    </button>
                    <button
                      onClick={() => shareToWhatsApp()}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm font-medium shadow-lg shadow-emerald-900/20"
                    >
                      <Share2 className="w-4 h-4" />
                      مشاركة واتساب
                    </button>
                    {useAI && (
                      <button
                        onClick={() => generateMessage(true)}
                        disabled={isGenerating}
                        className="sm:col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        إعادة صياغة بالذكاء الاصطناعي
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900/30 border border-white/5 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-500 font-medium">لا توجد رسالة لعرضها</p>
                  <p className="text-zinc-600 text-sm mt-2">قم بالذهاب إلى قسم "إنشاء الرسالة" لإنشاء تحديث جديد</p>
                  <button onClick={() => setActiveTab('generator')} className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                    الذهاب للإنشاء
                  </button>
                </div>
              )}
            </motion.section>
          )}

          {/* --- HISTORY TAB --- */}
          {activeTab === 'history' && (
            <motion.section
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-violet-500 rounded-full"></span>
                  السجل التاريخي
                </h2>
                <button onClick={loadHistory} className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  تحديث
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setHistoryView('messages')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    historyView === 'messages' ? 'bg-violet-500/10 border border-violet-500/30 text-violet-400' : 'bg-zinc-900 border border-white/5 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  الرسائل المحفوظة ({savedMessages.length})
                </button>
                <button
                  onClick={() => setHistoryView('prices')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    historyView === 'prices' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-zinc-900 border border-white/5 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  سجل الأسعار ({goldPrices.length})
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-zinc-600 animate-spin" />
                </div>
              ) : historyView === 'messages' ? (
                <div className="space-y-4">
                  {savedMessages.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                      <p>لا توجد رسائل محفوظة بعد</p>
                    </div>
                  ) : (
                    savedMessages.map((msg) => (
                      <div key={msg.id} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
                        {msg.image_data && (
                          <img src={msg.image_data} alt="" className="w-full h-36 object-cover" />
                        )}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(msg.created_at)}
                            </span>
                            <button onClick={() => deleteMessage(msg.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap line-clamp-4">{msg.content}</p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => copyToClipboard(msg.content)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              نسخ
                            </button>
                            <button
                              onClick={() => shareToWhatsApp(msg.content)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs transition-colors border border-emerald-600/20"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              واتساب
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {goldPrices.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                      <p>لا توجد أسعار مسجّلة بعد</p>
                    </div>
                  ) : (
                    goldPrices.map((price) => (
                      <div key={price.id} className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-amber-400 font-bold">عيار {price.karat}</span>
                            <span className="text-xs text-zinc-500">{price.currency}</span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-emerald-400">بيع: {price.sell_price}</span>
                            <span className="text-blue-400">شراء: {price.buy_price}</span>
                          </div>
                          {price.note && <p className="text-xs text-zinc-500 mt-1">{price.note}</p>}
                          <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(price.created_at)}
                          </p>
                        </div>
                        <button onClick={() => deletePriceRecord(price.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.section>
          )}

          {/* --- SETTINGS TAB --- */}
          {activeTab === 'settings' && (
            <motion.section
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Store Settings */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                  إعدادات المتجر
                </h2>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 flex items-center gap-2">
                      <Store className="w-4 h-4" /> اسم المحل
                    </label>
                    <input
                      type="text"
                      value={storeInfo.name}
                      onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                      placeholder="مثال: مجوهرات بابل"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> أرقام التواصل
                    </label>
                    <textarea
                      value={storeInfo.contacts}
                      onChange={(e) => setStoreInfo({ ...storeInfo, contacts: e.target.value })}
                      placeholder={`مثال:\nفرع 1: 0500000000\nفرع 2: 0511111111`}
                      rows={3}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all resize-none leading-relaxed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> أماكن الفروع
                    </label>
                    <textarea
                      value={storeInfo.branches}
                      onChange={(e) => setStoreInfo({ ...storeInfo, branches: e.target.value })}
                      placeholder={`مثال:\nالفرع الرئيسي: شارع الذهب\nالفرع الثاني: مول المدينة`}
                      rows={3}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all resize-none leading-relaxed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" /> رابط مجموعة الواتساب
                    </label>
                    <input
                      type="text"
                      value={storeInfo.group_link}
                      onChange={(e) => setStoreInfo({ ...storeInfo, group_link: e.target.value })}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                      dir="ltr"
                    />
                  </div>
                  <button
                    onClick={saveSettings}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                  >
                    {settingsSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {settingsSaved ? 'تم الحفظ في قاعدة البيانات ✓' : 'حفظ الإعدادات'}
                  </button>
                </div>
              </div>

              {/* Scheduled Notifications */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                  التذكير اليومي التلقائي
                </h2>
                <p className="text-sm text-zinc-500 mb-6">يرسل تذكيراً تلقائياً في الوقت المحدد للقيام بتحديث الأسعار</p>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950 border border-white/5">
                    <div className="flex items-center gap-3">
                      {schedule.is_active ? <Bell className="w-5 h-5 text-orange-400" /> : <BellOff className="w-5 h-5 text-zinc-500" />}
                      <div>
                        <p className="text-sm font-medium text-zinc-200">التذكير التلقائي</p>
                        <p className="text-xs text-zinc-500">{schedule.is_active ? 'مفعّل' : 'غير مفعّل'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSchedule({ ...schedule, is_active: !schedule.is_active })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${schedule.is_active ? 'bg-orange-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${schedule.is_active ? 'left-1' : 'left-7'}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400 block">الساعة</label>
                      <input
                        type="number"
                        min={0} max={23}
                        value={schedule.time_hour}
                        onChange={(e) => setSchedule({ ...schedule, time_hour: +e.target.value })}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-all text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400 block">الدقيقة</label>
                      <input
                        type="number"
                        min={0} max={59}
                        value={schedule.time_minute}
                        onChange={(e) => setSchedule({ ...schedule, time_minute: +e.target.value })}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-all text-center"
                      />
                    </div>
                  </div>

                  <button
                    onClick={saveSchedule}
                    disabled={savingSchedule}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium transition-colors"
                  >
                    {savingSchedule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                    {savingSchedule ? 'جاري الحفظ...' : `حفظ الجدولة (${String(schedule.time_hour).padStart(2,'0')}:${String(schedule.time_minute).padStart(2,'0')} يومياً)`}
                  </button>

                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <p className="text-xs text-orange-200/80 leading-relaxed">
                      💡 <strong>ملاحظة:</strong> التذكير يعمل على الخادم ويسجّل في سجل النظام. 
                      لإرسال رسائل تلقائية عبر واتساب تحتاج إلى <strong>WhatsApp Business API</strong> من Meta. راجع القسم أدناه للتفاصيل.
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Business API Instructions */}
              <div className="bg-zinc-900/50 border border-emerald-500/10 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-emerald-400">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  WhatsApp Business API
                </h2>
                <p className="text-sm text-zinc-400 mb-4">لتفعيل إرسال الرسائل تلقائياً يلزم إعداد الخطوات التالية بنفسك:</p>
                <ol className="space-y-3">
                  {[
                    { n: '1', text: 'أنشئ حساب Meta for Developers على developers.facebook.com' },
                    { n: '2', text: 'أنشئ تطبيقاً جديداً واختر نوع "Business"' },
                    { n: '3', text: 'فعّل منتج WhatsApp Business Platform داخل التطبيق' },
                    { n: '4', text: 'احصل على رقم هاتف تجاري معتمد وربطه بالتطبيق' },
                    { n: '5', text: 'احصل على رمز الوصول (Access Token) الدائم' },
                    { n: '6', text: 'أضف رمز الوصول في إعدادات الأسرار (Secrets) باسم WHATSAPP_TOKEN' },
                  ].map(({ n, text }) => (
                    <li key={n} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                      <p className="text-sm text-zinc-400">{text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
