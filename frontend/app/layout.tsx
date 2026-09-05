import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import EmergencyBanner from "@/components/EmergencyBanner";
import RagDrawer from "@/components/RagDrawer";
import SystemHealth from "@/components/SystemHealth";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: "Sovereign-AMM | HFT Microgrid",
  description: "High-frequency algorithmic market maker for physical microgrids.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${jetbrains.variable}`}>
      <body className="bg-background text-textMain font-sans antialiased bg-[url('/grid.svg')] bg-center bg-fixed min-h-screen flex flex-col pb-8">
        <EmergencyBanner />
        <Navbar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
        <RagDrawer />
        <SystemHealth />
      </body>
    </html>
  );
}
