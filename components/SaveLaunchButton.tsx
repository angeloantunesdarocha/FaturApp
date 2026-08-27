"use client";

import { useEffect, useRef, useState } from "react";

type SaveState = "idle" | "loading" | "success";

type Props = {
  onSave: () => boolean | Promise<boolean>;
  disabled?: boolean;
};

export default function SaveLaunchButton({ onSave, disabled = false }: Props) {
  const [state, setState] = useState<SaveState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function handleSave() {
    if (disabled || state !== "idle") return;

    setState("loading");

    // Permite que o navegador renderize o spinner antes do salvamento local.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    try {
      const saved = await onSave();
      if (!saved) {
        setState("idle");
        return;
      }

      setState("success");
      resetTimer.current = setTimeout(() => {
        setState("idle");
        resetTimer.current = null;
      }, 2000);
    } catch {
      setState("idle");
    }
  }

  const isLoading = state === "loading";
  const isSuccess = state === "success";

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={disabled || state !== "idle"}
      aria-busy={isLoading}
      aria-live="polite"
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition-all duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
        isSuccess
          ? "scale-[1.02] border-emerald-600 bg-emerald-600 text-white shadow-emerald-200"
          : isLoading
            ? "border-slate-300 bg-slate-100 text-slate-600"
            : "border-slate-300 bg-white text-slate-800 hover:scale-[1.01] hover:border-slate-500 hover:bg-slate-50 hover:shadow-md active:scale-[0.99]"
      }`}
    >
      {isLoading ? (
        <>
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 motion-reduce:animate-none" />
          <span>Salvando...</span>
        </>
      ) : isSuccess ? (
        <>
          <span aria-hidden="true" className="animate-bounce motion-reduce:animate-none">✅</span>
          <span>Lançamento Salvo!</span>
        </>
      ) : (
        <span>Salvar Lançamento</span>
      )}
    </button>
  );
}
