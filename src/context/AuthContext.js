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

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('token', data.token);
    // login only returns token+role — fetch full profile
    const { data: profileData } = await api.get('/auth/profile');
    setUser(profileData.user);
  };

  const register = async (name, email, password, referralCode) => {
    const { data } = await api.post('/auth/register', { name, email, password, referralCode });
    await AsyncStorage.setItem('token', data.token);
    const { data: profileData } = await api.get('/auth/profile');
    setUser(profileData.user);
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
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, isShopUser, isAdmin, isDeveloper }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
