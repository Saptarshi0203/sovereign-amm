/**
 * Authentication type definitions for Sovereign-AMM Frontend.
 *
 * These types model the authentication flow: credential submission,
 * API response handling, user identity representation, and Zustand
 * store shape for managing auth state across the application.
 *
 * Related requirements: 24.1–24.7
 */

/**
 * Credentials submitted by the user on the login page.
 * Used as the request body for POST /api/auth/login.
 */
export interface UserCredentials {
  /** User's registered email address */
  email: string;
  /** User's plaintext password (transmitted over HTTPS, never stored client-side) */
  password: string;
}

/**
 * Authenticated user identity returned by the backend after a
 * successful login or token validation check.
 */
export interface User {
  /** Unique user identifier (UUID or database primary key) */
  id: string;
  /** User's email address */
  email: string;
  /**
   * Access role controlling UI visibility and API permissions.
   * Examples: "admin", "trader", "viewer"
   */
  role: string;
}

/**
 * Shape of the JSON response body returned by POST /api/auth/login.
 * The JWT token is also delivered via the Set-Cookie header as an
 * HTTP-only cookie (requirement 24.1); this field mirrors it for
 * in-memory access during the current session.
 */
export interface LoginResponse {
  /** JWT access token for authenticating subsequent requests */
  token: string;
  /** Authenticated user details */
  user: User;
}

/**
 * Zustand store interface for authentication state and actions.
 *
 * Manages:
 * - Session status (`isAuthenticated`)
 * - Current user identity (`user`)
 * - In-memory token reference (`token`) — the authoritative copy
 *   is stored in an HTTP-only cookie (requirement 24.1)
 *
 * Actions:
 * - `login`     — submits credentials, stores token, updates state
 * - `logout`    — clears token and redirects to landing page (requirement 24.4)
 * - `checkAuth` — validates the stored token; redirects to /login on failure (requirement 24.2, 24.3)
 */
export interface AuthState {
  /** Whether the current session has a valid, authenticated user */
  isAuthenticated: boolean;

  /** Authenticated user details, or null when unauthenticated */
  user: User | null;

  /**
   * JWT token held in memory for attaching to API and WebSocket requests
   * (requirements 24.5, 24.6). null when the user is not logged in.
   */
  token: string | null;

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Submits the provided credentials to the backend authentication endpoint.
   * On success, stores the returned JWT token and updates `isAuthenticated`
   * and `user`. On failure, throws an error for the caller to handle.
   *
   * @param email    - User's email address
   * @param password - User's plaintext password
   * @throws {Error} When credentials are invalid or the network request fails
   *
   * Satisfies: Requirement 24.1 (token stored in HTTP-only cookie via Set-Cookie)
   */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Clears the in-memory token and authenticated user, then redirects the
   * browser to the Public_Landing_Page.
   *
   * Satisfies: Requirement 24.4 (clear tokens and redirect on logout)
   */
  logout: () => void;

  /**
   * Validates the current authentication token against the backend.
   * Returns `true` if the session is active and valid, `false` otherwise.
   * When validation fails, the store clears its auth state so the caller
   * or a layout guard can redirect to /login.
   *
   * @returns Promise resolving to `true` if authenticated, `false` if not
   *
   * Satisfies: Requirements 24.2, 24.3 (validate token presence; redirect on missing/expired)
   */
  checkAuth: () => Promise<boolean>;
}
