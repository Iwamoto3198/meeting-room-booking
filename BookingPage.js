import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDate, generateTimeSlots } from '../utils/dateUtils';
import { format } from 'date-fns';
import '../styles/BookingPage.css';

function BookingPage() {
  // フォームの状態管理
  const [rooms, setRooms] = useState([]);
  const [settings, setSettings] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  
  //各項目を１つのオブジェクトで管理
  const [formData, setFormData] = useState({
    roomId: '',
    date: '',
    startTime: '',
    endTime: '',
    representativeName: '',
    phoneNumber: '',
    numberOfPeople: '',
    purpose: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  // 初期データ読み込み
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 会議室データ取得
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      roomsData.sort((a, b) => a.order - b.order);
      setRooms(roomsData);

      // 設定データ取得
      const settingsSnapshot = await getDocs(collection(db, 'settings'));
      if (!settingsSnapshot.empty) {
        const settingsData = settingsSnapshot.docs[0].data();
        setSettings(settingsData);
        
        const slots = generateTimeSlots(
          settingsData.businessStartTime,
          settingsData.businessEndTime,
          settingsData.bookingIntervalMinutes
        );
        setTimeSlots(slots);
      }

      setLoading(false);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      alert('データの読み込みに失敗しました');
    }
  };

  // フォーム入力の変更処理
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // バリデーション（入力チェック）
  const validate = () => {
    const newErrors = {};

    if (!formData.roomId) {
      newErrors.roomId = '会議室を選択してください';
    }

    if (!formData.date) {
      newErrors.date = '日付を選択してください';
    } else {
      // 予約可能期間のチェック
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + (settings?.maxBookingDays || 60));
      
      if (selectedDate < today) {
        newErrors.date = '過去の日付は選択できません';
      } else if (selectedDate > maxDate) {
        newErrors.date = `${settings?.maxBookingDays || 60}日以内の日付を選択してください`;
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = '開始時刻を選択してください';
    }

    if (!formData.endTime) {
      newErrors.endTime = '終了時刻を選択してください';
    }

    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        newErrors.endTime = '終了時刻は開始時刻より後にしてください';
      }
    }

    if (!formData.representativeName.trim()) {
      newErrors.representativeName = '代表者名を入力してください';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = '電話番号を入力してください';
    } else if (!/^[0-9-]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = '電話番号は数字とハイフンのみで入力してください';
    }

    if (!formData.numberOfPeople) {
      newErrors.numberOfPeople = '利用人数を入力してください';
    } else if (formData.numberOfPeople < 1) {
      newErrors.numberOfPeople = '利用人数は1人以上で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; //エラーがなければtrue
  };

  // 重複チェック
  const checkConflict = async () => {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('roomId', '==', formData.roomId),
        where('date', '==', formData.date)
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const existingBookings = bookingsSnapshot.docs.map(doc => doc.data());

      // 時間の重複チェック
      for (const booking of existingBookings) {
        if (
          (formData.startTime >= booking.startTime && formData.startTime < booking.endTime) ||
          (formData.endTime > booking.startTime && formData.endTime <= booking.endTime) ||
          (formData.startTime <= booking.startTime && formData.endTime >= booking.endTime)
        ) {
          return true; // 重複あり
        }
      }

      return false; // 重複なし
    } catch (error) {
      console.error('重複チェックエラー:', error);
      throw error;
    }
  };

  // 予約送信処理
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      // 重複チェック
      const hasConflict = await checkConflict();
      if (hasConflict) {
        alert('選択した時間帯は既に予約されています。別の時間を選択してください。');
        setSubmitting(false);
        return;
      }

      // 会議室名を取得
      const selectedRoom = rooms.find(room => room.id === formData.roomId);

      // Firestoreに保存
      const bookingData = {
        roomId: formData.roomId,
        roomName: selectedRoom.name,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        representativeName: formData.representativeName,
        phoneNumber: formData.phoneNumber,
        numberOfPeople: parseInt(formData.numberOfPeople),
        purpose: formData.purpose,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'bookings'), bookingData);

      // 予約完了情報を保存
      setBookingDetails({
        ...bookingData,
        createdAt: new Date()
      });
      setBookingComplete(true);

    } catch (error) {
      console.error('予約保存エラー:', error);
      alert('予約の保存に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  // 予約完了画面
  if (bookingComplete && bookingDetails) {
    return (
      <div className="booking-container">
        <div className="success-message">
          <h2>✅ 予約が完了しました</h2>
          <p>以下の内容で予約を受け付けました。</p>

          <div className="success-details">
            <p><strong>会議室:</strong> {bookingDetails.roomName}</p>
            <p><strong>日付:</strong> {format(new Date(bookingDetails.date), 'yyyy年M月d日')}</p>
            <p><strong>時間:</strong> {bookingDetails.startTime} 〜 {bookingDetails.endTime}</p>
            <p><strong>代表者名:</strong> {bookingDetails.representativeName}</p>
            <p><strong>電話番号:</strong> {bookingDetails.phoneNumber}</p>
            <p><strong>利用人数:</strong> {bookingDetails.numberOfPeople}名</p>
            {bookingDetails.purpose && (
              <p><strong>会議目的:</strong> {bookingDetails.purpose}</p>
            )}
          </div>

          <div className="success-actions">
            <a href="/">カレンダーを見る</a>
            <a href="/booking">続けて予約する</a>
            <a href="/my-booking">予約を確認する</a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="booking-container">読み込み中...</div>;
  }

  return (
    <div className="booking-container">
      <a href="/" className="back-link">← トップに戻る</a>
      
      <h1 className="booking-title">会議室予約</h1>

      <form onSubmit={handleSubmit} className="booking-form">
        {/* 会議室選択 */}
        <div className="form-group">
          <label className="form-label">
            会議室<span className="required">*</span>
          </label>
          <select
            name="roomId"
            value={formData.roomId}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">選択してください</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name} (定員: {room.capacity}名)
              </option>
            ))}
          </select>
          {errors.roomId && <div className="error-message">{errors.roomId}</div>}
        </div>

        {/* 日付選択 */}
        <div className="form-group">
          <label className="form-label">
            日付<span className="required">*</span>
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="form-input"
            min={formatDate(new Date())}
            max={formatDate(new Date(Date.now() + (settings?.maxBookingDays || 60) * 24 * 60 * 60 * 1000))}
          />
          {errors.date && <div className="error-message">{errors.date}</div>}
        </div>

        {/* 時間選択 */}
        <div className="form-group">
          <label className="form-label">
            時間<span className="required">*</span>
          </label>
          <div className="time-inputs">
            <select
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">開始時刻</option>
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
            <span>〜</span>
            <select
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">終了時刻</option>
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          {errors.startTime && <div className="error-message">{errors.startTime}</div>}
          {errors.endTime && <div className="error-message">{errors.endTime}</div>}
        </div>

        {/* 代表者名 */}
        <div className="form-group">
          <label className="form-label">
            代表者名（苗字のみ）<span className="required">*</span>
          </label>
          <input
            type="text"
            name="representativeName"
            value={formData.representativeName}
            onChange={handleChange}
            className="form-input"
            placeholder="例: 山田"
          />
          {errors.representativeName && <div className="error-message">{errors.representativeName}</div>}
        </div>

        {/* 電話番号 */}
        <div className="form-group">
          <label className="form-label">
            電話番号<span className="required">*</span>
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="form-input"
            placeholder="例: 090-1234-5678"
          />
          {errors.phoneNumber && <div className="error-message">{errors.phoneNumber}</div>}
        </div>

        {/* 利用人数 */}
        <div className="form-group">
          <label className="form-label">
            利用人数<span className="required">*</span>
          </label>
          <input
            type="number"
            name="numberOfPeople"
            value={formData.numberOfPeople}
            onChange={handleChange}
            className="form-input"
            min="1"
            placeholder="例: 5"
          />
          {errors.numberOfPeople && <div className="error-message">{errors.numberOfPeople}</div>}
        </div>

        {/* 会議目的（任意） */}
        <div className="form-group">
          <label className="form-label">
            会議タイトル・目的（任意）
          </label>
          <textarea
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            className="form-textarea"
            placeholder="例: 営業会議"
          />
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          className="submit-button"
          disabled={submitting}
        >
          {submitting ? '予約中...' : '予約する'}
        </button>
      </form>
    </div>
  );
}

export default BookingPage;