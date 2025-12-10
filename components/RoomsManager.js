import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import '../styles/RoomsManager.css';

function RoomsManager() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    description: '' 
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsData = roomsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.order - b.order);
      setRooms(roomsData);
    } catch (error) {
      console.error('会議室取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('会議室名を入力してください');
      return;
    }
    if (!formData.capacity || formData.capacity < 1) {
      setFormError('定員を入力してください');
      return;
    }

    try {
      if (editingRoom) {
        await updateDoc(doc(db, 'rooms', editingRoom.id), {
          name: formData.name.trim(),
          capacity: parseInt(formData.capacity),
          description: formData.description.trim() 
        });
        alert('会議室を更新しました');
      } else {
        const maxOrder = rooms.length > 0 ? Math.max(...rooms.map(r => r.order)) : 0;
        await addDoc(collection(db, 'rooms'), {
          name: formData.name.trim(),
          capacity: parseInt(formData.capacity),
          description: formData.description.trim(), 
          order: maxOrder + 1,
          createdAt: new Date()
        });
        alert('会議室を追加しました');
      }

      setShowForm(false);
      setEditingRoom(null);
      setFormData({ name: '', capacity: '', description: '' });
      fetchRooms();

    } catch (error) {
      console.error('保存エラー:', error);
      setFormError('保存に失敗しました');
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      capacity: room.capacity,
      description: room.description || '' 
    });
    setFormError('');
    setShowForm(true);
  };

  const handleDelete = async (room) => {
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('roomId', '==', room.id)
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);

    if (!bookingsSnapshot.empty) {
      if (!window.confirm(
        `この会議室には${bookingsSnapshot.size}件の予約があります。\n削除してもよろしいですか？\n（予約も削除されます）`
      )) {
        return;
      }

      for (const bookingDoc of bookingsSnapshot.docs) {
        await deleteDoc(bookingDoc.ref);
      }
    } else {
      if (!window.confirm(`${room.name}を削除しますか？`)) {
        return;
      }
    }

    try {
      await deleteDoc(doc(db, 'rooms', room.id));
      alert('会議室を削除しました');
      fetchRooms();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleMoveUp = async (room, index) => {
    if (index === 0) return;
    
    const prevRoom = rooms[index - 1];
    try {
      await updateDoc(doc(db, 'rooms', room.id), { order: prevRoom.order });
      await updateDoc(doc(db, 'rooms', prevRoom.id), { order: room.order });
      fetchRooms();
    } catch (error) {
      console.error('順序変更エラー:', error);
    }
  };

  const handleMoveDown = async (room, index) => {
    if (index === rooms.length - 1) return;
    
    const nextRoom = rooms[index + 1];
    try {
      await updateDoc(doc(db, 'rooms', room.id), { order: nextRoom.order });
      await updateDoc(doc(db, 'rooms', nextRoom.id), { order: room.order });
      fetchRooms();
    } catch (error) {
      console.error('順序変更エラー:', error);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingRoom(null);
    setFormData({ name: '', capacity: '', description: '' });
    setFormError('');
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="rooms-manager-container">
      <div className="section-header">
        <h2>会議室管理</h2>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="toggle-form-button"
        >
          {showForm ? '閉じる' : '+ 新規追加'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>{editingRoom ? '会議室を編集' : '会議室を追加'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>会議室名 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="例: 会議室D"
                required
              />
            </div>

            <div className="form-group">
              <label>定員 *</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                placeholder="例: 8"
                min="1"
                required
              />
            </div>

            {/* 備考欄を追加 */}
            <div className="form-group">
              <label>備考</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="例: プロジェクター完備、ホワイトボード2台"
                rows="3"
              />
              <small>会議室選択画面に表示されます</small>
            </div>

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <div className="form-buttons">
              <button type="submit" className="submit-button">
                {editingRoom ? '更新' : '追加'}
              </button>
              <button 
                type="button" 
                onClick={cancelForm} 
                className="cancel-button"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rooms-list">
        <h3>登録済み会議室 ({rooms.length}件)</h3>
        
        {rooms.length === 0 ? (
          <p className="empty-message">会議室が登録されていません</p>
        ) : (
          <div className="rooms-items">
            {rooms.map((room, index) => (
              <div key={room.id} className="room-item">
                <div className="room-info">
                  <div className="room-name">{room.name}</div>
                  <div className="room-capacity">定員: {room.capacity}名</div>
                  {room.description && (
                    <div className="room-description">
                      備考: {room.description}
                    </div>
                  )}
                </div>
                <div className="room-actions">
                  <button
                    onClick={() => handleMoveUp(room, index)}
                    disabled={index === 0}
                    className="move-button"
                    title="上に移動"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(room, index)}
                    disabled={index === rooms.length - 1}
                    className="move-button"
                    title="下に移動"
                  >
                    ↓
                  </button>
                  <button 
                    onClick={() => handleEdit(room)}
                    className="edit-button"
                  >
                    編集
                  </button>
                  <button 
                    onClick={() => handleDelete(room)}
                    className="delete-button"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomsManager;