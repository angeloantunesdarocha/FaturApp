"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href
      ? "text-brand-700 font-semibold"
      : "text-slate-600 hover:text-brand-600";

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🚗</span>
          <span className="text-lg font-bold text-slate-900">FaturApp</span>
        </Link>
        <nav className="flex gap-5 text-sm">
          <Link href="/" className={isActive("/")}>
            Lançar dia
          </Link>
          <Link href="/relatorios" className={isActive("/relatorios")}>
            Relatórios
          </Link>
        </nav>
      </div>
    </header>
  );
}