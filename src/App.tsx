import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./lib/supabase";
import AuthPage from "./components/AuthPage";
import { useUserData } from "./hooks/useUserData";
import type { User } from "@supabase/supabase-js";
import { 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Volume2, 
  Bookmark, 
  RotateCcw, 
  Award, 
  Search, 
  Cpu, 
  Info, 
  Home as HomeIcon, 
  Briefcase, 
  Compass, 
  Zap, 
  HelpCircle,
  Play,
  Check,
  Plus,
  Loader2,
  BookmarkCheck,
  RefreshCw,
  Trophy,
  Mic,
  MicOff,
  Trash2,
  Trash,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  VocabularyItem, 
  ALL_PRE_CURATED_VOCABULARY,
  HOME_VOCABULARY, 
  OFFICE_VOCABULARY, 
  OTHERS_VOCABULARY 
} from "./data/vocabulary";
import { getVocabularyImage, getFallbackImageChain } from "./utils/imageMapper";

// --- DEDUPLICATE PRE-CURATED VOCABULARIES ---
const CLEANED_HOME_VOCABULARY = HOME_VOCABULARY.filter((item, index, self) =>
  self.findIndex(t => t.english.trim().toLowerCase() === item.english.trim().toLowerCase()) === index
);

const CLEANED_OFFICE_VOCABULARY = OFFICE_VOCABULARY.filter((item, index, self) =>
  self.findIndex(t => t.english.trim().toLowerCase() === item.english.trim().toLowerCase()) === index
);

const CLEANED_OTHERS_VOCABULARY = OTHERS_VOCABULARY.filter((item, index, self) =>
  self.findIndex(t => t.english.trim().toLowerCase() === item.english.trim().toLowerCase()) === index
);

const CLEANED_ALL_PRE_CURATED_VOCABULARY = [
  ...CLEANED_HOME_VOCABULARY,
  ...CLEANED_OFFICE_VOCABULARY,
  ...CLEANED_OTHERS_VOCABULARY
];

