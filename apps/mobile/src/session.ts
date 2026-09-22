import AsyncStorage from "@react-native-async-storage/async-storage";

export type OrgSettings = {
  name: string;
  slug: string;
  industry: string;
  app_name: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  unit_label: string;
  settings_json: Record<string, unknown>;
};

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  org_id: number;
  permissions: string[];
  organization: OrgSettings | null;
};

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";

let token: string | null = null;
let user: SessionUser | null = null;
const listeners = new Set<(loggedIn: boolean) => void>();

export function subscribeAuth(fn: (loggedIn: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(loggedIn: boolean) {
  listeners.forEach((fn) => fn(loggedIn));
}

export async function loadSession(): Promise<boolean> {
  try {
    const [t, u] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    token = t;
    user = u ? (JSON.parse(u) as SessionUser) : null;
    return !!token;
  } catch {
    token = null;
    user = null;
    return false;
  }
}

export function getToken(): string | null {
  return token;
}

export function getSessionUser(): SessionUser | null {
  return user;
}

export function isLoggedIn(): boolean {
  return !!token;
}

export async function setSession(newToken: string, newUser: SessionUser): Promise<void> {
  token = newToken;
  user = newUser;
  await AsyncStorage.setItem(TOKEN_KEY, newToken);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
  emit(true);
}

export async function clearSession(): Promise<void> {
  token = null;
  user = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  emit(false);
}
