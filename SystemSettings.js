import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import '../styles/SystemSettings.css';

function SystemSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // パスワード変更用
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 営業時間・予約設定用
  const [businessData, setBusinessData] = useState({
    businessStartTime: '',
    businessEndTime: '',
    bookingIntervalMinutes: '',
    maxBookingDays: ''
  });
  const [businessError, setBusinessError] = useState('');
  const [businessSuccess, setBusinessSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings(data);
        setBusinessData({
          businessStartTime: data.businessStartTime,
          businessEndTime: data.businessEndTime,
          bookingIntervalMinutes: data.bookingIntervalMinutes,
          maxBookingDays: data.maxBookingDays
        });
      }
    } catch (error) {
      console.error('設定取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // パスワード変更
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // バリデーション
    if (passwordData.currentPassword !== settings.adminPassword) {
      setPasswordError('現在のパスワードが正しくありません');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('新しいパスワードは6文字以上で入力してください');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'config'), {
        adminPassword: passwordData.newPassword
      });
      
      setPasswordSuccess('パスワードを変更しました');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      fetchSettings();

    } catch (error) {
      console.error('パスワード変更エラー:', error);
      setPasswordError('パスワードの変更に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 営業時間・予約設定変更
  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    setBusinessError('');
    setBusinessSuccess('');

    // バリデーション
    if (businessData.businessStartTime >= businessData.businessEndTime) {
      setBusinessError('終了時刻は開始時刻より後にしてください');
      return;
    }
    if (![15, 30, 60].includes(parseInt(businessData.bookingIntervalMinutes))) {
      setBusinessError('予約単位は15分、30分、60分のいずれかを選択してください');
      return;
    }
    if (businessData.maxBookingDays < 1 || businessData.maxBookingDays > 365) {
      setBusinessError('予約可能期間は1〜365日の間で設定してください');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'config'), {
        businessStartTime: businessData.businessStartTime,
        businessEndTime: businessData.businessEndTime,
        bookingIntervalMinutes: parseInt(businessData.bookingIntervalMinutes),
        maxBookingDays: parseInt(businessData.maxBookingDays)
      });
      
      setBusinessSuccess('設定を更新しました');
      fetchSettings();

    } catch (error) {
      console.error('設定更新エラー:', error);
      setBusinessError('設定の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="system-settings-container">
      <h2>システム設定</h2>

      {/* パスワードの変更 */}
      <div className="settings-section">
        <h3>管理者パスワード変更</h3>
        <form onSubmit={handlePasswordSubmit} className="settings-form">
          <div className="form-group">
            <label>現在のパスワード *</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
              required
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>新しいパスワード *</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
              placeholder="6文字以上"
              required
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>新しいパスワード（確認） *</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              required
              disabled={saving}
            />
          </div>

          {passwordError && (
            <div className="error-message">{passwordError}</div>
          )}
          {passwordSuccess && (
            <div className="success-message">{passwordSuccess}</div>
          )}

          <button type="submit" className="submit-button" disabled={saving}>
            {saving ? '変更中...' : 'パスワードを変更'}
          </button>
        </form>
      </div>

      {/* 営業時間・予約設定 */}
      <div className="settings-section">
        <h3>営業時間・予約設定</h3>
        <form onSubmit={handleBusinessSubmit} className="settings-form">
          <div className="form-row">
            <div className="form-group">
              <label>営業開始時刻 *</label>
              <input
                type="time"
                value={businessData.businessStartTime}
                onChange={(e) => setBusinessData({...businessData, businessStartTime: e.target.value})}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>営業終了時刻 *</label>
              <input
                type="time"
                value={businessData.businessEndTime}
                onChange={(e) => setBusinessData({...businessData, businessEndTime: e.target.value})}
                required
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>予約単位 *</label>
              <select
                value={businessData.bookingIntervalMinutes}
                onChange={(e) => setBusinessData({...businessData, bookingIntervalMinutes: e.target.value})}
                required
                disabled={saving}
              >
                <option value="15">15分</option>
                <option value="30">30分</option>
                <option value="60">60分</option>
              </select>
            </div>

            <div className="form-group">
              <label>予約可能期間（日数） *</label>
              <input
                type="number"
                value={businessData.maxBookingDays}
                onChange={(e) => setBusinessData({...businessData, maxBookingDays: e.target.value})}
                min="1"
                max="365"
                required
                disabled={saving}
              />
              <small>1〜365日で設定</small>
            </div>
          </div>

          {businessError && (
            <div className="error-message">{businessError}</div>
          )}
          {businessSuccess && (
            <div className="success-message">{businessSuccess}</div>
          )}

          <button type="submit" className="submit-button" disabled={saving}>
            {saving ? '更新中...' : '設定を更新'}
          </button>
        </form>
      </div>

      {/* 現在の設定表示 */}
      <div className="settings-section current-settings">
        <h3>現在の設定</h3>
        <div className="settings-info">
          <div className="info-item">
            <span className="info-label">営業時間:</span>
            <span className="info-value">{settings.businessStartTime} 〜 {settings.businessEndTime}</span>
          </div>
          <div className="info-item">
            <span className="info-label">予約単位:</span>
            <span className="info-value">{settings.bookingIntervalMinutes}分</span>
          </div>
          <div className="info-item">
            <span className="info-label">予約可能期間:</span>
            <span className="info-value">{settings.maxBookingDays}日間</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemSettings;