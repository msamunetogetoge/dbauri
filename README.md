# dbauri(データベース接続アプリケーション)

このアプリケーションは、PostgreSQLデータベースに接続し、クエリを実行し、結果を表示するためのデスクトップアプリケーションです。また、接続状態をリアルタイムで確認する機能や、データベース接続を解除する機能も備えています。

## 機能

- PostgreSQLデータベースへの接続
- SQLクエリの実行と結果の表示
- 接続状態のリアルタイム表示
- データベース接続の解除

## 使用技術

- Rust
  - `tokio`
  - `tokio-postgres`
  - `tauri`
  - `chrono`
  - `uuid`
  - `bigdecimal`
- TypeScript
  - `solid-js`
  - `solid-bootstrap`

## インストールとセットアップ

### 前提条件

- Rustのインストール
  - [公式サイト](https://www.rust-lang.org/ja/tools/install)からインストールしてください。
- Node.jsのインストール
  - [公式サイト](https://nodejs.org/)からインストールしてください。
- PostgreSQLのインストール
  - [公式サイト](https://www.postgresql.org/)からインストールしてください。

### クローンと依存関係のインストール

1. リポジトリをクローンします。

    ```sh
    git clone https://github.com/yourusername/your-repo.git
    cd your-repo
    ```

2. Rustの依存関係をインストールします。

    ```sh
    cargo build
    ```

3. Node.jsの依存関係をインストールします。

    ```sh
    npm install
    ```

### 起動

1. アプリケーションを起動します。

    ```sh
    npm run tauri dev
    ```

## 使用方法

### データベースへの接続

1. アプリケーションを起動します。
2. 接続情報を入力して、データベースに接続します。

### クエリの実行

1. 接続が成功したら、SQLクエリを入力するテキストエリアが表示されます。
2. クエリを入力し、「Execute Query」ボタンをクリックしてクエリを実行します。
3. クエリの結果がテーブル形式で表示されます。

### 接続状態の確認

- 接続状態は、アプリケーションの上部にリアルタイムで表示されます。

### データベース接続の解除

1. 「Disconnect」ボタンをクリックして、データベース接続を解除します。

## ファイル構成

├── src/ # フロントエンドのコード
├── db/ # サンプルdbのdockerファイルなど
├── src-tauri/ # バックエンドのコード
├── package.json # Node.jsの依存関係とスクリプト
└── README.md # このファイル
