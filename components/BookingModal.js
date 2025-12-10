import React from 'react';

function BookingModal({
  showModal,        // モーダルの表示/非表示フラグ
  modalMode,       // モーダルのモード（"create", "view", "blocked"）
  selectedSlot,    // 選択された時間スロット情報（予約作成時）
  selectedBooking, // 選択された予約情報（予約確認時）
  formData,        // 予約フォームのデータ
  formError,       // フォームのエラーメッセージ
  timeSlots,       // 選択可能な時間スロットの配列
  onClose,         // モーダルを閉じるコールバック関数
  onFormChange,    // フォーム入力変更時のコールバック関数
  onCreateBooking, // 予約作成時のコールバック関数
  onCancelBooking  // 予約キャンセル時のコールバック関数
}) {
  
  if (!showModal) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      
      {/* モーダルの内容部分 */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* 予約の詳細確認 */}
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
              <button onClick={onCancelBooking} className="cancel-button">
                予約をキャンセル
              </button>
              <button onClick={onClose} className="close-button">
                閉じる
              </button>
            </div>
          </>
        )}

        {/* 予約作成画面 */}
        {modalMode === 'create' && selectedSlot && (
          <>
            <h2>予約作成</h2>
            <div className="booking-details">
              <p><strong>会議室:</strong> {selectedSlot.room.name}</p>
              <p><strong>日付:</strong> {selectedSlot.date}</p>
            </div>
            <form onSubmit={onCreateBooking} className="booking-form">
              <div className="form-row">
                <div className="form-group">
                  <label>開始時刻 *</label>
                  <select
                    value={formData.startTime}
                    onChange={(e) => onFormChange({...formData, startTime: e.target.value})}
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
                    onChange={(e) => onFormChange({...formData, endTime: e.target.value})}
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
                  onChange={(e) => onFormChange({...formData, representativeName: e.target.value})}
                  placeholder="山田"
                  required
                />
              </div>
              <div className="form-group">
                <label>電話番号 *</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => onFormChange({...formData, phoneNumber: e.target.value})}
                  placeholder="090-1234-5678"
                  required
                />
              </div>
              <div className="form-group">
                <label>利用人数 *</label>
                <input
                  type="number"
                  value={formData.numberOfPeople}
                  onChange={(e) => onFormChange({...formData, numberOfPeople: e.target.value})}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>会議の目的</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => onFormChange({...formData, purpose: e.target.value})}
                  placeholder="営業会議"
                />
              </div>
              {formError && <div className="error-message">{formError}</div>}
              <div className="modal-buttons">
                <button type="submit" className="submit-button">
                  予約する
                </button>
                <button type="button" onClick={onClose} className="close-button">
                  キャンセル
                </button>
              </div>
            </form>
          </>
        )}

        {/* 予約不可の場合*/}
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
              <button onClick={onClose} className="close-button">
                閉じる
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BookingModal;