"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

function FaturAppMark() {
  return <span aria-hidden="true" className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#123B63] shadow-sm ring-1 ring-[#0D2F4F]/10"><svg viewBox="0 0 40 40" className="h-7 w-7" fill="none"><path d="M8 23.5h24M11 23.5l1.9-6.2c.25-.8.99-1.3 1.83-1.3h10.54c.84 0 1.58.5 1.83 1.3L29 23.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.5 23.5v4.2M29.5 23.5v4.2M13 27.7h14" stroke="white" strokeWidth="2.4" strokeLinecap="round"/><circle cx="13.5" cy="24.5" r="1.6" fill="#34C759"/><circle cx="26.5" cy="24.5" r="1.6" fill="#34C759"/><path d="M14 12.5h3.2v3.5H14zM19.1 10h3.2v6h-3.2zM24.2 7.5h3.2V16h-3.2z" fill="#34C759" opacity="0.95"/></svg></span>;
}

export default function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const isReports = pathname === "/relatorios";

  return <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:flex-nowrap sm:px-4">
    <Link href="/" aria-label="FaturApp - Lucro real por dia, km e hora" className="group flex min-w-0 items-center gap-2.5"><FaturAppMark /><span className="min-w-0"><span className="block truncate font-sans text-[20px] font-extrabold leading-none tracking-[-0.04em] text-[#123B63] sm:text-[21px]">Fatur<span className="text-[#168A4A]">App</span></span><span className="hidden text-[11px] font-medium leading-tight text-slate-500 sm:block">Lucro real por dia, km e hora</span></span></Link>
    {isAuthenticated && <nav aria-label="Navegação principal" className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto sm:gap-3">
      <Link href="/" aria-current={!isReports ? "page" : undefined} className="rounded-full bg-[#168A4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#11763F] focus:outline-none focus:ring-2 focus:ring-[#168A4A]/30">Lançar dia</Link>
      <Link href="/relatorios" aria-current={isReports ? "page" : undefined} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#123B63] shadow-sm transition-colors hover:border-[#123B63] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#123B63]/20">Relatórios</Link>
      <div className="relative -top-0.5"><LogoutButton /></div>
    </nav>}
  </div></header>;
}
