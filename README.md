# 五目定石帳（gomoku-joseki）

五目並べ（連珠）の定石を「分岐をたどって」覚えるための PWA。サーバー無し・端末内（IndexedDB）完結。
設計は [docs/design.md](docs/design.md)。将棋版「定跡帳」（[eeeme/shogi-zyoseki](https://github.com/eeeme/shogi-zyoseki)）・リバーシ版「定石帳」（[eeeme/reversi-joseki](https://github.com/eeeme/reversi-joseki)）と同じ考え方・見た目・構成で作っています。

## 機能

- **定石ツリー**：手数は下へ、変化は右の列へ枝分かれ。珠型名のある局面には ◆
- **閲覧・編集**：盤に打って手を追加（✏ オン時。交点をタップ → もう一度タップで確定）、本線の入れ替え、部分木の削除、局面ごとのメモ
- **連珠のルール**：1手目は天元、五連で終局、黒の禁手（三三・四四・長連）を判定して盤に×
- **向きをそろえる**：直接打ちは2手目 H9、間接打ちは2手目 I9、3手目は珠型の標準の向きで記録（向き違いの同じ手順は1本にまとまる）
- **26珠型の名前**：花月・浦月など（`src/gomoku/openings.ts` の表。向き・手順前後を問わず判定）
- **練習**：黒／白を選ぶと相手の手は自動、自分の番で定石の手を答える。間隔反復（SM-2簡易版）・石を隠す脳内盤モード
- **今日の復習**：「今日の復習に使う」フォルダの本だけが対象。復習日が来た局面から最後まで通して出題
- **棋譜取込**：棋譜文字列（`h8i9j10…`）、1行1手順の複数行（分岐付きの1冊に）、盤面図（`X`/`O`/`-` の15行＋手番）
- **実戦照合**・**書き出し**（本線／全変化）・**合流・局面検索**（8対称）・**次の手の出現率**・フォルダ・タグ・しおり・盤面編集・応援・使い方の案内

## 開発

```bash
npm install
npm run dev     # 開発サーバー
npm test        # ルール・禁手・正規化・棋譜のテスト
npm run build   # dist/ に出力
```

main への push で GitHub Actions がテスト→ビルド→GitHub Pages（`/gomoku-joseki/`）へデプロイします。

## Android アプリ（Google Play）

Capacitor で包んでいます（パッケージ名 `com.meisme.gomokujoseki`）。手順は [store/RELEASE.md](store/RELEASE.md)。署名鍵は新しく作り、別名（alias）は `gomoku-joseki`。
