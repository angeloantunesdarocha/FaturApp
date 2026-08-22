"use client";

import { logoutUser } from "@/app/actions";

export default function LogoutButton() {
  return (
    <form action={logoutUser} className="inline-flex">
      <button
        type="submit"
        className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 active:bg-red-600 active:text-white"
        aria-label="Sair do FaturApp"
      >
        Sair
      </button>
    </form>
  );
}
