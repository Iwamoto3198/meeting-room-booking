import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getWeekDates, formatDate, formatDateDisplay, generateTimeSlots } from '../utils/dateUtils';
import { format } from 'date-fns';
import '../styles/HomePage.css';

function HomePage() {
  // 状態管理
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // 初期データ読み込み
  useEffect(() => {
    loadInitialData();
  }, []);

  // 週が変わったら予約データを再取得
  useEffect(() => {
    if (rooms.length > 0) {
      const dates = getWeekDates(currentDate);
      setWeekDates(dates);
      loadBookings(dates);
    }
  }, [currentDate, rooms]);

  // Firestoreから会議室・設定・予約データを取得
  const loadInitialData = async () => {
    try {
      console.log('データ読み込み開始');

      // 会議室データ取得
      console.log('会議室データ取得中...');
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      console.log('会議室データ取得完了:', roomsSnapshot.docs.length, '件');
      
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      roomsData.sort((a, b) => a.order - b.order);
      setRooms(roomsData);
      console.log('会議室データ:', roomsData);

      // 設定データ取得
      console.log('設定データ取得中...');
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      console.log('設定データ取得完了:', settingsSnapshot.docs.length, '件');
      
      if (!settingsSnapshot.empty) {
        const settings = settingsSnapshot.docs[0].data();
        console.log('設定データ:', settings);
        
        const slots = generateTimeSlots(
          settings.businessStartTime,
          settings.businessEndTime,
          settings.bookingIntervalMinutes
        );
        setTimeSlots(slots);
        console.log('タイムスロット生成完了:', slots.length, '件');
      } else {
        console.error('設定データが見つかりません');
        alert('設定データが見つかりません。/init-data で初期データを投入してください。');
      }

      setLoading(false);
      console.log('データ読み込み完了');
    } catch (error) {
      console.error('データ読み込みエラー詳細:', error);
      alert('データの読み込みに失敗しました: ' + error.message);
      setLoading(false);
    }
  };

  // 指定した週の予約データを取得
  const loadBookings = async (dates) => {
    try {
      const startDate = formatDate(dates[0]); //週の最初の日
      const endDate = formatDate(dates[6]); //週の最後の日

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
    } catch (error) {
      console.error('予約データ読み込みエラー:', error);
    }
  };

  // 前の週へ移動
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  // 次の週へ移動
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // 今週へ戻る
  const goToThisWeek = () => {
    setCurrentDate(new Date());
  };

  // 指定した日時・会議室の予約を取得
  const getBookingForSlot = (roomId, date, time) => {
    return bookings.find(
      booking =>
        booking.roomId === roomId &&
        booking.date === formatDate(date) &&
        booking.startTime === time
    );
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="home-container">
      <h1 className="home-title">会議室予約システム</h1>

      {/* ナビゲーションボタン */}
      <div className="navigation-buttons">
        <button onClick={goToPreviousWeek} className="nav-button">← 前の週</button>
        <button onClick={goToThisWeek} className="nav-button nav-button-center">今週</button>
        <button onClick={goToNextWeek} className="nav-button">次の週 →</button>
        <span className="current-month">
          {format(weekDates[0], 'yyyy年M月')}
        </span>
      </div>

      {/* リンク */}
      <div className="page-links">
        <a href="/booking">予約する</a>
        <a href="/my-booking">予約確認</a>
        <a href="/admin/login" className="admin-link">管理者ログイン</a>
      </div>

      {/* カレンダー表示 */}
      <div className="calendar-wrapper">
        <table className="calendar-table">
          <thead>
            <tr>
              <th className="header-cell">時間</th>
              {weekDates.map((date, index) => (
                <th key={index} className="header-cell">
                  {formatDateDisplay(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <React.Fragment key={room.id}>
                <tr>
                  <td colSpan={8} className="room-header">{room.name}</td>
                </tr>
                {timeSlots.map(time => (
                  <tr key={`${room.id}-${time}`}>
                    <td className="time-cell">{time}</td>
                    {weekDates.map((date, index) => {
                      const booking = getBookingForSlot(room.id, date, time);
                      return (
                        <td key={index} className="booking-cell">
                          {booking ? (
                            <div className="booking-info">
                              {booking.representativeName}
                            </div>
                          ) : (
                            <div className="empty-slot">-</div>
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
    </div>
  );
}

export default HomePage;