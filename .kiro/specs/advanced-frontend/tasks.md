# Implementation Plan: Sovereign-AMM Advanced Frontend

## Overview

This implementation plan breaks down the Sovereign-AMM Advanced Frontend into discrete coding tasks. The system is a high-frequency trading terminal built with Next.js 14, operating at 10 Hz update frequency with real-time WebSocket integration, Zustand state management, and Recharts visualization components. The architecture separates public marketing pages from authenticated trading dashboards, with consistent dark-mode styling and monospace numerical precision displays.

**Technology Stack:** Next.js 14, React 18, TypeScript 5.4+, Zustand 4.5+, Recharts 2.12+, Tailwind CSS 3.4+, Lucide React

**Key Features:**
- 10 Hz real-time data streaming via WebSocket
- L2 order book visualization with bid/ask depth chart
- Battery state monitoring with circular gauge
- GLFT pricing model breakdown display
- Four-slider judge controls for AMM parameters
- RAG-powered AI copilot for explainability
- Responsive design with mobile hamburger menu
- Authentication-protected dashboard routes

## Tasks

- [x] 1. Project Setup and Configuration
  - Initialize Next.js 14 project with TypeScript and App Router
  - Configure Tailwind CSS with custom dark mode theme
  - Install dependencies: Zustand, Recharts, Lucide React
  - Set up ESLint and TypeScript strict mode
  - Create directory structure for components, store, hooks, lib, and types
  - Configure environment variables for backend API and WebSocket URLs
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.9, 20.10_

- [x] 2. Type Definitions and Data Models
  - [x] 2.1 Create market data type definitions
    - Define `TickMessage` interface with all tick data fields
    - Define order book tuple types for bids and asks
    - Define quote breakdown structure
    - Define time series data point interface
    - _Requirements: 4.4, 4.8, 25.1-25.9_

  - [x] 2.2 Create authentication type definitions
    - Define user credentials interface
    - Define JWT token structure
    - Define auth state interface
    - _Requirements: 24.1-24.7_

- [x] 3. Utility Functions and Formatters
  - [x] 3.1 Implement number formatting utilities
    - Create `formatPrice()` function with configurable decimal places (6-12)
    - Create `formatPercentage()` function for battery SoC display
    - Create `formatVolume()` function for integer volume display
    - Ensure all formatters apply monospace-compatible output
    - _Requirements: 25.1-25.9, 5.4, 18.5_

  - [x] 3.2 Write unit tests for formatters
    - Test formatPrice with 6, 8, and 12 decimal places
    - Test formatPercentage with 2 and 6 decimal places
    - Test formatVolume for integer conversion
    - Test edge cases: zero, negative, very large numbers
    - _Requirements: 25.1-25.9_

  - [x] 3.3 Implement data validation functions
    - Create `validateTickMessage()` function with type guards
    - Validate required numeric fields (tick, micro_price, best_bid, best_ask, battery_soc, battery_inventory)
    - Validate array structures for bids and asks
    - Validate optional fields (amm_bid, amm_ask, quote_breakdown)
    - Throw descriptive errors for invalid data
    - _Requirements: 4.8_

  - [x] 3.4 Write property tests for data validation
    - **Property 1: Type Safety Invariant** - All validated tick messages must have correct TypeScript types
    - **Validates: Requirements 4.8**
    - Generate random valid tick messages and verify validation passes
    - Generate random invalid messages and verify validation throws
    - _Requirements: 4.8_

- [x] 4. State Management Implementation
  - [x] 4.1 Create Zustand market store
    - Define `MarketState` interface with connection state, tick data, battery state, order book, AMM quotes, quote breakdown, and time series
    - Implement `updateFromTick()` action for atomic tick updates
    - Implement time series limiting to 100 most recent points
    - Implement `setConnectionState()` action for WebSocket status
    - Implement `clearStore()` action for cleanup
    - Add `lastUpdate` timestamp tracking for staleness detection
    - _Requirements: 4.3, 4.4, 4.5, 21.5_

  - [x] 4.2 Write property tests for market store
    - **Property 2: Time Series Bounded Length** - Time series array never exceeds 100 entries
    - **Validates: Requirements 21.5**
    - **Property 3: State Immutability** - Store updates create new objects, don't mutate existing state
    - **Validates: Requirements 4.3**
    - _Requirements: 4.3, 21.5_

  - [x] 4.3 Create Zustand auth store
    - Define `AuthState` interface with authentication status, user data, and token
    - Implement `login()` action with backend API call
    - Implement `logout()` action with token clearing
    - Implement `checkAuth()` action for route protection
    - Store token in HTTP-only cookies via backend Set-Cookie
    - _Requirements: 24.1, 24.2, 24.4_

  - [x] 4.4 Write integration tests for auth store
    - Test successful login flow with valid credentials
    - Test failed login with invalid credentials
    - Test logout clears auth state
    - Test checkAuth validates token presence
    - _Requirements: 24.1-24.4_

