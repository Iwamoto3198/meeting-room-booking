import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BlockedDatesManager from '../components/BlockedDatesManager';
import BookingsListManager from '../components/BookingsListManager';
import RoomsManager from '../components/RoomsManager';
import SystemSettings from '../components/SystemSettings';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');

  const handleLogout = () => {
    if (window.confirm('ログアウトしますか?')) {
      logout();
      navigate('/admin/login');
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>管理者ダッシュボード</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/')} className="home-button">
            トップページ
          </button>
          <button onClick={handleLogout} className="logout-button">
            ログアウト
          </button>
        </div>
      </header>

      <nav className="admin-nav">
        <button
          className={`nav-tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          予約一覧
        </button>
        <button
          className={`nav-tab ${activeTab === 'blocked-dates' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocked-dates')}
        >
          予約不可日管理
        </button>
        <button
          className={`nav-tab ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          会議室管理
        </button>
        <button
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          システム設定
        </button>
      </nav>

      <div className="admin-content">
        {activeTab === 'bookings' && <BookingsListManager />}
        {activeTab === 'blocked-dates' && <BlockedDatesManager />}
        {activeTab === 'rooms' && <RoomsManager />}
        {activeTab === 'settings' && <SystemSettings />}
      </div>
    </div>
  );
}

export default AdminDashboard;