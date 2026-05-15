# nerve-board — Architecture Design (Phase 1)

> **Stage 5A** · Real-Time Data Visualization Platform
> **Stack:** Vue 3 (Composition API) · TypeScript · Pinia · Apache ECharts
> **Data Source:** Binance WebSocket public streams (MockAdapter fallback)
> **Author:** Phase 1 — System Design (no code)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Three-Layer Architecture](#2-three-layer-architecture)
3. [Data Flow — Stream → State → UI](#3-data-flow)
4. [Layer 1: Streaming Services](#4-layer-1-streaming-services)
5. [Layer 2: State Management (Pinia)](#5-layer-2-state-management)
6. [Layer 3: UI Components](#6-layer-3-ui-components)
7. [Component Taxonomy](#7-component-taxonomy)
8. [Performance Strategy](#8-performance-strategy)
9. [Key Modules & Services](#9-key-modules--services)
10. [Architecture Summary](#10-architecture-summary)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Decisions, Assumptions & Risks](#12-decisions-assumptions--risks)

---

## 1. Design Philosophy

This system is designed as a **monitoring/trading-class dashboard** where data arrives continuously at high frequency. Every architectural decision is driven by three pillars:

| Pillar | Meaning |
|---|---|
| **Separation of Concerns** | Streaming logic, state management, and UI rendering live in completely isolated layers. No component ever opens a WebSocket. No store ever renders a DOM element. |
| **Reactive Minimalism** | Only the minimum amount of state needed for the current viewport is kept reactive. Historical data is stored in non-reactive buffers to avoid Vue's proxy overhead. |
| **Composable Reuse** | Every visualization (chart, card, feed) is a generic, data-shape-driven component. Domain knowledge lives in composables and stores, never in templates. |

---

## 2. Three-Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     LAYER 3: UI COMPONENTS                   │
│  (Vue SFCs — layouts, pages, charts, cards, feed, controls)  │
│  • Consumes ONLY computed refs from stores                   │
│  • Zero business logic — pure presentation                   │
│  • Uses requestAnimationFrame-gated rendering                │
└────────────────────────────┬─────────────────────────────────┘
                             │  reads (computed refs)
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                  LAYER 2: STATE (Pinia Stores)               │
│  • Normalised, domain-specific stores                        │
│  • Manages windowed data buffers (capped arrays)             │
│  • Exposes derived/computed state for the UI                 │
│  • Receives batched updates from Layer 1                     │
└────────────────────────────┬─────────────────────────────────┘
                             │  pushes (batched)
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              LAYER 1: STREAMING SERVICES                     │
│  • Pure TypeScript classes — NO Vue dependency               │
│  • WebSocket / SSE / REST polling adapters                   │
│  • Connection lifecycle (connect, reconnect, backoff)        │
│  • Message parsing, validation, normalisation                │
│  • Tick batching (buffers ticks, flushes on RAF boundary)    │
└──────────────────────────────────────────────────────────────┘
```

**Rule:** Dependencies flow **upward only**. Layer 1 has zero knowledge of Vue. Layer 2 imports from Layer 1's types but not its classes. Layer 3 imports only from Layer 2's public API (store refs/actions).

---

## 3. Data Flow

### 3.1 Primary Data Pipeline

```
WebSocket message arrives (raw Binance JSON)
       │
       ▼
┌─────────────────────┐
│  StreamAdapter       │  Parse raw frame
│  (Layer 1)           │  Validate via DataValidator
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  MessageParser       │  Normalize into canonical DTOs:
│  (Layer 1)           │  TickDTO, CandleDTO, ActivityDTO
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  TickBuffer          │  Accumulate DTOs in a plain array
│  (Layer 1)           │  Flush every ~16ms (RAF) or every N msgs
└──────────┬──────────┘
           │  batch payload (TickDTO[])
           ▼
┌─────────────────────┐
│  Pinia Store         │  Merge batch into normalised state
│  (Layer 2)           │  Trim windowed buffer (keep last 500)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Derived Composables │  Transform store data for UI:
│  (Layer 2.5)         │  chart-ready series, computed KPIs,
│                      │  formatted values, memoised selectors
└──────────┬──────────┘
           │  computed refs
           ▼
┌─────────────────────┐
│  Vue Component       │  Reads derived refs
│  (Layer 3)           │  ECharts updates via setOption()
│                      │  Cards re-render via Vue reactivity
└─────────────────────┘
```

### 3.2 Why Batching Matters

WebSocket feeds can deliver 50-200+ messages per second. Without batching:
- Each message triggers a Pinia state mutation
- Each mutation triggers Vue's reactivity system
- Each reactivity trigger causes component re-renders
- **Result:** The browser melts.

The **TickBuffer** collapses all messages received within a single animation frame (~16ms) into one batch, producing **one** store mutation per frame, which produces **one** render cycle. This is the single most important performance decision in the architecture.

### 3.3 Secondary Flows

| Flow | Path |
|---|---|
| **User Action → API** | Component → Store Action → REST Service → Store Mutation → Component |
| **Time Range Change** | FilterStore mutation → triggers data re-fetch → MarketStore reset + backfill |
| **Connection Status** | StreamAdapter emits status → ConnectionStore → StatusBar component |

---

## 4. Layer 1: Streaming Services

### 4.1 Module: `services/streaming/`

All streaming code lives here. **Zero Vue imports.**

| File/Module | Responsibility |
|---|---|
| `StreamAdapter.ts` | Abstract base class. Defines `connect()`, `disconnect()`, `onMessage()`, `onError()`, `onStatusChange()`. Protocol-agnostic. |
| `WebSocketAdapter.ts` | Concrete adapter for Binance WebSocket streams. Handles binary/text frames, ping/pong, auto-reconnect with exponential backoff. |
| `MockStreamAdapter.ts` | Generates realistic simulated market data when Binance is unavailable. Configurable tick rate and volatility. Implements same `StreamAdapter` interface. |
| `SSEAdapter.ts` | Concrete adapter for Server-Sent Events (future). |
| `PollingAdapter.ts` | Concrete adapter for REST polling fallback (future). |
| `TickBuffer.ts` | Accumulates incoming messages. Flushes on `requestAnimationFrame` boundary. Configurable flush threshold (time or count). Emits a single `onFlush(batch: T[])` callback. |
| `DataValidator.ts` | Sanitises and validates incoming payloads. Rejects malformed data, prevents unsafe injection, enforces schema contracts. Sits between adapter and TickBuffer. |
| `MessageParser.ts` | Validates and normalises raw message payloads into typed DTOs. Handles different message types (trade, orderbook, ticker, event). |
| `ConnectionManager.ts` | Orchestrates multiple `StreamAdapter` instances. Manages lifecycle (start all, stop all, **pause, resume**, reconnect). Exposes connection health metrics. |

### 4.2 Design Principles

- **Adapter Pattern:** Swapping WebSocket for SSE or polling requires changing only one file.
- **No Callbacks to Vue:** Layer 1 uses a simple event emitter pattern (or callback injection). The Pinia store registers a callback during `onMounted` / plugin initialisation. Layer 1 never imports `ref`, `reactive`, or any Vue API.
- **Testable in Isolation:** Every class can be unit-tested with a mock WebSocket — no Vue test utils needed.

---

## 5. Layer 2: State Management

### 5.1 Store Architecture (Pinia)

Each domain gets its own store. Stores are **thin** — they hold normalised data and expose computed derivations. Heavy computation is offloaded to utility functions.

| Store | Domain | Key State |
|---|---|---|
| `useMarketStore` | Price ticks, OHLCV candles | `tickers: Map<symbol, Ticker>`, `candles: Map<symbol, CandleBuffer>`, `trades: Map<symbol, TradeBuffer>` |
| `useMetricsStore` | Aggregated metrics for cards | `metrics: Record<string, MetricValue>` — derived from market data or separate feed |
| `useActivityStore` | Live event/log feed | `events: CircularBuffer<ActivityEvent>` — capped at N entries |
| `useConnectionStore` | Stream health & status | `status: ConnectionStatus`, `latency: number`, `reconnectCount: number`, `isPaused: boolean` |
| `useFilterStore` | User-selected filters | `selectedSymbols: string[]`, `timeRange: TimeRange`, `chartType: ChartType`, `visibleDatasets: Set<string>` |
| `useUIStore` | Layout / theme preferences | `sidebarOpen: boolean`, `theme: 'dark' \| 'light'`, `layout: LayoutConfig` — exposes `toggleTheme()` action |

### 5.2 Data Buffer Strategy

For high-frequency data, raw arrays inside reactive state are a performance trap. Strategy:

| Buffer Type | Use Case | Implementation |
|---|---|---|
| **CircularBuffer** | Activity feed, recent trades | Fixed-size array with head/tail pointers. Old entries are overwritten. |
| **WindowedBuffer** | Candle data for charts | Rolling window (e.g. last 500 candles). Older data is pruned on each batch flush. |
| **SnapshotRef** | Latest ticker price | Single `shallowRef<Ticker>` — replaced atomically, never mutated. |

**Critical:** Use `shallowRef` and `shallowReactive` wherever possible. Vue's deep reactivity proxy on arrays of 500+ objects with nested properties is expensive. Shallow refs mean Vue tracks only the reference change, not deep property access.

### 5.3 Store ↔ Streaming Integration

```
App initialisation (plugin or root component setup):

1. Create StreamAdapter instances
2. Create TickBuffer, wire it to StreamAdapter.onMessage
3. TickBuffer.onFlush → call store.ingestBatch(batch)
4. Store.ingestBatch merges data, trims buffers, triggers reactivity
```

This wiring happens **once**, in a dedicated **`StreamingPlugin`** (Vue plugin) or a top-level composable (`useStreamingBridge`). Components never interact with this wiring.

### 5.4 Derived State Layer (Composables)

Between raw store state and UI components, **derived composables** handle transformations:

| Composable | Input (Store) | Output (UI-ready) |
|---|---|---|
| `useChartSeries` | `useMarketStore.candles` | ECharts-formatted series options |
| `useDerivedMetrics` | `useMarketStore.tickers` | Computed KPIs: 24h change, volume, high/low |
| `useFormattedFeed` | `useActivityStore.events` | Time-ago strings, severity colors, sorted list |
| `useFilteredData` | Store data + `useFilterStore` | Data filtered by symbol, time range, visible datasets |

**Why explicit?**
- Keeps stores thin (raw normalised data only)
- Memoises expensive transforms (chart data formatting)
- Components stay dumb — they receive ready-to-render data
- Easy to test in isolation

---

## 6. Layer 3: UI Components

### 6.1 Component Principles

| Principle | Enforcement |
|---|---|
| **Props-driven** | Every component receives data via props or store-injected computed refs. No component fetches its own data. |
| **Slot-based composition** | Layout components use named slots. Chart wrappers use scoped slots for custom tooltips/overlays. |
| **Imperative chart updates** | Chart components do NOT re-render the entire chart on data change. They hold a chart instance ref and call `chart.update(newData)` imperatively via `watch`. |
| **Lazy rendering** | Components outside the viewport (e.g. below the fold) use `v-if` with Intersection Observer or virtual scrolling. |

### 6.2 Component Hierarchy

```
App.vue
├── AppShell.vue (layout frame: sidebar, topbar, content area)
│   ├── TopBar.vue
│   │   ├── ConnectionStatus.vue          ← useConnectionStore
│   │   ├── TimeRangeSelector.vue         ← useFilterStore (Phase 3+)
│   │   └── SymbolSearch.vue              ← useFilterStore (Phase 3+)
│   │
│   ├── Sidebar.vue (Phase 3+)
│   │   └── NavigationMenu.vue
│   │
│   └── DashboardPage.vue (main content)
│       ├── MetricsRow.vue
│       │   ├── MetricCard.vue            ← useMetricsStore (×N)
│       │   └── MetricCard.vue
│       │
│       ├── ChartGrid.vue
│       │   ├── ChartPanel.vue            ← wrapper with header + controls
│       │   │   └── LineChart.vue          ← generic chart component
│       │   ├── ChartPanel.vue
│       │   │   └── CandlestickChart.vue
│       │   └── ChartPanel.vue
│       │       └── AreaChart.vue
│       │
│       └── ActivityPanel.vue
│           └── ActivityFeed.vue          ← useActivityStore
│               └── ActivityItem.vue      ← single event row
│
├── StreamControls.vue                    ← pause/resume toggle
├── ThemeToggle.vue                       ← dark/light mode switch
└── StateOverlay.vue                      ← reusable loading/empty/error overlay
```

---

## 7. Component Taxonomy

### 7.1 Categories

| Category | Description | Examples |
|---|---|---|
| **Layout** | Structural shells. No data awareness. | `AppShell`, `ChartGrid`, `MetricsRow`, `Sidebar` |
| **Container** | Connects to stores, passes data down. Thin orchestration. | `DashboardPage`, `ChartPanel`, `ActivityPanel` |
| **Presentation** | Pure UI. Receives props, emits events. Zero store access. | `MetricCard`, `ActivityItem`, `ConnectionBadge`, `StateOverlay` |
| **Visualization** | Chart wrappers. Manage chart library instances. | `LineChart`, `CandlestickChart`, `AreaChart`, `BarChart` |
| **Control** | User input elements. Emit filter/action events. | `TimeRangeSelector`, `SymbolSearch`, `ChartTypeToggle`, `StreamControls`, `DatasetToggle`, `ThemeToggle` |

### 7.2 Reusable Visualization Components

All chart components follow the same contract:

```
Props:
  - data: T[]              (the data series)
  - config: ChartConfig    (colors, axes, labels)
  - size?: { w, h }        (optional explicit sizing)

Emits:
  - crosshair-move(point)  (for synced crosshairs across charts)
  - range-change(range)    (when user zooms/pans)

Internal:
  - Holds ECharts instance via template ref
  - Uses `watch(data, ...)` to call echarts.setOption() imperatively
  - Handles resize via ResizeObserver → echarts.resize()
  - Cleans up via echarts.dispose() in onUnmounted
```

### 7.3 Reusable MetricCard

```
Props:
  - label: string           ("24h Volume", "BTC Price", etc.)
  - value: string | number
  - previousValue?: number  (for delta calculation)
  - trend?: 'up' | 'down' | 'flat'
  - icon?: string
  - format?: 'currency' | 'percent' | 'number'

Computed internally:
  - deltaPercent (from value vs previousValue)
  - formatted display value
  - trend color (green/red/neutral)
```

### 7.4 Reusable ActivityFeed

```
Props:
  - events: ActivityEvent[]
  - maxVisible?: number      (virtual scroll window)

Each ActivityEvent:
  - id: string
  - type: 'trade' | 'alert' | 'system' | 'info'
  - message: string
  - timestamp: number
  - severity?: 'low' | 'medium' | 'high'
  - metadata?: Record<string, unknown>
```

---

## 8. Performance Strategy

### 8.1 The Performance Pyramid

```
          ┌─────────────┐
          │  RENDER GATE │  ← Only render what's visible
          │  (v-if, lazy)│
          ├─────────────┤
          │  SHALLOW     │  ← shallowRef, shallowReactive
          │  REACTIVITY  │     avoid deep proxy on large arrays
          ├─────────────┤
          │  IMPERATIVE  │  ← Chart.update() not re-mount
          │  CHART API   │     watch + imperative beats template diffing
          ├─────────────┤
          │  BATCH       │  ← TickBuffer collapses N messages
          │  MUTATIONS   │     into 1 store mutation per frame
          ├─────────────┤
          │  RAF-GATED   │  ← requestAnimationFrame as the
          │  FLUSH       │     clock for all data ingestion
          └─────────────┘
```

### 8.2 Specific Techniques

| Technique | What It Prevents |
|---|---|
| **RAF-gated TickBuffer** | Prevents 200 store mutations/sec → collapses to ~60/sec (one per frame) |
| **shallowRef for tick data** | Prevents Vue from deep-proxying every property of every candle/trade object |
| **Imperative chart updates** | Prevents full chart re-mount on every data change — just appends new points |
| **CircularBuffer with fixed size** | Prevents unbounded memory growth in long-running sessions |
| **Virtual scrolling on ActivityFeed** | Prevents rendering 10,000 DOM nodes for the event log |
| **`v-memo` on stable rows** | Prevents re-diffing list items whose data hasn't changed |
| **Web Worker for heavy computation** | Moves indicator calculations (RSI, MACD, moving averages) off the main thread (Phase 4+) |
| **Debounced filter changes** | Prevents data re-fetch storms when user rapidly changes filters |
| **Component-level `v-once`** | For truly static UI (headers, labels) — skip reactivity entirely |

### 8.3 Memory Management

- All data buffers have a hard cap (configurable per buffer type)
- On each flush, old data beyond the window is discarded
- `onUnmounted` hooks aggressively clean up chart instances, observers, and subscriptions
- Connection cleanup on page visibility change (`visibilitychange` API) — pause streams when tab is hidden

### 8.4 Responsive Strategy

| Breakpoint | Target | Layout Adaptation |
|---|---|---|
| `≥1280px` | Desktop | Full grid: metrics row + 2-3 chart columns + feed sidebar |
| `768–1279px` | Tablet | Stacked: metrics row → single chart column → feed below |
| `<768px` | Mobile | Single column, collapsible panels, swipeable chart tabs |

- CSS Grid with `auto-fit` / `minmax()` for chart panels
- Charts use `ResizeObserver` — no fixed pixel dimensions
- ActivityFeed collapses to compact mode on mobile
- MetricCards wrap naturally via flexbox

### 8.5 Error Resilience Strategy

| Scenario | Handler |
|---|---|
| WebSocket disconnect | Auto-reconnect with exponential backoff (1s → 2s → 4s → max 30s) |
| Malformed payload | `DataValidator` rejects silently, logs to ActivityFeed as system event |
| Empty state (no data yet) | `StateOverlay` shows skeleton/placeholder |
| Loading state | `StateOverlay` shows spinner |
| Connection failed permanently | `StateOverlay` shows retry button + error message |
| Rate limiting | Adapter detects 429/close codes, backs off automatically |

---

## 9. Key Modules & Services

| Module | Layer | Path | Purpose |
|---|---|---|---|
| `WebSocketAdapter` | Streaming | `src/services/streaming/` | Binance WebSocket connection |
| `MockStreamAdapter` | Streaming | `src/services/streaming/` | Simulated data fallback |
| `DataValidator` | Streaming | `src/services/streaming/` | Payload sanitisation + schema validation |
| `TickBuffer` | Streaming | `src/services/streaming/` | RAF-gated message batching |
| `MessageParser` | Streaming | `src/services/streaming/` | Raw → typed DTO transformation |
| `ConnectionManager` | Streaming | `src/services/streaming/` | Multi-stream orchestration + pause/resume |
| `useMarketStore` | State | `src/stores/` | Price, candle, trade state |
| `useMetricsStore` | State | `src/stores/` | Aggregated metric values |
| `useActivityStore` | State | `src/stores/` | Live event feed state |
| `useConnectionStore` | State | `src/stores/` | Connection health state |
| `useFilterStore` | State | `src/stores/` | User filter/preference state |
| `StreamingPlugin` | Bridge | `src/plugins/` | Wires Layer 1 → Layer 2 at app init |
| `LineChart` | UI | `src/components/charts/` | Generic line chart wrapper |
| `CandlestickChart` | UI | `src/components/charts/` | Candlestick chart wrapper |
| `AreaChart` | UI | `src/components/charts/` | Area chart wrapper |
| `BarChart` | UI | `src/components/charts/` | Bar chart wrapper |
| `MetricCard` | UI | `src/components/cards/` | Single KPI display |
| `ActivityFeed` | UI | `src/components/feed/` | Scrolling event log |
| `AppShell` | UI | `src/components/layout/` | Dashboard frame/skeleton |
| `CircularBuffer` | Utility | `src/utils/` | Fixed-size ring buffer |
| `formatters` | Utility | `src/utils/` | Currency, number, date formatters |

---

## 10. Architecture Summary

### 10.1 Key Modules / Services

**Streaming Layer (no Vue):**
- `StreamAdapter` (abstract) → `WebSocketAdapter`, `SSEAdapter`, `PollingAdapter`
- `TickBuffer` — RAF-gated batch accumulator
- `MessageParser` — schema validation + DTO mapping
- `ConnectionManager` — multi-feed lifecycle orchestrator

**State Layer (Pinia):**
- `useMarketStore` — tickers, candles, trades (per-symbol Maps)
- `useMetricsStore` — computed KPIs
- `useActivityStore` — circular event buffer
- `useConnectionStore` — health/status
- `useFilterStore` — user selections

**UI Layer (Vue SFCs):**
- **Layout:** `AppShell`, `ChartGrid`, `MetricsRow`
- **Visualization:** `LineChart`, `CandlestickChart`, `AreaChart`, `BarChart`
- **Data Display:** `MetricCard`, `ActivityFeed`, `ActivityItem`, `StateOverlay`
- **Controls:** `TimeRangeSelector`, `SymbolSearch`, `ChartTypeToggle`, `StreamControls`, `DatasetToggle`, `ThemeToggle`
- **Status:** `ConnectionStatus`, `ConnectionBadge`

**Bridge:**
- `StreamingPlugin` or `useStreamingBridge` — one-time wiring

### 10.2 Data Flow Diagram

```
┌──────────────┐     messages      ┌──────────────┐    batch     ┌──────────────┐
│   External   │ ──────────────▶   │  TickBuffer  │ ──────────▶  │  Pinia Store │
│  WebSocket   │   (per message)   │  (RAF gate)  │  (per frame) │  (reactive)  │
│   Server     │                   │              │              │              │
└──────────────┘                   └──────────────┘              └──────┬───────┘
                                                                       │
                                                          computed refs │
                                                                       ▼
                                                                ┌──────────────┐
                                                                │     Vue      │
                                                                │  Components  │
                                                                │  (render)    │
                                                                └──────────────┘
```

### 10.3 Component Categories

| Category | Count | Naming Convention |
|---|---|---|
| Layout | 3-4 | `*Shell`, `*Grid`, `*Row` |
| Container/Page | 2-3 | `*Page`, `*Panel` |
| Visualization | 4 | `*Chart` |
| Presentation | 3-4 | `*Card`, `*Item`, `*Badge` |
| Control | 3+ | `*Selector`, `*Search`, `*Toggle` |

---

## 11. Implementation Roadmap

### Phase 2 — Foundation Build
- [ ] Scaffold Vue 3 + TypeScript + Vite project
- [ ] Install and configure Pinia, Vue Router, Apache ECharts
- [ ] Implement `CircularBuffer` and `WindowedBuffer` utilities
- [ ] Implement `TickBuffer` with RAF-gated flushing
- [ ] Build `WebSocketAdapter` with auto-reconnect
- [ ] Build `MessageParser` with typed DTOs
- [ ] Create `useMarketStore` with `ingestBatch()` action
- [ ] Create `useConnectionStore`

### Phase 3 — Core UI
- [ ] Build `AppShell` layout with dark theme
- [ ] Build `MetricCard` component (props-driven)
- [ ] Build `MetricsRow` container
- [ ] Build generic `ChartPanel` wrapper
- [ ] Build `LineChart` with imperative update pattern
- [ ] Build `CandlestickChart`
- [ ] Build `ActivityFeed` with virtual scrolling
- [ ] Wire `StreamingPlugin` to connect all layers

### Phase 4 — Live Integration
- [ ] Connect to a real WebSocket feed (Binance, CoinCap, etc.)
- [ ] End-to-end data flow: WS → Buffer → Store → Charts
- [ ] Connection status indicator in TopBar
- [ ] Handle reconnect, backoff, and error states
- [ ] Implement `AreaChart` and `BarChart` variants

### Phase 5 — Interactivity
- [ ] `TimeRangeSelector` with filter store integration
- [ ] `SymbolSearch` / symbol switching
- [ ] Chart crosshair synchronization across panels
- [ ] Chart type toggle (line ↔ candle ↔ area)
- [ ] Responsive layout / grid rearrangement

### Phase 6 — Polish & Production
- [ ] Web Worker for indicator calculations (RSI, MACD, etc.)
- [ ] Page visibility pause/resume for streams
- [ ] Error boundary components
- [ ] Loading skeleton states
- [ ] Performance profiling and optimization pass
- [ ] Accessibility audit
- [ ] Unit + integration test suite

---

## 12. Decisions, Assumptions & Risks

### 12.1 Decisions Made

| # | Decision | Rationale |
|---|---|---|
| D1 | **Vue 3 Composition API only** — no Options API | Composables are essential for extracting streaming/store logic into reusable functions |
| D2 | **Pinia over Vuex** | First-class TypeScript support, simpler API, official recommendation |
| D3 | **Apache ECharts** as primary charting library | Supports all required chart types (line, bar, area, candlestick) plus bonus (heatmap, radar, geo). Imperative `setOption()` API suits our update pattern. Larger bundle (~300KB) but far more versatile than Lightweight Charts. |
| D4 | **RAF-gated TickBuffer** as the batching mechanism | Industry-standard approach for high-frequency UI updates; aligns with browser paint cycle |
| D5 | **shallowRef for all data buffers** | Deep reactivity on 500+ object arrays is prohibitively expensive |
| D6 | **StreamAdapter abstract class pattern** | Future-proofs for SSE/polling without touching store or UI code |
| D7 | **Streaming logic has zero Vue dependency** | Enables unit testing without Vue, keeps Layer 1 portable |
| D8 | **Dark theme as default, light mode available** | Standard for financial dashboards; PRD requires dark/light toggle |
| D9 | **MockStreamAdapter as first-class fallback** | Ensures demo-ability when Binance is unreachable; same interface as real adapter |
| D10 | **DataValidator as explicit sanitisation gate** | PRD mandates payload validation and safe data handling; no raw data reaches stores |

### 12.2 Assumptions

| # | Assumption |
|---|---|
| A1 | **Binance WebSocket** public streams as primary data source (JSON frames) |
| A2 | MockStreamAdapter used during development and as demo fallback |
| A3 | The dashboard is single-page (no multi-page routing needed initially) |
| A4 | Target browser: modern evergreen browsers (Chrome, Firefox, Safari, Edge) |
| A5 | Single-user application (no multi-tenancy, no auth) |
| A6 | Data volume: up to ~200 messages/second per symbol, 1-5 active symbols |
| A7 | Must be responsive across desktop, tablet, and mobile viewports |

### 12.3 Risks & Trade-offs

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Apache ECharts larger bundle size (~300KB) may affect initial load** | Use lazy-loaded chart modules and route-level code splitting |
| R2 | **shallowRef requires manual trigger of reactivity** | Document the pattern clearly; enforce via code review and linting rules |
| R3 | **WebSocket APIs have rate limits / require API keys** | Use CoinCap (free, no key) for dev; abstract the adapter so swapping is trivial |
| R4 | **Memory leaks from long-running streams** | CircularBuffer caps + aggressive cleanup in `onUnmounted` + visibility API pause |
| R5 | **Complex state synchronization across multiple symbols** | Per-symbol Maps in stores with clear keying; avoid cross-symbol derived state initially |
| R6 | **TickBuffer introduces ~16ms latency** | Acceptable for dashboard use; sub-frame latency is imperceptible to users |

---

## Directory Structure (Planned)

```
nerve-board/
├── public/
├── src/
│   ├── App.vue
│   ├── main.ts
│   │
│   ├── assets/                    # Static assets, fonts, icons
│   │
│   ├── components/
│   │   ├── layout/                # AppShell, TopBar, Sidebar
│   │   ├── charts/                # LineChart, CandlestickChart, AreaChart, BarChart
│   │   ├── cards/                 # MetricCard
│   │   ├── feed/                  # ActivityFeed, ActivityItem
│   │   ├── controls/              # TimeRangeSelector, SymbolSearch, ChartTypeToggle
│   │   └── status/                # ConnectionStatus, ConnectionBadge
│   │
│   ├── pages/                     # DashboardPage (and future pages)
│   │
│   ├── stores/                    # Pinia stores
│   │   ├── market.ts
│   │   ├── metrics.ts
│   │   ├── activity.ts
│   │   ├── connection.ts
│   │   ├── filter.ts
│   │   └── ui.ts
│   │
│   ├── services/
│   │   └── streaming/             # StreamAdapter, WebSocketAdapter, TickBuffer, etc.
│   │
│   ├── plugins/                   # StreamingPlugin (Layer 1 ↔ Layer 2 bridge)
│   │
│   ├── composables/               # Derived state + reusable composition functions
│   │   ├── useChartSeries.ts      # Store → ECharts-ready series data
│   │   ├── useDerivedMetrics.ts   # Store → computed KPIs for cards
│   │   ├── useFilteredData.ts     # Store + filters → filtered datasets
│   │   ├── useFormattedFeed.ts    # Store → UI-ready activity feed
│   │   ├── useChartResize.ts
│   │   ├── useStreamingBridge.ts
│   │   └── useFormatters.ts
│   │
│   ├── types/                     # TypeScript interfaces and DTOs
│   │   ├── market.ts
│   │   ├── activity.ts
│   │   ├── streaming.ts
│   │   └── chart.ts
│   │
│   └── utils/                     # CircularBuffer, WindowedBuffer, formatters
│       ├── CircularBuffer.ts
│       ├── WindowedBuffer.ts
│       └── formatters.ts
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```
