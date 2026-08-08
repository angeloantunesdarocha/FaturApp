"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/utils";

type Props = { monthLabel: string; profit: number; km: number; bestDate: string; bestProfit: number; costPerKm: number | null };

function buildText(p: Props) {
  return `📊 Meu ${p.monthLabel} no FaturApp: ${formatBRL(p.profit)} líquidos • ${p.km.toLocaleString("pt-BR")} km • melhor dia ${p.bestDate} (${formatBRL(p.bestProfit)}) • custo ${p.costPerKm !== null ? `${formatBRL(p.costPerKm)}/km` : "—"}. Descubra seu lucro real em faturapp.cv`;
}

async function makeImage(p: Props) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f8fff9"/><stop offset="100%" stop-color="#e7f8ed"/></linearGradient></defs><rect width="1080" height="1080" rx="56" fill="url(#g)"/><rect width="1080" height="28" fill="#168A4A"/><text x="80" y="110" font-family="Arial" font-size="34" font-weight="700" fill="#123B63">FaturApp</text><text x="80" y="220" font-family="Arial" font-size="34" fill="#64748b">Seu ${p.monthLabel} no FaturApp</text><text x="80" y="340" font-family="Arial" font-size="76" font-weight="800" fill="#168A4A">${formatBRL(p.profit)} líquidos</text><text x="80" y="455" font-family="Arial" font-size="42" font-weight="700" fill="#123B63">${p.km.toLocaleString("pt-BR")} km rodados</text><text x="80" y="570" font-family="Arial" font-size="34" fill="#334155">Melhor dia: ${p.bestDate} — ${formatBRL(p.bestProfit)}</text><text x="80" y="680" font-family="Arial" font-size="34" fill="#334155">Custo médio: ${p.costPerKm !== null ? `${formatBRL(p.costPerKm)}/km` : "—"}</text><text x="80" y="940" font-family="Arial" font-size="28" fill="#64748b">FaturApp • lucro real do motorista de app</text></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image(); image.src = url;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Falha na imagem")); });
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1080; canvas.getContext("2d")?.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Falha na imagem")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

export default function WrappedMensal(props: Props) {
  const [status, setStatus] = useState("");
  const text = buildText(props);
  async function share() {
    try {
      const blob = await makeImage(props); const file = new File([blob], "faturapp-wrapped.png", { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) { await navigator.share({ title: `Meu ${props.monthLabel} no FaturApp`, text, files: [file] }); return; }
      await navigator.clipboard.writeText(text); setStatus("Texto copiado: seu aparelho não permite compartilhar a imagem diretamente.");
    } catch (e) { if ((e as Error)?.name !== "AbortError") setStatus("Não foi possível compartilhar agora."); }
  }
  function whatsapp() { window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }
  async function copy() { await navigator.clipboard.writeText(text); setStatus("Texto copiado!"); }
  return <section className="rounded-2xl border border-brand-200 bg-white p-4 shadow-lg" aria-label="Seu mês em 4 números">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-700">SEU MÊS EM 4 NÚMEROS</p><h2 className="text-xl font-bold text-slate-900">Seu {props.monthLabel} no FaturApp</h2></div></div>
    <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50 p-6 ring-1 ring-slate-200" role="img" aria-label={`Seu ${props.monthLabel}: ${formatBRL(props.profit)} líquidos, ${props.km} km, melhor dia ${props.bestDate} e custo médio por quilômetro`}>
      <div className="text-2xl font-extrabold text-[#123B63]">Fatur<span className="text-[#168A4A]">App</span></div>
      <p className="mt-7 text-4xl font-extrabold text-brand-700">{formatBRL(props.profit)} líquidos</p>
      <p className="mt-4 text-lg font-semibold text-slate-800">{props.km.toLocaleString("pt-BR")} km rodados</p>
      <p className="mt-3 text-base text-slate-700">Melhor dia: {props.bestDate} — {formatBRL(props.bestProfit)}</p>
      <p className="mt-2 text-base text-slate-700">Custo médio: {props.costPerKm !== null ? `${formatBRL(props.costPerKm)}/km` : "—"}</p>
      <p className="mt-10 text-xs text-slate-500">FaturApp • lucro real do motorista de app</p>
    </div>
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"><button type="button" onClick={share} className="btn btn-primary">📸 Compartilhar</button><button type="button" onClick={whatsapp} className="rounded-lg bg-[#25D366] px-4 py-2.5 font-semibold text-white hover:opacity-90">💬 WhatsApp</button><button type="button" onClick={copy} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">📋 Copiar texto</button></div>
    {status && <p className="mt-2 text-center text-xs text-slate-500">{status}</p>}
  </section>;
}
