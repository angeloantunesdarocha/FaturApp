"use client";

import { useMemo, useRef, useState } from "react";
import { computeDayProfit, computeNetFare, formatBRL, formatDateBR, toNumber, type DailyEntry } from "@/lib/utils";

type Props = { entries: DailyEntry[] };
type Mood = "positive" | "attention" | "negative";

function getMood(profit: number): Mood {
  if (profit < 0) return "negative";
  if (profit <= 20) return "attention";
  return "positive";
}

const moodConfig: Record<Mood, { emoji: string; eyebrow: string; title: string; message: string; accent: string; soft: string; button: string }> = {
  positive: { emoji: "🚀", eyebrow: "DIA DE RESULTADO", title: "Hoje valeu a pena!", message: "Meu trabalho virou resultado. Estou acompanhando tudo de perto com o FaturApp.", accent: "#16a34a", soft: "#ecfdf5", button: "Compartilhar minha conquista" },
  attention: { emoji: "⚠️", eyebrow: "OLHO NO RESULTADO", title: "Quase no prejuízo", message: "Hoje eu trabalhei, mas o resultado ficou apertado. Ainda bem que o FaturApp me ajuda a enxergar isso.", accent: "#d97706", soft: "#fffbeb", button: "Compartilhar meu resultado" },
  negative: { emoji: "😔", eyebrow: "RESULTADO DO DIA", title: "Hoje deu prejuízo", message: "Nem todo dia é lucro. O importante é saber o número e tomar decisões melhores amanhã.", accent: "#dc2626", soft: "#fef2f2", button: "Compartilhar meu alerta" },
};

