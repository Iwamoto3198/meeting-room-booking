import React, { useMemo } from 'react';
import { formatDate, formatDateDisplay } from '../utils/dateUtils';

const CalendarTable = React.memo(function CalendarTable({ 
  weekDates,        // 表示する週の日付配列（月曜日から日曜日まで）
  currentRoom,      // 現在選択されている会議室オブジェクト
  timeSlots,       // 表示する時間スロットの配列（例: ["09:00", "09:15", ...]）
  bookings,        // 予約データの配列
  blockedDates,    // 予約不可日の配列
  onSlotClick      // セルがクリックされた時に呼ばれるコールバック関数
}) {
  
  const getBookingForSlot = (roomId, date, time) => {
    const booking = bookings.find(booking => {
      if (booking.roomId !== roomId || booking.date !== date) {
        return false;
      }
      return time >= booking.startTime && time < booking.endTime;
    });
    return booking;
  };

  const isDateBlocked = (date, roomId = null) => {
    return blockedDates.some(blocked => {
      if (blocked.date !== date) return false;
      if (blocked.type === 'all') return true;
      if (blocked.type === 'specific' && blocked.roomId === roomId) return true;
      return false;
    });
  };


  // データ検証とエラーハンドリング
    // 会議室情報が読み込まれていない場合
  if (!currentRoom) {
    return (
      <div className="calendar-container">
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          会議室情報を読み込んでいます...
        </div>
      </div>
    );
  }

    //カレンダー部分
  if (!timeSlots || timeSlots.length === 0) {
    return (
      <div className="calendar-container">
        <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
          ⚠️ 時間設定が読み込めませんでした。管理者に連絡してください。
        </div>
      </div>
    );
  }

  if (!weekDates || weekDates.length === 0) {
    return (
      <div className="calendar-container">
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          日付情報を読み込んでいます...
        </div>
      </div>
    );
  }
  
  return (
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
          {timeSlots.map((time) => (
            <tr key={time} className="time-row">
              <td className="time-cell">{time}</td>
              {weekDates.map((date, dateIndex) => {
                const dateStr = formatDate(date); 
                
                const booking = getBookingForSlot(currentRoom.id, dateStr, time);
                
                const isBlocked = isDateBlocked(dateStr, currentRoom.id);
                
                const isPast = new Date(`${dateStr}T${time}`) < new Date();
                
                let cellClass = 'booking-cell';
                if (isPast) cellClass += ' past';           // 過去:クリック不可
                else if (isBlocked) cellClass += ' blocked'; // 予約不可:クリック不可
                else if (booking) cellClass += ' booked';    // 予約済み:クリックで詳細表示
                else cellClass += ' available';             // 予約可能:クリックで予約作成

                return (
                  <td
                    key={dateIndex}
                    className={cellClass}
                    // 過去でない場合のみクリック可能
                    onClick={() => !isPast && onSlotClick(currentRoom, date, time)}
                  >
                    {/* 予約情報の表示（予約開始時刻のセルのみ） */}
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
  );
});

export default CalendarTable;