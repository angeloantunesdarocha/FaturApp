"use client";

import { useState } from "react";
import { logoutUser } from "@/app/actions";

export default function LogoutButton() {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <form action={logoutUser}>
      <button
        type="submit"
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
    </form>
  );
}
