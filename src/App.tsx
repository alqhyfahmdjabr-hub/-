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
  MapPin
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

interface BotStats {
  subscriber_count: number;
  last_broadcast: string | null;
  recent_activity: { action: string; first_name: string | null; username: string | null; created_at: string }[];
}

// --- Constants ---
const GROUP_LINK = 'https://chat.whatsapp.com/BabelJewelryGroup'; // Fixed group link
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1000&auto=format&fit=crop';

type Tab = 'generator' | 'preview' | 'settings' | 'history';

interface StoreInfo {
  name: string;
  contacts: string;
  branches: string;
  group_link: string;
}

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<Tab>('generator');
  
  // Generator State
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [karat, setKarat] = useState('21');
  const [currency, setCurrency] = useState('يمني');
  const [note, setNote] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);
  
  // Store Info State
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ 
    name: 'مجوهرات بابل', 
    contacts: '', 
    branches: '',
    group_link: GROUP_LINK
  });

  // Output State
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Bot Stats
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  // History State
  const [goldPrices, setGoldPrices] = useState<any[]>([]);
  const [savedMessages, setSavedMessages] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Schedule State
  const [schedule, setSchedule] = useState({ time_hour: 9, time_minute: 0, is_active: false });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Live Price State
  const [livePrice, setLivePrice] = useState<any>(null);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [livePriceError, setLivePriceError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    loadSettings();
    loadSchedule();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
    if (activeTab === 'settings') {
      loadBotStats();
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

  const loadHistory = React.useCallback(async () => {
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

  const loadBotStats = async () => {
    try {
      const res = await fetch('/api/bot/stats');
      if (res.ok) setBotStats(await res.json());
    } catch (_) {}
  };

  const broadcastNow = async () => {
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await fetch('/api/bot/broadcast', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBroadcastResult(`✅ تم الإرسال لـ ${data.sent_to} مشترك`);
        loadBotStats();
      } else {
        setBroadcastResult(`❌ ${data.error || 'حدث خطأ'}`);
      }
    } catch {
      setBroadcastResult('❌ تعذر الاتصال بالخادم');
    }
    setBroadcasting(false);
    setTimeout(() => setBroadcastResult(null), 4000);
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

  // --- Handlers ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFormattedDateTime = () => {
    const now = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    
    return {
      date: now.toLocaleDateString('ar-SA', dateOptions),
      time: now.toLocaleTimeString('ar-SA', timeOptions),
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
          ${GROUP_LINK}
          
          الشروط:
          - اجعل النبرة فخمة، مرحبة، وتبعث على الثقة.
          - اذكر اسم المحل "${storeInfo.name}" بوضوح.
          - اذكر الفروع وأرقام التواصل بشكل مرتب وأنيق.
          - استخدم إيموجي (Emojis) مناسبة للمجوهرات والذهب (مثل ✨، 💎، 👑، 📍، 📞).
          - نسق النص بشكل مريح للعين (استخدم الأسطر الفارغة).
          - لا تضف أي روابط أخرى غير المذكور.
          - أخرج النص النهائي الجاهز للنسخ مباشرة بدون أي مقدمات أو شروحات إضافية.
          ${isRegenerate ? 'ملاحظة: هذه إعادة صياغة، حاول استخدام أسلوب أو كلمات مختلفة قليلاً عن المعتاد مع الحفاظ على الفخامة.' : ''}
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });

        setGeneratedMessage(response.text || '');
        setActiveTab('preview'); // Auto-switch to preview
      } catch (err) {
        console.error('AI Generation Error:', err);
        setError('حدث خطأ أثناء توليد الرسالة بالذكاء الاصطناعي. سيتم استخدام القالب الافتراضي.');
        generateStandardMessage(date, time);
        setActiveTab('preview');
      }
    } else {
      generateStandardMessage(date, time);
      setActiveTab('preview');
    }

    setIsGenerating(false);
  };

  const generateStandardMessage = (date: string, time: string) => {
    const template = `✨ ${storeInfo.name} ✨

أسعار الذهب لهذا اليوم:
العيار: ${karat}
سعر البيع: ${sellPrice} ${currency} للغرام
سعر الشراء: ${buyPrice} ${currency} للغرام

${note ? `📌 ${note}\n` : ''}
📅 التاريخ: ${date}
⏰ الوقت: ${time}

📍 فروعنا:
${storeInfo.branches || 'لم يتم تحديد الفروع'}

📞 للتواصل:
${storeInfo.contacts || 'لم يتم تحديد أرقام التواصل'}

💎 نسعد بخدمتكم دائماً ونتمنى لكم تسوقاً ممتعاً!

🔗 انضموا لمجموعتنا ليصلكم كل جديد:
${GROUP_LINK}`;

    setGeneratedMessage(template);
  };

  const copyToClipboard = async () => {
    if (!generatedMessage) return;
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareToWhatsApp = () => {
    if (!generatedMessage) return;
    const encodedMessage = encodeURIComponent(generatedMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
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
        
        {/* Tabs Navigation */}
        <div className="max-w-3xl mx-auto px-4 flex gap-6 overflow-x-auto no-scrollbar border-t border-white/5 mt-2">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'generator' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span className="font-medium text-sm">إنشاء الرسالة</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'preview' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="font-medium text-sm">المعاينة والمشاركة</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium text-sm">إعدادات المتجر</span>
          </button>
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

              <div className="space-y-6">
                {/* Prices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 block">سعر البيع للغرام *</label>
                    <input
                      type="number"
                      value={sellPrice}
                      onChange={(e) => {
                        setSellPrice(e.target.value);
                        setError('');
                      }}
                      placeholder="مثال: 36000"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400 block">سعر الشراء للغرام *</label>
                    <input
                      type="number"
                      value={buyPrice}
                      onChange={(e) => {
                        setBuyPrice(e.target.value);
                        setError('');
                      }}
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
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all appearance-none"
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
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
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
                        <p className="text-xs text-zinc-500 mt-1">سيتم استخدام صورة افتراضية فخمة إن لم تقم بالرفع</p>
                      </div>
                    </button>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 group h-48">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={removeImage}
                          className="bg-red-500/90 text-white p-2 rounded-full hover:bg-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
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
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      useAI ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        useAI ? 'left-1' : 'left-7'
                      }`}
                    />
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm">
                    {error}
                  </motion.p>
                )}

                {/* Generate Button */}
                <button
                  onClick={() => generateMessage(false)}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold py-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <MessageCircle className="w-5 h-5" />
                  )}
                  {isGenerating ? 'جاري الصياغة...' : 'إنشاء الرسالة والانتقال للمعاينة'}
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
                  {/* Image Preview */}
                  <div className="relative h-64 bg-zinc-950 border-b border-white/5">
                    <img
                      src={image || DEFAULT_IMAGE}
                      alt="Babel Jewelry"
                      className="w-full h-full object-cover"
                    />
                    {!image && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                        صورة افتراضية
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="p-6">
                    <div className="whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed font-sans">
                      {generatedMessage}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 bg-zinc-950/50 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors text-sm font-medium"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'تم النسخ!' : 'نسخ النص'}
                    </button>
                    <button
                      onClick={shareToWhatsApp}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-sm font-medium shadow-lg shadow-emerald-900/20"
                    >
                      <Share2 className="w-4 h-4" />
                      مشاركة واتساب
                    </button>
                    
                    {useAI && (
                      <button
                        onClick={() => generateMessage(true)}
                        disabled={isGenerating}
                        className="sm:col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 transition-colors text-sm font-medium disabled:opacity-50 mt-2"
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
                  <button 
                    onClick={() => setActiveTab('generator')}
                    className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                  >
                    الذهاب للإنشاء
                  </button>
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
              className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm"
            >
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                إعدادات المتجر الثابتة
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                هذه المعلومات سيتم حفظها في متصفحك وإرفاقها تلقائياً في كل رسالة تقوم بإنشائها.
              </p>

              <div className="space-y-6">
                {/* Store Name */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400 flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    اسم المحل
                  </label>
                  <input
                    type="text"
                    value={storeInfo.name}
                    onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                    placeholder="مثال: مجوهرات بابل"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Contact Numbers */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    أرقام التواصل
                  </label>
                  <textarea
                    value={storeInfo.contacts}
                    onChange={(e) => setStoreInfo({ ...storeInfo, contacts: e.target.value })}
                    placeholder="مثال:&#10;فرع 1: 0500000000&#10;فرع 2: 0511111111"
                    rows={3}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Branches */}
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    أماكن الفروع
                  </label>
                  <textarea
                    value={storeInfo.branches}
                    onChange={(e) => setStoreInfo({ ...storeInfo, branches: e.target.value })}
                    placeholder="مثال:&#10;الفرع الرئيسي: شارع الذهب، العاصمة&#10;الفرع الثاني: مول المدينة"
                    rows={3}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed"
                  />
                </div>
                
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 mt-4">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-200/80 leading-relaxed">
                    يتم حفظ الإعدادات تلقائياً بمجرد كتابتها. لا حاجة لزر حفظ.
                  </p>
                </div>
              </div>

              {/* Telegram Bot Card */}
              <div className="bg-zinc-900/50 border border-blue-500/20 rounded-2xl p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 text-blue-400">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    بوت تيليجرام — التحديثات التلقائية
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    عند تحديث سعر الذهب في التطبيق، يُرسَل تلقائياً لجميع المشتركين في البوت.
                    وعندما يطلب أي عميل السعر، يردّ البوت فوراً.
                  </p>
                </div>

                {/* Bot identity + stats */}
                <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 text-2xl">🤖</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-300">@babel120_bot</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                      <span className="text-xs text-green-400">مفعّل ويعمل الآن</span>
                    </div>
                  </div>
                  <a
                    href="https://t.me/babel120_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors font-medium"
                  >
                    فتح البوت ↗
                  </a>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {botStats ? botStats.subscriber_count : '—'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">مشترك في البوت</p>
                  </div>
                  <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-sm font-semibold text-zinc-300">
                      {botStats?.last_broadcast
                        ? new Date(botStats.last_broadcast).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
                        : 'لا يوجد بعد'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">آخر بث للأسعار</p>
                  </div>
                </div>

                {/* Manual broadcast button */}
                <div>
                  <button
                    onClick={broadcastNow}
                    disabled={broadcasting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold transition-colors"
                  >
                    {broadcasting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>📢</span>}
                    {broadcasting ? 'جاري الإرسال...' : 'بث الأسعار الآن لجميع المشتركين'}
                  </button>
                  {broadcastResult && (
                    <p className="text-center text-sm mt-2 text-zinc-300">{broadcastResult}</p>
                  )}
                </div>

                {/* Recent activity */}
                {botStats && botStats.recent_activity.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 font-medium mb-2">آخر طلبات من التليجرام:</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {botStats.recent_activity.filter(a => a.action === 'price_request').slice(0, 5).map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-xs px-3 py-2 bg-zinc-950 rounded-lg border border-white/5">
                          <span className="text-zinc-400">
                            {a.first_name || a.username || 'مجهول'}
                            {a.username ? ` (@${a.username})` : ''}
                          </span>
                          <span className="text-zinc-600">
                            {new Date(a.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-2">الكلمات التي تُشغّل البوت:</p>
                  <div className="flex flex-wrap gap-2">
                    {['سعر الذهب', 'أسعار', 'كم السعر', 'عيار 21', 'gold price', 'اليوم'].map(kw => (
                      <span key={kw} className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300 border border-white/5">{kw}</span>
                    ))}
                  </div>
                </div>

                {/* How to subscribe instruction */}
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <p className="text-xs text-blue-200/70 leading-relaxed">
                    📌 <strong>لاشتراك العملاء:</strong> يرسلون <code className="bg-zinc-800 px-1 rounded">/start</code> للبوت ويتلقّون تلقائياً كل تحديث جديد للأسعار.
                  </p>
                </div>
              </div>
            </motion.section>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
