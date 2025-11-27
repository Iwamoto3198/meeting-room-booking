import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // ページ読み込み時にログイン状態を復元
  useEffect(() => {
    const adminLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (adminLoggedIn === 'true') {
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  // ログイン
  const login = () => {
    setIsAdmin(true);
    sessionStorage.setItem('adminLoggedIn', 'true');
  };

  // ログアウト
  const logout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('adminLoggedIn');
  };

  const value = {
    isAdmin,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};