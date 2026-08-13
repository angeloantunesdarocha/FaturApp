"use client";

import { useState } from "react";
import { logoutUser } from "@/app/actions";

export default function LogoutButton() {
  const [isPressed, setIsPressed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
          isPressed
            ? "border-[#B91C1C] bg-[#B91C1C] text-white"
            : "border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        }`}
      >
        Sair
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071c31]/65 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
        >
          <div className="w-full max-w-sm animate-fade-up overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-[#123B63] via-[#14527a] to-[#168A4A] px-6 pb-7 pt-8 text-center text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-4xl shadow-inner" aria-hidden="true">👋</div>
              <h2 id="logout-title" className="mt-4 text-2xl font-extrabold tracking-tight">Ah, que pena você já vai?</h2>
              <p className="mt-3 text-sm leading-6 text-white/85">Seu lucro real continua esperando por você. Volte quando quiser — o FaturApp estará aqui para ajudar você a trabalhar sabendo quanto realmente sobra.</p>
            </div>

            <div className="space-y-3 p-5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#10B981] px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#059669] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                Continuar no FaturApp
              </button>
              <form action={logoutUser}>
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300/40"
                >
                  Sair por agora
                </button>
              </form>
              <p className="pt-1 text-center text-xs text-slate-400">Você pode voltar a qualquer momento.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
