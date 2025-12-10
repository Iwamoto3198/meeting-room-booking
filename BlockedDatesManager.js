import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import '../styles/BlockedDatesManager.css';

function BlockedDatesManager() {
  const [blockedDates, setBlockedDates] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    date: '',
    type: 'all', 
    roomId: '',
    reason: ''
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 会議室取得
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsData = roomsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.order - b.order);
      setRooms(roomsData);

      // 予約不可日取得
      const blockedSnapshot = await getDocs(collection(db, 'blockedDates'));
      const blockedData = blockedSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setBlockedDates(blockedData);

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // バリデーション
    if (!formData.date) {
      setFormError('日付を入力してください');
      return;
    }

    if (formData.type === 'specific' && !formData.roomId) {
      setFormError('会議室を選択してください');
      return;
    }

    // 過去日チェック
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setFormError('過去の日付は設定できません');
      return;
    }

    try {
      // 重複チェック
      const duplicate = blockedDates.find(
        b => b.date === formData.date && 
             b.type === formData.type && 
             (formData.type === 'all' || b.roomId === formData.roomId)
      );

      if (duplicate) {
        setFormError('既に同じ設定が存在します');
        return;
      }

      // 予約不可日の追加
      const newBlocked = {
        date: formData.date,
        type: formData.type,
        reason: formData.reason.trim(),
        createdAt: new Date()
      };

      if (formData.type === 'specific') {
        newBlocked.roomId = formData.roomId;
        const room = rooms.find(r => r.id === formData.roomId);
        newBlocked.roomName = room?.name || '';
      }

      await addDoc(collection(db, 'blockedDates'), newBlocked);

      alert('予約不可日を設定しました');
      setShowForm(false);
      setFormData({
        date: '',
        type: 'all',
        roomId: '',
        reason: ''
      });
      fetchData();

    } catch (error) {
      console.error('設定エラー:', error);
      setFormError('設定に失敗しました');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('この予約不可日設定を削除しますか？')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'blockedDates', id));
      alert('削除しました');
      fetchData();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="blocked-dates-container">
      <div className="section-header">
        <h2>予約不可日管理</h2>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="toggle-form-button"
        >
          {showForm ? '閉じる' : '+ 新規追加'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>予約不可日を追加</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>日付 *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>対象範囲 *</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="all"
                    checked={formData.type === 'all'}
                    onChange={(e) => setFormData({...formData, type: e.target.value, roomId: ''})}
                  />
                  全会議室
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="specific"
                    checked={formData.type === 'specific'}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  />
                  特定の会議室
                </label>
              </div>
            </div>

            {formData.type === 'specific' && (
              <div className="form-group">
                <label>会議室 *</label>
                <select
                  value={formData.roomId}
                  onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                  required
                >
                  <option value="">選択してください</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>理由（任意）</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="例: 設備点検、年末年始"
              />
            </div>

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <div className="form-buttons">
              <button type="submit" className="submit-button">
                追加
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="cancel-button"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="blocked-list">
        <h3>設定済み予約不可日 ({blockedDates.length}件)</h3>
        
        {blockedDates.length === 0 ? (
          <p className="empty-message">予約不可日は設定されていません</p>
        ) : (
          <div className="blocked-items">
            {blockedDates.map(blocked => (
              <div key={blocked.id} className="blocked-item">
                <div className="blocked-info">
                  <div className="blocked-date">{blocked.date}</div>
                  <div className="blocked-target">
                    {blocked.type === 'all' ? (
                      <span className="badge badge-all">全会議室</span>
                    ) : (
                      <span className="badge badge-specific">{blocked.roomName}</span>
                    )}
                  </div>
                  {blocked.reason && (
                    <div className="blocked-reason">理由: {blocked.reason}</div>
                  )}
                </div>
                <button 
                  onClick={() => handleDelete(blocked.id)}
                  className="delete-button"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BlockedDatesManager;