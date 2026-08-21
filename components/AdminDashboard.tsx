"use client";

import { useMemo, useState, useTransition } from "react";
import { createAdminUser, deleteAdminUser } from "@/app/admin/actions";

type User = {
  id: string; login: string; email: string | null; role: string; created_at: string;
  last_seen_at: string | null; last_path: string | null; online: boolean;
  entries_count: number; reports_count: number; contributions_count: number; contributions_amount: number;
};
type Activity = { id: number; event_type: string; event_at: string; path: string | null; login: string | null; };
type Props = { data: { summary: Record<string, number>; users: User[]; recent_activity: Activity[]; range: { from: string; to: string } } };

const number = new Intl.NumberFormat("pt-BR");
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dt = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR") : "Nunca";
const labels: Record<string, string> = {
  access: "Acesso", entry_created: "Lançamento criado", entry_updated: "Lançamento atualizado",
  report_pdf: "PDF emitido", report_excel: "Planilha emitida", report_shared: "Relatório compartilhado",
  contribution_started: "Apoio iniciado", contribution_active: "Apoio confirmado", admin_action: "Ação administrativa",
};

export default function AdminDashboard({ data }: Props) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const users = useMemo(() => data.users.filter((user) =>
    [user.login, user.email || ""].join(" ").toLowerCase().includes(query.toLowerCase())), [data.users, query]);

  function createUser(form: HTMLFormElement) {
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await createAdminUser({
        login: String(fd.get("login") || ""), password: String(fd.get("password") || ""), email: String(fd.get("email") || ""),
      });
      setMessage(result.ok ? "Usuário criado com sucesso." : result.error || "Não foi possível criar.");
      if (result.ok) form.reset();
    });
  }

  function removeUser(user: User) {
    if (!window.confirm(`Excluir ${user.login}? Essa ação remove suas sessões e dados vinculados.`)) return;
    startTransition(async () => {
      const result = await deleteAdminUser(user.id);
      setMessage(result.ok ? "Usuário excluído." : result.error || "Não foi possível excluir.");
    });
  }

  const cards = [
    ["Usuários", data.summary.users_total], ["Online agora", data.summary.users_online],
    ["Acessos", data.summary.accesses], ["Lançamentos", data.summary.entries_created],
    ["Relatórios", data.summary.reports_emitted], ["Apoios ativos", money.format(Number(data.summary.contribution_amount || 0))],
  ];

  return <div className="space-y-5 pb-12">
    <section className="rounded-3xl bg-[#123B63] p-6 text-white shadow-sm">
      <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">Área restrita</p>
      <h1 className="mt-2 text-3xl font-black">Central administrativa</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-200">Acompanhamento operacional do FaturApp, usuários, atividade e apoio financeiro.</p>
    </section>

    <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4" action="/admin">
      <label className="text-xs font-bold text-slate-500">De<input name="from" type="date" defaultValue={data.range.from} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
      <label className="text-xs font-bold text-slate-500">Até<input name="to" type="date" defaultValue={data.range.to} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
      <button className="rounded-lg bg-[#123B63] px-4 py-2.5 text-sm font-bold text-white">Aplicar período</button>
      <span className="text-xs text-slate-500">Online = atividade nos últimos 5 minutos.</span>
    </form>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-900">{typeof value === "number" ? number.format(value) : value}</p></div>)}
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[.16em] text-emerald-600">Cadastro manual</p>
      <h2 className="mt-1 text-xl font-black text-slate-900">Adicionar usuário</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); createUser(event.currentTarget); }}>
        <input name="login" required maxLength={120} placeholder="Nome de acesso" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" />
        <input name="email" type="email" placeholder="E-mail (opcional)" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" />
        <input name="password" required type="password" placeholder="Senha inicial" className="rounded-xl border border-slate-200 px-3 py-3 text-sm" />
        <button disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">{pending ? "Processando…" : "Criar usuário"}</button>
      </form>
      <p className="mt-2 text-xs text-slate-500">A senha precisa conter maiúscula, número e caractere especial.</p>
      {message && <p className="mt-3 text-sm font-semibold text-slate-700" role="status">{message}</p>}
    </section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-600">Base de usuários</p><h2 className="mt-1 text-xl font-black text-slate-900">Usuários e atividade</h2></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuário ou e-mail" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div className="overflow-x-auto"><table className="min-w-[1100px] w-full text-sm"><thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Última atividade</th><th className="px-4 py-3 text-right">Lanç.</th><th className="px-4 py-3 text-right">Relat.</th><th className="px-4 py-3 text-right">Apoios</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
      <tbody>{users.map((user) => <tr key={user.id} className="border-t border-slate-100"><td className="px-4 py-4"><p className="font-bold text-slate-800">{user.login}</p><p className="text-xs text-slate-500">{user.email || "Sem e-mail"}</p></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.online ? "Online" : "Offline"}</span><p className="mt-1 text-xs text-slate-500">{user.role}</p></td><td className="px-4 py-4 text-xs text-slate-600">{dt(user.last_seen_at)}<p className="mt-1 text-slate-400">{user.last_path || "—"}</p></td><td className="px-4 py-4 text-right font-bold">{number.format(user.entries_count)}</td><td className="px-4 py-4 text-right font-bold">{number.format(user.reports_count)}</td><td className="px-4 py-4 text-right"><p className="font-bold">{number.format(user.contributions_count)}</p><p className="text-xs text-slate-500">{money.format(Number(user.contributions_amount || 0))}</p></td><td className="px-4 py-4 text-right">{user.role === "admin" ? <span className="text-xs font-bold text-slate-400">Protegido</span> : <button disabled={pending} onClick={() => removeUser(user)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Excluir</button>}</td></tr>)}</tbody></table></div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-600">Auditoria</p><h2 className="mt-1 text-xl font-black text-slate-900">Atividade recente</h2><div className="mt-4 space-y-2">{data.recent_activity.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm"><span><b>{event.login || "Sistema"}</b> · {labels[event.event_type] || event.event_type}</span><span className="text-xs text-slate-500">{dt(event.event_at)} {event.path ? `· ${event.path}` : ""}</span></div>)}{!data.recent_activity.length && <p className="text-sm text-slate-500">Ainda não há eventos registrados.</p>}</div></section>
  </div>;
}
