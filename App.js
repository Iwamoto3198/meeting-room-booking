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

/**
 * ProtectedRoute - 管理者専用ルートの保護コンポーネント
 * 
 * このコンポーネントは、管理者のみがアクセスできるページを保護します。
 * 管理者でない場合は、自動的にログインページにリダイレクトします。
 */
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
            <Route path="/" element={<RoomSelectionPage />} />
            <Route path="/calendar/:roomId" element={<HomePage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/my-booking" element={<MyBookingPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/init-data" element={<InitDataPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;