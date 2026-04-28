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
} from 'react-native';
import { useRef, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getBotReply } from '@/services/chatbot';
import { TEAL, BSU, useAppTheme, AppTheme } from '@/constants/theme';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  suggestions?: string[];
};

const WELCOME: Message = {
  id: 'welcome',
  sender: 'bot',
  text: "Hi there! 👋 I'm your BSU CBOO Payroll Assistant. Ask me anything about your payslips, salary, announcements, or account.",
  suggestions: [
    'How do I view my payslips?',
    'How do I download a payslip?',
    'How do I change my password?',
    'What can you help with?',
  ],
};

let msgCounter = 0;
function uid() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const theme = useAppTheme();
  const styles = makeStyles(theme);

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  const firstName = user?.first_name ?? 'Employee';

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: uid(), sender: 'user', text: trimmed };
    setMessages((prev) => [userMsg, ...prev]);
    setInput('');
    setIsTyping(true);

    // Simulate brief typing delay
    setTimeout(() => {
      const { response, suggestions } = getBotReply(trimmed);
      const botMsg: Message = { id: uid(), sender: 'bot', text: response, suggestions };
      setMessages((prev) => [botMsg, ...prev]);
      setIsTyping(false);
    }, 700);
  }, []);

  function renderItem({ item }: { item: Message }) {
    const isBot = item.sender === 'bot';
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
            <View style={[styles.bubble, styles.botBubble]}>
              <Text style={styles.botText}>{item.text}</Text>
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

        {isBot && item.suggestions && item.suggestions.length > 0 && (
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
        <View style={styles.onlineDot} />
      </View>

      {/* Messages — inverted so newest is at the bottom */}
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
          editable={!isTyping}
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

function makeStyles(t: AppTheme) {
  const STATUS_TOP = Platform.OS === 'ios' ? 56 : 40;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },

    /* ── Header ── */
    header: {
      paddingTop: STATUS_TOP,
      paddingBottom: 14,
      paddingHorizontal: 16,
      backgroundColor: TEAL.light,
      borderBottomWidth: 1,
      borderBottomColor: TEAL.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bsuLogo: { width: 44, height: 44 },
    appHeading: { height: 30, width: 110 },
    headerSub: { fontSize: 11, color: TEAL.darker, fontWeight: '500', marginTop: 1 },
    onlineDot: {
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: '#22c55e',
      borderWidth: 2, borderColor: TEAL.light,
    },

    /* ── List ── */
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

    /* ── Quick-reply chips ── */
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

    /* ── Input bar ── */
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
