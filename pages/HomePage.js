/**
 * ========================================
 * HomePage.js - 会議室予約カレンダーページ
 * ========================================
 * 
 * このページは、選択した会議室の予約カレンダーを表示します。
 * ユーザーはカレンダー上で予約を作成・確認・キャンセルできます。
 * 
 * URL: /calendar/:roomId
 * 
 * 主な機能:
 * - 週単位のカレンダー表示
 * - 予約の作成・確認・キャンセル
 * - 予約不可日の表示
 * - 週の移動（前週・今週・次週）
 * - 会議室の切り替え
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getWeekDates, formatDate, generateTimeSlots } from '../utils/dateUtils';
import CalendarTable from '../components/CalendarTable';
import BookingModal from '../components/BookingModal';
import '../styles/HomePage.css';

function HomePage() {
  // ========================================
  // URLパラメータとナビゲーション
  // ========================================
  const { roomId } = useParams(); // URLから会議室IDを取得（例: /calendar/room1 → roomId = "room1"）
  const navigate = useNavigate();  // ページ遷移用の関数
  
  // ========================================
  // カレンダー関係の状態管理
  // ========================================
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentRoom, setCurrentRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  const [formError, setFormError] = useState(''); // フォームのエラーメッセージ

  // ========================================
  // 計算値（メモ化）
  // ========================================
  
  /**
   * weekDates - 現在の週の日付配列（月曜日から日曜日まで）
   * 
   * useMemoでメモ化することで、currentDateが変わった時のみ再計算されます。
   * これにより、不要な再レンダリングを防ぎます。
   */
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // ========================================
  // データ取得（useEffect）
  // ========================================
  
  /**
   * 会議室データと設定データの取得
   * 
   * これらのデータは変更頻度が低いため、roomIdが変わった時のみ取得します。
   * これにより、パフォーマンスを向上させます。
   */
  useEffect(() => {
    let isMounted = true;

    const loadRoomsAndSettings = async () => {
      try {
        // 会議室データ取得
        const roomsSnapshot = await getDocs(collection(db, 'rooms'));
        const roomsData = roomsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        if (!isMounted) return;
        setRooms(roomsData);

        // 選択した会議室を設定
        const room = roomsData.find(r => r.id === roomId);
        if (room) {
          setCurrentRoom(room);
        } else {
          navigate('/');
          return;
        }

        // 設定データ取得
        const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
        if (!isMounted) return;
        
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          const slots = generateTimeSlots(
            settings.businessStartTime || '09:00',
            settings.businessEndTime || '18:00',
            settings.bookingIntervalMinutes || 15
          );
          setTimeSlots(slots);
        } else {
          // 設定データが存在しない場合のデフォルト値
          console.warn('設定データが見つかりません。デフォルト値を使用します。');
          const defaultSlots = generateTimeSlots('09:00', '18:00', 15);
          setTimeSlots(defaultSlots);
        }
      } catch (error) {
        console.error('会議室・設定データ取得エラー:', error);
        if (isMounted) {
          setError('データの読み込みに失敗しました。ページを再読み込みしてください。');
        }
      }
    };

    loadRoomsAndSettings();

    return () => {
      isMounted = false;
    };
  }, [roomId, navigate]);

  /**
   * refreshBookings - 予約データを再取得する共通関数
   * 
   * この関数は、予約作成・キャンセル後にカレンダーを更新するために使用されます。
   * useCallbackでメモ化されているため、依存配列の値が変わらない限り再作成されません。
   * 
   * 機能:
   * - 現在の週の予約データをFirestoreから取得
   * - インデックスエラーの場合はフォールバック処理を実行
   * - 取得したデータでbookingsステートを更新
   */
  const refreshBookings = useCallback(async () => {
    if (!roomId || !weekDates.length) return;

    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);

      // 予約データ取得（日付範囲でフィルタリング）
      // 注意: 複数のwhere条件を使用する場合、Firestoreの複合インデックスが必要です
      let bookingsSnapshot;
      try {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('roomId', '==', roomId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        bookingsSnapshot = await getDocs(bookingsQuery);
      } catch (queryError) {
        // インデックスエラーの場合、roomIdのみでフィルタリングしてクライアント側でフィルタリング
        if (queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
          console.warn('複合インデックスが見つかりません。roomIdのみでフィルタリングします。');
          const fallbackQuery = query(
            collection(db, 'bookings'),
            where('roomId', '==', roomId)
          );
          bookingsSnapshot = await getDocs(fallbackQuery);
        } else {
          throw queryError;
        }
      }
      
      let bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // インデックスエラーでフォールバックした場合、クライアント側で日付範囲をフィルタリング
      if (bookingsData.length > 0 && bookingsData.some(b => b.date < startDate || b.date > endDate)) {
        bookingsData = bookingsData.filter(booking => {
          return booking.date >= startDate && booking.date <= endDate;
        });
      }
      
      setBookings(bookingsData);
    } catch (error) {
      console.error('予約データ再取得エラー:', error);
      // エラーは表示せず、コンソールにのみ記録（ユーザー体験を損なわないため）
    }
  }, [roomId, weekDates]);

  // 予約データと予約不可日データを取得（週が変わった時のみ）
  useEffect(() => {
    if (!roomId || !weekDates.length) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchBookingData = async () => {
      try {
        const startDate = formatDate(weekDates[0]);
        const endDate = formatDate(weekDates[6]);

        // 予約データ取得（日付範囲でフィルタリング）
        // 注意: 複数のwhere条件を使用する場合、Firestoreの複合インデックスが必要です
        let bookingsSnapshot;
        try {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('roomId', '==', roomId),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
          );
          bookingsSnapshot = await getDocs(bookingsQuery);
        } catch (queryError) {
          // インデックスエラーの場合、roomIdのみでフィルタリングしてクライアント側でフィルタリング
          if (queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
            console.warn('複合インデックスが見つかりません。roomIdのみでフィルタリングします。');
            const fallbackQuery = query(
              collection(db, 'bookings'),
              where('roomId', '==', roomId)
            );
            bookingsSnapshot = await getDocs(fallbackQuery);
          } else {
            throw queryError;
          }
        }
        
        if (!isMounted) return;
        
        let bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (bookingsData.length > 0 && bookingsData.some(b => b.date < startDate || b.date > endDate)) {
          bookingsData = bookingsData.filter(booking => {
            return booking.date >= startDate && booking.date <= endDate;
          });
        }
        
        setBookings(bookingsData);

        // 予約不可日取得（日付範囲でフィルタリング）
        let blockedDatesSnapshot;
        try {
          const blockedDatesQuery = query(
            collection(db, 'blockedDates'),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
          );
          blockedDatesSnapshot = await getDocs(blockedDatesQuery);
        } catch (queryError) {
          if (queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
            console.warn('複合インデックスが見つかりません。全件取得してフィルタリングします。');
            blockedDatesSnapshot = await getDocs(collection(db, 'blockedDates'));
          } else {
            throw queryError;
          }
        }
        
        if (!isMounted) return;
        
        let blockedDatesData = blockedDatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (blockedDatesData.length > 0 && blockedDatesData.some(b => b.date < startDate || b.date > endDate)) {
          blockedDatesData = blockedDatesData.filter(blocked => {
            return blocked.date >= startDate && blocked.date <= endDate;
          });
        }
        
        setBlockedDates(blockedDatesData);

      } catch (error) {
        console.error('予約データ取得エラー:', error);
        if (isMounted) {
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            setError(
              '⚠️ Firestoreのインデックスが必要です。\n\n' +
              'ブラウザのコンソールに表示されたインデックス作成リンクをクリックするか、\n' +
              'Firebaseコンソールで以下のインデックスを作成してください：\n' +
              '- Collection: bookings\n' +
              '- Fields: roomId (Ascending), date (Ascending)'
            );
          } else {
            setError(`予約データの読み込みに失敗しました: ${error.message || '不明なエラー'}`);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBookingData();

    return () => {
      isMounted = false;
    };
  }, [roomId, weekDates]);

  const isDateBlocked = useCallback((date, roomId = null) => {
    return blockedDates.some(blocked => {
      if (blocked.date !== date) return false;
      if (blocked.type === 'all') return true;
      if (blocked.type === 'specific' && blocked.roomId === roomId) return true;
      return false;
    });
  }, [blockedDates]);

  const calculateEndTime = useCallback((startTime, duration) => {
    const [hour, minute] = startTime.split(':').map(Number);
    const endMinute = minute + duration;
    const endHour = endMinute >= 60 ? hour + Math.floor(endMinute / 60) : hour;
    return `${String(endHour).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`;
  }, []);

  const handleSlotClick = useCallback((room, date, time) => {
    const dateStr = formatDate(date);
    
    // 過去の日時かどうかをチェック
    const slotDateTime = new Date(`${dateStr}T${time}`);
    if (slotDateTime < new Date()) {
      return;
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

    // 予約の確認
    const booking = bookings.find(booking => {
      if (booking.roomId !== room.id || booking.date !== dateStr) return false;
      return time >= booking.startTime && time < booking.endTime;
    });
    
    if (booking) {
      // 既存予約を表示
      setSelectedBooking(booking);
      setModalMode('view');
      setShowModal(true);
    } else {
      // 新規予約フォームを表示
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
  }, [isDateBlocked, blockedDates, bookings, calculateEndTime]);

  const handleCreateBooking = useCallback(async (e) => {
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

      
      // Firestoreへの予約データ保存
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
      // 予約データを再取得（共通関数を使用）
      await refreshBookings();

    } catch (error) {
      console.error('予約作成エラー:', error);
      setFormError('予約の作成に失敗しました');
    }
  }, [formData, selectedSlot, bookings, refreshBookings]);

  const handleCancelBooking = useCallback(async () => {
    // ユーザーに確認を求める
    if (!window.confirm('この予約をキャンセルしますか？')) {
      return;
    }

    try {
      // Firestoreから予約データを削除
      await deleteDoc(doc(db, 'bookings', selectedBooking.id));
      alert('予約をキャンセルしました');
      setShowModal(false);
      // 予約データを再取得（共通関数を使用）
      await refreshBookings();
    } catch (error) {
      console.error('キャンセルエラー:', error);
      alert('キャンセルに失敗しました');
    }
  }, [selectedBooking, refreshBookings]);

  // モーダルを閉じる
  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedSlot(null);
    setSelectedBooking(null);
    setFormError('');
  }, []);

  // 週の移動
  const goToPreviousWeek = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  const goToThisWeek = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

  // 会議室切り替え
  const handleRoomChange = useCallback((newRoomId) => {
    navigate(`/calendar/${newRoomId}`);
  }, [navigate]);

  if (loading && !currentRoom) {
    return <div className="loading">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="home-container">
        <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
          <p>⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className="nav-button">
            ページを再読み込み
          </button>
        </div>
      </div>
    );
  }

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

      <CalendarTable
        weekDates={weekDates}
        currentRoom={currentRoom}
        timeSlots={timeSlots}
        bookings={bookings}
        blockedDates={blockedDates}
        onSlotClick={handleSlotClick}
      />

      <BookingModal
        showModal={showModal}
        modalMode={modalMode}
        selectedSlot={selectedSlot}
        selectedBooking={selectedBooking}
        formData={formData}
        formError={formError}
        timeSlots={timeSlots}
        onClose={closeModal}
        onFormChange={setFormData}
        onCreateBooking={handleCreateBooking}
        onCancelBooking={handleCancelBooking}
      />
    </div>
  );
}

export default HomePage;