"use client";

import { usePathname } from "next/navigation";

const COPYRIGHT = "© 2026 FaturApp. Visibilidade total sobre o seu lucro real. Desenvolvido por Ângelo Antunes. Todos os direitos reservados.";
const INSTAGRAM_URL = "https://www.instagram.com/faturappbrasil/";
const FACEBOOK_URL = "https://www.facebook.com/faturappbrasil/";

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M13.7 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.7-.1-1.5-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4.1V10H8.2v3h2.6v8h2.9Z" />
    </svg>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-400/10 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071c31] motion-reduce:transform-none"
    >
      {children}
    </a>
  );
}

export default function AppFooter() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <footer className="shrink-0 px-4 py-3 text-center text-xs leading-relaxed text-slate-400">
        <p>{COPYRIGHT}</p>
      </footer>
    );
  }

  if (pathname !== "/comece") return null;

  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#071c31] text-slate-300">
      <div className="mx-auto flex w-full max-w-6xl flex-col-reverse items-center justify-center gap-4 px-4 py-6 md:flex-row md:justify-between md:gap-8 md:px-6">
        <p className="max-w-3xl text-center text-xs leading-relaxed text-slate-400 md:text-left">
          {COPYRIGHT}
        </p>
        <nav aria-label="Redes sociais do Fatur APP Brasil" className="flex shrink-0 items-center gap-4">
          <SocialLink href={INSTAGRAM_URL} label="Instagram do Fatur APP Brasil">
            <InstagramIcon />
          </SocialLink>
          <SocialLink href={FACEBOOK_URL} label="Facebook do Fatur APP Brasil">
            <FacebookIcon />
          </SocialLink>
        </nav>
      </div>
    </footer>
  );
}
