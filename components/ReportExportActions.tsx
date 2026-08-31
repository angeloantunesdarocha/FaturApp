"use client";

import { useMemo, useState } from "react";
import { type DaySummary } from "@/lib/day-calculation";
import { buildReportText, createReportPdf } from "@/lib/report-export";
import { formatDateBR } from "@/lib/utils";

type Props = { days: DaySummary[]; from: string; to: string };

export default function ReportExportActions({ days, from, to }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const text = useMemo(() => buildReportText(days, from, to), [days, from, to]);
  const filename = `FaturApp_Relatorio_Completo_${from}_${to}.pdf`;

  function track(event: "report_pdf" | "report_shared") {
    void fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, path: window.location.pathname, metadata: { from, to, days: days.length } }),
    });
  }

  function downloadPdf() {
    createReportPdf(days, from, to).save(filename);
    track("report_pdf");
  }

  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    track("report_shared");
  }

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setStatus("Texto completo copiado.");
    track("report_shared");
  }

  async function emailPdf() {
    setBusy(true);
    setStatus("");
    try {
      const doc = createReportPdf(days, from, to);
      const file = new File([doc.output("blob")], filename, { type: "application/pdf" });
      const subject = `Relatório FaturApp — ${formatDateBR(from)} a ${formatDateBR(to)}`;
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: subject, text, files: [file] });
        setStatus("PDF e resumo prontos para envio pelo aplicativo de e-mail escolhido.");
      } else {
        doc.save(filename);
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
        setStatus("O PDF foi baixado. Anexe-o ao e-mail aberto pelo seu dispositivo.");
      }
      track("report_shared");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setStatus("Não foi possível preparar o envio agora.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Exportar relatório</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Escolha o formato do período selecionado</h2><p className="mt-1 text-sm text-slate-500">PDF, WhatsApp e e-mail usam os mesmos totais e todos os detalhes de receitas e despesas.</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={downloadPdf} disabled={!days.length} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40">Baixar PDF</button>
        <button type="button" onClick={whatsapp} disabled={!days.length} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40">WhatsApp</button>
        <button type="button" onClick={emailPdf} disabled={!days.length || busy} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40">{busy ? "Preparando…" : "E-mail + PDF"}</button>
        <button type="button" onClick={copyText} disabled={!days.length} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800 disabled:opacity-40">Copiar texto</button>
      </div>
    </div>
    {status && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-600">{status}</p>}
  </section>;
}
