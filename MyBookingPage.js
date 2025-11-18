import React, { useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import '../styles/MyBookingPage.css';

function MyBookingPage() {
  const [searchData, setSearchData] = useState({
    representativeName: '',
    phoneNumber: ''
  });

  const [booking, setBooking] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelComplete, setCancelComplete] = useState(false);
  const [errors, setErrors] = useState({});

  // フォーム入力の変更処理
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchData(prev => ({
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

  // バリデーション
  const validate = () => {
    const newErrors = {};

    if (!searchData.representativeName.trim()) {
      newErrors.representativeName = '代表者名を入力してください';
    }

    if (!searchData.phoneNumber.trim()) {
      newErrors.phoneNumber = '電話番号を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 予約検索処理
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSearching(true);
    setSearched(false);
    setBooking(null);

    try {
      // Firestoreから予約を検索
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('representativeName', '==', searchData.representativeName),
        where('phoneNumber', '==', searchData.phoneNumber)
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);

      if (!bookingsSnapshot.empty) {
        // 最新の予約を取得（複数ある場合は最初の1件）
        const bookingDoc = bookingsSnapshot.docs[0];
        const bookingData = {
          id: bookingDoc.id,
          ...bookingDoc.data()
        };

        // 過去の予約かチェック
        const bookingDateTime = new Date(`${bookingData.date}T${bookingData.startTime}`);
        const now = new Date();

        if (bookingDateTime < now) {
          // 過去の予約
          setBooking({ ...bookingData, isPast: true });
        } else {
          // 未来の予約
          setBooking({ ...bookingData, isPast: false });
        }
      } else {
        setBooking(null);
      }

      setSearched(true);
    } catch (error) {
      console.error('予約検索エラー:', error);
      alert('予約の検索に失敗しました。もう一度お試しください。');
    } finally {
      setSearching(false);
    }
  };

  // 予約キャンセル処理
  const handleCancel = async () => {
    if (!booking || !booking.id) {
      return;
    }

    const confirmCancel = window.confirm(
      `以下の予約をキャンセルしますか？\n\n` +
      `会議室: ${booking.roomName}\n` +
      `日付: ${format(new Date(booking.date), 'yyyy年M月d日')}\n` +
      `時間: ${booking.startTime} 〜 ${booking.endTime}\n\n` +
      `この操作は取り消せません。`
    );

    if (!confirmCancel) {
      return;
    }

    setCanceling(true);

    try {
      // Firestoreから削除
      await deleteDoc(doc(db, 'bookings', booking.id));
      
      setCancelComplete(true);
    } catch (error) {
      console.error('予約キャンセルエラー:', error);
      alert('予約のキャンセルに失敗しました。もう一度お試しください。');
    } finally {
      setCanceling(false);
    }
  };

  // 新しく検索する
  const handleNewSearch = () => {
    setSearchData({
      representativeName: '',
      phoneNumber: ''
    });
    setBooking(null);
    setSearched(false);
    setCancelComplete(false);
    setErrors({});
  };

  // キャンセル完了画面
  if (cancelComplete) {
    return (
      <div className="my-booking-container">
        <div className="cancel-success">
          <h2>✅ 予約をキャンセルしました</h2>
          <p>予約のキャンセルが完了しました。</p>

          <div className="action-links">
            <a href="/">カレンダーを見る</a>
            <a href="/booking">新しく予約する</a>
            <button
              onClick={handleNewSearch}
              style={{
                display: 'inline-block',
                margin: '0 10px',
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              別の予約を検索
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-booking-container">
      <a href="/" className="back-link">← トップに戻る</a>
      
      <h1 className="my-booking-title">予約確認・キャンセル</h1>

      <div className="info-message">
        予約時に入力した代表者名と電話番号を入力して、予約を検索してください。
      </div>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="form-group">
          <label className="form-label">
            代表者名（苗字のみ）<span className="required">*</span>
          </label>
          <input
            type="text"
            name="representativeName"
            value={searchData.representativeName}
            onChange={handleChange}
            className="form-input"
            placeholder="例: 山田"
            disabled={searching}
          />
          {errors.representativeName && (
            <div className="error-message">{errors.representativeName}</div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            電話番号<span className="required">*</span>
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={searchData.phoneNumber}
            onChange={handleChange}
            className="form-input"
            placeholder="例: 090-1234-5678"
            disabled={searching}
          />
          {errors.phoneNumber && (
            <div className="error-message">{errors.phoneNumber}</div>
          )}
        </div>

        <button
          type="submit"
          className="search-button"
          disabled={searching}
        >
          {searching ? '検索中...' : '予約を検索する'}
        </button>
      </form>

      {/* 検索結果 */}
      {searched && !booking && (
        <div className="no-booking-message">
          <p>予約が見つかりませんでした。</p>
          <p>代表者名と電話番号を確認して、もう一度お試しください。</p>
        </div>
      )}

      {/* 予約詳細 */}
      {booking && (
        <div className="booking-details">
          <h2>予約詳細</h2>

          <div className="detail-row">
            <div className="detail-label">会議室:</div>
            <div className="detail-value">{booking.roomName}</div>
          </div>

          <div className="detail-row">
            <div className="detail-label">日付:</div>
            <div className="detail-value">
              {format(new Date(booking.date), 'yyyy年M月d日 (E)', { locale: require('date-fns/locale/ja') })}
            </div>
          </div>

          <div className="detail-row">
            <div className="detail-label">時間:</div>
            <div className="detail-value">{booking.startTime} 〜 {booking.endTime}</div>
          </div>

          <div className="detail-row">
            <div className="detail-label">代表者名:</div>
            <div className="detail-value">{booking.representativeName}</div>
          </div>

          <div className="detail-row">
            <div className="detail-label">電話番号:</div>
            <div className="detail-value">{booking.phoneNumber}</div>
          </div>

          <div className="detail-row">
            <div className="detail-label">利用人数:</div>
            <div className="detail-value">{booking.numberOfPeople}名</div>
          </div>

          {booking.purpose && (
            <div className="detail-row">
              <div className="detail-label">会議目的:</div>
              <div className="detail-value">{booking.purpose}</div>
            </div>
          )}

          {/* キャンセルボタン */}
          {!booking.isPast && (
            <div className="cancel-section">
              <div className="cancel-warning">
                ⚠️ 予約をキャンセルする場合は、以下のボタンをクリックしてください。
                この操作は取り消せません。
              </div>
              <button
                onClick={handleCancel}
                className="cancel-button"
                disabled={canceling}
              >
                {canceling ? 'キャンセル中...' : '予約をキャンセルする'}
              </button>
            </div>
          )}

          {booking.isPast && (
            <div className="info-message" style={{ marginTop: '20px' }}>
              この予約は既に終了しています。キャンセルできません。
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyBookingPage;