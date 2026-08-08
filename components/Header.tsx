"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function FaturAppMark() {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#123B63] shadow-sm ring-1 ring-[#0D2F4F]/10"
    >
      <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
        <path
          d="M8 23.5h24M11 23.5l1.9-6.2c.25-.8.99-1.3 1.83-1.3h10.54c.84 0 1.58.5 1.83 1.3L29 23.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.5 23.5v4.2M29.5 23.5v4.2M13 27.7h14"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="13.5" cy="24.5" r="1.6" fill="#34C759" />
        <circle cx="26.5" cy="24.5" r="1.6" fill="#34C759" />
        <path
          d="M14 12.5h3.2v3.5H14zM19.1 10h3.2v6h-3.2zM24.2 7.5h3.2V16h-3.2z"
          fill="#34C759"
          opacity="0.95"
        />
      </svg>
    </span>
  );
}

function NavigationIcon({ type }: { type: "launch" | "reports" }) {
  if (type === "launch") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M5 17.5V12l7-5 7 5v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 17.5v-4h7v4M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  const navItems = [
    { href: "/", label: "Lançar dia", icon: "launch" as const },
    { href: "/relatorios", label: "Relatórios", icon: "reports" as const },
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-3.5">
        <Link
          href="/"
          aria-label="FaturApp - Lançar dia"
          className="group flex min-w-0 shrink-0 items-center gap-2.5"
        >
          <FaturAppMark />
          <span className="font-sans text-[20px] font-extrabold leading-none tracking-[-0.04em] text-[#123B63] sm:text-[21px]">
            Fatur<span className="text-[#168A4A]">App</span>
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="flex items-center gap-2 sm:gap-3">
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168A4A] focus-visible:ring-offset-2 active:scale-[0.98] sm:gap-2 sm:px-4 sm:text-[15px] ${
                  active
                    ? "bg-[#168A4A] text-white shadow-sm hover:bg-[#11743E]"
                    : "border border-slate-200 bg-white text-[#123B63] shadow-sm hover:border-[#168A4A]/40 hover:bg-slate-50 hover:text-[#11743E]"
                }`}
              >
                <NavigationIcon type={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
