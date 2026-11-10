import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, onAuthExpired } from '@/lib/api';
import type { Role, StudentClassroom, UpdateProfilePayload, User } from '@/lib/types';

interface AuthResponse {
  user: User;
  classrooms?: StudentClassroom[];
}

interface AuthContextValue {
  user: User | null;
  classrooms: StudentClassroom[];
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [classrooms, setClassrooms] = useState<StudentClassroom[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const data = await api<AuthResponse>('/api/auth/me');
      setUser(data.user);
      setClassrooms(data.classrooms ?? []);
    } catch {
      setUser(null);
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(
    () =>
      onAuthExpired(() => {
        setUser(null);
        setClassrooms([]);
      }),
    [],
  );

  const login = useCallback(async (username: string, password: string) => {
    const data = await api<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
    const me = await api<AuthResponse>('/api/auth/me');
    setClassrooms(me.classrooms ?? []);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setClassrooms([]);
    }
  }, []);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload) => {
      const data = await api<{ user: User }>('/api/auth/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api<{ ok: true }>('/api/auth/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      classrooms,
      loading,
      login,
      logout,
      updateProfile,
      changePassword,
      refresh: loadMe,
    }),
    [user, classrooms, loading, login, logout, updateProfile, changePassword, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak.');
  return context;
}

export function isTeacher(role: Role | undefined) {
  return role === 'TEACHER';
}
