import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL } from '../config';
import { authFetch } from '../authFetch';

type Role = 'user' | 'assistant';

interface Bubble {
  id: string;
  role: Role;
  content: string;
  error?: boolean;
}

interface ChatTurn {
  role: Role;
  content: string;
}

interface ChatResult {
  reply: string;
  tools_used: string[];
  configured: boolean;
}

const SUGGESTIONS = [
  'How many on bench?',
  'Who is critical (91+ days)?',
  'Top skills on bench',
  'IFB pipeline status',
  'Headcount by location',
];

const INTRO: Bubble = {
  id: 'intro',
  role: 'assistant',
  content:
    'Hi! I can answer questions about your workforce data — headcount, aging, skills, pipeline, locations. Tap a suggestion below or type your own.',
};

let seq = 0;
const nextId = () => `b${++seq}`;

async function postChat(message: string, history: ChatTurn[]): Promise<ChatResult> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: history.slice(-12) }),
  });
  if (!response.ok) {
    let detail = 'Chat failed. Please try again.';
    try {
      const err = await response.json();
      if (typeof err?.detail === 'string') detail = err.detail;
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  return (await response.json()) as ChatResult;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Bubble[]>([INTRO]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<Bubble>>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, busy, scrollToEnd]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      setInput('');
      const userBubble: Bubble = { id: nextId(), role: 'user', content: text };
      const next = [...messages, userBubble];
      setMessages(next);
      setBusy(true);
      try {
        const history: ChatTurn[] = next
          .filter((m) => m.id !== INTRO.id)
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.content }));
        const res = await postChat(text, history);
        setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: res.reply }]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            error: true,
            content: err instanceof Error ? err.message : 'Something went wrong.',
          },
        ]);
      } finally {
        setBusy(false);
        scrollToEnd();
      }
    },
    [busy, messages, scrollToEnd]
  );

  const showSuggestions = messages.length <= 1 && !busy;

  const renderItem = ({ item }: { item: Bubble }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.bubbleRow,
          { alignItems: isUser ? 'flex-end' : 'flex-start' },
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
            item.error && styles.bubbleError,
          ]}
        >
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToEnd}
      />

      {busy && (
        <View style={styles.typingRow}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>Thinking…</Text>
            <ActivityIndicator size="small" color="#6366f1" />
          </View>
        </View>
      )}

      {showSuggestions && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestionChip}
              onPress={() => void send(s)}
              disabled={busy}
              accessibilityRole="button"
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about bench data…"
          placeholderTextColor="#8b93b8"
          maxLength={2000}
          editable={!busy}
          returnKeyType="send"
          onSubmitEditing={() => void send(input)}
          accessibilityLabel="Chat message"
        />
        <TouchableOpacity
          style={[styles.sendButton, (busy || !input.trim()) && styles.sendButtonDisabled]}
          onPress={() => void send(input)}
          disabled={busy || !input.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8eaf6' },
  listContent: { padding: 14, paddingBottom: 8, gap: 10 },
  bubbleRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
  },
  bubbleUser: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 14,
  },
  bubbleAssistant: {
    backgroundColor: '#f2f4fb',
    shadowColor: '#d4d9ec',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleError: { backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#f5b5bd' },
  bubbleText: { fontSize: 13.5, lineHeight: 20, color: '#1e293b' },
  bubbleTextUser: { color: '#ffffff' },
  typingRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 6 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f2f4fb',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  typingText: { fontSize: 12.5, color: '#64748b' },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  suggestionChip: {
    backgroundColor: '#eef0fa',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#d4d9ec',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  suggestionText: { fontSize: 11.5, fontWeight: '600', color: '#4f46e5' },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(163,177,198,.25)',
    backgroundColor: '#e8eaf6',
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderRadius: 10,
    backgroundColor: '#e8eaf6',
    fontSize: 14,
    color: '#1e293b',
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  sendButton: {
    width: 46,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#b0b8d8',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  sendButtonDisabled: { backgroundColor: '#c7cdf0' },
  sendIcon: { color: '#ffffff', fontSize: 17 },
});
