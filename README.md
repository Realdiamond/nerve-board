# ⚡ nerve-board

> **Stage 5A** — Real-Time Data Visualization Platform  
> Built with Vue 3 · TypeScript · Pinia · Apache ECharts · CoinCap API

A production-grade real-time cryptocurrency analytics dashboard that streams live market data and visualizes it through interactive, high-performance charts.

---

## 🚀 Live Demo

> Deployed on Vercel — see submission link

---

## 🛠 Setup Instructions

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/nerve-board.git
cd nerve-board
npm install
```

Create a `.env` file in the root:

```env
VITE_STREAM_MODE=live           # or 'mock' for local dev without API key
VITE_STREAM_SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT
VITE_COINCAP_API_KEY=your_key_here   # free key from pro.coincap.io
```

```bash
npm run dev      # development server at localhost:5173
npm run build    # production build
npm run preview  # preview production build
```

---

## 🏗 Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│         LAYER 3: UI COMPONENTS          │
│   Vue SFCs — charts, cards, controls    │
│   Zero business logic — pure UI         │
└──────────────┬──────────────────────────┘
               │ reads (computed refs)
┌──────────────▼──────────────────────────┐
│      LAYER 2: STATE (Pinia Stores)      │
│   Normalised, domain-specific stores    │
│   Windowed data buffers (capped arrays) │
│   Exposes derived/computed state        │
└──────────────┬──────────────────────────┘
               │ pushes (batched)
┌──────────────▼──────────────────────────┐
│     LAYER 1: STREAMING SERVICES         │
│   Pure TypeScript — zero Vue imports    │
│   CoinCapAdapter (WS + REST)            │
│   MockStreamAdapter (fallback)          │
│   ConnectionManager + TickBuffer        │
└─────────────────────────────────────────┘
```

**Rule:** Dependencies flow upward only. Layer 1 has zero knowledge of Vue.

### Directory Structure

```
src/
├── components/
│   ├── cards/        # MetricCard
│   ├── charts/       # LineChart, CandlestickChart, AreaChart, BarChart
│   ├── controls/     # TimeRangeSelector, ChartTypeToggle, StreamControls
│   ├── feed/         # ActivityFeed
│   ├── layout/       # AppShell, TopBar
│   └── status/       # ConnectionStatus
├── composables/      # useChartSeries, useDerivedMetrics, useFormattedFeed
├── pages/            # DashboardPage
├── plugins/          # StreamingPlugin (Layer 1 ↔ Layer 2 bridge)
├── services/
│   └── streaming/    # CoinCapAdapter, MockStreamAdapter, TickBuffer, etc.
├── stores/           # market, activity, connection, filter, metrics, ui
└── types/            # TypeScript DTOs and interfaces
```

---

## 📊 State Management Strategy

Six Pinia stores, each with a single domain responsibility:

| Store | Responsibility |
|---|---|
| `useMarketStore` | Live tickers, OHLCV candles, trades per symbol |
| `useActivityStore` | Circular event/log feed (capped at 100 entries) |
| `useConnectionStore` | WebSocket status, reconnect count, message rate |
| `useFilterStore` | Active symbol, time range, chart type, visible datasets |
| `useMetricsStore` | Aggregated KPI values |
| `useUIStore` | Theme, sidebar state |

**Key pattern:** Stores hold raw normalized data. Composables (`useChartSeries`, `useDerivedMetrics`) transform it into UI-ready derived state. Components never compute — they only display.

---

## ⚡ Rendering Optimization Decisions

| Technique | Problem Solved |
|---|---|
| **RAF-gated TickBuffer** | Collapses 200 WS messages/sec → 1 store mutation per frame (~60/sec) |
| **`shallowRef` for data buffers** | Prevents Vue deep-proxying 500+ object arrays |
| **Imperative ECharts updates** | `chart.setOption()` instead of full re-mount on every data change |
| **Windowed candle buffer** | Hard-capped array size prevents unbounded memory growth |
| **Batched store ingestion** | Single `ingestBatch()` call per flush — one reactivity trigger per frame |

---

## 📡 Data Streaming Approach

### Live Mode (CoinCap)
```
WebSocket: wss://ws.coincap.io/prices?assets=bitcoin,ethereum,...
REST Poll: https://rest.coincap.io/v3/assets?ids=...  (every 10s)
History:   https://rest.coincap.io/v3/assets/{slug}/history?interval=m1  (on connect)
```

Flow:
1. On WS connect → immediately backfill 2h of real historical candles via REST
2. WS pushes live price ticks → parsed into `TickerDTO` + `CandleDTO`
3. REST polling enriches with 24h volume, change%, market data every 10s
4. All data batched via TickBuffer → single Pinia mutation per frame

### Mock Mode
Deterministic random-walk generator using configurable base prices and volatility. No external dependencies — works fully offline.

### Auto-Fallback
If CoinCap WS fails after max reconnect attempts → automatically switches to `MockStreamAdapter` with user-visible activity feed notification.

---

## ⚖️ Trade-offs Made

| Decision | Trade-off |
|---|---|
| **CoinCap over Binance** | CoinCap is browser-safe (no CORS), free prepaid API. Binance requires server-side proxy. |
| **Apache ECharts** | ~300KB bundle vs lighter alternatives — but supports all chart types natively with imperative API |
| **Synthetic candles from WS ticks** | CoinCap WS gives price ticks, not OHLCV. We build candle buckets from ticks + use history endpoint for real historical data |
| **Mock fallback as first-class feature** | Ensures demo-ability regardless of API availability |
| **Single dashboard page** | Keeps routing simple; multi-page would add navigation complexity without UX value |

---

## ✅ Stage 5A Feature Checklist

### Required
- ✅ Real-Time Data Streaming (WebSocket + REST polling)
- ✅ Line Chart
- ✅ Bar Chart
- ✅ Area Chart
- ✅ Real-time Metric Cards (Last Price, 24H Change, 24H High, 24H Low, Volume)
- ✅ Activity Feed with severity indicators
- ✅ Filter data (symbol, time range, chart type, dataset toggle)
- ✅ Pause/Resume streaming
- ✅ Time range selector (Live, 1 Min, 5 Min, 15 Min, 1 Hour, 4 Hours, 1 Day)
- ✅ Chart type switching (Line, Area, Bar, Candlestick)
- ✅ TypeScript throughout
- ✅ Component-based architecture
- ✅ Centralized state management (Pinia)
- ✅ Error handling & reconnect with exponential backoff
- ✅ Mock fallback for resilience
- ✅ Responsive layout
- ✅ No memory leaks (capped buffers, cleanup on unmount)
- ✅ Payload validation (DataValidator)

### Bonus
- ✅ Candlestick chart (OHLCV)
- ✅ Real CoinCap API integration
- ✅ Historical data backfill on connect
- ✅ Auto-fallback to mock on connection failure
- ✅ Severity indicators in activity feed
- ✅ Dark theme

---

## 🔑 Environment Variables (Vercel)

Add these in Vercel → Project Settings → Environment Variables:

| Variable | Value |
|---|---|
| `VITE_STREAM_MODE` | `live` |
| `VITE_COINCAP_API_KEY` | your CoinCap API key |
| `VITE_STREAM_SYMBOLS` | `BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT` |
