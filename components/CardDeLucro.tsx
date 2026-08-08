"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/utils";

type Props = {
  profit: number;
  km: number;
  profitPerHour: number | null;
  profitPerKm: number | null;
  costPerKm: number | null;
  onClose?: () => void;
};

function shareText({ profit, km, profitPerHour }: Props) {
  return `🚗 Hoje no FaturApp: ${formatBRL(profit)} líquidos • ${km.toLocaleString("pt-BR")} km${profitPerHour !== null ? ` • ${formatBRL(profitPerHour)}/h` : ""} • #MotoristaDeApp`;
}

async function createCardImage({ profit, km, profitPerHour }: Props): Promise<Blob> {
  const width = 1080;
  const height = 1080;
  const hourLine = profitPerHour !== null ? `• ${formatBRL(profitPerHour)}/h` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f8fff9"/><stop offset="100%" stop-color="#e7f8ed"/></linearGradient></defs>
    <rect width="1080" height="1080" rx="56" fill="url(#g)"/>
    <rect x="0" y="0" width="1080" height="28" fill="#168A4A"/>
    <text x="80" y="110" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="#123B63">FaturApp</text>
    <text x="80" y="220" font-family="Arial,sans-serif" font-size="30" fill="#64748b">Hoje</text>
    <text x="80" y="350" font-family="Arial,sans-serif" font-size="82" font-weight="800" fill="#168A4A">${formatBRL(profit)}</text>
    <text x="80" y="405" font-family="Arial,sans-serif" font-size="36" fill="#334155">líquidos</text>
    <text x="80" y="500" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#123B63">• ${km.toLocaleString("pt-BR")} km</text>
    ${hourLine ? `<text x="80" y="570" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#123B63">${hourLine}</text>` : ""}
    <text x="80" y="940" font-family="Arial,sans-serif" font-size="28" fill="#64748b">FaturApp • lucro real do motorista de app</text>
  </svg>`;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.src = url;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Não foi possível gerar a imagem.")); });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Não foi possível gerar a imagem.")), "image/png"));
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export default function CardDeLucro({ profit, km, profitPerHour, profitPerKm, costPerKm, onClose }: Props) {
  const [status, setStatus] = useState("");
  const text = shareText({ profit, km, profitPerHour, profitPerKm, costPerKm });

  async function share() {
    try {
      const image = await createCardImage({ profit, km, profitPerHour, profitPerKm, costPerKm });
      const file = new File([image], "faturapp-lucro-hoje.png", { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: "Meu lucro de hoje no FaturApp", text, files: [file] });
        return;
      }
      await navigator.clipboard.writeText(text);
      setStatus("Seu texto foi copiado. O aparelho não permite compartilhar a imagem diretamente.");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      setStatus("Não foi possível compartilhar agora. Tente WhatsApp ou copiar o texto.");
    }
  }

  function whatsapp() { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }
  async function copy() { await navigator.clipboard.writeText(text); setStatus("Texto copiado!"); }

  return (
    <section className="rounded-2xl border border-brand-200 bg-white p-4 shadow-lg" aria-label="Seu lucro de hoje">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-wide text-brand-700">Seu lucro de hoje</p><h2 className="text-xl font-bold text-slate-900">Compartilhe seu resultado</h2></div>
        {onClose && <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100" aria-label="Fechar card de lucro">Fechar</button>}
      </div>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50 p-6 ring-1 ring-slate-200" role="img" aria-label={`Hoje: ${formatBRL(profit)} líquidos, ${km} km${profitPerHour !== null ? ` e ${formatBRL(profitPerHour)} por hora` : ""}`}>
        <div className="flex items-start justify-between"><span className="text-2xl font-extrabold tracking-tight text-[#123B63]">Fatur<span className="text-[#168A4A]">App</span></span><span className="text-sm font-medium text-slate-500">Hoje</span></div>
        <p className="mt-8 text-4xl font-extrabold tracking-tight text-brand-700">{formatBRL(profit)} líquidos</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-lg font-semibold text-slate-800"><span>• {km.toLocaleString("pt-BR")} km</span>{profitPerHour !== null && <span>• {formatBRL(profitPerHour)}/h</span>}</div>
        <p className="mt-10 text-xs text-slate-500">FaturApp • lucro real do motorista de app</p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" onClick={share} className="btn btn-primary">📸 Compartilhar</button>
        <button type="button" onClick={whatsapp} className="rounded-lg bg-[#25D366] px-4 py-2.5 font-semibold text-white hover:opacity-90">💬 WhatsApp</button>
        <button type="button" onClick={copy} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">📋 Copiar texto</button>
      </div>
      {status && <p className="mt-2 text-center text-xs text-slate-500">{status}</p>}
    </section>
  );
}