- [x] 5. WebSocket Integration
  - [x] 5.1 Implement WebSocket connection hook
    - Create `useWebSocket` custom hook
    - Establish WebSocket connection with token authentication
    - Handle onopen event: update connection state, reset reconnect attempts
    - Handle onmessage event: parse JSON, validate with `validateTickMessage()`, update market store
    - Handle onerror event: log error, update connection state
    - Handle onclose event: update connection state, trigger reconnection
    - _Requirements: 4.1, 4.2, 4.3, 4.8, 24.5_

  - [x] 5.2 Implement exponential backoff reconnection
    - Calculate delay using formula: `min(1000 * 2^attempts, 30000)`
    - Track reconnection attempts with state
    - Reset attempts counter on successful connection
    - Clear timeout on component unmount
    - _Requirements: 4.6_

  - [x] 5.3 Write integration tests for WebSocket handling
    - Test successful connection establishes WebSocket
    - Test message parsing updates market store correctly
    - Test connection failure triggers reconnection
    - Test exponential backoff delays increase correctly
    - Test reconnection stops after successful connection
    - _Requirements: 4.1-4.8_

- [x] 6. API Client Implementation
  - [x] 6.1 Create REST API client utility
    - Implement base API client with fetch wrapper
    - Add authentication token from cookies to all requests
    - Implement retry logic with exponential backoff (up to 3 attempts)
    - Handle 401 Unauthorized responses with redirect to login
    - Create API endpoint functions for judge controls, RAG queries, and articles
    - _Requirements: 13.7, 14.4, 15.4, 23.4, 23.7, 24.6_

  - [x] 6.2 Write integration tests for API client
    - Test successful API calls return data
    - Test failed calls retry with backoff
    - Test 401 responses trigger redirect
    - Test authentication token included in headers
    - _Requirements: 23.4, 23.7, 24.6_

- [x] 7. Navigation and Layout Components
  - [x] 7.1 Create Navbar component
    - Implement desktop navigation with tabs (Dashboard, Grid, Battery, Pricing, About, Contact)
    - Apply active state styling to current tab based on pathname
    - Display logo at left edge with link to home
    - Show auth buttons (Sign In, Sign Up) when unauthenticated
    - Show user menu with logout when authenticated
    - Position navbar with fixed height (64px) and dark background
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9_

  - [x] 7.2 Create mobile menu component
    - Display hamburger menu icon below 768px breakpoint
    - Toggle vertical menu on hamburger click
    - Show all navigation tabs in vertical layout
    - Apply active state styling to current tab
    - Close menu on navigation
    - _Requirements: 2.6, 2.7, 19.2_

  - [x] 7.3 Write unit tests for navigation
    - Test active state styling applies to current route
    - Test mobile menu displays below 768px
    - Test hamburger toggles menu visibility
    - Test auth buttons display when unauthenticated
    - Test user menu displays when authenticated
    - _Requirements: 2.1-2.9_

  - [x] 7.4 Create Footer component
    - Display contact information (email, phone)
    - Display social media links with icons
    - Open social links in new tabs
    - Display copyright text with current year
    - Display links to Privacy Policy and Terms of Service
    - Apply dark mode styling consistent with app
    - _Requirements: 17.1-17.7_

  - [x] 7.5 Create root layout with global styling
    - Set up Next.js root layout with HTML structure
    - Import and apply Tailwind CSS global styles
    - Configure dark mode with bg-slate-950 background
    - Include Navbar and Footer in layout
    - Set up font configurations (sans-serif and monospace)
    - _Requirements: 18.1, 18.2, 18.5, 18.6_

  - [x] 7.6 Create route groups structure
    - Create `(public)` route group for landing, about, contact pages
    - Create `(auth)` route group for login and register pages
    - Create `(dashboard)` route group for protected trading pages
    - Implement dashboard layout with authentication check
    - Redirect to login if unauthenticated on dashboard routes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 24.3_

