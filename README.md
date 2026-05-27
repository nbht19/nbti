# NBTI

Vite + React で作成した診断アプリです。

## Local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

ビルド成果物は `dist/` に出力されます。

## Deploy to Vercel

### 初回デプロイ

1. このリポジトリの最新内容を GitHub に push する
2. Vercel にログインする
3. Vercel の Dashboard で `Add New...` -> `Project` を選ぶ
4. GitHub 連携を求められた場合は、Vercel GitHub App にこのリポジトリへのアクセスを許可する
5. Import するリポジトリとしてこのリポジトリを選ぶ
6. Project Settings で以下を確認する

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

7. `Deploy` を押す
8. デプロイ完了後、発行された `*.vercel.app` の URL で表示を確認する

このリポジトリには `vercel.json` が含まれているため、通常は Vercel が設定を自動で読み取ります。

### 以降の更新

Vercel と GitHub を連携した場合、対象ブランチに push すると自動で再デプロイされます。

本番公開に使うブランチは、Vercel の Project Settings で Production Branch として設定してください。通常は `main` または `master` を指定します。

### 独自ドメインを使う場合

1. Vercel の Project Settings -> `Domains` を開く
2. 使用したいドメインを追加する
3. Vercel に表示される DNS 設定を、ドメイン管理サービス側に追加する
4. Vercel 側で Valid になるまで待つ
