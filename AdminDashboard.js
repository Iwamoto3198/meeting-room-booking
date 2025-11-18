import React from 'react';

function AdminDashboard() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>管理者ダッシュボード</h1>
      <p>予約一覧・会議室管理・設定予定</p>
      <a href="/admin/login">← ログアウト</a>
    </div>
  );
}

export default AdminDashboard;