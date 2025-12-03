import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import '../styles/RoomSelectionPage.css';

function RoomSelectionPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleRoomClick = (roomId) => {
    navigate(`/calendar/${roomId}`);
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="room-selection-container">
      <header className="selection-header">
        <h1>会議室を選択</h1>
        <div className="header-buttons">
          <button onClick={() => navigate('/my-booking')} className="nav-button">
            予約確認
          </button>
          <button onClick={() => navigate('/admin/login')} className="nav-button admin-button">
            管理者
          </button>
        </div>
      </header>

      <div className="rooms-grid">
        {rooms.map(room => (
          <div 
            key={room.id} 
            className="room-card"
            onClick={() => handleRoomClick(room.id)}
          >
            <div className="room-card-header">
              <h2>{room.name}</h2>
              <span className="room-capacity">定員 {room.capacity}名</span>
            </div>
            <div className="room-card-body">
              <p className="room-description">
                {room.description || 'この会議室の予約カレンダーを表示します'}
              </p>
            </div>
            <div className="room-card-footer">
              <button className="view-calendar-button">
                カレンダーを見る →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoomSelectionPage;