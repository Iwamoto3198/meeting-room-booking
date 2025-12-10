# 会議室予約システム

ReactとFirebaseを使用した、シンプルな会議室予約管理システムです。

## 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [技術スタック](#技術スタック)
- [セットアップ](#セットアップ)
- [使用方法](#使用方法)
- [プロジェクト構造](#プロジェクト構造)
- [デプロイ](#デプロイ)
- [トラブルシューティング](#トラブルシューティング)
- [ライセンス](#ライセンス)

## 概要

このシステムは、会議室の予約管理を効率的に行うためのWebアプリケーションです。
ユーザーはカレンダー上で会議室の空き状況を確認し、簡単に予約・キャンセルができます。
管理者は会議室の管理、予約の管理、システム設定の変更が可能です。


## 主な機能

### 一般ユーザー向け機能

- **会議室選択**: 利用可能な会議室の一覧表示
- **カレンダー表示**: 各会議室の週単位での予約カレンダー表示
- **予約作成**: カレンダー上で直接予約を作成
- **予約確認・キャンセル**: 代表者名と電話番号で予約を検索し、確認・キャンセル
- **予約フォーム**: フォーム形式での予約作成

### 管理者向け機能

- **会議室管理**: 会議室の追加・編集・削除・順序変更
- **予約管理**: 全予約の一覧表示・検索・削除
- **予約不可日設定**: 特定の日付や会議室を予約不可に設定
- **システム設定**: 営業時間、予約間隔、予約可能日数の設定

## 技術スタック

- **フロントエンド**
  - React 19.2.0
  - React Router DOM 7.9.5
  - date-fns 4.1.0（日付操作）

- **バックエンド・データベース**
  - Firebase Firestore（NoSQLデータベース）
  - Firebase Authentication（認証）

- **開発ツール**
  - Create React App
  - React Scripts 5.0.1

## セットアップ

### 前提条件

- Node.js 14.0以上
- npm または yarn
- Firebaseプロジェクト

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd meeting-room-booking
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Firebaseプロジェクトの作成

1. [Firebase Console]にアクセス
2. 新しいプロジェクトを作成
3. Firestore Databaseを有効化
4. Authenticationを有効化（メール/パスワード認証は未使用だが、将来の拡張用）

### 4. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

これらの値は、Firebase Consoleの「プロジェクト設定」→「一般」タブから取得できます。

**重要**: `.env`ファイルを変更した後は、開発サーバーを再起動してください。


### 5. Firestoreのインデックス設定

このアプリケーションは複数の`where`条件を使用するため、Firestoreの複合インデックスが必要です。

#### 自動設定（推奨）

1. アプリケーションを実行してエラーが発生した場合、ブラウザのコンソールにインデックス作成リンクが表示されます
2. そのリンクをクリックすると、Firebaseコンソールで自動的にインデックスが作成されます

#### 手動設定

Firebaseコンソールで以下のインデックスを作成してください：

**bookingsコレクション用:**
- Collection ID: `bookings`
- Fields:
  - `roomId` (Ascending)
  - `date` (Ascending)
- Query scope: Collection

**blockedDatesコレクション用:**
- Collection ID: `blockedDates`
- Fields:
  - `date` (Ascending)
- Query scope: Collection

### 6. Firestoreセキュリティルール

Firebase Consoleの「Firestore Database」→「ルール」タブで、以下のルールを設定してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 会議室データは全員が読み取り可能
    match /rooms/{roomId} {
      allow read: if true;
      allow write: if false; // 管理者のみ（認証が必要）
    }
    
    // 予約データ
    match /bookings/{bookingId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false; // 管理者のみ
    }
    
    // 設定データ
    match /settings/{settingId} {
      allow read: if true;
      allow write: if false; // 管理者のみ
    }
    
    // 予約不可日データ
    match /blockedDates/{blockedId} {
      allow read: if true;
      allow write: if false; // 管理者のみ
    }
  }
}
```

### 7. 初期データの投入

初回起動時は、初期データを投入する必要があります：

1. アプリケーションを起動
2. `/init-data`にアクセス
3. 「初期データを投入する」ボタンをクリック

これにより、以下のデータが作成されます：
- 会議室A（定員10名）
- 会議室B（定員6名）
- 会議室C（定員4名）
- システム設定（営業時間: 10:00-19:00、予約間隔: 15分）

### 8. アプリケーションの起動

```bash
npm start
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 使用方法

### 一般ユーザー

1. **会議室の選択**
   - トップページで会議室を選択
   - または、カレンダーページで会議室を切り替え

2. **予約の作成**
   - カレンダー上で空き時間をクリック
   - フォームに必要情報を入力（代表者名、電話番号、利用人数など）
   - 「予約する」ボタンをクリック

3. **予約の確認・キャンセル**
   - 「予約確認」ページにアクセス
   - 代表者名と電話番号を入力
   - 予約を検索し、必要に応じてキャンセル

### 管理者

1. **ログイン**
   - 「管理者」ボタンをクリック
   - デフォルトパスワード: `admin123`（初期データ投入後）
   - パスワードは管理者ダッシュボードで変更可能

2. **会議室管理**
   - 管理者ダッシュボードの「会議室管理」タブ
   - 会議室の追加・編集・削除・順序変更

3. **予約管理**
   - 「予約管理」タブで全予約を確認
   - 必要に応じて予約を削除

4. **予約不可日設定**
   - 「予約不可日管理」タブ
   - 特定の日付や会議室を予約不可に設定

5. **システム設定**
   - 「システム設定」タブ
   - 営業時間、予約間隔、予約可能日数、管理者パスワードを変更

## プロジェクト構造

```
meeting-room-booking/
├── public/                 # 静的ファイル
│   ├── index.html
│   └── ...
├── src/
│   ├── components/         # 再利用可能なコンポーネント
│   │   ├── BlockedDatesManager.js    # 予約不可日管理
│   │   ├── BookingModal.js           # 予約モーダル
│   │   ├── BookingsListManager.js    # 予約一覧管理
│   │   ├── CalendarTable.js           # カレンダーテーブル
│   │   ├── RoomsManager.js           # 会議室管理
│   │   └── SystemSettings.js         # システム設定
│   ├── contexts/          # React Context
│   │   └── AuthContext.js            # 認証コンテキスト
│   ├── pages/             # ページコンポーネント
│   │   ├── AdminDashboard.js         # 管理者ダッシュボード
│   │   ├── AdminLoginPage.js        # 管理者ログイン
│   │   ├── BookingPage.js           # 予約フォームページ
│   │   ├── HomePage.js              # カレンダーページ
│   │   ├── InitDataPage.js          # 初期データ投入ページ
│   │   ├── MyBookingPage.js         # 予約確認ページ
│   │   └── RoomSelectionPage.js      # 会議室選択ページ
│   ├── styles/            # CSSファイル
│   ├── utils/             # ユーティリティ関数
│   │   └── dateUtils.js              # 日付操作関数
│   ├── App.js             # メインアプリケーションコンポーネント
│   ├── firebase.js        # Firebase初期化
│   └── index.js           # エントリーポイント
├── .env                   # 環境変数（.gitignoreに含まれる）
├── .gitignore
├── package.json
└── README.md
```

## デプロイ

### Firebase Hostingへのデプロイ

1. Firebase CLIをインストール
```bash
npm install -g firebase-tools
```

2. Firebaseにログイン
```bash
firebase login
```

3. プロジェクトを初期化
```bash
firebase init hosting
```

4. ビルド
```bash
npm run build
```

5. デプロイ
```bash
firebase deploy
```

### その他のホスティングサービス

`npm run build`でビルドした`build`フォルダの内容を、任意の静的ホスティングサービス（Netlify、Vercel、GitHub Pagesなど）にデプロイできます。

## トラブルシューティング

### Firestoreのインデックスエラーが発生する場合

エラーメッセージに「index」という文字が含まれている場合、複合インデックスが必要です。

1. ブラウザのコンソールに表示されたリンクをクリック
2. または、Firebaseコンソールの「Firestore Database」→「インデックス」から手動で作成

現在のコードは、インデックスが存在しない場合でも動作するようにフォールバック機能を実装していますが、パフォーマンス向上のためインデックスの作成を推奨します。

### 環境変数が読み込まれない場合

1. `.env`ファイルがプロジェクトルート（`package.json`と同じ階層）にあることを確認
2. 環境変数名が`REACT_APP_`で始まっていることを確認
3. 開発サーバーを再起動

### カレンダーが表示されない場合

1. ブラウザのコンソールでエラーを確認
2. Firestoreの設定データ（`settings/config`）が存在することを確認
3. 会議室データ（`rooms`コレクション）が存在することを確認

### 予約が作成できない場合

1. Firestoreのセキュリティルールを確認
2. ブラウザのコンソールでエラーを確認
3. 予約の重複チェックが正しく機能しているか確認

## 開発用コマンド
```bash
# 開発サーバーの起動
npm start

# プロダクションビルド
npm run build

# テストの実行
npm test

# コードのeject（設定ファイルを直接編集可能にする）
npm run eject
```

**注意**: `npm run eject`は元に戻せない操作です。通常は使用する必要はありません。

## セキュリティに関する注意事項

- 本番環境では、管理者パスワードを強力なものに変更してください
- Firestoreのセキュリティルールを本番環境に適したものに調整してください
- `/init-data`ページへのアクセスを制限してください
- 環境変数（`.env`ファイル）をGitにコミットしないでください（`.gitignore`に含まれています）

---

## 参考資料

- [React公式ドキュメント](https://reactjs.org/)
- [Firebase公式ドキュメント](https://firebase.google.com/docs)
- [React Router公式ドキュメント](https://reactrouter.com/)
- [date-fns公式ドキュメント](https://date-fns.org/)

---
