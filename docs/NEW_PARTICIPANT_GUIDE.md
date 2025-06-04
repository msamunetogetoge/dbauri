# 新規参加者向けガイド

このドキュメントでは、リポジトリの大まかな構造と開発を始める際に押さえておきたいポイントをまとめています。README と合わせてご活用ください。

## リポジトリの概要
このプロジェクトは **Tauri** を使用したデスクトップアプリケーションで、PostgreSQL へ接続してクエリを実行するツールです。フロントエンドは **SolidJS** (TypeScript)、バックエンドは **Rust** で実装されています。

```
├── src/          # フロントエンドのコード
├── src-tauri/    # バックエンド(Tauri)のコード
├── db/           # サンプルDB用のDockerファイルなど
├── public/       # アセット
├── package.json  # Node.jsの依存関係とスクリプト
└── README.md     # 説明書
```

## 開発時の要点
- **DB接続管理** : フロントエンドでは `ConnectionContext` で接続状態を共有し、バックエンドでは `AppState` に `HashMap<Uuid, Client>` を保持して複数接続に対応しています。
- **フロント⇔バックエンド通信** : `invoke` 関数を利用して、フロントエンドから Tauri のコマンド(Rust 側関数)を呼び出します。主なコマンドには `connect_to_database`、`disconnect_from_database`、`execute_query` があります。
- **サンプルDB** : `db/` の Dockerfile と `init.sql` を使うことでローカルにテスト用データベースを構築できます。
- **ビルド&リリース** : `.github/workflows/taiuri-action.yaml` では `release` ブランチへの push 時に各プラットフォーム向けビルドを行いリリースを作成します。

## 次に学ぶとよいこと
1. **Tauri の基本** : `src-tauri/src/main.rs` を読み、Tauri コマンドやウィンドウイベント処理を理解します。
2. **SolidJS のコンポーネント構造** : `src/components/` を参照し、状態管理(createSignal, createEffect など)やイベントの流れを把握します。
3. **フロントエンドとバックエンドの連携** : `invoke`/`listen` を使ったイベント通知や接続 ID を介したクエリ実行方法を確認します。
4. **ユニットテスト** : Rust 側のテストを実行する際は `.env` に `DATABASE_URL` を設定する必要があります。
5. **ビルド手順・CI** : `.github/workflows/taiuri-action.yaml` のビルドフローを確認し、リリース工程を理解します。

開発を始める際には README のセットアップ手順に従って環境を整え、上記ポイントを参考にコードを読み進めてください。
