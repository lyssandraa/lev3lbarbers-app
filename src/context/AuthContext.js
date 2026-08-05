import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const { data } = await api.get('/auth/profile');
          setUser(data.user);
        }
      } catch (err) {
        // Only wipe the token on a real auth rejection — not on network blips
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          await AsyncStorage.removeItem('token');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Shared by anything that already has a token (password login, register,
  // PIN quick-switch) — stores it and fetches the full profile.
  const loginWithToken = async (token) => {
    await AsyncStorage.setItem('token', token);
    const { data: profileData } = await api.get('/auth/profile');
    setUser(profileData.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await loginWithToken(data.token);
  };

  const register = async (name, email, password, referralCode) => {
    const { data } = await api.post('/auth/register', { name, email, password, referralCode });
    await loginWithToken(data.token);
    return data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  const isShopUser  = ['STAFF', 'ADMIN', 'DEVELOPER'].includes(user?.role);
  const isAdmin     = ['ADMIN', 'DEVELOPER'].includes(user?.role);
  const isDeveloper = user?.role === 'DEVELOPER';

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, loginWithToken, register, logout, isShopUser, isAdmin, isDeveloper }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
