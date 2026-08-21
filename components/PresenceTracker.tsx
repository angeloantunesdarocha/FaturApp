"use client";

import { useEffect } from "react";

function send(event: "access" | "heartbeat") {
  return fetch("/api/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ event, path: window.location.pathname }),
  }).catch(() => undefined);
}

export default function PresenceTracker() {
  useEffect(() => {
    void send("access");
    const timer = window.setInterval(() => void send("heartbeat"), 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void send("heartbeat");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
