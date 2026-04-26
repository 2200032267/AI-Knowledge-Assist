// SessionStorage auth (JWT-like base64 payload) + localStorage "DB"

export const AUTH_SESSION_KEY = "session";
export const AUTH_TOKEN_KEY = "token";
export const AUTH_EXPIRES_KEY = "expires";
export const AUTH_USER_CACHE_KEY = "user_cache";
export const USERS_DB_KEY = "users";

// Simple password hash for demo ONLY.
export function hashPassword(pwd) {
  try {
    return btoa(pwd);
  } catch {
    return "";
  }
}

export function generateToken(userId, ttlMs = 24 * 60 * 60 * 1000) {
  const payload = { userId, exp: Date.now() + ttlMs };
  return btoa(JSON.stringify(payload));
}

export function verifyToken(token) {
  try {
    const payload = JSON.parse(atob(token));
    if (!payload?.userId || !payload?.exp) return null;
    if (payload.exp < Date.now()) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export function readUsersDb() {
  try {
    return JSON.parse(window.localStorage.getItem(USERS_DB_KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeUsersDb(users) {
  window.localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
}

export function getSession() {
  const token = window.sessionStorage.getItem(AUTH_TOKEN_KEY);
  const session = window.sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!token || !session) return null;

  const userId = verifyToken(token);
  if (!userId) return null;

  const expires = Number(window.sessionStorage.getItem(AUTH_EXPIRES_KEY) || 0);
  if (expires && expires < Date.now()) return null;

  return { userId, token, expires };
}

export function getCurrentUserFromSession() {
  const s = getSession();
  if (!s) return null;
  const users = readUsersDb();
  return users.find((u) => u.id === s.userId) || null;
}

export function ensureUserDataInitialized(userId, defaultSettings) {
  if (!window.localStorage.getItem(`settings_${userId}`)) {
    window.localStorage.setItem(`settings_${userId}`, JSON.stringify(defaultSettings));
  }
  if (!window.localStorage.getItem(`docs_${userId}`)) {
    window.localStorage.setItem(`docs_${userId}`, JSON.stringify([]));
  }
  if (!window.localStorage.getItem(`history_${userId}`)) {
    window.localStorage.setItem(`history_${userId}`, JSON.stringify([]));
  }
}

export function loginUserSession(user, defaultSettings) {
  const ttlMs = 24 * 60 * 60 * 1000;
  const token = generateToken(user.id, ttlMs);

  window.sessionStorage.setItem(AUTH_SESSION_KEY, user.id);
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  window.sessionStorage.setItem(AUTH_EXPIRES_KEY, String(Date.now() + ttlMs));
  window.sessionStorage.setItem(
    AUTH_USER_CACHE_KEY,
    JSON.stringify({ name: user.name, email: user.email })
  );

  ensureUserDataInitialized(user.id, defaultSettings);

  return { token, expires: Date.now() + ttlMs };
}

export function logoutUserSession() {
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_EXPIRES_KEY);
  window.sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
}

export function signup({ name, email, password }) {
  const users = readUsersDb();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (users.some((u) => String(u.email || "").toLowerCase() === normalizedEmail)) {
    return { ok: false, error: "Email already exists" };
  }

  const user = {
    id: `u${Date.now()}`,
    email: normalizedEmail,
    name: String(name || "").trim(),
    passwordHash: hashPassword(String(password || "")),
    createdAt: new Date().toISOString(),
  };

  writeUsersDb([...users, user]);
  return { ok: true, user };
}

export function login({ email, password }) {
  const users = readUsersDb();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = users.find((u) => String(u.email || "").toLowerCase() === normalizedEmail);

  if (!user) return { ok: false, error: "Invalid email or password" };
  if (user.passwordHash !== hashPassword(String(password || ""))) {
    return { ok: false, error: "Invalid email or password" };
  }

  return { ok: true, user };
}

export function oauthLogin(provider) {
  const users = readUsersDb();
  const now = Date.now();
  const user = {
    id: `oauth_${provider}_${now}`,
    email: `${provider}_${now}@example.com`,
    name: provider === "google" ? "Google User" : "GitHub User",
    passwordHash: "",
    createdAt: new Date().toISOString(),
    provider,
  };
  writeUsersDb([...users, user]);
  return user;
}
