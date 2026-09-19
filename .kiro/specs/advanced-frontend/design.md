# Design Document: Sovereign-AMM Advanced Frontend

## Executive Summary

The Sovereign-AMM Advanced Frontend is a high-frequency trading terminal built with Next.js 14, designed to visualize and control a 10 Hz energy matching engine. The system separates public marketing from authenticated trading interfaces, implements real-time data streaming via WebSocket, and provides deterministic numerical displays optimized for financial precision.

**Core Architecture:** Next.js 14 App Router with TypeScript, Zustand state management, Recharts visualization, Tailwind CSS styling, and native WebSocket integration.

**Key Design Decisions:**
- **Public/Authenticated Separation:** Distinct route groups for marketing vs. trading functionality
- **10 Hz Real-Time Updates:** Zustand store as single source of truth, selective component subscriptions
- **70/30 Carousel-Sidebar Layout:** Rotating visualization focus with persistent auxiliary content
- **Monospace Numerical Precision:** 6-12 decimal places with vertical alignment for financial data
- **Dark Mode Theming:** Emerald Green (#10b981) for bids, Rose Red (#e11d48) for asks on slate-950 background

## Technology Stack

### Core Framework
- **Next.js 14.2+** with App Router architecture
- **React 18.3+** for component rendering
- **TypeScript 5.4+** with strict mode enabled

### State Management
- **Zustand 4.5+** for global state with selective subscriptions
- Native WebSocket API for real-time communication

### UI Libraries
- **Tailwind CSS 3.4+** for utility-first styling
- **Recharts 2.12+** for declarative chart components
- **Lucide React 0.344+** for icon components

### Development Tools
- **ESLint** with Next.js recommended rules
- **TypeScript ESLint** for type-aware linting
- **Prettier** for code formatting

## Architecture Overview

### Directory Structure

```
frontend/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                    # Landing page
│   │   ├── about/page.tsx
│   │   └── contact/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Dashboard layout with auth check
│   │   ├── dashboard/page.tsx
│   │   ├── grid/page.tsx
│   │   ├── battery/page.tsx
│   │   └── pricing/page.tsx
│   ├── layout.tsx                      # Root layout
│   └── globals.css
├── components/
│   ├── navigation/
│   │   ├── Navbar.tsx
│   │   ├── MobileMenu.tsx
│   │   └── AuthButtons.tsx
│   ├── hero/
│   │   └── HeroSection.tsx
│   ├── ticker/
│   │   └── TickerTape.tsx
│   ├── carousel/
│   │   ├── FeatureCarousel.tsx
│   │   ├── L2DepthChart.tsx
│   │   ├── PriceChart.tsx
│   │   └── ControlPowerDetails.tsx
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── RecentArticles.tsx
│   │   └── RagCopilot.tsx
│   ├── cards/
│   │   ├── BatteryGauge.tsx
│   │   ├── QuoteExplanation.tsx
│   │   └── JudgeControls.tsx
│   ├── footer/
│   │   └── Footer.tsx
│   └── ui/
│       ├── ConnectionStatus.tsx
│       └── ErrorBanner.tsx
├── store/
│   ├── marketStore.ts                  # Zustand store for market data
│   └── authStore.ts                    # Zustand store for auth state
├── hooks/
│   ├── useWebSocket.ts                 # WebSocket connection management
│   ├── useAuth.ts                      # Authentication utilities
│   └── useDebounce.ts                  # Debouncing for slider updates
├── lib/
│   ├── websocket.ts                    # WebSocket client implementation
│   ├── api.ts                          # API client for REST endpoints
│   ├── formatters.ts                   # Number formatting utilities
│   └── validators.ts                   # Data validation functions
└── types/
    ├── market.ts                       # Market data type definitions
    └── auth.ts                         # Auth type definitions
```

### Route Groups Strategy

**Public Routes (`(public)` group):**
- Landing page (`/`)
- About page (`/about`)
- Contact page (`/contact`)
- No authentication required
- Shared public layout with simplified navigation

**Auth Routes (`(auth)` group):**
- Login page (`/login`)
- Registration page (`/register`)
- Minimal layout without main navigation

**Dashboard Routes (`(dashboard)` group):**
- Dashboard (`/dashboard`)
- Grid visualization (`/grid`)
- Battery monitoring (`/battery`)
- Pricing controls (`/pricing`)
- Protected by authentication middleware
- Shared dashboard layout with full navigation and WebSocket connection

## State Management Architecture

### Zustand Store Design

The application uses two primary Zustand stores:

#### Market Store (`marketStore.ts`)

```typescript
interface MarketState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  lastUpdate: number;
  
  // Current tick data
  tickNumber: number;
  microPrice: number;
  bestBid: number;
  bestAsk: number;
  
  // Battery state
  batterySOC: number;
  batteryInventory: number;
  
  // Order book
  bids: Array<{ price: number; volume: number }>;
  asks: Array<{ price: number; volume: number }>;
  
  // AMM quotes
  ammBid: number | null;
  ammAsk: number | null;
  
  // Quote breakdown
  quoteBreakdown: {
    basePrice: number;
    spread: number;
    deltaBid: number;
    deltaAsk: number;
    degradationCost: number;
  } | null;
  
  // Time series (limited to 100 points)
  timeSeries: Array<{
    tick: number;
    microPrice: number;
    soc: number;
  }>;
  
  // Actions
  updateFromTick: (tickData: TickMessage) => void;
  setConnectionState: (connected: boolean, error?: string) => void;
  clearStore: () => void;
}
```

**Store Update Strategy:**
- `updateFromTick()`: Single atomic update from WebSocket message
- Limits `timeSeries` array to most recent 100 points (shift old data)
- Updates `lastUpdate` timestamp for staleness detection
- Immutable updates using spread operators for React re-render optimization

#### Auth Store (`authStore.ts`)

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  token: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}
```

**Authentication Flow:**
1. User submits credentials on login page
2. `login()` action calls backend API, receives JWT token
3. Token stored in HTTP-only cookie via `Set-Cookie` header
4. `checkAuth()` validates token on dashboard route access
5. Failed validation redirects to `/login`

### Component Subscription Pattern

Components subscribe to specific store slices to prevent unnecessary re-renders:

```typescript
// Subscribe only to microPrice
const microPrice = useMarketStore(state => state.microPrice);

