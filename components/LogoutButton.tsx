"use client";

import { logoutUser } from "@/app/actions";

export default function LogoutButton() {
  return (
    <form action={logoutUser}>
      <button type="submit" className="text-sm font-semibold text-red-600 hover:text-red-700">
        Sair
      </button>
    </form>
  );
}
