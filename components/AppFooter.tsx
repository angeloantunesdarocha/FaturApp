"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const COPYRIGHT = "© 2026 FaturApp. Visibilidade total sobre o seu lucro real. Desenvolvido por Ângelo Antunes. Todos os direitos reservados.";
const INSTAGRAM_URL = "https://www.instagram.com/faturappbrasil/";
const FACEBOOK_URL = "https://www.facebook.com/share/1DCMkxEp7E/";
const publicRoutes = ["/comece", "/sobre", "/privacidade", "/termos", "/contato"];

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

  const isPublicContent = publicRoutes.includes(pathname) || pathname.startsWith("/guias");
  if (!isPublicContent) return null;

  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#071c31] text-slate-300">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.3fr_1fr_auto] md:px-6">
        <div>
          <p className="font-extrabold text-white">Fatur<span className="text-emerald-400">App</span></p>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-400">{COPYRIGHT}</p>
        </div>

        <nav aria-label="Links institucionais" className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
          <Link href="/comece" className="hover:text-white">Como funciona</Link>
          <Link href="/guias" className="hover:text-white">Guias</Link>
          <Link href="/sobre" className="hover:text-white">Sobre</Link>
          <Link href="/contato" className="hover:text-white">Contato</Link>
          <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
          <Link href="/termos" className="hover:text-white">Termos de uso</Link>
        </nav>

        <nav aria-label="Redes sociais do FaturApp Brasil" className="flex items-start gap-3">
          <SocialLink href={INSTAGRAM_URL} label="Instagram do FaturApp Brasil"><InstagramIcon /></SocialLink>
          <SocialLink href={FACEBOOK_URL} label="Facebook do FaturApp Brasil"><FacebookIcon /></SocialLink>
        </nav>
      </div>
    </footer>
  );
}
