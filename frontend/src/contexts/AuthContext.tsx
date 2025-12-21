import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, childrenAPI } from '../services/api';
import type { User, ChildProfile, ChildSession } from '../types';

interface AuthContextType {
  user: User | null;
  childSession: ChildSession | null;
  children: ChildProfile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  startChildSession: (childId: string) => Promise<void>;
  endChildSession: () => void;
  refreshChildren: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [childSession, setChildSession] = useState<ChildSession | null>(null);
  const [childrenList, setChildrenList] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await authAPI.getMe();
          setUser(userData);
          await loadChildren();
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loadChildren = async () => {
    try {
      const childrenData = await childrenAPI.getAll();
      setChildrenList(childrenData);
    } catch (error) {
      console.error('Failed to load children:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    localStorage.setItem('token', response.access_token);
    setUser(response.user);
    await loadChildren();
  };

  const signup = async (email: string, password: string) => {
    const response = await authAPI.signup(email, password);
    localStorage.setItem('token', response.access_token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('childToken');
    setUser(null);
    setChildSession(null);
    setChildrenList([]);
  };

  const startChildSession = async (childId: string) => {
    const session = await authAPI.createChildSession(childId);
    localStorage.setItem('childToken', session.access_token);
    localStorage.setItem('token', session.access_token); // Use child token for API calls
    setChildSession(session);
  };

  const endChildSession = () => {
    const parentToken = localStorage.getItem('token');
    localStorage.removeItem('childToken');
    if (parentToken) {
      localStorage.setItem('token', parentToken);
    }
    setChildSession(null);
  };

  const refreshChildren = async () => {
    await loadChildren();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        childSession,
        children: childrenList,
        loading,
        login,
        signup,
        logout,
        startChildSession,
        endChildSession,
        refreshChildren,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};