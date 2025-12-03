import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getWeekDates, formatDate, formatDateDisplay, generateTimeSlots } from '../utils/dateUtils';
import '../styles/HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // モーダル関連の状態
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(''); // 'view', 'create', 'blocked'
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // 予約フォームの状態
  const [formData, setFormData] = useState({
    representativeName: '',
    phoneNumber: '',
    numberOfPeople: '',
    purpose: ''
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 会議室取得
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsData = roomsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.order - b.order);
      setRooms(roomsData);

      // 設定取得
      const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        const slots = generateTimeSlots(
          settings.businessStartTime,
          settings.businessEndTime,
          settings.bookingIntervalMinutes
        );
        setTimeSlots(slots);
      }

      // 週の日付を計算
      const dates = getWeekDates(currentDate);
      setWeekDates(dates);

      // 予約取得（週の範囲）
      const startDate = formatDate(dates[0]);
      const endDate = formatDate(dates[6]);
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);

      // 予約不可日取得
      const blockedDatesSnapshot = await getDocs(collection(db, 'blockedDates'));
      const blockedDatesData = blockedDatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBlockedDates(blockedDatesData);

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 予約を取得する関数
  const getBooking = (roomId, date, time) => {
    return bookings.find(
      b => b.roomId === roomId && b.date === date && b.startTime === time
    );
  };

  // 日付が予約不可かチェック
  const isDateBlocked = (date, roomId = null) => {
    return blockedDates.some(blocked => {
      if (blocked.date !== date) return false;
      if (blocked.type === 'all') return true;
      if (blocked.type === 'specific' && blocked.roomId === roomId) return true;
      return false;
    });
  };

  // スロットクリック時の処理
  const handleSlotClick = (room, date, time) => {
    const dateStr = formatDate(date);
    
    // 過去日チェック
    const slotDateTime = new Date(`${dateStr}T${time}`);
    if (slotDateTime < new Date()) {
      return; // 過去のスロットはクリック不可
    }

    // 予約不可日チェック
    if (isDateBlocked(dateStr, room.id)) {
      const blocked = blockedDates.find(b => 
        b.date === dateStr && 
        (b.type === 'all' || (b.type === 'specific' && b.roomId === room.id))
      );
      setSelectedSlot({ room, date: dateStr, time, blocked });
      setModalMode('blocked');
      setShowModal(true);
      return;
    }

    const booking = getBooking(room.id, dateStr, time);
    
    if (booking) {
      // 既存予約をクリック
      setSelectedBooking(booking);
      setModalMode('view');
      setShowModal(true);
    } else {
      // 空きスロットをクリック
      setSelectedSlot({ room, date: dateStr, time });
      setFormData({
        representativeName: '',
        phoneNumber: '',
        numberOfPeople: '',
        purpose: ''
      });
      setFormError('');
      setModalMode('create');
      setShowModal(true);
    }
  };

  // 予約作成
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setFormError('');

    // バリデーション
    if (!formData.representativeName.trim()) {
      setFormError('代表者名を入力してください');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setFormError('電話番号を入力してください');
      return;
    }
    if (!formData.numberOfPeople || formData.numberOfPeople < 1) {
      setFormError('利用人数を入力してください');
      return;
    }

    // 電話番号形式チェック
    const phoneRegex = /^[0-9\-]+$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setFormError('電話番号は数字とハイフンのみで入力してください');
      return;
    }

    try {
      // 重複チェック
      const existingBooking = getBooking(
        selectedSlot.room.id,
        selectedSlot.date,
        selectedSlot.time
      );
      if (existingBooking) {
        setFormError('この時間帯は既に予約されています');
        return;
      }

      // 終了時刻を計算（15分後）
      const [hour, minute] = selectedSlot.time.split(':').map(Number);
      const endMinute = minute + 15;
      const endHour = endMinute >= 60 ? hour + 1 : hour;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`;

      // 予約データ作成
      await addDoc(collection(db, 'bookings'), {
        roomId: selectedSlot.room.id,
        roomName: selectedSlot.room.name,
        date: selectedSlot.date,
        startTime: selectedSlot.time,
        endTime: endTime,
        representativeName: formData.representativeName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        numberOfPeople: parseInt(formData.numberOfPeople),
        purpose: formData.purpose.trim(),
        createdAt: new Date()
      });

      // 成功
      alert('予約が完了しました！');
      setShowModal(false);
      fetchData(); // データ再取得

    } catch (error) {
      console.error('予約作成エラー:', error);
      setFormError('予約の作成に失敗しました');
    }
  };

  // 予約キャンセル
  const handleCancelBooking = async () => {
    if (!window.confirm('この予約をキャンセルしますか？')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'bookings', selectedBooking.id));
      alert('予約をキャンセルしました');
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('キャンセルエラー:', error);
      alert('キャンセルに失敗しました');
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
    setSelectedBooking(null);
    setFormError('');
  };

  // 週移動
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToThisWeek = () => {
    setCurrentDate(new Date());
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>会議室予約システム</h1>
        <div className="header-buttons">
          <button onClick={() => navigate('/booking')} className="nav-button">
            予約作成
          </button>
          <button onClick={() => navigate('/my-booking')} className="nav-button">
            予約確認
          </button>
          <button onClick={() => navigate('/admin/login')} className="nav-button admin-button">
            管理者
          </button>
        </div>
      </header>

      <div className="week-navigation">
        <button onClick={goToPreviousWeek} className="week-nav-button">
          ← 前の週
        </button>
        <button onClick={goToThisWeek} className="week-nav-button today-button">
          今週
        </button>
        <button onClick={goToNextWeek} className="week-nav-button">
          次の週 →
        </button>
      </div>

      <div className="calendar-container">
        <table className="calendar-table">
          <thead>
            <tr>
              <th className="time-header">時間</th>
              {weekDates.map((date, index) => (
                <th key={index} className="date-header">
                  {formatDateDisplay(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <React.Fragment key={room.id}>
                <tr className="room-header-row">
                  <td className="room-name" colSpan={8}>
                    {room.name} (定員{room.capacity}名)
                  </td>
                </tr>
                {timeSlots.map((time) => (
                  <tr key={`${room.id}-${time}`} className="time-row">
                    <td className="time-cell">{time}</td>
                    {weekDates.map((date, dateIndex) => {
                      const dateStr = formatDate(date);
                      const booking = getBooking(room.id, dateStr, time);
                      const isBlocked = isDateBlocked(dateStr, room.id);
                      const isPast = new Date(`${dateStr}T${time}`) < new Date();
                      
                      let cellClass = 'booking-cell';
                      if (isPast) cellClass += ' past';
                      else if (isBlocked) cellClass += ' blocked';
                      else if (booking) cellClass += ' booked';
                      else cellClass += ' available';

                      return (
                        <td
                          key={dateIndex}
                          className={cellClass}
                          onClick={() => !isPast && handleSlotClick(room, date, time)}
                        >
                          {booking && (
                            <div className="booking-info">
                              {booking.representativeName}
                            </div>
                          )}
                          {isBlocked && !booking && (
                            <div className="blocked-info">予約不可</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {modalMode === 'view' && selectedBooking && (
              <>
                <h2>予約詳細</h2>
                <div className="booking-details">
                  <p><strong>会議室:</strong> {selectedBooking.roomName}</p>
                  <p><strong>日付:</strong> {selectedBooking.date}</p>
                  <p><strong>時間:</strong> {selectedBooking.startTime} - {selectedBooking.endTime}</p>
                  <p><strong>代表者:</strong> {selectedBooking.representativeName}</p>
                  {selectedBooking.purpose && (
                    <p><strong>目的:</strong> {selectedBooking.purpose}</p>
                  )}
                </div>
                <div className="modal-buttons">
                  <button onClick={handleCancelBooking} className="cancel-button">
                    予約をキャンセル
                  </button>
                  <button onClick={closeModal} className="close-button">
                    閉じる
                  </button>
                </div>
              </>
            )}

            {modalMode === 'create' && selectedSlot && (
              <>
                <h2>予約作成</h2>
                <div className="booking-details">
                  <p><strong>会議室:</strong> {selectedSlot.room.name}</p>
                  <p><strong>日付:</strong> {selectedSlot.date}</p>
                  <p><strong>時間:</strong> {selectedSlot.time}</p>
                </div>
                <form onSubmit={handleCreateBooking} className="booking-form">
                  <div className="form-group">
                    <label>代表者名 *</label>
                    <input
                      type="text"
                      value={formData.representativeName}
                      onChange={(e) => setFormData({...formData, representativeName: e.target.value})}
                      placeholder="山田"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>電話番号 *</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      placeholder="090-1234-5678"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>利用人数 *</label>
                    <input
                      type="number"
                      value={formData.numberOfPeople}
                      onChange={(e) => setFormData({...formData, numberOfPeople: e.target.value})}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>会議の目的</label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      placeholder="営業会議"
                    />
                  </div>
                  {formError && <div className="error-message">{formError}</div>}
                  <div className="modal-buttons">
                    <button type="submit" className="submit-button">
                      予約する
                    </button>
                    <button type="button" onClick={closeModal} className="close-button">
                      キャンセル
                    </button>
                  </div>
                </form>
              </>
            )}

            {modalMode === 'blocked' && selectedSlot && (
              <>
                <h2>予約不可</h2>
                <div className="booking-details">
                  <p><strong>会議室:</strong> {selectedSlot.room.name}</p>
                  <p><strong>日付:</strong> {selectedSlot.date}</p>
                  <p>この日は予約できません。</p>
                  {selectedSlot.blocked?.reason && (
                    <p><strong>理由:</strong> {selectedSlot.blocked.reason}</p>
                  )}
                </div>
                <div className="modal-buttons">
                  <button onClick={closeModal} className="close-button">
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
