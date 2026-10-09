import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  removeStoredToken,
  setOnUnauthorizedCallback,
} from '../api/apiClient';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    removeStoredToken();
    setUser(null);
  }, []);

  useEffect(() => {
    // Restore authentication state from localStorage on initial load / refresh
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      const normalizedUser = {
        ...storedUser,
        id: storedUser.id || storedUser.userId,
        userId: storedUser.userId || storedUser.id,
      };
      setUser(normalizedUser);
    } else {
      removeStoredToken();
      setUser(null);
    }
    setLoading(false);

    // Register callback when 401 Unauthorized occurs on protected requests
    setOnUnauthorizedCallback(() => {
      logout();
    });
  }, [logout]);

  const login = async (credentials) => {
    const authData = await authApi.login(credentials);
    // authData contains: { token, tokenType, userId, email, fullName, roles }
    setStoredToken(authData.token);
    const userInfo = {
      id: authData.userId,
      userId: authData.userId,
      email: authData.email,
      fullName: authData.fullName,
      roles: authData.roles,
    };
    setStoredUser(userInfo);
    setUser(userInfo);
    return authData;
  };

  const register = async (userData) => {
    const authData = await authApi.register(userData);
    return authData;
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