function cardSvg(entry: DailyEntry, origin: string) {
  const profit = computeDayProfit(entry);
  const mood = getMood(profit);
  const c = moodConfig[mood];
  const net = computeNetFare(entry);
  const fuel = Math.max(0, Number(entry.gas_expense) || 0) + Math.max(0, Number(entry.alcohol_expense) || 0);
  const maintenance = (entry.maintenance_details || []).reduce((s, i) => s + toNumber(i.value), 0) || Number(entry.maintenance_expense || 0);
  const extras = (entry.extra_expenses || []).reduce((s, i) => s + toNumber(i.value), 0);
  const km = Math.max(0, Number(entry.km_driven) || 0);
  const hours = Math.max(0, Number(entry.hours_worked) || 0);
  const cta = `Veja quanto realmente sobra no seu dia com o FaturApp: ${origin}`;
  const money = (v: number) => formatBRL(v).replace(/&/g, "&amp;");
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.soft}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
    <rect width="1080" height="1350" rx="52" fill="url(#bg)"/>
    <circle cx="920" cy="120" r="210" fill="${c.accent}" opacity=".08"/><circle cx="130" cy="1260" r="250" fill="${c.accent}" opacity=".06"/>
    <text x="72" y="92" font-family="Arial,sans-serif" font-size="34" font-weight="800" fill="#0f172a">FaturApp</text>
    <text x="72" y="150" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3" fill="${c.accent}">${c.eyebrow}</text>
    <text x="72" y="215" font-family="Arial,sans-serif" font-size="54" font-weight="900" fill="#0f172a">${c.emoji} ${esc(c.title)}</text>
    <text x="72" y="260" font-family="Arial,sans-serif" font-size="25" fill="#475569">${formatDateBR(entry.date)} • ${hours.toLocaleString("pt-BR")} h trabalhadas</text>
    <rect x="72" y="310" width="936" height="350" rx="42" fill="${c.accent}"/>
    <text x="120" y="380" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#ffffff" opacity=".85">LUCRO LÍQUIDO DO DIA</text>
    <text x="120" y="500" font-family="Arial,sans-serif" font-size="82" font-weight="900" fill="#ffffff">${money(profit)}</text>
    <text x="120" y="555" font-family="Arial,sans-serif" font-size="25" fill="#ffffff" opacity=".9">Receita líquida: ${money(net)}</text>
    <text x="120" y="600" font-family="Arial,sans-serif" font-size="25" fill="#ffffff" opacity=".9">${km.toLocaleString("pt-BR")} km • Combustível ${money(fuel)}</text>
    <rect x="72" y="700" width="936" height="270" rx="36" fill="#ffffff" stroke="#e2e8f0"/>
    <text x="112" y="760" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#64748b">MEU DIA EM NÚMEROS</text>
    <text x="112" y="825" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#0f172a">Combustível</text><text x="470" y="825" font-family="Arial,sans-serif" font-size="28" font-weight="800" fill="#0f172a">${money(fuel)}</text>
    <text x="112" y="875" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#0f172a">Manutenção + extras</text><text x="470" y="875" font-family="Arial,sans-serif" font-size="28" font-weight="800" fill="#0f172a">${money(maintenance + extras)}</text>
    <text x="112" y="925" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#0f172a">Distância</text><text x="470" y="925" font-family="Arial,sans-serif" font-size="28" font-weight="800" fill="#0f172a">${km.toLocaleString("pt-BR")} km</text>
    <text x="72" y="1035" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#334155">${esc(c.message)}</text>
    <rect x="72" y="1090" width="936" height="112" rx="28" fill="#0f172a"/>
    <text x="540" y="1140" text-anchor="middle" font-family="Arial,sans-serif" font-size="27" font-weight="800" fill="#ffffff">${esc(cta)}</text>
    <text x="540" y="1178" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#cbd5e1">Controle seus números. Trabalhe com mais inteligência.</text>
    <text x="72" y="1275" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#64748b">faturapp • gestão financeira para motoristas</text>
  </svg>`;
}

export default function ShareResultCard({ entries }: Props) {
  const [selectedId, setSelectedId] = useState(entries[0]?.id || "");
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => entries.find(e => e.id === selectedId) || entries[0], [entries, selectedId]);
  const mood = selected ? getMood(computeDayProfit(selected)) : "positive";
  const c = moodConfig[mood];

  if (!selected) return null;

  async function makeBlob() {
    const svg = cardSvg(selected, window.location.origin);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Não foi possível gerar o card.")); });
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas indisponível.");
    ctx.drawImage(image, 0, 0); URL.revokeObjectURL(url);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Falha ao criar imagem.")), "image/png"));
  }

  async function shareCard() {
    setSharing(true); setStatus("");
    try {
      const blob = await makeBlob();
      const file = new File([blob], `FaturApp_${selected.date}.png`, { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: "Meu resultado no FaturApp", text: `Meu resultado de ${formatDateBR(selected.date)} no FaturApp. ${c.message}` });
        setStatus("Card pronto para compartilhar!");
      } else {
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
        const text = `Meu resultado de ${formatDateBR(selected.date)} no FaturApp: ${formatBRL(computeDayProfit(selected))}. ${c.message} Acesse: ${window.location.origin}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        setStatus("O card foi baixado e o WhatsApp foi aberto. Anexe a imagem à conversa.");
      }
    } catch (error) { if ((error as Error).name !== "AbortError") setStatus("Não foi possível compartilhar agora. Tente novamente."); }
    finally { setSharing(false); }
  }

  async function downloadCard() { const blob = await makeBlob(); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `FaturApp_${selected.date}.png`; a.click(); }

  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-600">Compartilhe seu resultado</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Transforme seus números em uma conquista</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Escolha um lançamento e gere um card pensado para chamar atenção no WhatsApp — positivo, alerta ou prejuízo, sem esconder a realidade.</p></div>
      <select value={selected.id} onChange={e => setSelectedId(e.target.value)} className="input min-w-[220px] font-semibold"><option value="" disabled>Escolha um registro</option>{entries.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(e=><option key={e.id} value={e.id}>{formatDateBR(e.date)} — {formatBRL(computeDayProfit(e))}</option>)}</select>
    </div>
    <div ref={previewRef} className="overflow-hidden rounded-[28px] p-5 sm:p-7" style={{ background: `linear-gradient(135deg, ${c.soft}, #fff)` }}>
      <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: c.accent }}>{c.eyebrow}</p><h3 className="mt-1 text-2xl font-black text-slate-900">{c.emoji} {c.title}</h3></div><div className="rounded-2xl bg-white/90 px-4 py-2 text-right shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-400">FaturApp</p><p className="text-sm font-black text-slate-800">{formatDateBR(selected.date)}</p></div></div>
      <div className="mt-5 rounded-3xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${c.accent}, #0f172a)` }}><p className="text-xs font-bold uppercase tracking-wider text-white/80">Lucro líquido do dia</p><p className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{formatBRL(computeDayProfit(selected))}</p><p className="mt-2 text-sm text-white/85">Receita líquida {formatBRL(computeNetFare(selected))} • {Math.max(0, Number(selected.km_driven) || 0).toLocaleString("pt-BR")} km</p></div>
      <p className="mt-5 text-sm font-semibold leading-6 text-slate-600">{c.message}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[10px] uppercase text-slate-400">Combustível</p><p className="mt-1 font-extrabold">{formatBRL((Number(selected.gas_expense)||0)+(Number(selected.alcohol_expense)||0))}</p></div><div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[10px] uppercase text-slate-400">Km</p><p className="mt-1 font-extrabold">{Math.max(0, Number(selected.km_driven)||0).toLocaleString("pt-BR")}</p></div><div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[10px] uppercase text-slate-400">Horas</p><p className="mt-1 font-extrabold">{Math.max(0, Number(selected.hours_worked)||0).toLocaleString("pt-BR")} h</p></div><div className="rounded-2xl bg-white p-3 shadow-sm"><p className="text-[10px] uppercase text-slate-400">FaturApp</p><p className="mt-1 font-extrabold">Controle real</p></div></div>
      <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-center text-sm font-bold text-white">Descubra quanto realmente sobra no seu dia • {typeof window !== "undefined" ? window.location.origin : "FaturApp"}</div>
    </div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={shareCard} disabled={sharing} className="flex-1 rounded-xl px-4 py-3 font-extrabold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60" style={{ backgroundColor: c.accent }}>{sharing ? "Gerando card…" : c.button}</button><button type="button" onClick={downloadCard} className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">Baixar PNG</button></div>
    {status && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-600">{status}</p>}
  </section>;
}