- [x] 8. Hero Section and Landing Page
  - [x] 8.1 Create Hero Section component
    - Display dark geometric grid background pattern
    - Render headline with "Energy Trading Meets Grid Physics" text
    - Set headline font size to 48px (mobile) → 72px (desktop)
    - Render descriptive subheading below headline
    - Create "Sign Up Now" primary CTA button with emerald background
    - Create "Sign In" secondary CTA button with bordered ghost style
    - Link CTAs to /register and /login routes
    - Ensure full viewport width with responsive padding
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 8.2 Create public landing page
    - Compose landing page with Hero Section, Feature Carousel, Sidebar, and Footer
    - Render page without authentication requirement
    - Apply responsive layout: 70/30 split desktop, stacked mobile
    - _Requirements: 1.2, 1.4, 6.1, 7.1_

- [x] 9. Ticker Tape Component
  - [x] 9.1 Implement Ticker Tape component
    - Subscribe to market store: microPrice, bestBid, bestAsk, batterySOC, isConnected
    - Display labels: "MICRO PRICE", "BEST BID", "BEST ASK", "SoC"
    - Format numeric values with monospace font
    - Display microPrice, bestBid, bestAsk with 8 decimal places
    - Display batterySOC with 6 decimal places as percentage
    - Apply emerald green to bestBid value
    - Apply rose red to bestAsk value
    - Make ticker sticky below navbar (top: 64px)
    - Add ARIA live region for screen reader announcements
    - Display connection status indicator (green dot = connected, red = disconnected)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 22.4, 23.1_

  - [x] 9.2 Write property tests for Ticker Tape
    - **Property 4: Price Update Latency** - Ticker updates within 100ms of store change
    - **Validates: Requirements 5.5, 5.6, 5.7, 5.8**
    - **Property 5: Decimal Precision Consistency** - All prices display exactly specified decimal places
    - **Validates: Requirements 25.1, 25.2, 25.3**
    - _Requirements: 5.5-5.8, 25.1-25.3_

- [x] 10. Feature Carousel Component
  - [x] 10.1 Implement Feature Carousel container
    - Create carousel with three panels: L2 Depth Chart, Price Chart, Control Power Details
    - Display one panel at a time with manual navigation
    - Render left and right chevron buttons
    - Track current panel index with state
    - Disable left chevron on first panel, right chevron on last panel
    - Display panel indicators (dots) below content
    - Set carousel width to 70% on desktop (lg breakpoint)
    - Stack vertically with sidebar below 1024px
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 7.7_

  - [x] 10.2 Write unit tests for carousel navigation
    - Test chevron navigation changes active panel
    - Test left chevron disabled on first panel
    - Test right chevron disabled on last panel
    - Test panel indicators show current position
    - Test panel indicator clicks navigate to correct panel
    - _Requirements: 6.5-6.9_

