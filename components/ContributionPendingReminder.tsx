"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CONTRIBUTION_STARTED_AT_KEY = "faturapp:contribution-started-at";
const CONTRIBUTION_LAST_REMINDER_AT_KEY = "faturapp:contribution-last-reminder-at";
const CONTRIBUTION_REMINDER_INTERVAL_MS = 3 * 60 * 1000;
const OPEN_CONTRIBUTION_STATUSES = ["pending", "past_due", "paused"];

type NoticeTone = "warning" | "success";

export default function ContributionPendingReminder() {
  const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const reminderTimerRef = useRef<number | null>(null);
  const runReminderRef = useRef<() => void>(() => undefined);
  const successShownRef = useRef(false);

  const clearReminderTimer = useCallback(() => {
    if (reminderTimerRef.current !== null) {
      window.clearTimeout(reminderTimerRef.current);
      reminderTimerRef.current = null;
    }
  }, []);

  const showNotice = useCallback((tone: NoticeTone, message: string) => {
    setNotice({ tone, message });

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 7000);
  }, []);

  const scheduleReminder = useCallback((delayMs?: number) => {
    clearReminderTimer();

    const startedAt = Number(window.localStorage.getItem(CONTRIBUTION_STARTED_AT_KEY) || 0);
    if (!startedAt) return;

    const lastReminderAt = Number(
      window.localStorage.getItem(CONTRIBUTION_LAST_REMINDER_AT_KEY) || startedAt,
    );
    const remaining = delayMs ?? Math.max(0, CONTRIBUTION_REMINDER_INTERVAL_MS - (Date.now() - lastReminderAt));

    reminderTimerRef.current = window.setTimeout(() => {
      runReminderRef.current();
    }, remaining);
  }, [clearReminderTimer]);

  const checkContributionAndRemind = useCallback(async () => {
    const startedAt = Number(window.localStorage.getItem(CONTRIBUTION_STARTED_AT_KEY) || 0);
    if (!startedAt) {
      clearReminderTimer();
      return;
    }

    try {
      const response = await fetch("/api/contributions/status", { cache: "no-store" });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.localStorage.removeItem(CONTRIBUTION_STARTED_AT_KEY);
          window.localStorage.removeItem(CONTRIBUTION_LAST_REMINDER_AT_KEY);
          clearReminderTimer();
          return;
        }

        scheduleReminder();
        return;
      }

      const payload = await response.json();
      const contribution = payload.contribution || null;

      if (contribution?.status === "active") {
        window.localStorage.removeItem(CONTRIBUTION_STARTED_AT_KEY);
        window.localStorage.removeItem(CONTRIBUTION_LAST_REMINDER_AT_KEY);
        clearReminderTimer();

        if (!successShownRef.current) {
          successShownRef.current = true;
          showNotice(
            "success",
            "🎉 Obrigado por contribuir com o FaturApp! Sua contribuição foi confirmada com sucesso. 💚😊",
          );
        }
        return;
      }

      if (contribution?.status && !OPEN_CONTRIBUTION_STATUSES.includes(contribution.status)) {
        window.localStorage.removeItem(CONTRIBUTION_STARTED_AT_KEY);
        window.localStorage.removeItem(CONTRIBUTION_LAST_REMINDER_AT_KEY);
        clearReminderTimer();
        return;
      }

      if (OPEN_CONTRIBUTION_STATUSES.includes(contribution?.status)) {
        window.localStorage.setItem(CONTRIBUTION_LAST_REMINDER_AT_KEY, String(Date.now()));
        showNotice(
          "warning",
          "⏳ A contribuição ainda está pendente e em aberto. Falta concluir a confirmação no Mercado Pago. 💚",
        );
      }
    } catch {
      // Mantém o marcador e tenta novamente no próximo intervalo sem interromper a navegação.
    }

    if (window.localStorage.getItem(CONTRIBUTION_STARTED_AT_KEY)) {
      scheduleReminder();
    }
  }, [clearReminderTimer, scheduleReminder, showNotice]);

  useEffect(() => {
    runReminderRef.current = () => {
      void checkContributionAndRemind();
    };
  }, [checkContributionAndRemind]);

  useEffect(() => {
    scheduleReminder();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleReminder();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearReminderTimer();

      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, [clearReminderTimer, scheduleReminder]);

  if (!notice) return null;

  return (
    <div
      className={
        "fixed inset-x-4 top-20 z-[100] mx-auto flex max-w-xl items-start gap-3 rounded-2xl border px-4 py-4 text-sm font-semibold shadow-2xl backdrop-blur notice-toast " +
        (notice.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-900")
      }
      role="status"
      aria-live="polite"
    >
      <span className="flex-1 leading-6">{notice.message}</span>
      <button
        type="button"
        onClick={() => setNotice(null)}
        className="shrink-0 text-lg leading-none opacity-70 hover:opacity-100"
        aria-label="Fechar mensagem"
      >
        ×
      </button>
    </div>
  );
}