export default function App() {
  // --- AUTH ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const { data: userData, save: saveUserData, loading: userDataLoading } = useUserData(user);
  // --- STATE DECLARATIONS ---
  const [scenarios, setScenarios] = useState<{ id: string; name: string; desc: string; icon: any; isCustom?: boolean }[]>([
    { id: 'home', name: "Lingkungan Rumah", desc: "Rumah, dapur, barang kamar tidur & percakapan keluarga.", icon: HomeIcon },
    { id: 'office', name: "Dunia Kantor", desc: "Rapat, deadline, dokumen kerja, karir & gaji.", icon: Briefcase },
    { id: 'others', name: "Tempat Umum & Sosial", desc: "Perjalanan, makan luar, belanja di swalayan & apotek.", icon: Compass }
  ]);
  const [category, setCategory] = useState<string>('home');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoFlipEnabled, setAutoFlipEnabled] = useState(false);
  const [memorizedIds, setMemorizedIds] = useState<string[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [streak, setStreak] = useState(1);
  const [customWords, setCustomWords] = useState<VocabularyItem[]>([]);
  const [showOnlyUnmemorized, setShowOnlyUnmemorized] = useState(false);

  // Global search states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSearchError, setShowSearchError] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState("");

  // Custom scenario form states
  const [showAddScenarioForm, setShowAddScenarioForm] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioDesc, setNewScenarioDesc] = useState("");

  // Bulk generation state
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Custom Confirmation Dialog State (safe for sandboxed iframes)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Ya, Hapus",
    cancelText: "Batal",
    isDanger: true,
  });

  // Pronunciation practice states
  const [practiceStatus, setPracticeStatus] = useState<'idle' | 'listening' | 'success' | 'fail' | 'error'>('idle');
  const [practiceTranscript, setPracticeTranscript] = useState("");
  const [practiceScore, setPracticeScore] = useState<number | null>(null);
  const [practiceError, setPracticeError] = useState("");
  const [practicingCardId, setPracticingCardId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // AI Generator state
  const [aiTopic, setAiTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: "", type: null });

  // Quiz active recall states
  const [quizActive, setQuizActive] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<{
    word: VocabularyItem;
    options: string[];
    correctIndex: number;
    userSelectedIndex: number | null;
  }[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // --- LOCAL PERSISTENCE ---
  useEffect(() => {
  if (userDataLoading || !user) return;

  setMemorizedIds(userData.memorized_ids);
  setStarredIds(userData.starred_ids);
  setStreak(userData.streak_days);

  // Custom words
  const cleanedCustom = userData.custom_words.filter((item: any, _: number, self: any[]) => {
    return self.findIndex((t: any) =>
      t.category === item.category &&
      t.english.trim().toLowerCase() === item.english.trim().toLowerCase()
    ) === self.indexOf(item);
  });
  setCustomWords(cleanedCustom);

  // Custom scenarios
  if (userData.custom_scenarios.length > 0) {
    const defaultScenarios = [
      { id: 'home', name: "Lingkungan Rumah", desc: "Rumah, dapur, barang kamar tidur & percakapan keluarga.", icon: HomeIcon },
      { id: 'office', name: "Dunia Kantor", desc: "Rapat, deadline, dokumen kerja, karir & gaji.", icon: Briefcase },
      { id: 'others', name: "Tempat Umum & Sosial", desc: "Perjalanan, makan luar, belanja di swalayan & apotek.", icon: Compass }
    ];
    setScenarios([...defaultScenarios, ...userData.custom_scenarios.map((sc: any) => ({
      ...sc, icon: Sparkles, isCustom: true
    }))]);
  }

  // Streak logic
  const todayStr = new Date().toDateString();
  if (userData.last_active_date && userData.last_active_date !== todayStr) {
    const diff = Math.ceil(
      Math.abs(new Date(todayStr).getTime() - new Date(userData.last_active_date).getTime())
      / (1000 * 60 * 60 * 24)
    );
    const newStreak = diff === 1 ? userData.streak_days + 1 : 1;
    setStreak(newStreak);
    saveUserData({ streak_days: newStreak, last_active_date: todayStr });
  } else if (!userData.last_active_date) {
    saveUserData({ last_active_date: todayStr });
  }
}, [userDataLoading, user]);

  const saveMemorized = (newIds: string[]) => {
    setMemorizedIds(newIds);
    saveUserData({ memorized_ids: newIds });
  };

  const saveStarred = (newIds: string[]) => {
    setStarredIds(newIds);
    saveUserData({ starred_ids: newIds });
  };

  // --- VOCABULARY LIST RESOLUTION ---
  // Merges pre-curated deduplicated words + custom words of that category
  const activeVocabList = useMemo(() => {
    let baseList: VocabularyItem[] = [];
    if (category === 'home') baseList = CLEANED_HOME_VOCABULARY;
    else if (category === 'office') baseList = CLEANED_OFFICE_VOCABULARY;
    else if (category === 'others') baseList = CLEANED_OTHERS_VOCABULARY;
    else baseList = []; // Custom categories start empty

    // Append custom generated words matching this specific category
    const matchingCustom = customWords.filter(w => w.category === category);
    const combined = [...baseList, ...matchingCustom];

    // Deduplicate on English words to ensure absolutely unique cards in this view
    const seen = new Set<string>();
    const uniqueCombined: VocabularyItem[] = [];
    for (const item of combined) {
      const key = item.english.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCombined.push(item);
      }
    }

    if (showOnlyUnmemorized) {
      return uniqueCombined.filter(item => !memorizedIds.includes(item.id));
    }
    return uniqueCombined;
  }, [category, customWords, memorizedIds, showOnlyUnmemorized]);

  // Easy filter to only study newly generated custom cards
  const [onlyCustomFilter, setIsOnlyCustomFilter] = useState(false);
  const finalFilteredList = useMemo(() => {
    if (onlyCustomFilter) {
      return activeVocabList.filter(item => item.isCustom);
    }
    return activeVocabList;
  }, [activeVocabList, onlyCustomFilter]);

  // Safety fallbacks when list is empty
  const currentCard: VocabularyItem | undefined = finalFilteredList[currentIndex] || finalFilteredList[0];
  const resolvedCard: VocabularyItem | undefined = finalFilteredList[currentIndex] || finalFilteredList[0];

  // Keep currentIndex bounds locked in when list length changes
  useEffect(() => {
    if (currentIndex >= finalFilteredList.length) {
      setCurrentIndex(Math.max(0, finalFilteredList.length - 1));
    }
  }, [finalFilteredList, currentIndex]);

  // --- AUTO-FLIP 5-SECOND TIMER EFFECT ---
  useEffect(() => {
    if (!autoFlipEnabled || isFlipped || !resolvedCard) return;

    // Start 5-second timer to automatically flip to Definition side
    const timer = setTimeout(() => {
      setIsFlipped(true);
    }, 5000);

    // Clean up timer if auto-flip is disabled, card is manual flipped, or word changes
    return () => clearTimeout(timer);
  }, [autoFlipEnabled, isFlipped, resolvedCard]);

  // Global search results across all categories
  // Form search submission handler
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    // Search all words in all scenarios
    const allWords = [
      ...CLEANED_HOME_VOCABULARY,
      ...CLEANED_OFFICE_VOCABULARY,
      ...CLEANED_OTHERS_VOCABULARY,
      ...customWords
    ];

    // Deduplicate array based on English words
    const seen = new Set<string>();
    const uniqueAll: VocabularyItem[] = [];
    for (const item of allWords) {
      const key = item.english.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueAll.push(item);
      }
    }

    // 1. Exact match
    let match = uniqueAll.find(w => 
      w.english.trim().toLowerCase() === q || 
      w.indonesian.trim().toLowerCase() === q
    );

    // 2. Starts with query (English or Indonesian)
    if (!match) {
      match = uniqueAll.find(w => 
        w.english.trim().toLowerCase().startsWith(q) || 
        w.indonesian.trim().toLowerCase().startsWith(q)
      );
    }

    // 3. Substring match
    if (!match) {
      match = uniqueAll.find(w => 
        w.english.toLowerCase().includes(q) || 
        w.indonesian.toLowerCase().includes(q) || 
        w.example.toLowerCase().includes(q) ||
        (w.meaning && w.meaning.toLowerCase().includes(q))
      );
    }

    if (match) {
      navigateToWord(match);
    } else {
      setSearchedTerm(searchQuery);
      setShowSearchError(true);
    }

    // Blur focus
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsSearchFocused(false);
  };

  const navigateToWord = (word: VocabularyItem) => {
    // 1. Set the active category
    setCategory(word.category);

    // 2. Clear filters so the target word is guaranteed to be visible in the list
    setShowOnlyUnmemorized(false);
    setIsOnlyCustomFilter(false);

    // 3. Resolve the full deduplicated vocabulary list for this category
    let baseList: VocabularyItem[] = [];
    if (word.category === 'home') baseList = CLEANED_HOME_VOCABULARY;
    else if (word.category === 'office') baseList = CLEANED_OFFICE_VOCABULARY;
    else if (word.category === 'others') baseList = CLEANED_OTHERS_VOCABULARY;

    const matchingCustom = customWords.filter(w => w.category === word.category);
    const combined = [...baseList, ...matchingCustom];

    const seen = new Set<string>();
    const uniqueCombined: VocabularyItem[] = [];
    for (const item of combined) {
      const key = item.english.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCombined.push(item);
      }
    }

    // 4. Find the target word index in the clean list and route to it
    const index = uniqueCombined.findIndex(item => item.id === word.id);
    if (index !== -1) {
      setCurrentIndex(index);
    } else {
      setCurrentIndex(0);
    }

    // 5. Clean up flipping, practice states, and search queries
    setIsFlipped(false);
    clearPractice();
    setSearchQuery(""); // Clear the search bar
  };

  // Reset card flipping and pronunciation practice when moving to next/prev card
  const handleNextCard = () => {
    setIsFlipped(false);
    clearPractice();
    setTimeout(() => {
      if (finalFilteredList.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % finalFilteredList.length);
      }
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    clearPractice();
    setTimeout(() => {
      if (finalFilteredList.length > 0) {
        setCurrentIndex((prev) => (prev - 1 + finalFilteredList.length) % finalFilteredList.length);
      }
    }, 150);
  };

  // Progress metrics
  const categoryTotal = useMemo(() => {
    let baseLength = 0;
    if (category === 'home') baseLength = CLEANED_HOME_VOCABULARY.length;
    else if (category === 'office') baseLength = CLEANED_OFFICE_VOCABULARY.length;
    else if (category === 'others') baseLength = CLEANED_OTHERS_VOCABULARY.length;

    const matchingCustom = customWords.filter(w => w.category === category).length;
    return baseLength + matchingCustom;
  }, [category, customWords]);

  const categoryMemorizedCount = useMemo(() => {
    let list: VocabularyItem[] = [];
    if (category === 'home') list = CLEANED_HOME_VOCABULARY;
    else if (category === 'office') list = CLEANED_OFFICE_VOCABULARY;
    else if (category === 'others') list = CLEANED_OTHERS_VOCABULARY;
    else list = [];

    const matchingCustom = customWords.filter(w => w.category === category);
    const combined = [...list, ...matchingCustom];
    
    // Deduplicate internally to ensure progress counts are completely correct
    const seen = new Set<string>();
    const uniqueCombined: VocabularyItem[] = [];
    for (const item of combined) {
      const key = item.english.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCombined.push(item);
      }
    }

    return uniqueCombined.filter(item => memorizedIds.includes(item.id)).length;
  }, [category, customWords, memorizedIds]);

  const progressPercentage = categoryTotal > 0 
    ? Math.round((categoryMemorizedCount / categoryTotal) * 100) 
    : 0;

  // Overall statistics for Goal Tracker
  const totalStudiedToday = useMemo(() => {
    // Total memorized across all categories (using cleaned base lists)
    return CLEANED_ALL_PRE_CURATED_VOCABULARY.concat(customWords).filter(w => memorizedIds.includes(w.id)).length;
  }, [customWords, memorizedIds]);

  const dailyGoal = 50;
  const isGoalReached = totalStudiedToday >= dailyGoal;

  // --- ACTIVE MEMORIZATION ACTION ---
  const toggleMemorized = (id: string) => {
    if (memorizedIds.includes(id)) {
      saveMemorized(memorizedIds.filter(i => i !== id));
    } else {
      saveMemorized([...memorizedIds, id]);
      // Gentle vibration feedback on supported devices for immediate gratification
      if ('vibrate' in navigator) {
        navigator.vibrate(40);
      }
    }
  };

  const toggleStarred = (id: string) => {
    if (starredIds.includes(id)) {
      saveStarred(starredIds.filter(i => i !== id));
    } else {
      saveStarred([...starredIds, id]);
    }
  };

  const handleResetProgress = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Setel Ulang Semua Progress",
      message: "Apakah Anda yakin ingin menyetel ulang semua hafalan kata, daftar kosakata kustom, dan rentetan (streak) hari belajar Anda?",
      confirmText: "Ya, Setel Ulang",
      cancelText: "Batal",
      isDanger: true,
      onConfirm: () => {
        saveMemorized([]);
        saveStarred([]);
        setStreak(1);
        localStorage.setItem("vocab_streak_days", "1");
        setCustomWords([]);
        saveUserData({ custom_words: [], memorized_ids: [], starred_ids: [], streak_days: 1 });
        localStorage.removeItem("vocab_custom_words");
        setCurrentIndex(0);
        setIsFlipped(false);
        setConfirmDialog(p => ({ ...p, isOpen: false }));
      }
    });
  };

  // --- TEXT TO SPEECH (PROUNCIATION SOUND) ---
  const speakWord = (wordText: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // prevent card from flipping
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.lang = 'en-US';
      utterance.rate = 0.85; // highly comprehensive academic clarity
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Browser Anda tidak mendukung Text-to-Speech.");
    }
  };

  // --- WEBSPEECH API FOR SPEECH RECOGNITION (PRONUNCIATION PRACTICE) ---
  const startListening = (targetWord: string, cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // prevent card from flipping or triggering click-to-flip
    
    // Stop any existing recognition session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log(err);
      }
    }

    setPracticingCardId(cardId);
    setPracticeStatus('listening');
    setPracticeTranscript("");
    setPracticeScore(null);
    setPracticeError("");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPracticeStatus('error');
      setPracticeError("Browser tidak mendukung Web Speech API.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US'; // We are practicing English pronunciation
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log("Speech recognition started for target:", targetWord);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Speech heard:", transcript);
        setPracticeTranscript(transcript);

        // Compare transcript against target word
        const score = calculateSimilarity(transcript, targetWord);
        setPracticeScore(score);

        if (score >= 80) {
          setPracticeStatus('success');
          // Speak congratulatory audio or trigger speech feedback
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const congrats = new SpeechSynthesisUtterance("Splendid!");
            congrats.lang = 'en-US';
            congrats.volume = 0.5;
            window.speechSynthesis.speak(congrats);
          }
        } else {
          setPracticeStatus('fail');
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setPracticeStatus('error');
        if (event.error === 'not-allowed') {
          setPracticeError("Akses mikrofon ditolak. Aktifkan izin mikrofon.");
        } else if (event.error === 'no-speech') {
          setPracticeError("Suara tidak terdengar. Silakan bicara lebih keras.");
        } else {
          setPracticeError(`Terjadi kesalahan (${event.error}).`);
        }
      };

      recognition.onend = () => {
        console.log("Speech recognition ended.");
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      console.error("Failed to initialize speech recognition:", err);
      setPracticeStatus('error');
      setPracticeError("Gagal memulai mikrofon.");
    }
  };

  const stopListening = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log(err);
      }
    }
    setPracticeStatus('idle');
  };

  const clearPractice = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPracticeStatus('idle');
    setPracticeTranscript("");
    setPracticeScore(null);
    setPracticeError("");
    setPracticingCardId(null);
  };

  const cleanWordForComparison = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "") // strip punctuation
      .trim();
  };

  const calculateSimilarity = (s1: string, s2: string): number => {
    const w1 = cleanWordForComparison(s1);
    const w2 = cleanWordForComparison(s2);
    
    if (w1 === w2) return 100;
    if (!w1 || !w2) return 0;
    
    // Custom quick check: if one contains the other entirely as a whole word
    if (w1.includes(w2) || w2.includes(w1)) {
      return 90;
    }
    
    // Calculate Levenshtein Distance
    const track = Array(w2.length + 1).fill(null).map(() => Array(w1.length + 1).fill(null));
    for (let i = 0; i <= w1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= w2.length; j += 1) {
      track[j][0] = j;
    }
    for (let j = 1; j <= w2.length; j += 1) {
      for (let i = 1; i <= w1.length; i += 1) {
        const indicator = w1[i - 1] === w2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j - 1][i] + 1, // deletion
          track[j][i - 1] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    const distance = track[w2.length][w1.length];
    const maxLength = Math.max(w1.length, w2.length);
    return Math.round(((maxLength - distance) / maxLength) * 100);
  };

  // --- AI VOCABULARY GENERATION ENTRAINMENT ---
  const handleGenerateCustomWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;

    setIsGenerating(true);
    setAiMessage({ text: "Menghubungi server asisten AI Gemini... Harap tunggu sebentar.", type: "info" });

    try {
      const response = await fetch("/api/gemini/custom-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: aiTopic.trim(),
          category: category // Pass current category!
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil data asisten kosakata");
      }

      if (data.cards && data.cards.length > 0) {
        // Enforce the current selected category on generated cards
        const sanitizedCards = data.cards.map((c: any) => ({
          ...c,
          category: category
        }));

        // Deduplicate before adding to customWords
        const seenCombined = new Set<string>();
        CLEANED_HOME_VOCABULARY.forEach(item => seenCombined.add(`home:${item.english.trim().toLowerCase()}`));
        CLEANED_OFFICE_VOCABULARY.forEach(item => seenCombined.add(`office:${item.english.trim().toLowerCase()}`));
        CLEANED_OTHERS_VOCABULARY.forEach(item => seenCombined.add(`others:${item.english.trim().toLowerCase()}`));

        const cleanedCustom: VocabularyItem[] = [];
        const allCustomCombined = [...customWords, ...sanitizedCards];
        allCustomCombined.forEach(item => {
          const key = `${item.category}:${item.english.trim().toLowerCase()}`;
          if (!seenCombined.has(key)) {
            seenCombined.add(key);
            cleanedCustom.push(item);
          }
        });

        setCustomWords(cleanedCustom);
        saveUserData({ custom_words: cleanedCustom });
        localStorage.setItem("vocab_custom_words", JSON.stringify(cleanedCustom));

        const catName = getCategoryTitleInIndonesian(category);
        setAiTopic("");
        setAiMessage({ 
          text: `Berhasil membuat ${sanitizedCards.length} kartu kosakata baru untuk kategori "${catName}". Ditambahkan ke daftar belajar Anda!`, 
          type: "success" 
        });

        // Focus on first generated card index
        setIsOnlyCustomFilter(true);
        setCurrentIndex(activeVocabList.length);
      } else {
        throw new Error("Format data yang diterima tidak sesuai.");
      }

    } catch (err: any) {
      console.error(err);
      setAiMessage({ 
        text: err.message || "Gagal memproses kata. Silakan cek koneksi atau kunci API Anda.", 
        type: "error" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- BULK EXTRA 50 WORDS GENERATOR ---
  const handleGenerateBulkMoreVocab = async () => {
    setIsGeneratingBulk(true);
    setBulkError("");
    try {
      let baseList: VocabularyItem[] = [];
      if (category === 'home') baseList = CLEANED_HOME_VOCABULARY;
      else if (category === 'office') baseList = CLEANED_OFFICE_VOCABULARY;
      else if (category === 'others') baseList = CLEANED_OTHERS_VOCABULARY;
      
      const combined = baseList.concat(customWords.filter(w => w.category === category));
      const existingWords = combined.map(item => item.english);
      const categoryName = getCategoryTitleInIndonesian(category);

      const response = await fetch("/api/gemini/bulk-more-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          categoryName,
          existingWords
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menghasilkan kosakata tambahan.");
      }

      if (data.cards && data.cards.length > 0) {
        // Deduplicate before adding to customWords
        const seenCombined = new Set<string>();
        CLEANED_HOME_VOCABULARY.forEach(item => seenCombined.add(`home:${item.english.trim().toLowerCase()}`));
        CLEANED_OFFICE_VOCABULARY.forEach(item => seenCombined.add(`office:${item.english.trim().toLowerCase()}`));
        CLEANED_OTHERS_VOCABULARY.forEach(item => seenCombined.add(`others:${item.english.trim().toLowerCase()}`));

        const cleanedCustom: VocabularyItem[] = [];
        const allCustomCombined = [...customWords, ...data.cards];
        allCustomCombined.forEach(item => {
          const key = `${item.category}:${item.english.trim().toLowerCase()}`;
          if (!seenCombined.has(key)) {
            seenCombined.add(key);
            cleanedCustom.push(item);
          }
        });

        setCustomWords(cleanedCustom);
        saveUserData({ custom_words: cleanedCustom });
        localStorage.setItem("vocab_custom_words", JSON.stringify(cleanedCustom));
        
        alert(`Berhasil menambahkan kosakata baru bertema "${categoryName}" dari Gemini AI!`);
        
        setShowOnlyUnmemorized(false);
        setIsOnlyCustomFilter(false);
        // Focus first new word
        setCurrentIndex(combined.length);
      } else {
        throw new Error("Format data yang diterima dari AI tidak lengkap.");
      }
    } catch (err: any) {
      console.error(err);
      setBulkError(err.message || "Gagal memproses penambahan kata oleh Gemini.");
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // --- EXPORT TO EXCEL COMPATIBLE CSV ---
  const exportToExcel = () => {
    const headers = [
      "No.",
      "Kategori",
      "Word in english",
      "Pronounce",
      "word in bahasa indonesia",
      "contoh dalam kalimat"
    ];

    const categoryName = getCategoryTitleInIndonesian(category);
    const listToExport = finalFilteredList;

    if (listToExport.length === 0) {
      alert("Tidak ada kosakata yang dapat diekspor pada filter saat ini.");
      return;
    }

    const rows = listToExport.map((item, idx) => {
      const sentenceExample = `"${item.example}" / "${item.exampleTranslation}"`;
      return [
        (idx + 1).toString(),
        categoryName,
        item.english,
        item.phonetic,
        item.indonesian,
        sentenceExample
      ];
    });

    const escapeCSV = (field: string) => {
      if (field === null || field === undefined) return "";
      let result = field.toString();
      if (result.includes('"') || result.includes(',') || result.includes('\n') || result.includes('\r')) {
        result = '"' + result.replace(/"/g, '""') + '"';
      }
      return result;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeStr = categoryName.toLowerCase().replace(/\s+/g, "_");
    link.setAttribute("download", `vocab_export_${safeStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CUSTOM SCENARIO HANDLERS ---
  const handleAddScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;

    const newId = "custom_sc_" + Math.random().toString(36).substr(2, 9);
    const newScenarioObj = {
      id: newId,
      name: newScenarioName.trim(),
      desc: newScenarioDesc.trim() || "Kategori kustom buatan Anda.",
      icon: Sparkles,
      isCustom: true
    };

    const updatedScenarios = [...scenarios, newScenarioObj];
    setScenarios(updatedScenarios);
    saveUserData({ custom_scenarios: updatedScenarios.filter(s => s.isCustom).map(s => ({ id: s.id, name: s.name, desc: s.desc, isCustom: true })) }); // ADD THIS

    const serializable = updatedScenarios
      .filter(s => s.isCustom)
      .map(s => ({ id: s.id, name: s.name, desc: s.desc, isCustom: true }));
    localStorage.setItem("vocab_custom_scenarios", JSON.stringify(serializable));

    setNewScenarioName("");
    setNewScenarioDesc("");
    setShowAddScenarioForm(false);

    setCategory(newId);
    setCurrentIndex(0);
    setIsFlipped(false);
    clearPractice();
  };

  const handleDeleteScenario = (scId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Skenario Kustom",
      message: "Apakah Anda yakin ingin menghapus kategori skenario ini? Semua kata buatan AI di kategori ini juga akan terhapus.",
      confirmText: "Ya, Hapus Skenario",
      cancelText: "Batal",
      isDanger: true,
      onConfirm: () => {
        const updatedScenarios = scenarios.filter(s => s.id !== scId);
        setScenarios(updatedScenarios);
        saveUserData({ custom_scenarios: updatedScenarios.filter(s => s.isCustom).map(s => ({ id: s.id, name: s.name, desc: s.desc, isCustom: true })) });

        const serializable = updatedScenarios
          .filter(s => s.isCustom)
          .map(s => ({ id: s.id, name: s.name, desc: s.desc, isCustom: true }));
        localStorage.setItem("vocab_custom_scenarios", JSON.stringify(serializable));

        const updatedCustomWords = customWords.filter(w => w.category !== scId);
        setCustomWords(updatedCustomWords);
        saveUserData({ custom_words: updatedCustomWords });
        localStorage.setItem("vocab_custom_words", JSON.stringify(updatedCustomWords));

        if (category === scId) {
          setCategory('home');
          setCurrentIndex(0);
          setIsFlipped(false);
          clearPractice();
        }
        setConfirmDialog(p => ({ ...p, isOpen: false }));
      }
    });
  };

  // --- CARD LEVEL CUSTOM WORD DELETOR ---
  const deleteCustomWord = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Kosakata Kustom",
      message: "Apakah Anda yakin ingin menghapus kartu kosakata kustom ini? Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      isDanger: true,
      onConfirm: () => {
        const updated = customWords.filter(w => w.id !== id);
        setCustomWords(updated);
        saveUserData({ custom_words: updated });
        localStorage.setItem("vocab_custom_words", JSON.stringify(updated));
        
        // Ensure currentIndex is safely bounded to the new list size
        const remainingForThisCategory = updated.filter(w => w.category === category);
        let baseList: VocabularyItem[] = [];
        if (category === 'home') baseList = CLEANED_HOME_VOCABULARY;
        else if (category === 'office') baseList = CLEANED_OFFICE_VOCABULARY;
        else if (category === 'others') baseList = CLEANED_OTHERS_VOCABULARY;

        const baseAndCustomCount = baseList.length + remainingForThisCategory.length;
        if (currentIndex >= baseAndCustomCount && baseAndCustomCount > 0) {
          setCurrentIndex(baseAndCustomCount - 1);
        }
        setConfirmDialog(p => ({ ...p, isOpen: false }));
      }
    });
  };

  // --- QUIZ GAME ENGINE (ACTIVE RECALL CHALLENGE) ---
  const launchQuickQuiz = () => {
    // Generate active recall test using studied words or general items in current category
    let pool: VocabularyItem[] = [];
    if (category === 'home') pool = CLEANED_HOME_VOCABULARY;
    else if (category === 'office') pool = CLEANED_OFFICE_VOCABULARY;
    else if (category === 'others') pool = CLEANED_OTHERS_VOCABULARY;
    else pool = [];

    // Deduplicate the combinedPool on english words to avoid testing duplicate words in quiz!
    const combined = pool.concat(customWords.filter(w => w.category === category));
    const seen = new Set<string>();
    const combinedPool: VocabularyItem[] = [];
    for (const item of combined) {
      const key = item.english.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combinedPool.push(item);
      }
    }

    if (combinedPool.length < 4) {
      alert("Harap tambahkan setidaknya 4 kosakata di kategori ini terlebih dahulu untuk memulai kuis!");
      return;
    }

    // Pick 5 random questions
    const shuffled = [...combinedPool].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(5, combinedPool.length));

    const questionsWithAnswers = selectedQuestions.map((correctWord) => {
      // Pick 3 random decoy options from the pool (having different translations)
      const decoys = combinedPool
        .filter(item => item.id !== correctWord.id)
        .map(item => item.indonesian)
        .filter((val, idx, self) => self.indexOf(val) === idx); // unique translation entries

      const shuffledDecoys = decoys.sort(() => 0.5 - Math.random()).slice(0, 3);
      const allOptions = [...shuffledDecoys, correctWord.indonesian].sort(() => 0.5 - Math.random());
      const correctIdx = allOptions.indexOf(correctWord.indonesian);

      return {
        word: correctWord,
        options: allOptions,
        correctIndex: correctIdx,
        userSelectedIndex: null
      };
    });

    setQuizQuestions(questionsWithAnswers);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizCompleted(false);
    setQuizActive(true);
  };

  const handleSelectAnswer = (optionIdx: number) => {
    if (quizQuestions[currentQuizIndex].userSelectedIndex !== null) return; // already answered

    const updated = [...quizQuestions];
    updated[currentQuizIndex].userSelectedIndex = optionIdx;
    setQuizQuestions(updated);

    if (optionIdx === quizQuestions[currentQuizIndex].correctIndex) {
      setQuizScore(prev => prev + 1);
    }
  };

  const advanceQuiz = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  // --- CATEGORY TEXT IN INDONESIAN ---
  const getCategoryTitleInIndonesian = (cat: string) => {
    const matched = scenarios.find(s => s.id === cat);
    if (matched) return matched.name;
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

      if (authLoading || userDataLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      );
    }

    if (!user) return <AuthPage />;
  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans transition-colors duration-200">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 w-full bg-white/75 backdrop-blur-lg border-b border-white/40 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3" id="app_brand">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-blue-500/15 shadow-lg">
              <BookOpen className="h-6 w-6" id="logo_icon" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 leading-tight">
                VocabCards
              </h1>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">
                Daily English Vocabulary
              </span>
            </div>
          </div>

          {/* CENTRAL METRICS SUMMARY */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-2.5 bg-white/80 px-4 py-2 rounded-xl border border-white/50 shadow-sm">
              <span className="text-lg">🔥</span>
              <div className="text-left">
                <span className="text-xs text-slate-400 block font-medium leading-none">Streak</span>
                <span className="text-sm font-bold text-slate-800 font-display">{streak} Hari</span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100/50 shadow-sm">
              <span className="text-lg">🎯</span>
              <div className="text-left">
                <span className="text-xs text-slate-500 block font-medium leading-none">Goal Harian (50)</span>
                <span className="text-sm font-bold text-blue-700 font-display">{totalStudiedToday} / 50 Kata</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={handleResetProgress}
              title="Setel ulang semua kemajuan belajar Anda"
              className="p-2 sm:px-3 sm:py-2 text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center space-x-1.5 rounded-lg hover:bg-red-50/80"
              id="reset_btn"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline font-semibold">Reset Progress</span>
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              title="Logout dari akun Anda"
              className="p-2 sm:px-3 sm:py-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <span className="hidden sm:inline font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CONTROLS, STATS, CATEGORIES & AI EXPLORER */}
        <section className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* DAILY PROGRESS GOAL THERMOMETER */}
          <div className="glass-card p-6" id="daily_goal_card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Trophy className={`h-5 w-5 ${isGoalReached ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                <h3 className="font-semibold text-slate-800 font-display">Target Harian (50 Kata)</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goals</span>
            </div>

            {/* PROGRESS BAR */}
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold inline-block py-1 px-2.5 uppercase rounded-full text-blue-600 bg-blue-50">
                    {isGoalReached ? "🥇 Tercapai!" : "🏃 Menghafal"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {totalStudiedToday} / {dailyGoal} Kata
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-100/80 border border-slate-200/20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (totalStudiedToday / dailyGoal) * 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="shadow-[0_0_12px_rgba(59,130,246,0.25)] flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-indigo-600"
                ></motion.div>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mt-3 leading-relaxed font-medium">
              {isGoalReached 
                ? "Selamat! Anda telah menguasai target 50 kata hari ini. Pertahankan streak Anda besok!" 
                : `Hafalkan ${Math.max(0, dailyGoal - totalStudiedToday)} kosakata lagi hari ini untuk mencapai target ideal percakapan harian.`}
            </p>
          </div>

          {/* GLOBAL VOCAB SEARCH BAR */}
          <div className="glass-card p-5 relative" id="global_search_card">
            <h3 className="font-semibold text-slate-800 font-display mb-3 text-sm">Cari Kosakata Global</h3>
            <form 
              onSubmit={handleSearchSubmit}
              className="relative"
            >
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                placeholder="Cari kata (Inggris / Indonesia)..."
                className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* SCENARIO CATEGORY SELECTION */}
          <div className="glass-card p-6" id="scenarios_card">
            <h3 className="font-semibold text-slate-800 font-display mb-4">Pilih Skenario Percakapan</h3>
            
            <div className="space-y-3">
              {scenarios.map((item) => {
                const isActive = category === item.id;
                const activeColor = item.id === 'home' 
                  ? "border-blue-500/65 bg-blue-500/5" 
                  : item.id === 'office'
                  ? "border-indigo-500/65 bg-indigo-500/5"
                  : item.id === 'others'
                  ? "border-purple-500/65 bg-purple-500/5"
                  : "border-pink-500/65 bg-pink-500/5";

                const gradient = item.id === 'home'
                  ? "from-blue-500 to-indigo-500"
                  : item.id === 'office'
                  ? "from-indigo-500 to-purple-600"
                  : item.id === 'others'
                  ? "from-purple-500 to-pink-500"
                  : "from-pink-500 to-rose-500";

                return (
                  <div key={item.id} className="relative group/sc">
                    <button
                      onClick={() => {
                        setCategory(item.id);
                        setCurrentIndex(0);
                        setIsFlipped(false);
                        setIsOnlyCustomFilter(false);
                        clearPractice();
                      }}
                      className={`w-full text-left p-3.5 pr-14 rounded-2xl border flex items-start space-x-3.5 transition-all duration-200 group relative ${
                        isActive 
                          ? `${activeColor} shadow-md` 
                          : 'border-white/40 hover:border-slate-300 hover:bg-white/50'
                      }`}
                      id={`category_tab_${item.id}`}
                    >
                      <div className={`p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                        isActive ? `bg-gradient-to-tr ${gradient} text-white shadow-md shadow-blue-500/10` : 'bg-slate-100/80 text-slate-500 border border-slate-200/30'
                      }`}>
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-bold block ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-snug font-medium">
                          {item.desc}
                        </span>
                      </div>

                      {isActive && (
                        <div className="absolute right-3 top-3 flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md shadow-xs">
                          <Check className="h-2.5 w-2.5" />
                          <span>Aktif</span>
                        </div>
                      )}
                    </button>

                    {/* Delete Custom Scenario Button */}
                    {item.isCustom && (
                      <button
                        onClick={(e) => handleDeleteScenario(item.id, e)}
                        className="absolute right-3.5 bottom-3.5 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200/40 opacity-0 group-hover/sc:opacity-100 transition duration-150 shadow-xs cursor-pointer z-10"
                        title="Hapus Kategori Skenario"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ADD SCENARIO FORM */}
            <div className="mt-4 pt-3 border-t border-slate-150/40">
              {!showAddScenarioForm ? (
                <button
                  onClick={() => setShowAddScenarioForm(true)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-250 text-slate-600 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-400" />
                  <span>Tambah Skenario Baru</span>
                </button>
              ) : (
                <form onSubmit={handleAddScenario} className="space-y-3 bg-slate-50/75 p-4 rounded-2xl border border-slate-200/60">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 font-display">Skenario Kustom Baru</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddScenarioForm(false)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      required
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      placeholder="e.g. Dunia Kuliner / Airport"
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={newScenarioDesc}
                      onChange={(e) => setNewScenarioDesc(e.target.value)}
                      placeholder="e.g. Percakapan di restoran & cara memesan makanan"
                      className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Simpan Skenario
                  </button>
                </form>
              )}
            </div>

            {/* FILTER FILTER SYSTEM */}
            <div className="mt-5 pt-4 border-t border-slate-150/40 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowOnlyUnmemorized(!showOnlyUnmemorized)}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 ${
                  showOnlyUnmemorized 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 shadow-xs' 
                    : 'bg-white/60 border-slate-200/55 text-slate-500 hover:bg-slate-50'
                }`}
                id="filter_unmemorized_btn"
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Belum Hafal</span>
              </button>

              <button
                onClick={() => {
                  if (customWords.filter(w => w.category === category).length > 0) {
                    setIsOnlyCustomFilter(!onlyCustomFilter);
                  } else {
                    alert("Buat kosakata AI terlebih dahulu di formulir bawah untuk mencoba filter ini.");
                  }
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 ${
                  onlyCustomFilter 
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 shadow-xs' 
                    : 'bg-white/60 border-slate-200/55 text-slate-500 hover:bg-slate-50'
                }`}
                id="filter_custom_btn"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Buatan AI</span>
              </button>
            </div>
          </div>

          {/* AI CUSTOM FLASHCARD GENERATOR */}
          <div className="glass-card p-6" id="ai_generator_card">
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
                <Sparkles className="h-4.5 w-4.5 animate-pulse text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 font-display">Ingin Belajar Kata Lain? (Gemini AI)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-medium">
              Ketik topik khusus atau bahasa Inggris pilihan Anda (e.g. <i>"Dapur"</i>, <i>"Airport Security"</i>) ke Gemini AI untuk membuat kartu kustom otomatis.
            </p>

            <form onSubmit={handleGenerateCustomWord} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ketik topik: e.g. perlengkapan bayi..."
                  disabled={isGenerating}
                  className="w-full pl-3 pr-10 py-2.5 text-sm bg-slate-100/60 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold placeholder:text-slate-400"
                  id="ai_topic_input"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !aiTopic.trim()}
                  className="absolute right-1.5 top-1.5 p-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 transition"
                >
                  {isGenerating ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Plus className="h-4.5 w-4.5" />}
                </button>
              </div>

              {aiMessage.text && (
                <div className={`p-3 rounded-xl text-xs leading-relaxed font-bold ${
                  aiMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-150' :
                  aiMessage.type === 'success' ? 'bg-blue-50 text-blue-700 border border-blue-150' :
                  'bg-indigo-50/50 text-indigo-700 border border-indigo-150'
                }`}>
                  {aiMessage.text}
                </div>
              )}
            </form>
          </div>

          {/* ACTIVE RECALL QUIZ CALLOUT */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/15 relative overflow-hidden" id="quiz_intro_card">
            {/* Background design elements */}
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
              <HelpCircle className="h-32 w-32" />
            </div>
            
            <h3 className="font-semibold text-lg font-display mb-1.5 flex items-center space-x-1.5">
              <span>🧠 Game Review Cepat</span>
            </h3>
            <p className="text-white/80 text-xs mb-4 leading-relaxed font-semibold">
              Uji hafalan {category === 'home' ? 'Peralatan Rumah' : category === 'office' ? 'Bisnis & Kantor' : 'Tempat Umum'} melalui tantangan kuis 5 pertanyaan acak!
            </p>

            <button
              onClick={launchQuickQuiz}
              className="w-full bg-white hover:bg-slate-50 text-blue-600 hover:scale-101 active:scale-98 transition-all font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm"
              id="quiz_launcher_btn"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Mulai Tebak Kata Gratis</span>
            </button>
          </div>

        </section>

        {/* RIGHT COLUMN: INTERACTIVE FLASHCARD PREVIEW */}
        <section className="lg:col-span-8 flex flex-col items-center justify-center">
          
          <AnimatePresence mode="wait">
            {!quizActive ? (
              // --- REGULAR STUDY FLASHCARD PLAYGROUND ---
              <motion.div 
                key="flashcard_desk"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-2xl flex flex-col items-center"
              >
                {/* ACTIVE CATEGORY INDICATOR HEADER */}
                <div className="w-full flex justify-between items-center px-2 mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase leading-none">
                      Skenario Terpilih
                    </span>
                    <span className="text-xs font-bold text-slate-600 mt-1 uppercase font-display">
                      {category === 'home' ? '🏡 HOME & RESIDENCE' : category === 'office' ? '🏢 OFFICE & BUSINESS' : '🚍 PUBLIC & SCENARIOS'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1 bg-white/80 border border-white/40 shadow-xs py-1.5 px-3.5 rounded-full text-xs text-slate-600 font-bold">
                    <span className="font-mono">{finalFilteredList.length > 0 ? currentIndex + 1 : 0}</span>
                    <span className="text-slate-400">/</span>
                    <span className="font-mono">{finalFilteredList.length}</span>
                  </div>
                </div>

                {finalFilteredList.length === 0 ? (
                  // EMPTY STATE ON FILTERED OUT (Celebrate completion or prompt state)
                  <div className="w-full glass-card p-12 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                      {categoryMemorizedCount === categoryTotal && categoryTotal > 0 ? (
                        <Trophy className="h-12 w-12 text-amber-500 animate-pulse" />
                      ) : (
                        <BookmarkCheck className="h-12 w-12" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 font-display">
                        {categoryMemorizedCount === categoryTotal && categoryTotal > 0 
                          ? `Semua Selesai Dihafal! 🎉` 
                          : "Tidak ada kata di filter ini!"}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed font-semibold">
                        {categoryMemorizedCount === categoryTotal && categoryTotal > 0
                          ? `Luar biasa! Anda telah berhasil menghafal seluruh ${categoryTotal} kata di kategori "${getCategoryTitleInIndonesian(category)}". Ingin melanjutkan perjalanan belajar Anda?`
                          : "Anda mungkin sudah menandai semua kosakata skenario ini sebagai hafalan kaku. Silakan switch tab filter atau setel ulang seluruh progress!"}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                      {categoryMemorizedCount === categoryTotal && categoryTotal > 0 && (
                        <button 
                          onClick={handleGenerateBulkMoreVocab}
                          disabled={isGeneratingBulk}
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-95 transition flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isGeneratingBulk ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Sedang Membuat 50 Kata...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              <span>Tambah 50 Kosakata Baru</span>
                            </>
                          )}
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          setShowOnlyUnmemorized(false);
                          setIsOnlyCustomFilter(false);
                        }}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                      >
                        Tampilkan Semua Kata
                      </button>
                    </div>

                    {bulkError && (
                      <p className="text-xs text-red-500 font-bold mt-2">{bulkError}</p>
                    )}
                  </div>
                ) : (
                  resolvedCard && (
                    <>
                      {/* Auto Flip Toggle & Header Row */}
                      <div className="w-full flex justify-between items-center mb-3.5 max-w-lg px-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Kartu {currentIndex + 1} dari {finalFilteredList.length}
                        </span>

                        <div className="flex items-center space-x-2.5 bg-white border border-slate-200/40 rounded-xl py-1 px-3 shadow-xs">
                          <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wide select-none">
                            ⏱️ Auto-Flip (5 Detik)
                          </span>
                          <button
                            id="auto_flip_toggle"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAutoFlipEnabled(!autoFlipEnabled);
                            }}
                            className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              autoFlipEnabled ? "bg-blue-600" : "bg-slate-200"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                autoFlipEnabled ? "translate-x-3.5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Interactive Premium Card Transition Wrapper */}
                      <div className="w-full" id="interactive_flashcard_transition_wrapper">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={resolvedCard.id}
                            initial={{ opacity: 0, x: 25, scale: 0.985 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -25, scale: 0.985 }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            className="w-full"
                          >
                            {/* Interactive 3D Flip Card */}
                            <div 
                              onClick={() => setIsFlipped(!isFlipped)}
                              className="w-full aspect-[4/3] min-h-[360px] md:min-h-[420px] cursor-pointer group perspective-1000 select-none relative"
                              id="interactive_flashcard_container"
                            >
                        <div 
                          className={`w-full h-full relative transition-transform duration-500 transform-style-3d ${
                            isFlipped ? 'rotate-y-180' : ''
                          }`}
                        >
                          {/* FRONT VIEW */}
                          <div className="absolute inset-0 w-full h-full glass-card flex flex-col backface-hidden overflow-hidden justify-between p-6">
                            {/* Auto Flip Timer visual progress bar */}
                            {autoFlipEnabled && !isFlipped && (
                              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100/80 overflow-hidden z-20">
                                <motion.div 
                                  key={resolvedCard.id} // restarts the animation when card changes
                                  initial={{ width: "0%" }}
                                  animate={{ width: "100%" }}
                                  transition={{ duration: 5, ease: "linear" }}
                                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                />
                              </div>
                            )}
                            
                            {/* Card Top: Scenarios & Action Buttons */}
                            <div className="flex justify-between items-center w-full">
                              <span className="text-xs font-extrabold px-3 py-1 bg-white/90 text-slate-500 border border-slate-200/50 rounded-full tracking-wider uppercase">
                                {resolvedCard.isCustom ? "🧠 AI Custom Card" : getCategoryTitleInIndonesian(category)}
                              </span>
                              
                              <div className="flex items-center space-x-2">
                                {resolvedCard.isCustom && (
                                  <button
                                    onClick={(e) => deleteCustomWord(resolvedCard.id, e)}
                                    className="p-2 bg-red-50/70 border border-red-200/50 hover:bg-red-50 text-red-600 rounded-xl transition duration-200 cursor-pointer"
                                    title="Hapus kartu kustom ini"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStarred(resolvedCard.id);
                                  }}
                                  className={`p-2 rounded-xl border transition duration-200 ${
                                    starredIds.includes(resolvedCard.id)
                                      ? 'bg-amber-100/80 border-amber-300 text-amber-500'
                                      : 'bg-white border-slate-200/60 text-slate-400 hover:text-slate-600'
                                  }`}
                                  id={`star_btn_${resolvedCard.id}`}
                                >
                                  <Bookmark className="h-4 w-4 fill-current" />
                                </button>
                                
                                <button
                                  onClick={(e) => speakWord(resolvedCard.english, e)}
                                  className="p-2 bg-blue-50/70 border border-blue-200/50 hover:bg-blue-50 text-blue-600 rounded-xl transition duration-200"
                                  title="Dengar cara pengucapan kata"
                                  id={`audio_btn_${resolvedCard.id}`}
                                >
                                  <Volume2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* CURATED STOCK PHOTO IN THE MIDDLE */}
                            <div className="w-full h-36 md:h-48 rounded-2xl overflow-hidden relative border border-slate-100/80 shadow-inner">
                              <img 
                                src={getVocabularyImage(resolvedCard.english, resolvedCard.category, resolvedCard.imageSearchTerm)} 
                                alt={resolvedCard.english}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  const chain = getFallbackImageChain(resolvedCard.english, resolvedCard.imageSearchTerm);
                                  const currentIndex = parseInt(img.dataset.fallbackIndex || "-1", 10);
                                  const nextIndex = currentIndex + 1;
                                  if (nextIndex < chain.length) {
                                    img.dataset.fallbackIndex = String(nextIndex);
                                    img.src = chain[nextIndex];
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent flex items-end p-3">
                                <span className="text-[10px] text-white/95 font-bold uppercase tracking-widest bg-slate-900/30 backdrop-blur-xs px-2.5 py-1 rounded-md">
                                  {resolvedCard.category.toUpperCase()} • SCENARIO VISUAL
                                </span>
                              </div>
                            </div>

                            {/* CORE FOCUS PIECE: VOCABULARIES */}
                            <div className="text-center my-4">
                              <h2 className="text-4xl md:text-5xl font-black font-display tracking-tight text-slate-900 capitalize leading-none">
                                {resolvedCard.english}
                              </h2>
                              <div className="flex items-center justify-center space-x-1.5 mt-2.5">
                                <code className="text-xs md:text-sm font-bold font-mono text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-md">
                                  {resolvedCard.phonetic}
                                </code>
                                <button 
                                  onClick={(e) => speakWord(resolvedCard.english, e)}
                                  className="text-slate-300 hover:text-blue-500 transition-colors p-0.5"
                                  title="Pronounce"
                                >
                                  <Volume2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* PRONUNCIATION PRACTICE SECTION */}
                            <div className="mt-1 mb-3 flex flex-col items-center justify-center min-h-[72px]" onClick={(e) => e.stopPropagation()}>
                              {practiceStatus === 'idle' || practicingCardId !== resolvedCard.id ? (
                                <button
                                  onClick={(e) => startListening(resolvedCard.english, resolvedCard.id, e)}
                                  className="mx-auto flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition transform hover:scale-102 hover:shadow-lg duration-200"
                                >
                                  <Mic className="h-4 w-4 text-white/95 animate-pulse" />
                                  <span>Latih Pengucapan</span>
                                </button>
                              ) : (
                                <div className="w-full flex flex-col items-center max-w-[280px] bg-slate-50/90 border border-slate-200/50 rounded-xl p-2 pb-2.5">
                                  {practiceStatus === 'listening' && (
                                    <div className="flex flex-col items-center space-y-1 w-full">
                                      <div className="flex items-center space-x-2.5">
                                        <div className="relative flex items-center justify-center">
                                          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-400"></span>
                                        </div>
                                        <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider animate-pulse">Mendengarkan...</p>
                                      </div>
                                      <span className="text-[10px] text-slate-400 text-center font-medium">Ucapkan kata di atas secara jelas</span>
                                      <button 
                                        onClick={stopListening}
                                        className="mt-1 px-2.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-[10px] rounded-lg transition"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  )}

                                  {(practiceStatus === 'success' || practiceStatus === 'fail') && (
                                    <div className="flex flex-col items-center text-center space-y-0.5 w-full">
                                      <div className="flex items-center space-x-1.5">
                                        {practiceStatus === 'success' ? (
                                          <div className="flex items-center text-emerald-600 space-x-1">
                                            <CheckCircle2 className="h-4 w-4 fill-emerald-500 text-white" />
                                            <span className="text-xs font-black uppercase tracking-wider font-sans">Sempurna!</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center text-amber-600 space-x-1">
                                            <HelpCircle className="h-4 w-4 text-amber-500 fill-amber-100" />
                                            <span className="text-xs font-bold uppercase tracking-wider font-sans">Belum Cocok</span>
                                          </div>
                                        )}
                                        <span className="text-[10px] font-bold bg-slate-200/50 px-1.5 py-0.5 rounded-sm text-slate-600">
                                          {practiceScore}% Cocok
                                        </span>
                                      </div>
                                      
                                      <p className="text-xs text-slate-600 line-clamp-1 italic px-1 mt-0.5">
                                        Didengar: <span className="font-bold text-slate-800">"{practiceTranscript || '(hening)'}"</span>
                                      </p>

                                      <div className="flex items-center justify-center space-x-2 mt-1 w-full">
                                        <button
                                          onClick={(e) => startListening(resolvedCard.english, resolvedCard.id, e)}
                                          className="flex items-center space-x-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition"
                                        >
                                          <RefreshCw className="h-2.5 w-2.5" />
                                          <span>Ulangi</span>
                                        </button>
                                        <button
                                          onClick={clearPractice}
                                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-500 font-bold text-[10px] rounded-lg transition"
                                        >
                                          Tutup
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {practiceStatus === 'error' && (
                                    <div className="flex flex-col items-center text-center space-y-1 w-full">
                                      <p className="text-[10px] font-bold text-red-500 px-1 leading-tight">{practiceError}</p>
                                      <div className="flex space-x-2 mt-0.5">
                                        <button
                                          onClick={(e) => startListening(resolvedCard.english, resolvedCard.id, e)}
                                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-[10px] rounded-lg transition"
                                        >
                                          Coba
                                        </button>
                                        <button 
                                          onClick={clearPractice}
                                          className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] rounded-lg transition"
                                        >
                                          Tutup
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* BOTTOM FOOTER CALL TO FLIP */}
                            <div className="text-center pb-1">
                              <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-500 transition-colors">
                                Klik untuk melihat arti &amp; contoh kalimat &rarr;
                              </span>
                            </div>

                          </div>

                          {/* BACK VIEW */}
                          <div className="absolute inset-0 w-full h-full glass-card flex flex-col backface-hidden rotate-y-180 p-6 justify-between">
                            
                            {/* Card Top Header */}
                            <div className="flex justify-between items-center w-full">
                              <span className="text-xs font-extrabold px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full tracking-wider uppercase font-display">
                                ARTI KARTU
                              </span>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Back Cover
                              </span>
                            </div>

                            {/* INDONESIAN TRANSLATION HEADER */}
                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-center my-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                                Terjemahan Indonesia
                              </span>
                              <h3 className="text-xl md:text-2xl font-black text-slate-900 capitalize mt-1 font-display">
                                {resolvedCard.indonesian}
                              </h3>
                            </div>

                            {/* EXPLANATORY DEFINITION */}
                            <div className="px-1 text-slate-600">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                Penjelasan Makna
                              </span>
                              <p className="text-sm font-medium leading-relaxed text-slate-700">
                                {resolvedCard.meaning}
                              </p>
                            </div>

                            {/* EXAMPLE SENTENCE BOX */}
                            <div className="bg-blue-500/5 rounded-2xl p-4 border border-blue-100/10 text-left">
                              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block mb-1.5 font-display">
                                CONTOH DALAM KALIMAT
                              </span>
                              <p className="text-sm font-bold text-slate-800 leading-relaxed font-display">
                                "{resolvedCard.example}"
                              </p>
                              <p className="text-xs text-slate-500 mt-1 italic font-medium">
                                Artinya: {resolvedCard.exampleTranslation}
                              </p>
                            </div>

                            {/* FLIP INSTRUCTION BACK */}
                            <div className="text-center pb-1">
                              <span className="text-xs font-semibold text-slate-400">
                                Klik kembali untuk melihat kata bahasa Inggris
                              </span>
                            </div>

                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                      {/* FRONT CARD ACTION BAR (SWIPERS, PREV, NEXT, PROGRESS) */}
                      <div className="w-full flex justify-between items-center mt-6 space-x-4 max-w-lg">
                        <button
                          onClick={handlePrevCard}
                          className="p-3 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200/50 transition shadow-sm hover:scale-102 flex items-center justify-center"
                          title="Previous Card"
                          id="prev_card_btn"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => toggleMemorized(resolvedCard.id)}
                          className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-200 shadow-md flex items-center justify-center space-x-2 border ${
                            memorizedIds.includes(resolvedCard.id)
                              ? 'bg-blue-50 border-blue-200/60 text-blue-700'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white hover:opacity-95 shadow-blue-500/15 hover:scale-101 active:scale-99'
                          }`}
                          id="memorize_toggle_btn"
                        >
                          {memorizedIds.includes(resolvedCard.id) ? (
                            <>
                              <CheckCircle2 className="h-4.5 w-4.5" />
                              <span>SUDAH HAFAL (Kembalikan)</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-4.5 w-4.5 fill-current" />
                              <span>NILAI SEBAGAI HAFAL</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleNextCard}
                          className="p-3 bg-white hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200/50 transition shadow-sm hover:scale-102 flex items-center justify-center"
                          title="Next Card"
                          id="next_card_btn"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </button>
                      </div>

                      {/* ACTION TOOLBAR & QUIZ STATS */}
                      <div className="w-full flex flex-col md:flex-row justify-between items-center bg-white/90 p-4.5 rounded-2xl border border-slate-200/50 shadow-xs mt-8 gap-4 max-w-2xl">
                        <div className="flex flex-col items-center md:items-start">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-display">
                            Skenario Terpilih:
                          </span>
                          <div className="flex items-center space-x-2.5 mt-1">
                            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                            <span className="text-xs font-bold text-slate-700">
                              {getCategoryTitleInIndonesian(category)}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">•</span>
                            <span className="text-xs font-extrabold text-indigo-600 font-mono">
                              {categoryMemorizedCount} / {categoryTotal} Dihafal ({progressPercentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Control Toolbar Buttons */}
                        <div className="flex flex-wrap items-center gap-2 justify-center">
                          {/* Export to Excel */}
                          <button
                            onClick={exportToExcel}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-97 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition duration-150 shadow-xs flex items-center space-x-1.5 cursor-pointer"
                            id="export_excel_btn"
                          >
                            <span>🟢 Ekspor Excel</span>
                          </button>

                          {/* Add 50 more words button */}
                          <button
                            onClick={handleGenerateBulkMoreVocab}
                            disabled={isGeneratingBulk}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-55 active:scale-97 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition duration-150 shadow-xs flex items-center space-x-1.5 cursor-pointer font-sans"
                          >
                            {isGeneratingBulk ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Proses AI...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>+50 Kata Baru</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {bulkError && (
                        <div className="text-xs text-red-500 font-bold mt-2" id="bulk_error_txt">
                          {bulkError}
                        </div>
                      )}
                    </>
                  )
                )}
              </motion.div>
            ) : (
              // --- QUICK ASSESSMENT MODE (ACTIVE RECALL CHALLENGE QUIZ) ---
              <motion.div 
                key="quiz_playground"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-xl glass-card p-6 md:p-8 flex flex-col"
              >
                {!quizCompleted ? (
                  <>
                    {/* QUIZ HEADER PROGRESS */}
                    <div className="flex items-center justify-between border-b border-slate-150/50 pb-4 mb-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">
                          Active Recall Match
                        </span>
                        <h4 className="text-lg font-bold text-slate-800 font-display">
                          Uji Kosakata: {category === 'home' ? 'Peralatan Rumah' : category === 'office' ? 'Bisnis & Kantor' : 'Tempat Sosial'}
                        </h4>
                      </div>
                      
                      <button 
                        onClick={() => setQuizActive(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-semibold py-1 px-2.5 rounded-lg hover:bg-slate-100/55 border border-transparent hover:border-slate-150 transition"
                      >
                        Batal
                      </button>
                    </div>

                    {/* INTERACTIVE COMPREHENSION QUESTION */}
                    {quizQuestions[currentQuizIndex] && (
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          {/* Progress Ring Bar */}
                          <div className="w-full bg-slate-100 h-1.5 rounded-full mb-6 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full transition-all duration-300"
                              style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
                            ></div>
                          </div>

                          <div className="text-center py-6">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                              Pertanyaan {currentQuizIndex + 1} dari {quizQuestions.length}
                            </span>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight font-display">
                              "{quizQuestions[currentQuizIndex].word.english}"
                            </h3>
                            <div className="flex items-center justify-center space-x-1.5 mt-2">
                              <span className="text-xs font-bold font-mono text-slate-400 bg-slate-100/55 px-2.5 py-0.5 rounded-md border border-slate-200/45">
                                {quizQuestions[currentQuizIndex].word.phonetic}
                              </span>
                              <button 
                                onClick={() => speakWord(quizQuestions[currentQuizIndex].word.english)}
                                className="text-slate-300 hover:text-slate-500 transition-colors"
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            
                            <p className="text-sm font-medium text-slate-500 mt-4">
                              Apakah arti yang paling cocok untuk kosakata di atas?
                            </p>
                          </div>

                          {/* OPTION SLOTS */}
                          <div className="space-y-3 mt-4">
                            {quizQuestions[currentQuizIndex].options.map((option, idx) => {
                              const isSelected = quizQuestions[currentQuizIndex].userSelectedIndex === idx;
                              const isAnswered = quizQuestions[currentQuizIndex].userSelectedIndex !== null;
                              const isCorrect = quizQuestions[currentQuizIndex].correctIndex === idx;

                              let cardStyle = "border-slate-150 hover:bg-slate-50 hover:border-slate-300 text-slate-700";
                              if (isAnswered) {
                                if (isCorrect) {
                                  cardStyle = "bg-blue-50 border-blue-300 text-blue-800 font-bold shadow-xs";
                                } else if (isSelected) {
                                  cardStyle = "bg-red-50 border-red-200 text-red-800 font-bold";
                                } else {
                                  cardStyle = "opacity-50 border-slate-100 text-slate-400";
                                }
                              }

                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleSelectAnswer(idx)}
                                  disabled={isAnswered}
                                  className={`w-full text-left p-4 rounded-xl border font-bold text-sm transition-all duration-200 flex justify-between items-center ${cardStyle}`}
                                  id={`quiz_option_${idx}`}
                                >
                                  <span className="capitalize font-display">{option}</span>
                                  
                                  {isAnswered && isCorrect && (
                                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                                      Benar
                                    </span>
                                  )}
                                  {isAnswered && isSelected && !isCorrect && (
                                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                                      Salah
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* ADVANCE QUIZ BUTTON */}
                        <div className="mt-8 flex justify-end">
                          <button
                            onClick={advanceQuiz}
                            disabled={quizQuestions[currentQuizIndex].userSelectedIndex === null}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 disabled:opacity-45 text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                            id="quiz_next_btn"
                          >
                            <span>{currentQuizIndex === quizQuestions.length - 1 ? 'Hasil Akhir' : 'Lanjut'}</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // --- QUIZ ACHIEVED SUMMARY ---
                  <div className="text-center py-6 flex flex-col items-center justify-center space-y-5">
                    <div className="bg-amber-50 p-5 rounded-full text-amber-500 border border-amber-200/50 shadow-md">
                      <Trophy className="h-10 w-10 animate-bounce" id="gold_trophy_icon" />
                    </div>
                    
                    <div>
                      <h4 className="text-2xl font-black text-slate-900 font-display">Tantangan Kuis Selesai!</h4>
                      <p className="text-sm font-medium text-slate-500 mt-1 font-semibold">
                        Hebat, Anda telah menyegarkan ingatan mengenai kosakata hari ini.
                      </p>
                    </div>

                    <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 w-full max-w-xs flex justify-around items-center">
                      <div>
                        <span className="text-xs text-slate-400 block font-bold uppercase">Skor Tebakan</span>
                        <span className="text-2xl font-black text-blue-600 font-display">{quizScore * 20} / 100</span>
                      </div>
                      <div className="h-8 w-[1px] bg-slate-200"></div>
                      <div>
                        <span className="text-xs text-slate-400 block font-bold uppercase">Akurasi</span>
                        <span className="text-2xl font-black text-slate-700 font-display">{quizScore} / 5 Benar</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-semibold">
                      Lanjutkan latihan secara konstan untuk mengunci kosakata di atas secara permanen ke memori jangka panjang (Long-Term Memory).
                    </p>

                    <div className="flex space-x-3 w-full">
                      <button
                        onClick={launchQuickQuiz}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl text-xs flex justify-center items-center space-x-1.5 transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Mulai Kuis Baru</span>
                      </button>

                      <button
                        onClick={() => setQuizActive(false)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex justify-center items-center space-x-1 transition shadow-sm"
                      >
                        <span>Kembali Belajar</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </section>

      </main>

      {/* FOOTER BAR */}
      <footer className="bg-white/60 backdrop-blur-lg border-t border-white/40 py-6 mt-12 w-full text-center">
        <p className="text-xs text-slate-500 leading-normal font-semibold">
          Dibuat secara profesional untuk mempermudah hapalan bahasa Inggris harian Anda.
        </p>
        <p className="text-[10px] text-slate-450 mt-1 font-extrabold uppercase tracking-widest">
          Daily Vocab Deck • Day 1 (Home) • Day 2 (Office) • Day 3 (Others) • 50 Words Daily Goals
        </p>
      </footer>

      {/* CUSTOM CONFIRMATION MODAL (Safe for sandboxed iframes) */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900 font-display mb-2">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                {confirmDialog.message}
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition duration-150 cursor-pointer"
                >
                  {confirmDialog.cancelText || "Batal"}
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`flex-1 py-3 text-white font-bold rounded-xl text-xs transition duration-150 cursor-pointer ${
                    confirmDialog.isDanger 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {confirmDialog.confirmText || "Ya, Hapus"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SEARCH ERROR MODAL (Safe for sandboxed iframes, looks gorgeous and triggers on 'word not found') */}
      <AnimatePresence>
        {showSearchError && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-auto text-center flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-red-50 p-4 rounded-full text-red-500 border border-red-100 mb-4 h-12 w-12 flex items-center justify-center">
                <Search className="h-6 w-6 stroke-[2.5]" />
              </div>
              
              <h3 className="text-base font-bold text-slate-900 font-display mb-2">
                Kata Tidak Ditemukan
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                Kosakata "<span className="text-red-500 font-bold">{searchedTerm}</span>" tidak ditemukan di kategori mana pun. Silakan periksa ejaan atau cari kata lain!
              </p>
              
              <button
                type="button"
                onClick={() => setShowSearchError(false)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-xs transition duration-150 cursor-pointer shadow-sm shadow-blue-500/10"
              >
                Tutup & Kembali
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
