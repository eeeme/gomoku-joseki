# CLAUDE.md

五目定石帳（連珠の定石を分岐ツリーで覚える PWA）。リバーシ版 `eeeme/reversi-joseki`・将棋版 `eeeme/shogi-zyoseki` と同じ構成（React + TypeScript + Vite、IndexedDB、Capacitor）。設計は `docs/design.md`。

## 運用ルール
- main に直接コミットして push する（push で GitHub Actions がテスト → Pages へデプロイ）
- コミット前に `npm test` と `npm run build` を通す
- UIはシンプルに、説明テキストは最小限。バイブ（振動）は使わない
- 課金・広告なし（任意の応援だけ）。解析エンジン・評価値は入れない
- 画面や機能を足すときは、まずリバーシ版・将棋版の同じ画面に合わせる

## 設計の要点
- ルールは `src/gomoku/core.ts`（15路、1手目は天元、五連、黒の禁手 三三・四四・長連）
- 盤は `src/ui/Board.tsx`（SVG、仮置き→確定の2タップ、禁手点×、手数表示）
- 天元からの手順は標準の向き（直接打ち H9・間接打ち I9・珠型の向き）に正規化して記録（`src/gomoku/notation.ts`）
- 珠型の表は `src/gomoku/openings.ts`。定石書・サイトの文章は写さない
