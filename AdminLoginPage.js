import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AdminLoginPage.css';

function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAdmin } = useAuth();

  // 既にログイン済みの場合はダッシュボードへリダイレクト
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Firestoreから管理者パスワードを取得
      const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
      
      if (!settingsDoc.exists()) {
        setError('設定データが見つかりません。初期データを投入してください。');
        setLoading(false);
        return;
      }

      const adminPassword = settingsDoc.data().adminPassword;

      // パスワード照合
      if (password === adminPassword) {
        login();
        navigate('/admin/dashboard');
      } else {
        setError('パスワードが正しくありません。');
        setPassword('');
      }
    } catch (err) {
      console.error('ログインエラー:', err);
      setError('ログイン処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h1 className="admin-login-title">管理者ログイン</h1>
        
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="admin-login-footer">
          <button 
            onClick={handleBackToHome}
            className="back-button"
            disabled={loading}
          >
            トップページに戻る
          </button>
          <p className="password-hint">
            初期パスワード: admin123
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;