- [x] 11. L2 Depth Chart Visualization
  - [x] 11.1 Implement L2 Depth Chart component
    - Subscribe to market store: bids, asks, ammBid, ammAsk
    - Transform bids to negative volumes for leftward bars
    - Transform asks to positive volumes for rightward bars
    - Sort combined data by price (descending)
    - Render horizontal bar chart using Recharts BarChart
    - Display price levels on vertical Y-axis with monospace font
    - Display volumes on horizontal X-axis
    - Apply emerald green (#10b981) to bid bars
    - Apply rose red (#e11d48) to ask bars
    - Highlight AMM bid quote with darker emerald (#059669) and white 2px border
    - Highlight AMM ask quote with darker rose (#be123c) and white 2px border
    - Format price labels with 6 decimal places
    - Format volume labels as integers
    - Use memoization for chart data transformation
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 25.5, 25.6_

  - [x] 11.2 Write property tests for L2 Depth Chart
    - **Property 6: Bid-Ask Separation** - Bid bars always extend left, ask bars always extend right
    - **Validates: Requirements 8.2, 8.3**
    - **Property 7: Color Consistency** - Bids always emerald, asks always rose
    - **Validates: Requirements 18.3, 18.4**
    - **Property 8: Price Sorting** - Price levels displayed in descending order
    - **Validates: Requirements 8.1**
    - _Requirements: 8.1-8.5_

- [x] 12. Price Chart Visualization
  - [x] 12.1 Implement Price Chart component
    - Subscribe to market store: timeSeries array
    - Render dual-axis line chart using Recharts LineChart
    - Display microPrice on left Y-axis with 8 decimal places
    - Display battery SoC on right Y-axis with percentage formatting
    - Display tick number on X-axis
    - Render continuous line for microPrice series (blue stroke)
    - Render continuous line for SoC series (amber stroke)
    - Disable animations for 10 Hz performance
    - Use memoization for data transformations
    - Configure responsive container with 400px height
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 21.4_

  - [x] 12.2 Write property tests for Price Chart
    - **Property 9: Dual Axis Independence** - MicroPrice and SoC use separate Y-axes
    - **Validates: Requirements 9.2, 9.3**
    - **Property 10: Time Series Chronology** - Data points ordered by ascending tick number
    - **Validates: Requirements 9.4, 9.5**
    - _Requirements: 9.1-9.5_

- [x] 13. Control Power Details Component
  - [x] 13.1 Implement Control Power Details display
    - Create schematic grid topology visualization with SVG
    - Display node positions and connection lines
    - Show PTDF values when available
    - Implement click handler for connection lines
    - Highlight selected line on click
    - Display routing details panel (line capacity, current flow) on selection
    - Add arrow indicators for power flow direction
    - Apply color coding for line utilization percentage (gradient: red → yellow → green)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 14. Sidebar Components
  - [x] 14.1 Implement Sidebar container
    - Create sidebar layout with 30% width on desktop
    - Stack two sections vertically: Recent Articles (top), RAG Copilot (bottom)
    - Apply card styling with dark background and borders
    - Stack vertically below carousel on mobile (<1024px)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 14.2 Implement Recent Articles component
    - Display vertical list of article entries
    - Show title, publication date, and summary for each entry
    - Fetch article data from backend on mount
    - Display 5 most recent articles sorted by date
    - Navigate to full article page on entry click
    - Display "View All" link at bottom
    - Navigate to articles archive page on "View All" click
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [x] 14.3 Implement RAG Copilot component
    - Create chat message history panel with scrollable area
    - Create text input field for user queries
    - Create submit button adjacent to input
    - Send query to backend RAG service on submit
    - Append AI response to message history when received
    - Apply visual styling to distinguish user vs AI messages
    - Display loading indicator while waiting for response
    - Render markdown in AI responses
    - Auto-scroll to show most recent message on new message
    - Retain most recent 50 messages in history
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_

- [x] 15. Checkpoint - Verify layout and navigation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Battery Gauge Component
  - [x] 16.1 Implement Battery Gauge visualization
    - Subscribe to market store: batterySOC
    - Render circular arc using SVG
    - Calculate arc path based on SoC percentage (0-100%)
    - Apply color gradient from red (0%) to green (100%) on arc fill
    - Display numeric SoC value at center with monospace font
    - Format numeric value with 6 decimal places
    - Display "SoC" label above numeric value
    - Update arc fill within 100ms of store update
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 25.4_

  - [x] 16.2 Write property tests for Battery Gauge
    - **Property 11: SoC Range Validity** - Displayed SoC always between 0% and 100%
    - **Validates: Requirements 11.2, 11.3**
    - **Property 12: Color Gradient Monotonicity** - Arc color progresses from red to green as SoC increases
    - **Validates: Requirements 11.6**
    - _Requirements: 11.2, 11.3, 11.6_

- [x] 17. Quote Explanation Component
  - [x] 17.1 Implement Quote Explanation display
    - Subscribe to market store: quoteBreakdown
    - Display when quoteBreakdown is not null
    - Show "Base Price" label with basePrice value (monospace, 8 decimals)
    - Show "Spread" label with spread value (monospace, 8 decimals)
    - Show "Delta Bid" label with deltaBid value (monospace, 8 decimals)
    - Show "Delta Ask" label with deltaAsk value (monospace, 8 decimals)
    - Show "Degradation Cost" label with c_deg value (monospace, 8 decimals)
    - Update all values within 100ms of store update
    - Add tooltips explaining each component's role in GLFT model
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 25.9_

  - [x] 17.2 Write property tests for Quote Explanation
    - **Property 13: Component Completeness** - All five GLFT components always displayed when breakdown exists
    - **Validates: Requirements 12.2-12.6**
    - **Property 14: Precision Consistency** - All quote components display exactly 8 decimal places
    - **Validates: Requirements 25.9**
    - _Requirements: 12.2-12.6, 25.9_

- [x] 18. Judge Controls Component
  - [x] 18.1 Implement Judge Controls interface
    - Create four horizontal slider controls
    - Create "Gamma (Risk Aversion)" slider with range 0.01 to 10.0
    - Create "Kappa (Market Impact)" slider with range 0.001 to 1.0
    - Create "Q_max (Max Inventory)" slider with range 1000000 to 100000000
    - Create "A_deg (Degradation Factor)" slider with range 0.0 to 1000.0
    - Display current value below each slider with monospace font
    - Fetch initial parameter values from backend on mount
    - Debounce slider onChange events (300ms delay)
    - Send updated parameter to backend via API call on slider release
    - Disable all sliders when WebSocket disconnected
    - Display error message below slider if API call fails
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 21.3, 23.4_

  - [x] 18.2 Write integration tests for Judge Controls
    - Test sliders fetch initial values on mount
    - Test slider value updates display in UI
    - Test debounced API calls send correct parameters
    - Test sliders disabled when disconnected
    - Test error message displays on API failure
    - _Requirements: 13.7, 13.8, 13.9, 23.4_

- [x] 19. System Cards Layout
  - [x] 19.1 Create System Cards grid container
    - Position System Cards section below Ticker Tape on dashboard
    - Arrange Battery Gauge, Quote Explanation, Judge Controls in 3-column grid
    - Apply consistent padding and spacing between cards
    - Reflow to 2-column layout below 1280px
    - Reflow to single-column layout below 768px
    - Apply card styling: dark background, border, rounded corners
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 19.4, 19.5_

- [x] 20. Dashboard Pages
  - [x] 20.1 Create main dashboard page
    - Compose dashboard with Ticker Tape, System Cards, Carousel, and Sidebar
    - Initialize WebSocket connection on mount
    - Clean up WebSocket connection on unmount
    - Apply authentication protection via dashboard layout
    - _Requirements: 1.3, 4.1, 24.2_

  - [x] 20.2 Create Grid page
    - Display grid topology visualization
    - Show power flow details
    - Include navigation to dashboard
    - _Requirements: 2.3_

  - [x] 20.3 Create Battery page
    - Display detailed battery metrics
    - Show battery gauge with larger size
    - Include historical SoC chart
    - _Requirements: 2.3_

  - [x] 20.4 Create Pricing page
    - Display GLFT pricing model details
    - Show judge controls with expanded explanations
    - Include pricing history chart
    - _Requirements: 2.3_

- [x] 21. Authentication Pages
  - [x] 21.1 Create login page
    - Create form with email and password inputs
    - Add "Sign In" submit button
    - Call auth store login() action on submit
    - Display error message on failed login
    - Redirect to dashboard on successful login
    - Add link to registration page
    - _Requirements: 3.8, 24.1_

  - [x] 21.2 Create registration page
    - Create form with email, password, and confirm password inputs
    - Add validation for password match
    - Add "Sign Up" submit button
    - Call backend registration API on submit
    - Display success message and redirect to login
    - Display error message on failed registration
    - Add link to login page
    - _Requirements: 3.7_

- [x] 22. Error Handling and Connection Status
  - [x] 22.1 Create connection status indicator
    - Display prominent error banner when WebSocket disconnected
    - Show "Disconnected" state with red styling
    - Show "Connected" state with green styling
    - Auto-dismiss banner within 1 second of reconnection
    - Position banner at top of dashboard (below navbar)
    - _Requirements: 23.1, 23.3_

  - [x] 22.2 Implement stale data indication
    - Track time since last WebSocket update
    - Apply visual styling (dimmed opacity) when disconnected > 5 seconds
    - Apply to all data-dependent components: Ticker Tape, charts, gauges
    - Remove styling immediately on reconnection
    - _Requirements: 23.2_

  - [x] 22.3 Add error logging and debugging
    - Log WebSocket connection events to console
    - Log API call failures to console
    - Log validation errors to console
    - Include timestamps and error details
    - _Requirements: 23.6_

- [x] 23. Accessibility Implementation
  - [x] 23.1 Add keyboard navigation support
    - Ensure all interactive elements focusable with tab key
    - Implement logical tab order through navigation tabs
    - Add keyboard controls for sliders (arrow keys)
    - Add keyboard controls for carousel chevrons (left/right arrows)
    - _Requirements: 22.1, 22.6, 22.8_

  - [x] 23.2 Add ARIA labels and semantic HTML
    - Apply ARIA labels to hamburger menu button
    - Apply ARIA labels to carousel chevron buttons
    - Apply ARIA labels to connection status indicator
    - Use semantic HTML5: header, nav, main, aside, footer
    - _Requirements: 22.3, 22.5_

  - [x] 23.3 Add focus indicators
    - Apply visible focus rings to all interactive elements
    - Ensure focus contrast ratio ≥ 3:1 against background
    - Use Tailwind focus utilities for consistency
    - _Requirements: 22.2_

  - [x] 23.4 Add skip navigation link
    - Create "Skip to main content" link at top of page
    - Hide visually but accessible to screen readers
    - Make visible on keyboard focus
    - Navigate to main content on activation
    - _Requirements: 22.7_

- [x] 24. Responsive Design Implementation
  - [x] 24.1 Implement breakpoint-specific layouts
    - Verify 640px, 768px, 1024px, 1280px breakpoints work correctly
    - Test navbar collapses to hamburger below 768px
    - Test carousel and sidebar stack vertically below 1024px
    - Test System Cards reflow to 2-column below 1280px
    - Test System Cards reflow to single-column below 768px
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 24.2 Implement touch target sizing
    - Ensure all buttons and interactive elements ≥ 44x44 pixels on mobile
    - Test hamburger menu button size
    - Test carousel chevrons size
    - Test slider controls size
    - _Requirements: 19.7_

  - [x] 24.3 Verify font size readability
    - Ensure minimum font size of 14px across all breakpoints
    - Test body text readability on mobile
    - Test monospace number readability on mobile
    - Test label text readability on mobile
    - _Requirements: 19.6_

- [x] 25. Performance Optimization
  - [x] 25.1 Implement component memoization
    - Apply React.memo() to pure presentational components
    - Apply useMemo() to chart data transformations
    - Apply useCallback() to event handlers passed as props
    - Verify re-renders only occur for changed data
    - _Requirements: 21.2, 21.4_

  - [x] 25.2 Implement selective Zustand subscriptions
    - Use specific state slices in components
    - Apply shallow comparison for multi-field subscriptions
    - Verify components don't re-render on unrelated state changes
    - _Requirements: 21.2_

  - [x] 25.3 Optimize chart rendering for 10 Hz
    - Disable Recharts animations
    - Limit time series to 100 points
    - Memoize chart data transformations
    - Verify smooth 10 Hz updates without frame drops
    - _Requirements: 21.1, 21.5_

  - [x] 25.4 Write property tests for performance
    - **Property 15: Update Latency Bound** - All components update within 100ms of store change
    - **Validates: Requirements 4.5, 5.5-5.8, 11.3, 12.7**
    - **Property 16: Frame Rate Stability** - No dropped frames during 10 Hz updates
    - **Validates: Requirements 21.1**
    - _Requirements: 21.1, 4.5, 5.5-5.8_

- [x] 26. Testing and Validation
  - [x] 26.1 Implement integration test for WebSocket flow
    - Mock WebSocket connection
    - Send test tick message
    - Verify market store updates
    - Verify components re-render with new data
    - _Requirements: 4.1-4.8_

  - [x] 26.2 Implement integration test for authentication flow
    - Mock login API call
    - Submit credentials
    - Verify token stored
    - Verify redirect to dashboard
    - Verify protected route access granted
    - _Requirements: 24.1-24.7_

  - [x] 26.3 Write property tests for correctness properties
    - **Property 17: Color Consistency Invariant** - Bids always emerald, asks always rose across all components
    - **Validates: Requirements 18.3, 18.4**
    - **Property 18: Monospace Precision Display** - All numeric values use monospace with specified decimal places
    - **Validates: Requirements 18.5, 25.1-25.9**
    - **Property 19: Responsive Layout Integrity** - Components reflow correctly at all breakpoints without overlap
    - **Validates: Requirements 19.1-19.7**
    - **Property 20: Authentication Boundary Enforcement** - Dashboard routes always require authentication
    - **Validates: Requirements 1.3, 1.5, 24.2, 24.3**
    - _Requirements: 1.3, 18.3-18.5, 19.1-19.7, 24.2-24.3, 25.1-25.9_

- [x] 27. Final Integration and Polish
  - [x] 27.1 Verify all color theming consistent
    - Check emerald green (#10b981) applied to all bid/supply elements
    - Check rose red (#e11d48) applied to all ask/demand elements
    - Check bg-slate-950 applied as primary background
    - Check color contrast ratios ≥ 4.5:1 for text
    - _Requirements: 18.1, 18.3, 18.4, 18.7_

  - [x] 27.2 Verify all styling consistency
    - Check consistent border radius on all cards
    - Check consistent shadow effects on elevated components
    - Check consistent spacing and padding
    - Check monospace font on all numeric displays
    - _Requirements: 18.5, 18.8, 18.9_

  - [x] 27.3 Create About and Contact pages
    - Create About page with system overview
    - Create Contact page with contact form
    - Add navigation links
    - _Requirements: 2.3, 17.1-17.7_

  - [x] 27.4 Verify environment configuration
    - Check all environment variables documented
    - Verify WebSocket URL configuration
    - Verify API URL configuration
    - Create .env.example file
    - _Requirements: 20.1-20.10_

- [ ] 28. Final Checkpoint - Comprehensive Testing
  - Run all unit tests and verify passing
  - Run all integration tests and verify passing
  - Run all property-based tests and verify passing
  - Test complete user flow: login → dashboard → data visualization → controls
  - Test mobile responsive behavior on actual devices
  - Test WebSocket reconnection behavior
  - Verify accessibility with keyboard navigation
  - Verify accessibility with screen reader
  - Verify performance: Lighthouse score ≥ 90 desktop
  - Verify performance: First Contentful Paint ≤ 1.5s on 3G
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: All 25 requirements, 21.6, 21.7_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Component tasks build incrementally: utilities → state → hooks → components → pages
- Testing tasks run after implementation tasks to validate correctness
- Property tests validate universal correctness properties from design document
- Unit and integration tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at major milestones
- WebSocket integration is critical path: must be completed before dashboard visualization
- Authentication is prerequisite for all dashboard functionality
- Responsive design and accessibility are validated in final integration phase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["3.1", "3.3"] },
    { "id": 2, "tasks": ["3.2", "3.4", "4.1", "4.3"] },
    { "id": 3, "tasks": ["4.2", "4.4", "5.1", "6.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.2", "7.1", "7.4", "7.5"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.6", "8.1"] },
    { "id": 6, "tasks": ["8.2", "9.1", "10.1"] },
    { "id": 7, "tasks": ["9.2", "10.2", "11.1", "12.1", "13.1", "14.1"] },
    { "id": 8, "tasks": ["11.2", "12.2", "14.2", "14.3"] },
    { "id": 9, "tasks": ["16.1", "17.1", "18.1"] },
    { "id": 10, "tasks": ["16.2", "17.2", "18.2", "19.1"] },
    { "id": 11, "tasks": ["20.1", "21.1", "21.2"] },
    { "id": 12, "tasks": ["20.2", "20.3", "20.4", "22.1", "22.2", "22.3"] },
    { "id": 13, "tasks": ["23.1", "23.2", "23.3", "23.4", "24.1", "24.2", "24.3"] },
    { "id": 14, "tasks": ["25.1", "25.2", "25.3"] },
    { "id": 15, "tasks": ["25.4", "26.1", "26.2"] },
    { "id": 16, "tasks": ["26.3", "27.1", "27.2", "27.3", "27.4"] }
  ]
}
```
