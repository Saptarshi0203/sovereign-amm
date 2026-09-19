"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Grid", href: "/grid" },
    { label: "Battery", href: "/battery" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <nav className="bg-surface border-b border-border shadow-sm flex items-center justify-between px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center space-x-6">
        <Link href="/" className="text-xl font-outfit font-bold text-accent tracking-wide uppercase">
          Sovereign-AMM
        </Link>
        <div className="hidden md:flex space-x-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-jetbrains font-medium px-4 py-2 rounded-md transition-all ${
                pathname === item.href
                  ? "bg-accent/20 text-accent border border-accent/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                  : "text-textMuted hover:text-textMain hover:bg-surfaceHighlight border border-transparent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Link
          href="/login"
          className="text-sm font-jetbrains font-bold bg-accent text-bg px-5 py-2 rounded-md hover:bg-accent/90 transition-colors shadow-glow-accent"
        >
          LOGIN
        </Link>
      </div>
    </nav>
  );
}
