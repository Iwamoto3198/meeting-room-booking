//アプリ全体のルーティング（URL と表示するページの紐付け）を管理

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import MyBookingPage from './pages/MyBookingPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import InitDataPage from './pages/InitDataPage';

//ルート一覧
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 予約者向けページ */}
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/my-booking" element={<MyBookingPage />} />
          
          {/* 管理者向けページ */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* 開発用ページ */}
          <Route path="/init-data" element={<InitDataPage />} /> //
        </Routes>
      </div>
    </Router>
  );
}

export default App;


