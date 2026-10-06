# CLAUDE.md

五目定石帳（連珠の定石学習PWA）。React + TypeScript + Vite、IndexedDB（idb-keyval）、バックエンドなし。GitHub Pages で公開。

## 運用ルール
- main に直接コミットして push する（push で GitHub Actions がテスト → Pages へデプロイ）
- コミット前に `npm test` と `npm run build` を通す
- UIはシンプルに、説明テキストは最小限。バイブ（振動）は使わない
- 課金・広告なし

## 設計の要点
- 座標は a〜o / 1〜15（下が1）。1手目は h8 固定
- 局面は8対称で正規化した文字列がID。定石手の座標は正規形の座標系で保存
- 黒の禁手（三三・四四・長連）は `src/lib/rules.ts`。禁手を定石手として登録できない
- 定石データの変更後は `validateBook` がエラーゼロであること（`src/lib/book.test.ts`）
