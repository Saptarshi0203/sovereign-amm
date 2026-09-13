import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navigation/Navbar";
import { Footer } from "@/components/footer/Footer";
import { MarketClockProvider } from "@/components/providers/MarketClockProvider";
import { LiveDataProvider } from "@/components/providers/LiveDataProvider";
import { AuthDrawer } from "@/components/layout/AuthDrawer";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
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
      className={`dark ${inter.variable} ${outfit.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-sky-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased min-h-screen flex flex-col">
        {/* Accessibility: skip-to-main-content link, visible on keyboard focus */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <LiveDataProvider>
            <MarketClockProvider>
              <Navbar />

              <main id="main-content" className="flex-1">
                {children}
              </main>

              <Footer />
              <AuthDrawer />
            </MarketClockProvider>
            </LiveDataProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
