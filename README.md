# Δ TaskLab

タスクの **見積もり時間（計画）** と **実際にかかった時間（実測）** のズレ（Δ）を計測し、
AI の考察を得ながらタスク構成を改善していく「タスクシミュレーション」PWA です。

> コンセプト: 計画と現実の差分を計測するラボ。同じ内容のランを繰り返し、見積もり精度とタスクの粒度を段階的に改善します。

- モバイルファースト（幅 480px 基準の縦型レイアウト）
- 完全オフライン動作（インストール可能な PWA）
- データは端末内（localStorage）に永続化
- AI 連携は OS の共有機能経由で外部 AI アプリ（Claude 等）に委譲

## 技術スタック

- Vite + React 18 + TypeScript
- PWA: `vite-plugin-pwa`（Web App Manifest 生成 + Workbox による Service Worker 自動生成）
- スタイル: インラインスタイル + 注入 CSS（外部 UI ライブラリ不使用）
- 状態管理: React `useState` / `useRef` のみ

## 開発

```bash
npm install      # 依存関係のインストール
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド（tsc + vite build）
npm run preview  # ビルド成果物のプレビュー
npm run typecheck
```

> Service Worker は本番ビルドでのみ有効です（`vite.config.ts` の `devOptions.enabled = false`）。
> PWA 挙動（オフライン・インストール・更新トースト）の確認は `npm run build && npm run preview` で行ってください。

## プロジェクト構成

```
public/
  favicon.svg              アプリアイコン（藍地に白の Δ）
  apple-touch-icon.png
  icons/                   192 / 512 / maskable-512 PNG（manifest 用）
  fonts/                   セルフホストフォント（Space Grotesk / Space Mono / Inter, woff2）
src/
  main.tsx                 エントリ。SW 登録・storage.persist 要求
  App.tsx                  ビュー切り替え・ラン CRUD・永続化
  types.ts                 データモデル（Run / Task / HistoryEntry / Settings / AppData）
  storage.ts               loadData/saveData 抽象化 + スキーマ検証（IndexedDB へ移行可能な形）
  metrics.ts               Δ / Σ|Δ| / 計画比 / 時間表記 / バー長の算出
  prompt.ts                {{DATA}} 置換によるプロンプト生成
  share.ts                 Web Share API / クリップボード（フォールバック付き）
  constants.ts             既定プロンプト・配色トークン・ストレージキー
  useLongPressDrag.ts      長押しドラッグ並べ替え
  sw-update.ts             SW 更新通知（skipWaiting → リロード）
  components/              RunList / RunDetail / TaskRow / SettingsView / common
scripts/
  *.svg                    アイコン生成のソース SVG
```

## データモデル

`localStorage` のキー `tasklab:v1` に `AppData` 全体を JSON で 1 ドキュメント保存します。
ストレージ層は `loadData()` / `saveData(data)` に抽象化してあり、将来 IndexedDB へ移行できます。

設定画面から JSON でのエクスポート / インポート（全置換）が可能です。

## 指標

- タスク Δ = `実測 − 計画`（実測入力済みのみ）
- ラン Δ 合計 = Σ(実測 − 計画)、ばらつき Σ|Δ| = Σ|実測 − 計画|（いずれも計測済みのみ）
- Δ 合計が 0 でも Σ|Δ| > 0 なら「相殺」が起きている旨を明示

## ライセンス

[LICENSE](./LICENSE) を参照。
