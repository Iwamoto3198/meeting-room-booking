import React, { useState } from 'react';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/InitDataPage.css';

function InitDataPage() {
  const [message, setMessage] = useState('');

  const initializeData = async () => {
    try {
      setMessage('データ投入中...');

      const roomsData = [
        { name: '会議室A', capacity: 10, order: 1 },
        { name: '会議室B', capacity: 6, order: 2 },
        { name: '会議室C', capacity: 4, order: 3 }
      ];

      //会議室を１つずつ追加
      for (const room of roomsData) {
        await addDoc(collection(db, 'rooms'), {
          ...room,
          createdAt: serverTimestamp()
        });
      }

      //システム設定（IDを指定した保存）
      await setDoc(doc(db, 'settings', 'config'), {
        adminPassword: 'admin123',
        businessStartTime: '10:00',
        businessEndTime: '19:00',
        bookingIntervalMinutes: 15,
        maxBookingDays: 60
      });

      setMessage('✅ 初期データの投入が完了しました！');
    } catch (error) {
      setMessage('❌ エラー: ' + error.message);
      console.error(error);
    }
  };

  return (
    <div className="init-container">
      <h1>初期データ投入ページ</h1>
      <p>このページは開発用です。初回のみ実行してください。</p>
      
      <button onClick={initializeData} className="init-button">
        初期データを投入する
      </button>

      {message && (
        <div className="init-message">
          {message}
        </div>
      )}

      <div className="init-back-link">
        <a href="/">← トップに戻る</a>
      </div>
    </div>
  );
}

export default InitDataPage;