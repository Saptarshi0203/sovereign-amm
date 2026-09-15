import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navigation/Navbar";
import { Footer } from "@/components/footer/Footer";
import { MarketClockProvider } from "@/components/providers/MarketClockProvider";
import { LiveDataProvider } from "@/components/providers/LiveDataProvider";
import { AuthDrawer } from "@/components/layout/AuthDrawer";
import { RAGCopilotDrawer } from "@/components/RAGCopilotDrawer";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { CursorDot } from "@/components/ui/CursorDot";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sovereign-AMM | Deterministic Energy Trading",
  description:
    "High-frequency limit order book for microgrid energy markets with battery-based algorithmic market making. Real-time GLFT pricing, grid topology visualization, and deterministic settlement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${jakarta.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-canvas text-slate-100 font-sans antialiased min-h-screen flex flex-col">
        {/* Accessibility: skip-to-main-content link, visible on keyboard focus */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <LiveDataProvider>
            <MarketClockProvider>
              {/* Global scroll progress hairline (1px, telemetry colour) */}
              <ScrollProgress />
              {/* Custom cursor dot (pointer:fine devices only) */}
              <CursorDot />

              <Navbar />

              <main id="main-content" className="flex-1">
                {children}
              </main>

              <Footer />
              <AuthDrawer />
              <RAGCopilotDrawer />
            </MarketClockProvider>
            </LiveDataProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