// Subscribe to multiple related fields
const { bestBid, bestAsk } = useMarketStore(
  state => ({ bestBid: state.bestBid, bestAsk: state.bestAsk }),
  shallow // Use shallow comparison for object subscriptions
);
```

**Memoization Strategy:**
- Use `React.memo()` for pure presentational components
- Use `useMemo()` for expensive calculations (e.g., chart data transformations)
- Use `useCallback()` for event handlers passed to child components

## WebSocket Integration Architecture

### Connection Lifecycle

```typescript
// useWebSocket.ts
export function useWebSocket(url: string, token: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const connect = useCallback(() => {
    const websocket = new WebSocket(`${url}?token=${token}`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      useMarketStore.getState().setConnectionState(true);
      setReconnectAttempts(0);
    };
    
    websocket.onmessage = (event) => {
      try {
        const tickData = JSON.parse(event.data);
        validateTickMessage(tickData); // Type validation
        useMarketStore.getState().updateFromTick(tickData);
      } catch (error) {
        console.error('Invalid tick message:', error);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      useMarketStore.getState().setConnectionState(false, 'Connection error');
    };
    
    websocket.onclose = () => {
      console.log('WebSocket closed');
      useMarketStore.getState().setConnectionState(false);
      
      // Exponential backoff reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }, delay);
    };
    
    setWs(websocket);
  }, [url, token, reconnectAttempts]);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      ws?.close();
    };
  }, []);
  
  return ws;
}
```

### Tick Message Validation

```typescript
// validators.ts
interface TickMessage {
  tick: number;
  micro_price: number;
  best_bid: number;
  best_ask: number;
  battery_soc: number;
  battery_inventory: number;
  bids: Array<[number, number]>; // [price, volume] tuples
  asks: Array<[number, number]>;
  amm_bid: number | null;
  amm_ask: number | null;
  quote_breakdown?: {
    base_price: number;
    spread: number;
    delta_bid: number;
    delta_ask: number;
    c_deg: number;
  };
}

export function validateTickMessage(data: unknown): asserts data is TickMessage {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Tick message must be an object');
  }
  
  const msg = data as Record<string, unknown>;
  
  // Required numeric fields
  const requiredNumbers = [
    'tick', 'micro_price', 'best_bid', 'best_ask',
    'battery_soc', 'battery_inventory'
  ];
  
  for (const field of requiredNumbers) {
    if (typeof msg[field] !== 'number') {
      throw new Error(`Field ${field} must be a number`);
    }
  }
  
  // Required array fields
  if (!Array.isArray(msg.bids) || !Array.isArray(msg.asks)) {
    throw new Error('Bids and asks must be arrays');
  }
  
  // Validate bid/ask tuples
  for (const bid of msg.bids) {
    if (!Array.isArray(bid) || bid.length !== 2 || 
        typeof bid[0] !== 'number' || typeof bid[1] !== 'number') {
      throw new Error('Each bid must be a [price, volume] tuple');
    }
  }
  
  for (const ask of msg.asks) {
    if (!Array.isArray(ask) || ask.length !== 2 || 
        typeof ask[0] !== 'number' || typeof ask[1] !== 'number') {
      throw new Error('Each ask must be a [price, volume] tuple');
    }
  }
  
  // Optional fields validation
  if (msg.amm_bid !== null && typeof msg.amm_bid !== 'number') {
    throw new Error('amm_bid must be a number or null');
  }
  
  if (msg.amm_ask !== null && typeof msg.amm_ask !== 'number') {
    throw new Error('amm_ask must be a number or null');
  }
}
```

### Exponential Backoff Strategy

**Reconnection Delay Formula:** `delay = min(1000 * 2^attempts, 30000)`

| Attempt | Delay (ms) |
|---------|------------|
| 0       | 1,000      |
| 1       | 2,000      |
| 2       | 4,000      |
| 3       | 8,000      |
| 4       | 16,000     |
| 5+      | 30,000 (capped) |

## Component Design Specifications

### Navigation System

#### Navbar Component

```typescript
// components/navigation/Navbar.tsx
interface NavbarProps {
  className?: string;
}

const navigationTabs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Grid', href: '/grid' },
  { label: 'Battery', href: '/battery' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar({ className }: NavbarProps) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <nav className={cn('bg-slate-900 border-b border-slate-800', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-white">
              Sovereign-AMM
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="flex items-center space-x-4">
              {navigationTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === tab.href
                      ? 'bg-slate-800 text-white' // Active state
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          )}
          
          {/* Auth Buttons / User Menu */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <UserMenu user={user} />
            ) : (
              <AuthButtons />
            )}
            
            {/* Mobile Hamburger */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="ml-4 p-2 rounded-md text-slate-300 hover:bg-slate-700"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMobile && mobileMenuOpen && (
        <MobileMenu tabs={navigationTabs} currentPath={pathname} />
      )}
    </nav>
  );
}
```

**Design Rationale:**
- Fixed navigation height (64px) for layout predictability
- Active tab styling uses higher contrast background for visual feedback
- Mobile breakpoint at 768px triggers hamburger menu
- Logo positioned at left edge with consistent branding
- Smooth transitions for hover states

#### Mobile Menu Component

```typescript
// components/navigation/MobileMenu.tsx
interface MobileMenuProps {
  tabs: Array<{ label: string; href: string }>;
  currentPath: string;
}

