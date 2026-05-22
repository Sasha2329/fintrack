export interface UserSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'user' | 'admin';
  };
}

const SESSION_KEY = 'financeflow_session';

export function saveSession(session: UserSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getStoredSession(): UserSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
