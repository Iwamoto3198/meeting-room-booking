import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RoomSelectionPage from './pages/RoomSelectionPage';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import MyBookingPage from './pages/MyBookingPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import InitDataPage from './pages/InitDataPage';

// 管理者専用ルートの保護コンポーネント
const ProtectedRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>読み込み中...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* 会議室選択ページ（新規・トップページ） */}
            <Route path="/" element={<RoomSelectionPage />} />
            
            {/* 会議室別カレンダーページ（変更） */}
            <Route path="/calendar/:roomId" element={<HomePage />} />
            
            {/* 一般ユーザー向けページ */}
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/my-booking" element={<MyBookingPage />} />
            
            {/* 管理者ログインページ */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            
            {/* 管理者専用ページ（保護されたルート） */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* 開発用ページ */}
            <Route path="/init-data" element={<InitDataPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;