export function MobileMenu({ tabs, currentPath }: MobileMenuProps) {
  return (
    <div className="md:hidden bg-slate-900 border-t border-slate-800">
      <div className="px-2 pt-2 pb-3 space-y-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'block px-3 py-2 rounded-md text-base font-medium',
              currentPath === tab.href
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Hero Section

```typescript
// components/hero/HeroSection.tsx
export function HeroSection() {
  return (
    <section className="relative w-full bg-slate-950 overflow-hidden">
      {/* Dark Geometric Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-800/[0.05] bg-[size:40px_40px]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="text-center">
          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
            Energy Trading
            <span className="block text-emerald-500">Meets Grid Physics</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto">
            High-frequency limit order book for microgrid energy markets with 
            battery-based algorithmic market making
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold rounded-lg transition-colors"
            >
              Sign Up Now
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white text-lg font-semibold rounded-lg border border-slate-600 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Design Rationale:**
- Full viewport width with dark geometric grid background for visual depth
- Headline font size scales responsively (48px → 72px)
- Primary CTA (Sign Up) uses emerald green for visual hierarchy
- Secondary CTA (Sign In) uses bordered ghost button style
- Vertical padding creates breathing room (96px → 128px)

### Ticker Tape

```typescript
// components/ticker/TickerTape.tsx
export function TickerTape() {
  const { microPrice, bestBid, bestAsk, batterySOC, isConnected } = useMarketStore(
    state => ({
      microPrice: state.microPrice,
      bestBid: state.bestBid,
      bestAsk: state.bestAsk,
      batterySOC: state.batterySOC,
      isConnected: state.isConnected,
    }),
    shallow
  );
  
  return (
    <div className="sticky top-16 z-40 w-full bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div 
          className="flex items-center justify-between gap-8"
          role="status"
          aria-live="polite"
          aria-label="Market data ticker"
        >
          <TickerItem
            label="MICRO PRICE"
            value={formatPrice(microPrice, 8)}
            className="text-white"
          />
          <TickerItem
            label="BEST BID"
            value={formatPrice(bestBid, 8)}
            className="text-emerald-500"
          />
          <TickerItem
            label="BEST ASK"
            value={formatPrice(bestAsk, 8)}
            className="text-rose-500"
          />
          <TickerItem
            label="SoC"
            value={formatPercentage(batterySOC, 6)}
            className="text-white"
          />
          
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-emerald-500' : 'bg-rose-500'
            )} />
            <span className="text-xs text-slate-400">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TickerItemProps {
  label: string;
  value: string;
  className?: string;
}

function TickerItem({ label, value, className }: TickerItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <span className={cn('text-lg font-mono font-semibold', className)}>
        {value}
      </span>
    </div>
  );
}
```

**Design Rationale:**
- Sticky positioning below navbar (top: 64px) maintains visibility during scroll
- Monospace font ensures decimal alignment and consistent width
- ARIA live region announces price updates to screen readers
- Color coding: Emerald for bids (buy/supply), Rose for asks (sell/demand)
- Connection status indicator provides immediate feedback on data freshness
- Horizontal layout with equal spacing for visual balance

### Feature Carousel

```typescript
// components/carousel/FeatureCarousel.tsx
type CarouselPanel = 'depth' | 'price' | 'power';

const panels: Array<{ id: CarouselPanel; title: string; component: React.ComponentType }> = [
  { id: 'depth', title: 'L2 Order Book Depth', component: L2DepthChart },
  { id: 'price', title: 'Price & State History', component: PriceChart },
  { id: 'power', title: 'Grid Topology', component: ControlPowerDetails },
];

export function FeatureCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };
  
  const goToNext = () => {
    setCurrentIndex(prev => Math.min(panels.length - 1, prev + 1));
  };
  
  const CurrentPanel = panels[currentIndex].component;
  
  return (
    <div className="relative w-full lg:w-[70%]">
      {/* Panel Container */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            {panels[currentIndex].title}
          </h2>
          
          {/* Navigation Controls */}
          <div className="flex gap-2">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={cn(
                'p-2 rounded-md transition-colors',
                currentIndex === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:bg-slate-800'
              )}
              aria-label="Previous panel"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === panels.length - 1}
              className={cn(
                'p-2 rounded-md transition-colors',
                currentIndex === panels.length - 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:bg-slate-800'
              )}
              aria-label="Next panel"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* Active Panel */}
        <div className="min-h-[400px]">
          <CurrentPanel />
        </div>
        
        {/* Panel Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {panels.map((panel, index) => (
            <button
              key={panel.id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentIndex ? 'bg-emerald-500' : 'bg-slate-700'
              )}
              aria-label={`Go to ${panel.title}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Design Rationale:**
- 70% width on desktop (lg breakpoint), full width on mobile
- Manual navigation only (no auto-advance) prevents disruptive transitions
- Chevron buttons disabled at boundaries to prevent confusion
- Panel indicators provide quick navigation and current position feedback
- Minimum height prevents layout shift between panels
- Border and rounded corners create card-style elevation

### Sidebar

```typescript
// components/sidebar/Sidebar.tsx
export function Sidebar() {
  return (
    <aside className="w-full lg:w-[30%] space-y-6">
      {/* Recent Articles Section */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Recent Articles</h3>
        <RecentArticles />
      </div>
      
      {/* RAG Copilot Section */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Ask AI</h3>
        <RagCopilot />
      </div>
    </aside>
  );
}
```

**Responsive Behavior:**
- Desktop (≥1024px): 30% width, positioned adjacent to carousel
- Tablet/Mobile (<1024px): Full width, stacked below carousel
- Vertical spacing between sections maintains visual separation

### L2 Depth Chart

```typescript
// components/carousel/L2DepthChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function L2DepthChart() {
  const { bids, asks, ammBid, ammAsk } = useMarketStore(
    state => ({
      bids: state.bids,
      asks: state.asks,
      ammBid: state.ammBid,
      ammAsk: state.ammAsk,
    }),
    shallow
  );
  
  // Transform data for horizontal bar chart
  const chartData = useMemo(() => {
    // Bids: negative volumes (extend left)
    const bidBars = bids.map(([price, volume]) => ({
      price: price,
      bidVolume: -volume, // Negative for left extension
      askVolume: 0,
      isAmmBid: price === ammBid,
    }));
    
    // Asks: positive volumes (extend right)
    const askBars = asks.map(([price, volume]) => ({
      price: price,
      bidVolume: 0,
      askVolume: volume,
      isAmmAsk: price === ammAsk,
    }));
    
    // Combine and sort by price
    return [...bidBars, ...askBars].sort((a, b) => b.price - a.price);
  }, [bids, asks, ammBid, ammAsk]);
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        
        {/* Price axis (vertical) */}
        <YAxis
          type="category"
          dataKey="price"
          tick={{ fill: '#cbd5e1', fontFamily: 'monospace', fontSize: 12 }}
          tickFormatter={(value) => formatPrice(value, 6)}
        />
        
        {/* Volume axis (horizontal) */}
        <XAxis
          type="number"
          tick={{ fill: '#cbd5e1', fontFamily: 'monospace', fontSize: 12 }}
          tickFormatter={(value) => Math.abs(value).toString()}
        />
        
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
          formatter={(value: number) => [Math.abs(value).toString(), 'Volume']}
          labelFormatter={(price) => `Price: ${formatPrice(price, 6)}`}
        />
        
        {/* Bid bars (left, emerald) */}
        <Bar dataKey="bidVolume" stackId="a">
          {chartData.map((entry, index) => (
            <Cell
              key={`bid-${index}`}
              fill={entry.isAmmBid ? '#059669' : '#10b981'} // Darker for AMM
              stroke={entry.isAmmBid ? '#ffffff' : 'none'}
              strokeWidth={entry.isAmmBid ? 2 : 0}
            />
          ))}
        </Bar>
        
        {/* Ask bars (right, rose) */}
        <Bar dataKey="askVolume" stackId="a">
          {chartData.map((entry, index) => (
            <Cell
              key={`ask-${index}`}
              fill={entry.isAmmAsk ? '#be123c' : '#e11d48'} // Darker for AMM
              stroke={entry.isAmmAsk ? '#ffffff' : 'none'}
              strokeWidth={entry.isAmmAsk ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Design Rationale:**
- Horizontal bar chart with price on Y-axis for natural order book visualization
- Negative volumes for bids create leftward extension from center
- Emerald green (#10b981) for bids, rose red (#e11d48) for asks
- AMM quotes highlighted with darker shade and white border (2px stroke)
- Monospace font for price labels ensures decimal alignment
- 6 decimal places for prices, integers for volumes
- Dark grid lines (#334155) maintain visibility without distraction
- Recharts ResponsiveContainer ensures scaling across viewport sizes

### Price Chart

```typescript
// components/carousel/PriceChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function PriceChart() {
  const timeSeries = useMarketStore(state => state.timeSeries);
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={timeSeries}
        margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        
        {/* Tick number axis (horizontal) */}
        <XAxis
          dataKey="tick"
          tick={{ fill: '#cbd5e1', fontFamily: 'monospace', fontSize: 12 }}
          label={{ value: 'Tick Number', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
        />
        
        {/* Micro price axis (left, primary) */}
        <YAxis
          yAxisId="left"
          tick={{ fill: '#cbd5e1', fontFamily: 'monospace', fontSize: 12 }}
          label={{ value: 'Micro Price', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          tickFormatter={(value) => formatPrice(value, 8)}
        />
        
        {/* State of charge axis (right, secondary) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: '#cbd5e1', fontFamily: 'monospace', fontSize: 12 }}
          label={{ value: 'State of Charge (%)', angle: 90, position: 'insideRight', fill: '#94a3b8' }}
          tickFormatter={(value) => formatPercentage(value, 2)}
        />
        
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
          formatter={(value: number, name: string) => {
            if (name === 'Micro Price') return formatPrice(value, 8);
            if (name === 'SoC') return formatPercentage(value, 6);
            return value;
          }}
        />
        
        <Legend
          wrapperStyle={{ color: '#cbd5e1' }}
        />
        
        {/* Micro price line */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="microPrice"
          name="Micro Price"
          stroke="#3b82f6" // Blue
          strokeWidth={2}
          dot={false}
          isAnimationActive={false} // Disable for 10 Hz updates
        />
        
        {/* State of charge line */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="soc"
          name="SoC"
          stroke="#f59e0b" // Amber
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Design Rationale:**
- Dual Y-axis design: left for micro price, right for SoC percentage
- Blue line for price, amber line for SoC (high contrast against dark background)
- Tick number on X-axis shows temporal progression
- Animation disabled for smooth 10 Hz updates without transition lag
- Dots disabled on line chart to reduce visual clutter at high frequency
- 100-point limit in store ensures chart doesn't slow down over time
- Monospace tick labels for consistent formatting

### Control Power Details

```typescript
// components/carousel/ControlPowerDetails.tsx
interface GridNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface GridLine {
  from: string;
  to: string;
  capacity: number;
  currentFlow: number;
  ptdf: number;
}

export function ControlPowerDetails() {
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  
  // Mock topology - would be loaded from backend
  const nodes: GridNode[] = [
    { id: 'bus1', x: 100, y: 150, label: 'Bus 1' },
    { id: 'bus2', x: 300, y: 150, label: 'Bus 2' },
    { id: 'bus3', x: 200, y: 300, label: 'Bus 3' },
  ];
  
  const lines: GridLine[] = [
    { from: 'bus1', to: 'bus2', capacity: 1000, currentFlow: 450, ptdf: 0.67 },
    { from: 'bus2', to: 'bus3', capacity: 800, currentFlow: 320, ptdf: 0.45 },
    { from: 'bus1', to: 'bus3', capacity: 1200, currentFlow: -150, ptdf: 0.33 },
  ];
  
  const getLineColor = (currentFlow: number, capacity: number) => {
    const utilization = Math.abs(currentFlow) / capacity;
    if (utilization > 0.9) return '#ef4444'; // Red - high utilization
    if (utilization > 0.7) return '#f59e0b'; // Amber - medium utilization
    return '#10b981'; // Emerald - low utilization
  };
  
  return (
    <div className="space-y-4">
      {/* SVG Topology Visualization */}
      <svg
        viewBox="0 0 400 400"
        className="w-full h-80 bg-slate-800 rounded-lg border border-slate-700"
      >
        {/* Draw lines first (behind nodes) */}
        {lines.map((line, index) => {
          const fromNode = nodes.find(n => n.id === line.from)!;
          const toNode = nodes.find(n => n.id === line.to)!;
          const lineId = `${line.from}-${line.to}`;
          const isSelected = selectedLine === lineId;
          
          // Arrow direction based on flow sign
          const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
          const arrowX = (fromNode.x + toNode.x) / 2 + 20 * Math.cos(angle);
          const arrowY = (fromNode.y + toNode.y) / 2 + 20 * Math.sin(angle);
          
          return (
            <g key={lineId}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={getLineColor(line.currentFlow, line.capacity)}
                strokeWidth={isSelected ? 4 : 2}
                onClick={() => setSelectedLine(lineId)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
              {/* Flow direction arrow */}
              {line.currentFlow !== 0 && (
                <polygon
                  points={`${arrowX},${arrowY - 5} ${arrowX + 10},${arrowY} ${arrowX},${arrowY + 5}`}
                  fill={getLineColor(line.currentFlow, line.capacity)}
                  transform={`rotate(${(angle * 180) / Math.PI}, ${arrowX}, ${arrowY})`}
                />
              )}
            </g>
          );
        })}
        
        {/* Draw nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={20}
              fill="#1e293b"
              stroke="#3b82f6"
              strokeWidth={2}
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dy="0.3em"
              fill="#cbd5e1"
              fontSize="12"
              fontWeight="bold"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      
      {/* Line Details Panel */}
      {selectedLine && (() => {
        const line = lines.find(l => `${l.from}-${l.to}` === selectedLine)!;
        const utilization = Math.abs(line.currentFlow) / line.capacity;
        
        return (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h4 className="text-lg font-bold text-white mb-2">
              Line {line.from} → {line.to}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Capacity:</span>
                <span className="ml-2 font-mono text-white">{line.capacity} MW</span>
              </div>
              <div>
                <span className="text-slate-400">Current Flow:</span>
                <span className="ml-2 font-mono text-white">{line.currentFlow} MW</span>
              </div>
              <div>
                <span className="text-slate-400">Utilization:</span>
                <span className="ml-2 font-mono text-white">
                  {formatPercentage(utilization, 2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">PTDF:</span>
                <span className="ml-2 font-mono text-white">{line.ptdf.toFixed(4)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
```

**Design Rationale:**
- SVG-based topology allows scalable, interactive visualization
- Color-coded lines indicate utilization: green (low), amber (medium), red (high)
- Arrow indicators show power flow direction based on sign
- Click interaction highlights line and displays detailed metrics
- PTDF values shown with 4 decimal places for sensitivity analysis
- Dark slate background provides contrast for colored elements

### Battery Gauge

```typescript
// components/cards/BatteryGauge.tsx
export function BatteryGauge() {
  const batterySOC = useMarketStore(state => state.batterySOC);
  
  // Calculate arc parameters (270-degree gauge)
  const arcStart = -135; // degrees
  const arcEnd = 135; // degrees
  const arcRange = arcEnd - arcStart;
  const currentAngle = arcStart + (batterySOC / 100) * arcRange;
  
  // Color gradient based on SoC
  const getGaugeColor = (soc: number) => {
    if (soc < 20) return '#ef4444'; // Red
    if (soc < 40) return '#f59e0b'; // Amber
    if (soc < 60) return '#eab308'; // Yellow
    if (soc < 80) return '#84cc16'; // Lime
    return '#10b981'; // Emerald
  };
  
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* SVG Gauge */}
      <svg viewBox="0 0 200 150" className="w-full max-w-xs">
        {/* Background arc */}
        <path
          d={describeArc(100, 100, 70, arcStart, arcEnd)}
          fill="none"
          stroke="#334155"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Filled arc */}
        <path
          d={describeArc(100, 100, 70, arcStart, currentAngle)}
          fill="none"
          stroke={getGaugeColor(batterySOC)}
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Center needle */}
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.cos((currentAngle * Math.PI) / 180)}
          y2={100 + 60 * Math.sin((currentAngle * Math.PI) / 180)}
          stroke="#ffffff"
          strokeWidth="2"
        />
        
        {/* Center dot */}
        <circle cx="100" cy="100" r="5" fill="#ffffff" />
      </svg>
      
      {/* Numeric Display */}
      <div className="text-center">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
          State of Charge
        </div>
        <div className="text-4xl font-mono font-bold text-white">
          {formatPercentage(batterySOC, 6)}
        </div>
      </div>
    </div>
  );
}

// Helper function to describe SVG arc path
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}
```

**Design Rationale:**
- 270-degree arc provides clear visual range without full circle
- Color gradient from red (low) to green (high) provides immediate status feedback
- Needle indicator shows precise position within arc
- 6 decimal place precision for numeric display (e.g., "87.654321%")
- Monospace font ensures consistent width for changing values
- SVG scales responsively while maintaining proportions

### Quote Explanation

```typescript
// components/cards/QuoteExplanation.tsx
export function QuoteExplanation() {
  const quoteBreakdown = useMarketStore(state => state.quoteBreakdown);
  
  if (!quoteBreakdown) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        No quote data available
      </div>
    );
  }
  
  const { basePrice, spread, deltaBid, deltaAsk, degradationCost } = quoteBreakdown;
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">GLFT Quote Breakdown</h3>
      
      <div className="space-y-3">
        <QuoteRow
          label="Base Price"
          value={formatPrice(basePrice, 8)}
          tooltip="Reference price from micro-price calculation"
        />
        <QuoteRow
          label="Spread"
          value={formatPrice(spread, 8)}
          tooltip="Bid-ask spread based on gamma (risk aversion)"
        />
        <QuoteRow
          label="Delta Bid"
          value={formatPrice(deltaBid, 8)}
          color="text-emerald-500"
          tooltip="Bid adjustment based on inventory position"
        />
        <QuoteRow
          label="Delta Ask"
          value={formatPrice(deltaAsk, 8)}
          color="text-rose-500"
          tooltip="Ask adjustment based on inventory position"
        />
        <QuoteRow
          label="Degradation Cost"
          value={formatPrice(degradationCost, 8)}
          tooltip="Battery wear cost from rainflow cycle counting"
        />
      </div>
      
      {/* Final Quotes */}
      <div className="pt-4 border-t border-slate-700 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Final Bid:</span>
          <span className="text-xl font-mono font-bold text-emerald-500">
            {formatPrice(basePrice - spread / 2 + deltaBid - degradationCost, 8)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Final Ask:</span>
          <span className="text-xl font-mono font-bold text-rose-500">
            {formatPrice(basePrice + spread / 2 + deltaAsk + degradationCost, 8)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface QuoteRowProps {
  label: string;
  value: string;
  color?: string;
  tooltip: string;
}

function QuoteRow({ label, value, color = 'text-white', tooltip }: QuoteRowProps) {
  return (
    <div className="flex justify-between items-center group">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">{label}</span>
        <Tooltip content={tooltip}>
          <Info className="h-4 w-4 text-slate-500 hover:text-slate-300 cursor-help" />
        </Tooltip>
      </div>
      <span className={cn('text-lg font-mono font-semibold', color)}>
        {value}
      </span>
    </div>
  );
}
```

**Design Rationale:**
- Itemized breakdown shows each GLFT pricing component
- Tooltip icons provide educational context for each term
- Color coding: emerald for bid-related, rose for ask-related values
- Final quotes calculated and displayed at bottom with emphasis
- 8 decimal place precision throughout for price accuracy
- Monospace font ensures decimal alignment in value column
- Conditional rendering handles missing quote data gracefully

### Judge Controls

```typescript
// components/cards/JudgeControls.tsx
interface SliderConfig {
  key: 'gamma' | 'kappa' | 'q_max' | 'a_deg';
  label: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  unit?: string;
}

const sliders: SliderConfig[] = [
  { key: 'gamma', label: 'Gamma (Risk Aversion)', min: 0.01, max: 10.0, step: 0.01, decimals: 2 },
  { key: 'kappa', label: 'Kappa (Market Impact)', min: 0.001, max: 1.0, step: 0.001, decimals: 3 },
  { key: 'q_max', label: 'Q_max (Max Inventory)', min: 1000000, max: 100000000, step: 1000000, decimals: 0, unit: 'Wh' },
  { key: 'a_deg', label: 'A_deg (Degradation Factor)', min: 0.0, max: 1000.0, step: 1.0, decimals: 2 },
];

export function JudgeControls() {
  const isConnected = useMarketStore(state => state.isConnected);
  const [values, setValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  
  // Load initial values on mount
  useEffect(() => {
    async function loadParameters() {
      try {
        const response = await fetch('/api/parameters');
        const data = await response.json();
        setValues(data);
      } catch (error) {
        console.error('Failed to load parameters:', error);
      }
    }
    loadParameters();
  }, []);
  
  // Debounced update function
  const debouncedUpdate = useDebounce(async (key: string, value: number) => {
    try {
      setLoading(true);
      await fetch('/api/parameters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
    } finally {
      setLoading(false);
    }
  }, 500); // 500ms debounce
  
  const handleSliderChange = (key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
    debouncedUpdate(key, value);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Market Making Parameters</h3>
        {loading && (
          <div className="text-xs text-slate-400">Updating...</div>
        )}
      </div>
      
      {sliders.map((slider) => (
        <div key={slider.key} className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm text-slate-300">{slider.label}</label>
            <span className="text-lg font-mono font-semibold text-white">
              {values[slider.key]?.toFixed(slider.decimals) ?? '—'}
              {slider.unit && <span className="text-sm text-slate-400 ml-1">{slider.unit}</span>}
            </span>
          </div>
          
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={slider.step}
            value={values[slider.key] ?? slider.min}
            onChange={(e) => handleSliderChange(slider.key, parseFloat(e.target.value))}
            disabled={!isConnected}
            className={cn(
              'w-full h-2 rounded-lg appearance-none cursor-pointer',
              'bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed',
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
              '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500',
              '[&::-webkit-slider-thumb]:hover:bg-emerald-600',
              '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
              '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-emerald-500',
              '[&::-moz-range-thumb]:hover:bg-emerald-600 [&::-moz-range-thumb]:border-0'
            )}
            aria-label={slider.label}
          />
          
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>{slider.min}</span>
            <span>{slider.max}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Design Rationale:**
- Four sliders with distinct parameter ranges matching requirements
- Debounced API calls (500ms) prevent excessive backend requests during dragging
- Current value displayed in monospace font with appropriate decimal precision
- Sliders disabled when WebSocket disconnected to prevent stale updates
- Loading indicator provides feedback during API calls
- Range labels show min/max bounds for each parameter
- Emerald green thumb matches brand color scheme
- Keyboard-accessible for arrow key adjustment

### RAG Copilot

```typescript
// components/sidebar/RagCopilot.tsx
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function RagCopilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage].slice(-50)); // Keep last 50
    } catch (error) {
      console.error('RAG query failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage].slice(-50));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-[400px]">
      {/* Message History */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">
            Ask me anything about the system, GLFT pricing, or grid operations.
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'p-3 rounded-lg',
                message.role === 'user'
                  ? 'bg-emerald-900/30 ml-4'
                  : 'bg-slate-800 mr-4'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Bot className="h-4 w-4 text-blue-400" />
                )}
                <span className="text-xs text-slate-400">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm text-slate-200 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
```

**Design Rationale:**
- Fixed height (400px) prevents layout shift as messages accumulate
- User messages right-aligned with emerald background, AI left-aligned with slate
- Auto-scroll to bottom when new messages arrive
- Markdown support for formatted AI responses (code blocks, lists, links)
- Loading indicator during API call prevents duplicate submissions
- 50-message limit prevents memory growth
- Icon differentiation: User icon for user, Bot icon for AI
- Timestamp on each message for temporal context
- Disabled input during loading prevents interaction issues

### Recent Articles

```typescript
// components/sidebar/RecentArticles.tsx
interface Article {
  id: string;
  title: string;
  summary: string;
  publishedDate: Date;
  url: string;
}

export function RecentArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadArticles() {
      try {
        const response = await fetch('/api/articles?limit=5');
        const data = await response.json();
        setArticles(data);
      } catch (error) {
        console.error('Failed to load articles:', error);
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }
  
  if (articles.length === 0) {
    return (
      <div className="text-center text-slate-400 text-sm py-8">
        No articles available
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <Link
          key={article.id}
          href={article.url}
          className="block p-3 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors"
        >
          <h4 className="text-sm font-semibold text-white mb-1 line-clamp-2">
            {article.title}
          </h4>
          <p className="text-xs text-slate-400 mb-2 line-clamp-2">
            {article.summary}
          </p>
          <div className="text-xs text-slate-500">
            {article.publishedDate.toLocaleDateString()}
          </div>
        </Link>
      ))}
      
      <Link
        href="/articles"
        className="block text-center text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
      >
        View All Articles →
      </Link>
    </div>
  );
}
```

**Design Rationale:**
- Displays 5 most recent articles from backend
- Line clamp (2 lines) prevents layout overflow from long titles/summaries
- Hover effect provides interaction feedback
- Publication date in locale-appropriate format
- "View All" link navigates to complete archive
- Loading state prevents empty flash during data fetch
- Card-style layout with consistent spacing

### System Cards Layout

```typescript
// app/(dashboard)/dashboard/page.tsx
export default function DashboardPage() {
  const ws = useWebSocket(process.env.NEXT_PUBLIC_WS_URL!, useAuthStore.getState().token!);
  
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <TickerTape />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status Banner */}
        <ConnectionStatus />
        
        {/* System Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <BatteryGauge />
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <QuoteExplanation />
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <JudgeControls />
          </div>
        </div>
        
        {/* Feature Carousel + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          <FeatureCarousel />
          <Sidebar />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
```

**Responsive Grid Breakpoints:**
- **Mobile (<768px):** Single column, cards stack vertically
- **Tablet (768px-1279px):** Two columns, cards arrange in 2×2 grid (Judge Controls wraps)
- **Desktop (≥1280px):** Three columns, cards display side-by-side

**Gap Spacing:** 24px (1.5rem) consistent spacing between all grid items

### Footer

```typescript
// components/footer/Footer.tsx
const socialLinks = [
  { name: 'GitHub', icon: Github, href: 'https://github.com/sovereign-amm' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/sovereign_amm' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/sovereign-amm' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Contact</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:info@sovereign-amm.com" className="hover:text-white transition-colors">
                  info@sovereign-amm.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Legal</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <Link href="/privacy" className="block hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          
          {/* Social Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Follow Us</h3>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5 text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-400">
          © {currentYear} Sovereign-AMM. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

**Design Rationale:**
- Three-column layout on desktop, stacks to single column on mobile
- Social links open in new tab with `rel="noopener noreferrer"` for security
- Dynamic year from `new Date().getFullYear()`
- Icon buttons with hover effect for social media
- Consistent spacing and typography with rest of application

## Data Formatting Utilities

```typescript
// lib/formatters.ts

/**
 * Format price with specified decimal precision
 */
export function formatPrice(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/**
 * Format percentage with specified decimal precision
 */
export function formatPercentage(value: number, decimals: number): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format large numbers with thousands separators
 */
export function formatWithSeparators(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Format number with aligned decimal points for tabular display
 * Returns fixed-width string with padding
 */
export function formatAligned(value: number, decimals: number, width: number): string {
  const formatted = value.toFixed(decimals);
  return formatted.padStart(width, ' ');
}
```

**Precision Requirements (from Requirement 25):**
- Micro price: 8 decimal places
- Best bid: 8 decimal places
- Best ask: 8 decimal places
- Battery SoC: 6 decimal places
- Order book prices: 6 decimal places
- Order book volumes: 0 decimal places (integers)
- GLFT breakdown: 8 decimal places

## Error Handling and Connection Management

### Connection Status Component

```typescript
// components/ui/ConnectionStatus.tsx
export function ConnectionStatus() {
  const { isConnected, connectionError, lastUpdate } = useMarketStore(
    state => ({
      isConnected: state.isConnected,
      connectionError: state.connectionError,
      lastUpdate: state.lastUpdate,
    }),
    shallow
  );
  
  const [isStale, setIsStale] = useState(false);
  
  // Check for stale data (no update in 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setIsStale(!isConnected || now - lastUpdate > 5000);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isConnected, lastUpdate]);
  
  if (isConnected && !isStale) {
    return null; // Don't show banner when everything is fine
  }
  
  return (
    <div className={cn(
      'mb-6 p-4 rounded-lg border flex items-center gap-3',
      isStale && isConnected
        ? 'bg-amber-900/20 border-amber-700 text-amber-300'
        : 'bg-rose-900/20 border-rose-700 text-rose-300'
    )}>
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        {isStale && isConnected ? (
          <div>
            <div className="font-semibold">Data may be stale</div>
            <div className="text-sm opacity-90">No updates received in the last 5 seconds</div>
          </div>
        ) : (
          <div>
            <div className="font-semibold">Connection lost</div>
            <div className="text-sm opacity-90">
              {connectionError || 'Attempting to reconnect...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Design Rationale:**
- Banner only appears when disconnected or stale (non-intrusive)
- Different severity levels: amber for stale, rose for disconnected
- Auto-dismisses when connection restored
- Positioned prominently below ticker tape

### Error Handling for API Calls

```typescript
// lib/api.ts
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
  retries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(endpoint, options);
      
      if (response.status === 401) {
        // Unauthorized - redirect to login
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      console.error(`API call attempt ${attempt + 1} failed:`, error);
      
      if (attempt < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}
```

## Accessibility Features

### Keyboard Navigation
- All interactive elements accessible via Tab key
- Focus indicators visible with 3:1 contrast ratio (emerald ring)
- Skip navigation link at top of page (visually hidden, revealed on focus)

### ARIA Attributes
```typescript
// Example: Ticker Tape with ARIA live region
<div role="status" aria-live="polite" aria-label="Market data ticker">
  {/* Ticker content */}
</div>

// Example: Slider with ARIA label
<input
  type="range"
  aria-label="Gamma (Risk Aversion) slider"
  aria-valuemin={0.01}
  aria-valuemax={10.0}
  aria-valuenow={currentValue}
/>

// Example: Icon button with ARIA label
<button aria-label="Open mobile menu">
  <Menu className="h-6 w-6" />
</button>
```

### Semantic HTML
- `<header>` for navigation
- `<nav>` for navigation links
- `<main>` for primary content
- `<aside>` for sidebar
- `<footer>` for footer
- `<article>` for article cards
- Heading hierarchy (h1 → h2 → h3) maintained

## Performance Optimization

### Component Memoization

```typescript
// Memoize expensive chart data transformations
const chartData = useMemo(() => {
  return transformOrderBookForChart(bids, asks);
}, [bids, asks]);

// Memoize pure presentational components
export const TickerItem = React.memo(function TickerItem({ label, value, className }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={cn('text-lg font-mono', className)}>{value}</span>
    </div>
  );
});

// Memoize callbacks to prevent child re-renders
const handleSliderChange = useCallback((key: string, value: number) => {
  setValues(prev => ({ ...prev, [key]: value }));
  debouncedUpdate(key, value);
}, [debouncedUpdate]);
```

### Selective Zustand Subscriptions

```typescript
// BAD: Subscribes to entire store, re-renders on any change
const state = useMarketStore();

// GOOD: Subscribes only to specific fields
const microPrice = useMarketStore(state => state.microPrice);

// GOOD: Subscribe to multiple related fields with shallow comparison
const { bestBid, bestAsk } = useMarketStore(
  state => ({ bestBid: state.bestBid, bestAsk: state.bestAsk }),
  shallow
);
```

### Debouncing Strategy

```typescript
// hooks/useDebounce.ts
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}
```

**Usage:**
- Judge Controls sliders: 500ms debounce
- Search inputs: 300ms debounce
- Prevents API call spam during rapid user interaction

### Chart Performance

```typescript
// Disable Recharts animations for 10 Hz updates
<Line
  isAnimationActive={false}
  dot={false} // Remove dots to reduce render load
/>

// Limit time series data
updateFromTick: (tickData) => {
  set((state) => ({
    ...state,
    timeSeries: [
      ...state.timeSeries,
      { tick: tickData.tick, microPrice: tickData.micro_price, soc: tickData.battery_soc }
    ].slice(-100), // Keep only last 100 points
  }));
}
```

### Next.js Optimization

```typescript
// next.config.js
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

## Authentication Flow

### Login Process

1. User submits credentials on `/login`
2. Frontend calls `POST /api/auth/login` with email and password
3. Backend validates credentials, returns JWT token
4. Frontend receives token in HTTP-only cookie via `Set-Cookie` header
5. `authStore.login()` updates authenticated state
6. Redirect to `/dashboard`

### Protected Routes

```typescript
// app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = await checkAuthToken();
  
  if (!isAuthenticated) {
    redirect('/login');
  }
  
  return (
    <div>
      {children}
    </div>
  );
}
```

### Token Management

- **Storage:** HTTP-only cookies (protected from XSS)
- **Validation:** Backend validates JWT on each request
- **Expiration:** 24-hour token lifetime
- **Refresh:** Not implemented in v1 (user must re-login after expiration)
- **WebSocket Auth:** Token passed as query parameter in WebSocket URL

## Testing Strategy

### Unit Tests
- Pure utility functions (formatters, validators)
- Zustand store actions and state updates
- Component rendering with static props
- Custom hooks behavior

### Integration Tests
- Component interaction with Zustand store
- WebSocket message handling and store updates
- API call error handling and retries
- Responsive layout changes at breakpoints

### End-to-End Tests (Cypress/Playwright)
- Complete authentication flow (login → dashboard access)
- WebSocket connection and real-time data updates
- Carousel navigation and panel switching
- Judge Controls slider interaction and API calls
- RAG Copilot message submission and response

### Property-Based Tests
- Number formatting with various precision values
- WebSocket message parsing with random valid/invalid data
- Exponential backoff delay calculation
- Carousel navigation boundary conditions

## Deployment Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_WS_URL=wss://api.sovereign-amm.com/ws
NEXT_PUBLIC_API_URL=https://api.sovereign-amm.com
```

### Build Command

```bash
npm run build
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

## Browser Support

- **Chrome/Edge:** Last 2 versions
- **Firefox:** Last 2 versions
- **Safari:** Last 2 versions
- **Mobile Safari:** iOS 14+
- **Chrome Mobile:** Android 10+

**Required Features:**
- WebSocket API
- CSS Grid
- CSS Flexbox
- ES2020 features
- ResizeObserver (for responsive charts)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Navigation Active State Synchronization

*For any* valid application route, the navigation tab corresponding to that route SHALL display active state styling, and all other tabs SHALL display inactive styling.

**Validates: Requirements 2.4, 2.5**

### Property 2: WebSocket Message Parsing and Store Updates

*For any* valid TickMessage received via WebSocket, the message SHALL be successfully parsed, validated, and used to update the Zustand store with all corresponding fields (tick, microPrice, bestBid, bestAsk, batterySOC, batteryInventory, bids, asks, ammBid, ammAsk, quoteBreakdown).

**Validates: Requirements 4.3, 4.8**

### Property 3: Store-to-Component Reactivity

*For any* component subscribed to a specific Zustand store field, WHEN that field value changes in the store, THEN the component SHALL re-render with the updated value within 100 milliseconds.

**Validates: Requirements 4.5, 5.5, 5.6, 5.7, 5.8, 8.4, 8.5, 9.5, 11.3, 12.7**

### Property 4: Carousel Bidirectional Navigation

*For any* carousel panel index I where 0 < I < N-1 (N = total panels), clicking the left chevron SHALL display panel I-1, and clicking the right chevron SHALL display panel I+1.

**Validates: Requirements 6.6, 6.7**

### Property 5: Exponential Backoff Retry Delay

*For any* non-negative integer N representing the number of failed connection attempts, the next retry delay SHALL be min(1000 * 2^N, 30000) milliseconds.

**Validates: Requirements 4.6, 23.7**

### Property 6: Number Formatting Precision

*For any* numeric value V and precision P (where P ∈ {0, 6, 8, 12}), the formatted output SHALL contain exactly P decimal places, use monospace font styling, and maintain consistent character width for vertical alignment.

**Validates: Requirements 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7**

### Property 7: Judge Controls API Submission

*For any* Judge Controls slider parameter (gamma, kappa, q_max, a_deg), WHEN the user releases the slider after adjustment, THEN an API call SHALL be made with the updated value within 500 milliseconds (accounting for debounce delay).

**Validates: Requirements 13.6, 13.7**

### Property 8: Decimal Alignment in Tabular Displays

*For any* table or list containing multiple numeric values with the same precision, all decimal points SHALL align vertically when displayed in monospace font.

**Validates: Requirements 25.9**

### Property 9: Carousel Panel Boundary Constraints

*For any* carousel state, WHEN displaying the first panel (index 0), the left chevron SHALL be disabled, and WHEN displaying the last panel (index N-1), the right chevron SHALL be disabled.

**Validates: Requirements 6.8, 6.9**

### Property 10: Order Book Visualization Symmetry

*For any* order book state with bids and asks, the L2 Depth Chart SHALL render bid volumes extending leftward from center using Emerald Green (#10b981), ask volumes extending rightward from center using Rose Red (#e11d48), and the center alignment SHALL remain constant regardless of volume magnitudes.

**Validates: Requirements 8.2, 8.3**

### Property 11: Time Series Data Retention Limit

*For any* sequence of tick updates, the timeSeries array in the Zustand store SHALL never exceed 100 elements, automatically removing the oldest entry when a new entry would exceed this limit.

**Validates: Requirements 9.6, 21.5**

### Property 12: Authentication-Based Route Access

*For any* dashboard route in the (dashboard) route group, WHEN accessed without a valid authentication token, the system SHALL redirect to /login before rendering any trading components.

**Validates: Requirements 1.5, 24.3**

### Property 13: Connection Status Visibility Logic

*For any* WebSocket connection state, WHEN isConnected is false OR lastUpdate timestamp is more than 5 seconds old, the connection status banner SHALL be visible; otherwise it SHALL be hidden.

**Validates: Requirements 4.7, 23.1, 23.2**

### Property 14: Responsive Grid Layout Reflow

*For any* viewport width W:
- WHEN W < 768px, System Cards SHALL display in 1-column layout
- WHEN 768px ≤ W < 1280px, System Cards SHALL display in 2-column layout
- WHEN W ≥ 1280px, System Cards SHALL display in 3-column layout

**Validates: Requirements 16.6, 16.7, 19.4, 19.5**

### Property 15: AMM Quote Highlighting

*For any* order book state WHERE ammBid or ammAsk is not null, the corresponding price level in the L2 Depth Chart SHALL be rendered with a distinct visual marker (darker shade and white border stroke).

**Validates: Requirements 8.8, 8.9**

### Property 16: Mobile Navigation Menu Toggle

*For any* viewport width W < 768px, WHEN the mobile hamburger icon is clicked, the mobile menu SHALL toggle between expanded (visible) and collapsed (hidden) states.

**Validates: Requirements 2.6, 2.7**

### Property 17: Slider Keyboard Accessibility

*For any* Judge Controls slider, WHEN focused, pressing the right/up arrow key SHALL increase the value by one step, and pressing the left/down arrow key SHALL decrease the value by one step, respecting the configured min/max bounds.

**Validates: Requirements 22.8**

### Property 18: Quote Breakdown Calculation Consistency

*For any* quoteBreakdown state in the store, the Final Bid displayed SHALL equal `basePrice - spread/2 + deltaBid - degradationCost`, and the Final Ask SHALL equal `basePrice + spread/2 + deltaAsk + degradationCost`, both formatted to 8 decimal places.

**Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6**

### Property 19: RAG Copilot Message History Limit

*For any* sequence of chat messages, the messages array SHALL never exceed 50 elements, automatically removing the oldest messages when new messages would exceed this limit.

**Validates: Requirements 14.10**

### Property 20: Chart Animation Disablement

*For any* Recharts-based visualization component (L2DepthChart, PriceChart), the `isAnimationActive` prop SHALL be set to false to prevent transition animations that would interfere with 10 Hz real-time updates.

**Validates: Requirements 21.1, 21.4**

---

## Summary

This design document specifies a production-ready Next.js 14 application for high-frequency energy trading visualization. Key architectural decisions include:

1. **Route group separation** for public vs. authenticated experiences
2. **Zustand-based state management** with selective subscriptions for 10 Hz performance
3. **Native WebSocket integration** with exponential backoff reconnection
4. **Recharts visualization** with disabled animations for smooth real-time updates
5. **Monospace typography** for numerical precision and decimal alignment
6. **Responsive grid layouts** with mobile-first breakpoints
7. **Accessibility compliance** with ARIA labels, keyboard navigation, and semantic HTML
8. **Dark mode theming** with Emerald/Rose color coding for bid/ask distinction

The design addresses all 25 requirements with comprehensive component specifications, state management patterns, error handling strategies, and performance optimizations. Correctness properties provide testable specifications for critical system behaviors including navigation, data synchronization, formatting precision, and responsive layout.
