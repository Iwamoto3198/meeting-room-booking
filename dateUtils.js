//日付操作を簡単にするユーティリティ関数集
import { format, addDays, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';

// 指定した日付の週の日付配列を取得（月曜始まり）
export const getWeekDates = (baseDate) => {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 }); // 1 = 月曜日
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

// 日付を "YYYY-MM-DD" 形式に変換
export const formatDate = (date) => {
  return format(date, 'yyyy-MM-dd');
};

// 日付を "MM/DD (曜日)" 形式に変換
export const formatDateDisplay = (date) => {
  return format(date, 'MM/dd (E)', { locale: ja }); //ja なので日本語ロケールで曜日表示
};

// 営業時間内の時間リストを生成
export const generateTimeSlots = (startTime, endTime, intervalMinutes) => {
  const slots = []; //初期化
  //時間を00:00形式で表記かつ、時、分を分割代入で別々の変数に格納
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  //現在時刻の初期化
  let currentHour = startHour;
  let currentMinute = startMinute;
  
  //メインループ部分
  while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
    //時刻文字列部分
    const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    slots.push(timeString);
    
    //時刻の更新（60分を超えたら1時間に変換等）
    currentMinute += intervalMinutes;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
  }
  
  return slots;
};