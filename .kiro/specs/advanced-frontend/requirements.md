# Requirements Document

## Introduction

The Sovereign-AMM Advanced Frontend is a high-frequency trading terminal interface for an energy matching engine that treats a physical microgrid as a financial exchange. The system provides real-time visualization and control of an L2 limit order book operating at 10 Hz, integrated with battery-based algorithmic market making using the GLFT (Guéant-Lehalle-Fernandez-Tapia) bounded-inventory model. The frontend architecture separates public marketing presence from authenticated trading functionality while maintaining deterministic, low-latency data presentation across all components.

## Glossary

- **Frontend_System**: The Next.js 14 web application providing user interface and real-time data visualization
- **Public_Landing_Page**: Unauthenticated marketing page with feature carousel and call-to-action elements
- **Trading_Dashboard**: Authenticated interface displaying real-time order book, battery state, and control parameters
- **Navigation_System**: Global header component providing routing between pages and authentication state
- **Ticker_Tape**: Full-width horizontal data ribbon displaying real-time market microstructure metrics
- **Feature_Carousel**: Rotating content display with L2 Depth Chart, Price Chart, and Control Power Details
- **Sidebar**: Fixed-width vertical panel containing Recent Articles and RAG Copilot
- **System_Cards**: Grid of interactive components displaying Battery Gauge, Quote Explanation, and Judge Controls
- **L2_Depth_Chart**: Visualization of the limit order book showing bid and ask volumes at each price level
- **Price_Chart**: Time-series line chart displaying micro-price and state-of-charge history
- **Control_Power_Details**: Display panel showing power flow topology with clickable routing information
- **Battery_Gauge**: Circular visualization of battery state-of-charge with numeric precision display
- **Quote_Explanation**: Component displaying GLFT pricing model breakdown with base price, spreads, and degradation costs
- **Judge_Controls**: Panel with four sliders controlling market-making parameters (gamma, kappa, Q_max, A_deg)
- **RAG_Copilot**: Chat interface for AI-powered explainability using ChromaDB vector search and LLM reasoning
- **WebSocket_Stream**: Real-time data connection operating at 10 Hz providing tick updates from backend engine
- **Zustand_Store**: Client-side state management system handling 10 Hz tick data and derived state calculations
- **Recent_Articles**: List component displaying timestamped articles or documentation links
- **Footer**: Global bottom section containing contact information, social links, and copyright
- **Hero_Section**: Large promotional area with headline, description, and call-to-action buttons
- **Emerald_Green**: Supply/bid color (#10b981) used consistently for buy-side market data
- **Rose_Red**: Demand/ask color (#e11d48) used consistently for sell-side market data
- **Dark_Mode**: Primary visual theme using bg-slate-950 background with high-contrast typography
- **Monospace_Font**: Fixed-width typeface applied to all numerical data for vertical alignment and precision reading
- **Mobile_Hamburger**: Collapsible menu icon for navigation on small screens
- **Active_State**: Visual indicator showing current navigation tab selection

## Requirements

### Requirement 1: Architecture and Page Structure

**User Story:** As a system architect, I want clear separation between public marketing and authenticated trading functionality, so that unauthenticated users see promotional content while authenticated users access real-time trading tools.

#### Acceptance Criteria

1. THE Frontend_System SHALL implement two distinct page types: Public_Landing_Page and Trading_Dashboard
2. THE Public_Landing_Page SHALL render without requiring authentication credentials
3. THE Trading_Dashboard SHALL require valid authentication tokens before rendering trading components
4. WHEN a user navigates to the root URL without authentication, THE Frontend_System SHALL display the Public_Landing_Page
5. WHEN a user navigates to dashboard routes without authentication, THE Frontend_System SHALL redirect to the login page
6. THE Frontend_System SHALL use Next.js 14 App Router architecture with separate route groups for public and authenticated pages

### Requirement 2: Navigation System

**User Story:** As a user, I want consistent navigation across all pages, so that I can efficiently move between marketing content, trading tools, and informational pages.

#### Acceptance Criteria

1. THE Navigation_System SHALL display a global header component on all pages
2. THE Navigation_System SHALL include a logo element positioned at the left edge
3. THE Navigation_System SHALL include navigation tabs labeled "Dashboard", "Grid", "Battery", "Pricing", "About", and "Contact"
4. WHEN a user clicks a navigation tab, THE Navigation_System SHALL route to the corresponding page
5. THE Navigation_System SHALL apply Active_State styling to the currently selected tab
6. WHEN the viewport width is below 768 pixels, THE Navigation_System SHALL display a Mobile_Hamburger icon
7. WHEN a user clicks the Mobile_Hamburger icon, THE Navigation_System SHALL expand a vertical menu containing all navigation tabs
8. THE Navigation_System SHALL display authentication status indicators showing "Sign In" and "Sign Up Now" buttons when unauthenticated
9. WHEN a user is authenticated, THE Navigation_System SHALL replace authentication buttons with account information and logout option

### Requirement 3: Hero Section and Call-to-Action

**User Story:** As a marketing stakeholder, I want prominent promotional content with clear calls-to-action, so that visitors understand the product value and can easily sign up or sign in.

#### Acceptance Criteria

1. THE Public_Landing_Page SHALL include a Hero_Section positioned immediately below the Navigation_System
2. THE Hero_Section SHALL display a dark geometric background pattern
3. THE Hero_Section SHALL include a headline text element with font size of at least 48 pixels
4. THE Hero_Section SHALL include a descriptive subheading text element
5. THE Hero_Section SHALL include a "Sign Up Now" button styled as a primary call-to-action
6. THE Hero_Section SHALL include a "Sign In" button styled as a secondary call-to-action
7. WHEN a user clicks the "Sign Up Now" button, THE Frontend_System SHALL navigate to the registration page
8. WHEN a user clicks the "Sign In" button, THE Frontend_System SHALL navigate to the login page
9. THE Hero_Section SHALL occupy the full viewport width

### Requirement 4: Real-Time Data Integration

**User Story:** As a trader, I want all components to display live data from the matching engine at 10 Hz update frequency, so that I see accurate, real-time market conditions for decision-making.

#### Acceptance Criteria

1. THE Frontend_System SHALL establish a WebSocket_Stream connection to the backend engine on Trading_Dashboard mount
2. THE WebSocket_Stream SHALL operate at 10 Hz update frequency
3. WHEN the WebSocket_Stream receives a tick message, THE Frontend_System SHALL update the Zustand_Store with new state data
4. THE Zustand_Store SHALL store tick number, micro_price, best_bid, best_ask, battery state-of-charge, battery inventory position, bids array, asks array, AMM bid quote, AMM ask quote, and quote breakdown
5. THE Frontend_System SHALL propagate Zustand_Store updates to all subscribed components within 100 milliseconds
6. WHEN the WebSocket_Stream connection closes, THE Frontend_System SHALL attempt reconnection with exponential backoff starting at 1 second
7. THE Frontend_System SHALL display a connection status indicator showing connected or disconnected state
8. THE WebSocket_Stream SHALL parse incoming JSON messages and validate data types before updating the Zustand_Store

### Requirement 5: Ticker Tape Display

**User Story:** As a trader, I want a persistent data ribbon showing critical market metrics in monospace format, so that I can monitor key values at a glance without scrolling.

#### Acceptance Criteria

1. THE Ticker_Tape SHALL render as a full-width horizontal component immediately below the Navigation_System on the Trading_Dashboard
2. THE Ticker_Tape SHALL display "MICRO PRICE", "BEST BID", "BEST ASK", and "SoC" labels with corresponding values
3. THE Ticker_Tape SHALL apply Monospace_Font styling to all numeric values
4. THE Ticker_Tape SHALL display numeric values with 8 to 12 decimal places of precision
5. WHEN the Zustand_Store updates micro_price, THE Ticker_Tape SHALL update the "MICRO PRICE" value within 100 milliseconds
6. WHEN the Zustand_Store updates best_bid, THE Ticker_Tape SHALL update the "BEST BID" value within 100 milliseconds
7. WHEN the Zustand_Store updates best_ask, THE Ticker_Tape SHALL update the "BEST ASK" value within 100 milliseconds
8. WHEN the Zustand_Store updates battery state-of-charge, THE Ticker_Tape SHALL update the "SoC" value within 100 milliseconds
9. THE Ticker_Tape SHALL apply Emerald_Green color to the "BEST BID" value
10. THE Ticker_Tape SHALL apply Rose_Red color to the "BEST ASK" value
11. THE Ticker_Tape SHALL remain visible during vertical scrolling on the Trading_Dashboard

### Requirement 6: Feature Carousel Structure

**User Story:** As a user, I want to navigate between different visualization types in a carousel format, so that I can focus on one chart at a time while having quick access to alternative views.

#### Acceptance Criteria

1. THE Public_Landing_Page SHALL include a Feature_Carousel positioned below the Hero_Section
2. THE Feature_Carousel SHALL occupy 70 percent of the horizontal layout width
3. THE Feature_Carousel SHALL display exactly one content panel at a time
4. THE Feature_Carousel SHALL support three content panels: L2_Depth_Chart, Price_Chart, and Control_Power_Details
5. THE Feature_Carousel SHALL display left and right chevron navigation controls
6. WHEN a user clicks the right chevron, THE Feature_Carousel SHALL advance to the next content panel
7. WHEN a user clicks the left chevron, THE Feature_Carousel SHALL return to the previous content panel
8. WHEN the Feature_Carousel displays the first content panel, THE Feature_Carousel SHALL disable the left chevron
9. WHEN the Feature_Carousel displays the last content panel, THE Feature_Carousel SHALL disable the right chevron
10. THE Feature_Carousel SHALL NOT automatically advance to the next panel without user interaction

### Requirement 7: Sidebar Structure

**User Story:** As a user, I want persistent access to articles and AI assistance, so that I can reference documentation and ask questions while viewing market data.

#### Acceptance Criteria

1. THE Public_Landing_Page SHALL include a Sidebar positioned adjacent to the Feature_Carousel
2. THE Sidebar SHALL occupy 30 percent of the horizontal layout width
3. THE Sidebar SHALL display two vertically stacked sections: Recent_Articles and RAG_Copilot
4. THE Recent_Articles section SHALL occupy the upper portion of the Sidebar
5. THE RAG_Copilot section SHALL occupy the lower portion of the Sidebar
6. THE Sidebar SHALL remain visible during horizontal carousel navigation
7. WHEN the viewport width is below 1024 pixels, THE Frontend_System SHALL stack the Feature_Carousel and Sidebar vertically

### Requirement 8: L2 Depth Chart Visualization

**User Story:** As a trader, I want to see the full limit order book with bid and ask volumes at each price level, so that I can assess market depth and liquidity.

#### Acceptance Criteria

1. THE L2_Depth_Chart SHALL render as a horizontal bar chart with price levels on the vertical axis
2. THE L2_Depth_Chart SHALL display bid volumes extending leftward from the center using Emerald_Green color
3. THE L2_Depth_Chart SHALL display ask volumes extending rightward from the center using Rose_Red color
4. WHEN the Zustand_Store updates the bids array, THE L2_Depth_Chart SHALL re-render bid bars within 100 milliseconds
5. WHEN the Zustand_Store updates the asks array, THE L2_Depth_Chart SHALL re-render ask bars within 100 milliseconds
6. THE L2_Depth_Chart SHALL display price labels using Monospace_Font with at least 6 decimal places
7. THE L2_Depth_Chart SHALL display volume labels using Monospace_Font with integer units
8. THE L2_Depth_Chart SHALL highlight the AMM bid quote with a distinct marker when amm_bid is not null
9. THE L2_Depth_Chart SHALL highlight the AMM ask quote with a distinct marker when amm_ask is not null
10. THE L2_Depth_Chart SHALL use the Recharts library for rendering

### Requirement 9: Price Chart Visualization

**User Story:** As a trader, I want to see historical micro-price and battery state-of-charge trends, so that I can identify patterns and assess system stability over time.

#### Acceptance Criteria

1. THE Price_Chart SHALL render as a dual-axis time-series line chart
2. THE Price_Chart SHALL display micro_price on the left vertical axis
3. THE Price_Chart SHALL display battery state-of-charge on the right vertical axis
4. THE Price_Chart SHALL display tick number on the horizontal axis
5. WHEN the Zustand_Store appends a new time_series entry, THE Price_Chart SHALL add the corresponding data point within 100 milliseconds
6. THE Price_Chart SHALL retain the most recent 100 data points in the visible history
7. THE Price_Chart SHALL apply a continuous line style to the micro_price series
8. THE Price_Chart SHALL apply a continuous line style to the state-of-charge series
9. THE Price_Chart SHALL use contrasting colors for micro_price and state-of-charge lines
10. THE Price_Chart SHALL use the Recharts library for rendering

### Requirement 10: Control Power Details Display

**User Story:** As a grid operator, I want to visualize power flow topology with interactive routing information, so that I can understand congestion patterns and line utilization.

#### Acceptance Criteria

1. THE Control_Power_Details SHALL display a schematic representation of the grid topology
2. THE Control_Power_Details SHALL indicate node positions and connection lines
3. THE Control_Power_Details SHALL display PTDF (Power Transfer Distribution Factors) values when available
4. WHEN a user clicks on a grid connection line, THE Control_Power_Details SHALL highlight the selected line
5. WHEN a user clicks on a grid connection line, THE Control_Power_Details SHALL display routing details including line capacity and current flow
6. THE Control_Power_Details SHALL use arrow indicators to show direction of power flow
7. THE Control_Power_Details SHALL apply color coding to indicate line utilization percentage

### Requirement 11: Battery Gauge Visualization

**User Story:** As a system operator, I want a clear circular gauge showing battery state-of-charge, so that I can quickly assess energy reserves at high precision.

#### Acceptance Criteria

1. THE Battery_Gauge SHALL render as a circular arc visualization
2. THE Battery_Gauge SHALL display the current state-of-charge as a percentage of maximum capacity
3. WHEN the Zustand_Store updates battery state-of-charge, THE Battery_Gauge SHALL update the arc fill within 100 milliseconds
4. THE Battery_Gauge SHALL display a numeric value at the center using Monospace_Font
5. THE Battery_Gauge SHALL display the numeric value with at least 6 decimal places
6. THE Battery_Gauge SHALL apply a color gradient from red (low) to green (high) to the arc fill
7. THE Battery_Gauge SHALL display "SoC" label above the numeric value

### Requirement 12: Quote Explanation Display

**User Story:** As a trader, I want detailed breakdown of the GLFT pricing model components, so that I understand how the AMM arrives at bid and ask quotes.

#### Acceptance Criteria

1. THE Quote_Explanation SHALL display when quote_breakdown data is available in the Zustand_Store
2. THE Quote_Explanation SHALL display "Base Price" with the base value using Monospace_Font
3. THE Quote_Explanation SHALL display "Spread" with the spread value using Monospace_Font
4. THE Quote_Explanation SHALL display "Delta Bid" with the delta_bid value using Monospace_Font
5. THE Quote_Explanation SHALL display "Delta Ask" with the delta_ask value using Monospace_Font
6. THE Quote_Explanation SHALL display "Degradation Cost" with the c_deg value using Monospace_Font
7. WHEN the Zustand_Store updates quote_breakdown, THE Quote_Explanation SHALL update all displayed values within 100 milliseconds
8. THE Quote_Explanation SHALL display all numeric values with at least 6 decimal places
9. THE Quote_Explanation SHALL provide tooltips or inline text explaining each component's role in the pricing model

### Requirement 13: Judge Controls Interface

**User Story:** As a system administrator, I want adjustable sliders for market-making parameters, so that I can tune the AMM behavior in response to changing grid conditions.

#### Acceptance Criteria

1. THE Judge_Controls SHALL display four horizontal slider controls
2. THE Judge_Controls SHALL include a slider labeled "Gamma (Risk Aversion)" with range 0.01 to 10.0
3. THE Judge_Controls SHALL include a slider labeled "Kappa (Market Impact)" with range 0.001 to 1.0
4. THE Judge_Controls SHALL include a slider labeled "Q_max (Max Inventory)" with range 1000000 to 100000000
5. THE Judge_Controls SHALL include a slider labeled "A_deg (Degradation Factor)" with range 0.0 to 1000.0
6. WHEN a user drags a slider, THE Judge_Controls SHALL display the current value using Monospace_Font
7. WHEN a user releases a slider, THE Judge_Controls SHALL send the updated parameter value to the backend engine via API call
8. THE Judge_Controls SHALL display current parameter values retrieved from the backend on component mount
9. THE Judge_Controls SHALL disable sliders when the WebSocket_Stream is disconnected

### Requirement 14: RAG Copilot Interface

**User Story:** As a user, I want an AI-powered chat interface that answers questions using system documentation, so that I can get contextual explanations without leaving the trading interface.

#### Acceptance Criteria

1. THE RAG_Copilot SHALL display a chat message history panel
2. THE RAG_Copilot SHALL display a text input field for user queries
3. THE RAG_Copilot SHALL display a submit button adjacent to the text input field
4. WHEN a user enters text and clicks submit, THE RAG_Copilot SHALL send the query to the backend RAG service
5. WHEN the backend RAG service returns a response, THE RAG_Copilot SHALL append the response to the chat message history
6. THE RAG_Copilot SHALL distinguish user messages from AI responses using visual styling
7. THE RAG_Copilot SHALL display a loading indicator while waiting for backend response
8. THE RAG_Copilot SHALL support markdown rendering in AI response messages
9. THE RAG_Copilot SHALL automatically scroll to show the most recent message when a new message is added
10. THE RAG_Copilot SHALL retain the most recent 50 messages in the chat history

### Requirement 15: Recent Articles Display

**User Story:** As a user, I want quick access to relevant articles and documentation links, so that I can reference educational content related to the trading system.

#### Acceptance Criteria

1. THE Recent_Articles SHALL display a vertical list of article entries
2. THE Recent_Articles SHALL display article title, publication date, and summary for each entry
3. WHEN a user clicks on an article entry, THE Recent_Articles SHALL navigate to the full article page or external URL
4. THE Recent_Articles SHALL retrieve article data from the backend on component mount
5. THE Recent_Articles SHALL display the 5 most recent articles by publication date
6. THE Recent_Articles SHALL display a "View All" link at the bottom of the list
7. WHEN a user clicks the "View All" link, THE Frontend_System SHALL navigate to a complete articles archive page

### Requirement 16: System Cards Layout

**User Story:** As a trader, I want an organized grid displaying multiple system status and control components, so that I can monitor and adjust parameters without excessive scrolling.

#### Acceptance Criteria

1. THE Trading_Dashboard SHALL include a System_Cards section positioned below the Ticker_Tape
2. THE System_Cards SHALL arrange components in a 3-column grid layout
3. THE System_Cards SHALL include Battery_Gauge in the first column position
4. THE System_Cards SHALL include Quote_Explanation in the second column position
5. THE System_Cards SHALL include Judge_Controls in the third column position
6. WHEN the viewport width is below 1280 pixels, THE System_Cards SHALL reflow to a 2-column layout
7. WHEN the viewport width is below 768 pixels, THE System_Cards SHALL reflow to a single-column layout
8. THE System_Cards SHALL apply consistent padding and spacing between grid items

### Requirement 17: Footer Display

**User Story:** As a user, I want consistent footer information across all pages, so that I can access contact details and legal information regardless of current page.

#### Acceptance Criteria

1. THE Footer SHALL render at the bottom of all pages in the Frontend_System
2. THE Footer SHALL display contact information including email address and phone number
3. THE Footer SHALL display social media links for platform accounts
4. WHEN a user clicks a social media link, THE Frontend_System SHALL open the corresponding social media profile in a new browser tab
5. THE Footer SHALL display copyright text including the current year
6. THE Footer SHALL display links to "Privacy Policy" and "Terms of Service" pages
7. THE Footer SHALL use Dark_Mode styling consistent with the rest of the application

### Requirement 18: Visual Design and Theming

**User Story:** As a user, I want consistent dark-mode styling with high-contrast colors optimized for financial data, so that I can comfortably view data during extended trading sessions.

#### Acceptance Criteria

1. THE Frontend_System SHALL apply Dark_Mode styling with bg-slate-950 background color to all pages
2. THE Frontend_System SHALL use Tailwind CSS for styling implementation
3. THE Frontend_System SHALL apply Emerald_Green (#10b981) color to all buy-side and supply-related data elements
4. THE Frontend_System SHALL apply Rose_Red (#e11d48) color to all sell-side and demand-related data elements
5. THE Frontend_System SHALL apply Monospace_Font to all numeric data displays including prices, volumes, and state values
6. THE Frontend_System SHALL apply sans-serif fonts to all non-numeric text content
7. THE Frontend_System SHALL maintain color contrast ratios of at least 4.5:1 for text readability
8. THE Frontend_System SHALL apply consistent border radius values to all card components
9. THE Frontend_System SHALL apply consistent shadow effects to elevated components

### Requirement 19: Responsive Layout Behavior

**User Story:** As a user, I want the interface to adapt gracefully to different screen sizes, so that I can access trading functionality on desktop, tablet, and mobile devices.

#### Acceptance Criteria

1. THE Frontend_System SHALL implement responsive breakpoints at 640px, 768px, 1024px, and 1280px viewport widths
2. WHEN the viewport width is below 768px, THE Navigation_System SHALL hide navigation tabs and display Mobile_Hamburger
3. WHEN the viewport width is below 1024px, THE Frontend_System SHALL stack Feature_Carousel and Sidebar vertically
4. WHEN the viewport width is below 1280px, THE System_Cards SHALL reflow from 3-column to 2-column layout
5. WHEN the viewport width is below 768px, THE System_Cards SHALL reflow to single-column layout
6. THE Frontend_System SHALL maintain readable font sizes across all breakpoints with minimum size of 14 pixels
7. THE Frontend_System SHALL ensure touch targets are at least 44x44 pixels on mobile viewports

### Requirement 20: Technology Stack and Dependencies

**User Story:** As a developer, I want clearly defined technology dependencies matching the specified stack, so that the implementation uses approved libraries and frameworks.

#### Acceptance Criteria

1. THE Frontend_System SHALL use Next.js version 14 with App Router architecture
2. THE Frontend_System SHALL use React version 18 for component rendering
3. THE Frontend_System SHALL use TypeScript for type-safe development
4. THE Frontend_System SHALL use Zustand version 4.5 or higher for state management
5. THE Frontend_System SHALL use Recharts version 2.12 or higher for chart visualizations
6. THE Frontend_System SHALL use Tailwind CSS version 3.4 or higher for styling
7. THE Frontend_System SHALL use Lucide React for icon components
8. THE Frontend_System SHALL implement WebSocket communication using native WebSocket API
9. THE Frontend_System SHALL configure TypeScript with strict mode enabled
10. THE Frontend_System SHALL configure ESLint with Next.js recommended rules

### Requirement 21: Performance and Optimization

**User Story:** As a trader, I want the interface to update smoothly at 10 Hz without lag or frame drops, so that I can make time-sensitive trading decisions based on current data.

#### Acceptance Criteria

1. THE Frontend_System SHALL render WebSocket_Stream updates at 10 Hz without dropped frames
2. THE Frontend_System SHALL limit re-renders to only components subscribed to changed Zustand_Store state
3. THE Frontend_System SHALL debounce Judge_Controls slider updates to prevent excessive API calls
4. THE Frontend_System SHALL implement memoization for expensive chart calculations
5. THE Frontend_System SHALL limit time_series data retention to 100 most recent points to prevent memory growth
6. THE Frontend_System SHALL achieve Lighthouse performance score of at least 90 on desktop
7. THE Frontend_System SHALL achieve First Contentful Paint within 1.5 seconds on 3G network
8. THE Frontend_System SHALL use Next.js Image component with optimization for all static images

### Requirement 22: Accessibility Compliance

**User Story:** As a user with assistive technology, I want the interface to support keyboard navigation and screen readers, so that I can access all functionality regardless of input method.

#### Acceptance Criteria

1. THE Frontend_System SHALL implement keyboard navigation for all interactive elements
2. THE Frontend_System SHALL provide focus indicators with contrast ratio of at least 3:1 against background
3. THE Frontend_System SHALL apply ARIA labels to icon-only buttons including Mobile_Hamburger and chevron controls
4. THE Frontend_System SHALL apply ARIA live regions to Ticker_Tape for screen reader announcements of value changes
5. THE Frontend_System SHALL apply semantic HTML5 elements including header, nav, main, aside, and footer
6. THE Frontend_System SHALL support tab key navigation through Navigation_System tabs in logical order
7. THE Frontend_System SHALL provide skip navigation link to bypass header and jump to main content
8. THE Judge_Controls sliders SHALL be keyboard-operable using arrow keys for value adjustment

### Requirement 23: Error Handling and Connection Management

**User Story:** As a trader, I want clear feedback when data connections fail, so that I understand when displayed data is stale and can take corrective action.

#### Acceptance Criteria

1. WHEN the WebSocket_Stream connection fails, THE Frontend_System SHALL display a prominent error banner
2. THE Frontend_System SHALL apply visual styling to indicate stale data when WebSocket_Stream is disconnected for more than 5 seconds
3. WHEN WebSocket_Stream reconnection succeeds, THE Frontend_System SHALL dismiss the error banner within 1 second
4. IF Judge_Controls API calls fail, THEN THE Frontend_System SHALL display an error message below the affected slider
5. IF RAG_Copilot API calls fail, THEN THE Frontend_System SHALL display an error message in the chat history
6. THE Frontend_System SHALL log WebSocket_Stream connection events to browser console for debugging
7. THE Frontend_System SHALL retry failed Judge_Controls API calls up to 3 times with exponential backoff

### Requirement 24: Authentication Integration

**User Story:** As a security-conscious user, I want authentication tokens managed securely with automatic session handling, so that my access credentials are protected.

#### Acceptance Criteria

1. WHEN a user submits valid credentials on the login page, THE Frontend_System SHALL store authentication tokens in HTTP-only cookies
2. WHEN a user accesses Trading_Dashboard routes, THE Frontend_System SHALL validate authentication token presence
3. IF authentication token is missing or expired, THEN THE Frontend_System SHALL redirect to the login page
4. WHEN a user clicks logout, THE Frontend_System SHALL clear authentication tokens and redirect to Public_Landing_Page
5. THE Frontend_System SHALL include authentication token in WebSocket_Stream connection handshake
6. THE Frontend_System SHALL include authentication token in all authenticated API requests
7. IF the backend returns 401 Unauthorized response, THEN THE Frontend_System SHALL redirect to the login page

### Requirement 25: Data Precision and Formatting

**User Story:** As a trader, I want numerical data displayed with appropriate precision and consistent formatting, so that I can distinguish small price differences critical for arbitrage decisions.

#### Acceptance Criteria

1. THE Frontend_System SHALL display micro_price values with exactly 8 decimal places
2. THE Frontend_System SHALL display best_bid values with exactly 8 decimal places
3. THE Frontend_System SHALL display best_ask values with exactly 8 decimal places
4. THE Frontend_System SHALL display battery state-of-charge values with exactly 6 decimal places
5. THE Frontend_System SHALL display order book price levels with exactly 6 decimal places
6. THE Frontend_System SHALL display order book volumes as integers without decimal places
7. THE Frontend_System SHALL display GLFT quote breakdown components with exactly 8 decimal places
8. THE Frontend_System SHALL format large numbers with thousands separators for readability
9. THE Frontend_System SHALL align decimal points vertically in tabular numeric displays
