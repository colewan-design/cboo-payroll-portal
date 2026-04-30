import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, type User } from '@/context/AuthContext';
import { getBotReply } from '@/services/chatbot';
import { TEAL, useAppTheme, AppTheme } from '@/constants/theme';
import {
  isModelDownloaded,
  downloadModel,
  loadModel,
  isModelLoaded,
  cleanLegacyModels,
  chat as llmChat,
  type LLMMessage,
} from '@/services/llm';
import { buildEmployeeContext } from '@/services/chatContext';
import { fetchManual, extractRelevantSection } from '@/services/manualContext';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  suggestions?: string[];
  streaming?: boolean;
};

type ModelStatus =
  | 'checking'
  | 'need_download'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error';

const WELCOME: Message = {
  id: 'welcome',
  sender: 'bot',
  text: "Hi there! I'm your BSU CBOO Payroll Assistant. Ask me anything about your payslips, salary, deductions, or account.",
  suggestions: [
    'What are my deductions?',
    'How do I view my payslips?',
    'How do I download a payslip?',
    'What can you help with?',
  ],
};

let msgCounter = 0;
function uid() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

function buildSystemPrompt(user: User | null, employeeContext?: string, manualSection?: string): string {
  const name = user
    ? [user.first_name, user.middle_name, user.last_name, user.suffix]
        .filter(Boolean)
        .join(' ')
    : 'Unknown';
  const payslipSection = employeeContext
    ? `\n\n${employeeContext}`
    : '';
  const manualNote = manualSection
    ? `\n\nRelevant documentation:\n${manualSection}`
    : '';

  const dataNote = employeeContext
    ? 'The employee\'s actual payroll records are provided below. Use them to give specific, accurate answers with real figures. Never say you lack access to data.'
    : 'No payroll records loaded yet. Tell the employee their data is still loading and to try again shortly.';

  return `You are a chat assistant for Benguet State University (BSU) CBOO payroll. Keep every reply under 3 sentences. Lead with the direct answer — no preamble, no filler, no greetings, no sign-offs, no "Best regards", no letter formatting. Use a short bullet list only when listing 3 or more distinct items. If a question needs more detail, give the key fact first then one supporting sentence.

${dataNote}

Employee: ${name} | ID: ${user?.employee_id ?? '—'} | Email: ${user?.email ?? '—'}

Deductions: GSIS (~9% of basic salary), PhilHealth (salary bracket), Pag-IBIG (₱100 or 2%), Withholding Tax (BIR table).
Pay: Basic (Salary Grade & Step) + PERA ₱2,000 + allowances = Gross. Gross − deductions = Net Pay.
App: Payslips tab → view/download payslips. News tab → memos/updates. Profile tab → change password/sign out.${payslipSection}${manualNote}`;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('checking');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [contextReady, setContextReady] = useState(false);

  // Tracks conversation history fed to the LLM (separate from UI messages)
  const llmHistoryRef = useRef<LLMMessage[]>([]);
  const employeeContextRef = useRef<string>('');
  const manualRef = useRef<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const firstName = user?.first_name ?? 'Employee';

  useEffect(() => {
    // Fetch all employee data in parallel with model init
    async function fetchEmployeeContext() {
      try {
        if (!user) return;
        employeeContextRef.current = await buildEmployeeContext(user);
      } catch {
        // context stays empty — model will tell user to retry
      } finally {
        setContextReady(true);
      }
    }

    async function initModel() {
      try {
        if (isModelLoaded()) {
          setModelStatus('ready');
          return;
        }
        const downloaded = await isModelDownloaded();
        if (downloaded) {
          setModelStatus('loading');
          await loadModel();
          cleanLegacyModels();
          setModelStatus('ready');
        } else {
          setModelStatus('need_download');
        }
      } catch {
        setModelStatus('need_download');
      }
    }

    fetchEmployeeContext();
    initModel();
    fetchManual().then(m => { manualRef.current = m; }).catch(() => {});
  }, [user?.employee_id]);

  async function handleDownload() {
    try {
      setModelStatus('downloading');
      setDownloadProgress(0);
      await downloadModel(setDownloadProgress);
      setModelStatus('loading');
      await loadModel();
      setModelStatus('ready');
    } catch {
      setModelStatus('error');
    }
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: Message = { id: uid(), sender: 'user', text: trimmed };
      setMessages((prev) => [userMsg, ...prev]);
      setInput('');

      // Fall back to rule-based bot when LLM not ready
      if (modelStatus !== 'ready') {
        setIsTyping(true);
        setTimeout(() => {
          const { response, suggestions } = getBotReply(trimmed);
          setMessages((prev) => [
            { id: uid(), sender: 'bot', text: response, suggestions },
            ...prev,
          ]);
          setIsTyping(false);
        }, 600);
        return;
      }

      // Add user turn to LLM history
      llmHistoryRef.current = [
        ...llmHistoryRef.current,
        { role: 'user', content: trimmed },
      ];
      // Keep last 16 messages (8 turns) — fits comfortably within the 4096-token context
      if (llmHistoryRef.current.length > 16)
        llmHistoryRef.current = llmHistoryRef.current.slice(-16);

      const manualSection = manualRef.current
        ? extractRelevantSection(manualRef.current, trimmed) ?? undefined
        : undefined;
      const llmMsgs: LLMMessage[] = [
        { role: 'system', content: buildSystemPrompt(user, employeeContextRef.current || undefined, manualSection) },
        ...llmHistoryRef.current,
      ];

      // Add an empty streaming message that fills in as tokens arrive
      const botMsgId = uid();
      setMessages((prev) => [
        { id: botMsgId, sender: 'bot', text: '', streaming: true },
        ...prev,
      ]);

      let accumulated = '';
      try {
        await llmChat(llmMsgs, (token) => {
          accumulated += token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId ? { ...m, text: accumulated } : m,
            ),
          );
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, streaming: false } : m,
          ),
        );

        if (accumulated)
          llmHistoryRef.current = [
            ...llmHistoryRef.current,
            { role: 'assistant', content: accumulated },
          ];
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  text:
                    accumulated ||
                    "Sorry, I couldn't generate a response. Please try again.",
                  streaming: false,
                }
              : m,
          ),
        );
        // Context was released by llm.ts on error — reload it silently
        llmHistoryRef.current = [];
        setModelStatus('loading');
        loadModel()
          .then(() => setModelStatus('ready'))
          .catch(() => setModelStatus('error'));
      }
    },
    [modelStatus, user],
  );

  function renderItem({ item }: { item: Message }) {
    const isBot = item.sender === 'bot';
    const showTypingDots = isBot && item.streaming && !item.text;

    return (
      <View style={styles.messageGroup}>
        {isBot && (
          <View style={styles.botRow}>
            <View style={styles.botAvatar}>
              <Image
                source={require('@/assets/images/bsu-logo.png')}
                style={styles.botAvatarImg}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.bubble, styles.botBubble, showTypingDots && styles.typingBubble]}>
              {showTypingDots ? (
                <Text style={styles.typingDots}>• • •</Text>
              ) : (
                <Text style={styles.botText}>
                  {item.text}
                  {item.streaming ? '▋' : ''}
                </Text>
              )}
            </View>
          </View>
        )}

        {!isBot && (
          <View style={styles.userRow}>
            <View style={[styles.bubble, styles.userBubble]}>
              <Text style={styles.userText}>{item.text}</Text>
            </View>
          </View>
        )}

        {isBot && !item.streaming && item.suggestions && item.suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {item.suggestions.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                onPress={() => sendMessage(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 24}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/bsu-logo.png')}
            style={styles.bsuLogo}
            resizeMode="contain"
          />
          <View>
            <Image
              source={require('@/assets/images/App Heading.png')}
              style={styles.appHeading}
              resizeMode="contain"
            />
            <Text style={styles.headerSub}>Payroll Assistant · {firstName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.restartBtn}
            onPress={() => {
              setMessages([WELCOME]);
              llmHistoryRef.current = [];
            }}
            hitSlop={8}
          >
            <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <View style={[styles.statusDot, modelStatus === 'ready' && styles.statusDotReady]} />
        </View>
      </View>

      {/* AI model status banner */}
      <ModelBanner
        status={modelStatus}
        progress={downloadProgress}
        onDownload={handleDownload}
        onRetry={handleDownload}
        theme={theme}
      />

      {/* Data loading banner — shown only when model is ready but context is still fetching */}
      {modelStatus === 'ready' && !contextReady && (
        <View style={[bannerStyles.bar, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
          <ActivityIndicator size="small" color={TEAL.primary} />
          <Text style={[bannerStyles.text, { color: theme.textMuted }]}>
            Loading your payroll data…
          </Text>
        </View>
      )}

      {/* Messages — inverted so newest is at bottom */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isTyping ? (
            <View style={[styles.botRow, { marginBottom: 8 }]}>
              <View style={styles.botAvatar}>
                <Image
                  source={require('@/assets/images/bsu-logo.png')}
                  style={styles.botAvatarImg}
                  resizeMode="contain"
                />
              </View>
              <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
                <Text style={styles.typingDots}>• • •</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything…"
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
          multiline
          maxLength={300}
          editable={!isTyping && modelStatus !== 'downloading' && modelStatus !== 'loading'}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isTyping) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── AI Model Banner ──────────────────────────────────────────────────────────

function ModelBanner({
  status,
  progress,
  onDownload,
  onRetry,
  theme,
}: {
  status: ModelStatus;
  progress: number;
  onDownload: () => void;
  onRetry: () => void;
  theme: AppTheme;
}) {
  if (status === 'ready' || status === 'checking') return null;

  if (status === 'need_download') {
    return (
      <TouchableOpacity
        style={[bannerStyles.bar, { backgroundColor: theme.primaryLight, borderBottomColor: theme.primaryBorder }]}
        onPress={onDownload}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles-outline" size={15} color={TEAL.primary} />
        <Text style={[bannerStyles.text, { color: TEAL.primary }]}>
          Enable AI Assistant
        </Text>
        <Text style={[bannerStyles.sub, { color: TEAL.dark }]}>~1.1 GB download</Text>
        <Ionicons name="chevron-forward" size={14} color={TEAL.dark} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
    );
  }

  if (status === 'downloading') {
    const pct = Math.round(progress * 100);
    return (
      <View style={[bannerStyles.bar, { backgroundColor: theme.primaryLight, borderBottomColor: theme.primaryBorder }]}>
        <ActivityIndicator size="small" color={TEAL.primary} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[bannerStyles.text, { color: TEAL.primary }]}>
            Downloading AI model… {pct}%
          </Text>
          <View style={[bannerStyles.track, { backgroundColor: theme.cardBorder }]}>
            <View style={[bannerStyles.fill, { width: `${pct}%` as any }]} />
          </View>
        </View>
      </View>
    );
  }

  if (status === 'loading') {
    return (
      <View style={[bannerStyles.bar, { backgroundColor: theme.primaryLight, borderBottomColor: theme.primaryBorder }]}>
        <ActivityIndicator size="small" color={TEAL.primary} />
        <Text style={[bannerStyles.text, { color: TEAL.primary }]}>
          Loading AI model…
        </Text>
      </View>
    );
  }

  // error
  return (
    <TouchableOpacity
      style={[bannerStyles.bar, { backgroundColor: '#fef2f2', borderBottomColor: '#fecaca' }]}
      onPress={onRetry}
      activeOpacity={0.8}
    >
      <Ionicons name="warning-outline" size={15} color="#dc2626" />
      <Text style={[bannerStyles.text, { color: '#dc2626' }]}>AI unavailable · tap to retry</Text>
    </TouchableOpacity>
  );
}

const bannerStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
  },
  text: { fontSize: 13, fontWeight: '600' },
  sub: { fontSize: 11, fontWeight: '400' },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: TEAL.primary,
    borderRadius: 2,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(t: AppTheme) {
  const STATUS_TOP = Platform.OS === 'ios' ? 56 : 40;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },

    header: {
      paddingTop: STATUS_TOP,
      paddingBottom: 14,
      paddingHorizontal: 16,
      backgroundColor: TEAL.primary,
      borderBottomWidth: 1,
      borderBottomColor: TEAL.dark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bsuLogo: { width: 44, height: 44 },
    appHeading: { height: 30, width: 110 },
    headerSub: { fontSize: 11, color: TEAL.textSub, fontWeight: '500', marginTop: 1 },

    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    restartBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
    },
    statusDot: {
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: '#d1d5db',
      borderWidth: 2, borderColor: TEAL.primary,
    },
    statusDotReady: { backgroundColor: '#22c55e' },

    listContent: { paddingHorizontal: 14, paddingVertical: 16, gap: 4 },
    messageGroup: { marginBottom: 4 },

    botRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
    botAvatar: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: TEAL.light,
      borderWidth: 1, borderColor: TEAL.border,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    },
    botAvatarImg: { width: 26, height: 26 },

    userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },

    bubble: {
      maxWidth: '78%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    botBubble: {
      backgroundColor: t.surface,
      borderWidth: 0.5,
      borderColor: t.cardBorder,
      borderBottomLeftRadius: 4,
    },
    userBubble: {
      backgroundColor: TEAL.primary,
      borderBottomRightRadius: 4,
    },
    botText: { fontSize: 14, color: t.textPrimary, lineHeight: 21 },
    userText: { fontSize: 14, color: '#fff', lineHeight: 21 },

    typingBubble: { paddingVertical: 12, paddingHorizontal: 16 },
    typingDots: { fontSize: 16, color: t.textMuted, letterSpacing: 4 },

    suggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 6,
      marginLeft: 38,
    },
    chip: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: TEAL.border,
      backgroundColor: t.bg,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: { fontSize: 12, color: TEAL.primary, fontWeight: '600' },

    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      borderTopWidth: 0.5,
      borderTopColor: t.cardBorder,
      backgroundColor: t.bg,
    },
    input: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      borderWidth: 0.5,
      borderColor: t.inputBorder,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: t.textPrimary,
      backgroundColor: t.inputBg,
    },
    sendBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: TEAL.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
}
