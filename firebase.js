/**
 * firebase.js - Firebase初期化設定
 * 
 * このファイルは、Firebase（Firestore、Authentication）の初期化を行います。
 * 環境変数から設定を読み込み、Firebaseアプリケーションを初期化します。
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Firebase設定オブジェクト
 * 
 * 環境変数（.envファイル）からFirebaseの設定を読み込みます。
 * Reactアプリでは、環境変数名はREACT_APP_で始める必要があります。
 */
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,              
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,      
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,        
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET, 
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID               
};

/**
 * 必須環境変数のリスト
 * 
 * これらの環境変数が設定されていない場合、Firebaseの初期化に失敗します。
 */
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

/**
 * 環境変数のチェック
 * 
 * 設定されていない環境変数を検出し、コンソールにエラーメッセージを表示します。
 */
const missingEnvVars = requiredEnvVars.filter(
  envVar => !process.env[envVar]
);

// 環境変数が不足している場合、エラーメッセージを表示
if (missingEnvVars.length > 0) {
  console.error('❌ 以下の環境変数が設定されていません:');
  missingEnvVars.forEach(envVar => console.error(`  - ${envVar}`));
  console.error('\n.env ファイルを確認してください。');
  console.error('変更後は開発サーバーを再起動してください。\n');
}

/* Firebaseアプリケーションの初期化 */
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);