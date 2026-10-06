# 五目定石帳 リリース手順（Google Play）

手順は定石帳（リバーシ版）の `store/RELEASE.md` と同じ。違うところだけ書く。

| 項目 | 値 |
|---|---|
| パッケージ名 | `com.meisme.gomokujoseki`（一度決めると変えられない） |
| アプリ名 | 五目定石帳 ― 連珠の定石を分岐で覚える |
| 署名鍵（アップロード鍵） | **新しく作る**（リバーシ版・将棋版の鍵は使い回さない）。別名 `gomoku-joseki` |
| プライバシーポリシー | https://eeeme.github.io/gomoku-joseki/privacy.html |
| 応援アイテム ID | `support_small` / `support_medium` / `support_large` / `support_monthly` |

- GitHub Secrets：https://github.com/eeeme/gomoku-joseki/settings/secrets/actions に `ANDROID_KEYSTORE_BASE64` と `ANDROID_KEYSTORE_PASSWORD`
- AAB：https://github.com/eeeme/gomoku-joseki/actions/workflows/android.yml →「Run workflow」→ Artifacts「gomoku-joseki-<番号>」
