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
import type { Role, StudentClassroom, User } from '@/lib/types';

interface AuthResponse {
  user: User;
  classrooms?: StudentClassroom[];
}

interface AuthContextValue {
  user: User | null;
  classrooms: StudentClassroom[];
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  registerTeacher: (payload: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    schoolName: string;
  }) => Promise<User>;
  registerStudent: (payload: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    joinCode: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
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

  const registerTeacher = useCallback(
    async (payload: {
      firstName: string;
      lastName: string;
      username: string;
      password: string;
      schoolName: string;
    }) => {
      const data = await api<AuthResponse>('/api/auth/register/teacher', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setUser(data.user);
      setClassrooms([]);
      return data.user;
    },
    [],
  );

  const registerStudent = useCallback(
    async (payload: {
      firstName: string;
      lastName: string;
      username: string;
      password: string;
      joinCode: string;
    }) => {
      const data = await api<AuthResponse>('/api/auth/register/student', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setUser(data.user);
      const me = await api<AuthResponse>('/api/auth/me');
      setClassrooms(me.classrooms ?? []);
      return data.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setClassrooms([]);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      classrooms,
      loading,
      login,
      registerTeacher,
      registerStudent,
      logout,
      refresh: loadMe,
    }),
    [user, classrooms, loading, login, registerTeacher, registerStudent, logout, loadMe],
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
