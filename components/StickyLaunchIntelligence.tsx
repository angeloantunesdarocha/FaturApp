"use client";
import { formatBRL } from "@/lib/utils";

type Props={profit:number;costs:number;revenue:number;className?:string};
export default function StickyLaunchIntelligence({profit,costs,revenue,className=""}:Props){
 const margin=revenue>0?(profit/revenue)*100:0;
 const tone=profit<0?"critical":profit>0&&margin>=15?"positive":"warning";
 const styles={positive:"border-emerald-300/50 bg-emerald-950/90 text-white shadow-emerald-950/20",warning:"border-amber-300/50 bg-amber-950/90 text-white shadow-amber-950/20",critical:"border-red-300/50 bg-red-950/95 text-white shadow-red-950/20"}[tone];
 const label={positive:"Resultado positivo",warning:"Atenção ao resultado",critical:"Prejuízo parcial"}[tone];
 return <div className={`sticky top-2 z-40 mx-auto w-full max-w-3xl px-2 ${className}`}><div className={`rounded-2xl border backdrop-blur-xl shadow-lg ${styles}`}><div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] opacity-70">{label}</p><p className="truncate text-lg font-extrabold leading-tight">{formatBRL(profit)}</p></div><div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-right text-[10px] sm:grid-cols-3 sm:gap-x-5"><div><span className="block opacity-60">Receita</span><strong>{formatBRL(revenue)}</strong></div><div><span className="block opacity-60">Custos</span><strong>{formatBRL(costs)}</strong></div><div className="col-span-2 sm:col-span-1"><span className="block opacity-60">Margem</span><strong>{margin.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</strong></div></div></div></div></div>;
}
