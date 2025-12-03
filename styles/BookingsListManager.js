import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import '../styles/BookingsListManager.css';

function BookingsListManager() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // フィルター・検索
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'upcoming', 'past'

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

      // 予約取得（日付順）
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('date', 'desc'),
        orderBy('startTime', 'desc')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (booking) => {
    if (!window.confirm(`${booking.representativeName}様の予約を削除しますか？`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'bookings', booking.id));
      alert('予約を削除しました');
      fetchData();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 予約が過去かどうか判定
  const isPastBooking = (booking) => {
    const bookingDateTime = new Date(`${booking.date}T${booking.endTime}`);
    return bookingDateTime < new Date();
  };

  // フィルタリング
  const getFilteredBookings = () => {
    return bookings.filter(booking => {
      // 検索（代表者名、電話番号、目的）
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = booking.representativeName.toLowerCase().includes(term);
        const matchPhone = booking.phoneNumber.includes(term);
        const matchPurpose = booking.purpose?.toLowerCase().includes(term) || false;
        if (!matchName && !matchPhone && !matchPurpose) return false;
      }

      // 会議室フィルター
      if (filterRoom !== 'all' && booking.roomId !== filterRoom) {
        return false;
      }

      // 日付フィルター
      if (filterDate && booking.date !== filterDate) {
        return false;
      }

      // ステータスフィルター
      if (filterStatus === 'upcoming' && isPastBooking(booking)) {
        return false;
      }
      if (filterStatus === 'past' && !isPastBooking(booking)) {
        return false;
      }

      return true;
    });
  };

  const filteredBookings = getFilteredBookings();

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="bookings-list-container">
      <div className="section-header">
        <h2>予約一覧</h2>
        <div className="stats">
          <span className="stat-item">全{bookings.length}件</span>
          <span className="stat-item">表示{filteredBookings.length}件</span>
        </div>
      </div>

      {/* フィルター・検索エリア */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>検索</label>
            <input
              type="text"
              placeholder="代表者名、電話番号、目的"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <label>会議室</label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="filter-select"
            >
              <option value="all">すべて</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>日付</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>ステータス</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">すべて</option>
              <option value="upcoming">今後の予約</option>
              <option value="past">過去の予約</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterRoom('all');
              setFilterDate('');
              setFilterStatus('all');
            }}
            className="reset-button"
          >
            リセット
          </button>
        </div>
      </div>

      {/* 予約リスト */}
      <div className="bookings-table-container">
        {filteredBookings.length === 0 ? (
          <p className="empty-message">
            {bookings.length === 0 ? '予約はありません' : '該当する予約が見つかりません'}
          </p>
        ) : (
          <table className="bookings-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>時間</th>
                <th>会議室</th>
                <th>代表者</th>
                <th>電話番号</th>
                <th>人数</th>
                <th>目的</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(booking => {
                const isPast = isPastBooking(booking);
                return (
                  <tr key={booking.id} className={isPast ? 'past-booking' : ''}>
                    <td>{booking.date}</td>
                    <td>{booking.startTime} - {booking.endTime}</td>
                    <td>{booking.roomName}</td>
                    <td>{booking.representativeName}</td>
                    <td>{booking.phoneNumber}</td>
                    <td>{booking.numberOfPeople}名</td>
                    <td>{booking.purpose || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(booking)}
                        className="delete-btn"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default BookingsListManager;
