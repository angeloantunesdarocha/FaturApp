"use client";

import { useState } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";

const faqItems = [
  {
    question: "O FaturApp é realmente gratuito?",
    answer:
      "Sim. O FaturApp é grátis para começar e você pode conhecer o seu lucro real sem informar cartão no cadastro.",
  },
  {
    question: "Quanto tempo leva para lançar um dia?",
    answer:
      "A proposta é levar menos de 1 minuto para registrar um dia. Você informa os valores do trabalho e os custos que realmente aconteceram.",
  },
  {
    question: "Posso usar em mais de um celular?",
    answer:
      "O FaturApp funciona pela sua conta. Não há bloqueio de aparelho identificado no fluxo atual; basta acessar a mesma conta em um navegador compatível.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer:
      "O acesso é feito por conta autenticada e os registros ficam associados ao seu usuário no Supabase. Como em qualquer serviço online, proteja sua senha e evite compartilhá-la.",
  },
  {
    question: "Funciona offline?",
    answer:
      "Ainda não. O fluxo atual depende de conexão com a internet para acessar a conta e salvar os lançamentos.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative overflow-hidden bg-white px-4 py-16 text-[#123B63] sm:px-8 sm:py-20">
      <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />

      <RevealOnScroll className="relative mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-emerald-600">Dúvidas honestas</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Tudo claro antes de começar.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Respostas diretas sobre o que o FaturApp faz hoje — sem promessa escondida.
          </p>
        </div>

        <div className="mt-10 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(18,59,99,0.08)]">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            const answerId = `faq-answer-${index}`;

            return (
              <div key={item.question} className="px-5 first:rounded-t-3xl last:rounded-b-3xl sm:px-7">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex min-h-20 w-full items-center justify-between gap-5 text-left text-base font-extrabold text-[#123B63] outline-none transition-colors hover:text-emerald-700 focus-visible:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-4 sm:text-lg"
                  >
                    <span>{item.question}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`h-5 w-5 shrink-0 text-emerald-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </h3>

                <div
                  id={answerId}
                  role="region"
                  aria-hidden={!isOpen}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="pb-6 pr-8 text-sm leading-7 text-slate-600 sm:text-base">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </RevealOnScroll>
    </section>
  );
}
