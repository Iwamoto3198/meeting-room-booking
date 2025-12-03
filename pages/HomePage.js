import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getWeekDates, formatDate, formatDateDisplay, generateTimeSlots } from '../utils/dateUtils';
import '../styles/HomePage.css';

function HomePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  // カレンダー関係の状態
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  // モーダル関係の状態
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  // 予約フォーム関係の状態
  const [formData, setFormData] = useState({
    representativeName: '',
    phoneNumber: '',
    numberOfPeople: '',
    purpose: '',
    startTime: '',
    endTime: ''
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData(); // データ取得関数を実行
  }, [currentDate, roomId]);

  const fetchData = async () => {
    setLoading(true); // ローディング開始
    try {
      // １.会議室のデータ取得
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsData = roomsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.order - b.order);
      setRooms(roomsData);

      // ２.選択した会議室のデータ取得
      const room = roomsData.find(r => r.id === roomId);
      if (room) {
        setCurrentRoom(room);
      } else {
        navigate('/');
        return;
      }

      // ３.設定データの取得
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

      // ４.週の日付を取得
      const dates = getWeekDates(currentDate);
      setWeekDates(dates);

      // ５.予約の範囲を取得
      const startDate = formatDate(dates[0]);
      const endDate = formatDate(dates[6]);
      console.log('予約取得範囲:', { startDate, endDate, roomId });
      
      // roomIdでフィルタリングしてからクライアント側で日付範囲をフィルタリング
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('roomId', '==', roomId)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const allBookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // クライアント側で日付範囲をフィルタリング
      const bookingsData = allBookingsData.filter(booking => {
        return booking.date >= startDate && booking.date <= endDate;
      });
      console.log('取得した予約情報（全件）:', allBookingsData);
      console.log('フィルタリング後の予約情報:', bookingsData);
      setBookings(bookingsData);

      // ６.予約不可日を取得
      const blockedDatesSnapshot = await getDocs(collection(db, 'blockedDates'));
      const blockedDatesData = blockedDatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('取得した予約不可日:', blockedDatesData);
      setBlockedDates(blockedDatesData);

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false); // ローディング終了
    }
  };

  //　予約情報の取得関数
  const getBookingForSlot = (roomId, date, time) => {
    const booking = bookings.find(booking => {
      if (booking.roomId !== roomId || booking.date !== date) {
        return false;
      }
      return time >= booking.startTime && time < booking.endTime;
    });
    if (booking && time === booking.startTime) {
      console.log('予約情報が見つかりました:', { roomId, date, time, booking });
    }
    return booking;
  };

  // 予約不可日の判定関数
  const isDateBlocked = (date, roomId = null) => {
    const isBlocked = blockedDates.some(blocked => {
      if (blocked.date !== date) return false;
      if (blocked.type === 'all') return true;
      if (blocked.type === 'specific' && blocked.roomId === roomId) return true;
      return false;
    });
    if (isBlocked) {
      console.log('予約不可日:', { date, roomId, blockedDates: blockedDates.filter(b => b.date === date) });
    }
    return isBlocked;
  };

  //　終了時間の計算関数
  const calculateEndTime = (startTime, duration) => {
    const [hour, minute] = startTime.split(':').map(Number);
    const endMinute = minute + duration;
    const endHour = endMinute >= 60 ? hour + Math.floor(endMinute / 60) : hour;
    return `${String(endHour).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`;
  };

  // スロットクリックの処理関数
  const handleSlotClick = (room, date, time) => {
    const dateStr = formatDate(date);
    
    const slotDateTime = new Date(`${dateStr}T${time}`);
    if (slotDateTime < new Date()) {
      return;
    }

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

    const booking = getBookingForSlot(room.id, dateStr, time);
    
    if (booking) {
      setSelectedBooking(booking);
      setModalMode('view');
      setShowModal(true);
    } else {
      setSelectedSlot({ room, date: dateStr, time });
      setFormData({
        representativeName: '',
        phoneNumber: '',
        numberOfPeople: '',
        purpose: '',
        startTime: time,
        endTime: calculateEndTime(time, 15)
      });
      setFormError('');
      setModalMode('create');
      setShowModal(true);
    }
  };

  // 予約作成ページの処理関数
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setFormError('');

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
    if (!formData.startTime || !formData.endTime) {
      setFormError('開始時刻と終了時刻を選択してください');
      return;
    }
    if (formData.startTime >= formData.endTime) {
      setFormError('終了時刻は開始時刻より後にしてください');
      return;
    }

    const phoneRegex = /^[0-9\-]+$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      setFormError('電話番号は数字とハイフンのみで入力してください');
      return;
    }

    try {
      const hasConflict = bookings.some(booking => {
        if (booking.roomId !== selectedSlot.room.id) return false;
        if (booking.date !== selectedSlot.date) return false;
        
        const existingStart = booking.startTime;
        const existingEnd = booking.endTime;
        const newStart = formData.startTime;
        const newEnd = formData.endTime;
        
        return (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        );
      });

      if (hasConflict) {
        setFormError('選択した時間帯に予約が重複しています');
        return;
      }

      await addDoc(collection(db, 'bookings'), {
        roomId: selectedSlot.room.id,
        roomName: selectedSlot.room.name,
        date: selectedSlot.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        representativeName: formData.representativeName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        numberOfPeople: parseInt(formData.numberOfPeople),
        purpose: formData.purpose.trim(),
        createdAt: new Date()
      });

      alert('予約が完了しました！');
      setShowModal(false);
      fetchData();

    } catch (error) {
      console.error('予約作成エラー:', error);
      setFormError('予約の作成に失敗しました');
    }
  };

  // 予約キャンセルページの処理関数
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

  // モーダルを閉じる関数
  const closeModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
    setSelectedBooking(null);
    setFormError('');
  };

  //週の移動系関数
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

  //　会議室の変更画面
  const handleRoomChange = (newRoomId) => {
    navigate(`/calendar/${newRoomId}`);
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  // カレンダー画面
  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-left">
          <button onClick={() => navigate('/')} className="back-button">
            ← 会議室一覧
          </button>
          <h1>{currentRoom?.name || '会議室'}</h1>
        </div>
        <div className="header-buttons">
          <select 
            value={roomId} 
            onChange={(e) => handleRoomChange(e.target.value)}
            className="room-selector"
          >
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
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
            {currentRoom && timeSlots.map((time) => (
              <tr key={time} className="time-row">
                <td className="time-cell">{time}</td>
                {weekDates.map((date, dateIndex) => {
                  const dateStr = formatDate(date);
                  const booking = getBookingForSlot(currentRoom.id, dateStr, time);
                  const isBlocked = isDateBlocked(dateStr, currentRoom.id);
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
                      onClick={() => !isPast && handleSlotClick(currentRoom, date, time)}
                    >
                      {!isBlocked && booking && booking.startTime === time && (
                        <div className="booking-info">
                          <div className="booking-time">
                            {booking.startTime} - {booking.endTime}
                          </div>
                          <div className="booking-name">
                            {booking.representativeName}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                </div>
                <form onSubmit={handleCreateBooking} className="booking-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>開始時刻 *</label>
                      <select
                        value={formData.startTime}
                        onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                        required
                      >
                        <option value="">選択してください</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>終了時刻 *</label>
                      <select
                        value={formData.endTime}
                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                        required
                      >
                        <option value="">選択してください</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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