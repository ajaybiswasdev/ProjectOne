import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../config";
import { setSession, type SessionUser } from "../session";

type LoginResult = {
  access_token: string;
  role: string;
  org_id: number;
  permissions: string[];
};

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Enter username and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(err.detail || "Login failed");
      }
      const data: LoginResult = await res.json();

      let sessionUser: SessionUser;
      const meRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${data.access_token}` },
      });
      if (meRes.ok) {
        sessionUser = (await meRes.json()) as SessionUser;
      } else {
        sessionUser = {
          id: 0,
          username: username.trim(),
          email: "",
          role: data.role,
          org_id: data.org_id,
          permissions: data.permissions || [],
          organization: null,
        };
      }
      await setSession(data.access_token, sessionUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>🔒</Text>
        </View>
        <Text style={styles.title}>Bench Dashboard</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="admin"
          placeholderTextColor="#a0aec0"
          editable={!loading}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#a0aec0"
          editable={!loading}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityLabel="Sign in"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#e8eaf6",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#e8eaf6",
    borderRadius: 20,
    padding: 32,
    shadowColor: "#b0b8d8",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  iconText: { fontSize: 24 },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#a0aec0",
    textAlign: "center",
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: "rgba(233,123,138,.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#b5364a",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#a0aec0",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: "#e8eaf6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1e293b",
    shadowColor: "#b0b8d8",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  btn: {
    marginTop: 24,
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#b0b8d8",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
