"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatBRL, toNumber, todayISO } from "@/lib/utils";
import { createRevenueItem, REVENUE_APPS, summarizeRevenue, type RevenueAppName, type RevenueItem } from "@/lib/revenue";
import ExtraExpenses from "./ExtraExpenses";
import FuelCalculator from "./FuelCalculator";
import MaintenanceExpenses, { type MaintenanceItem } from "./MaintenanceExpenses";
import CardDeLucro from "./CardDeLucro";
import { saveEntry } from "@/app/actions";

type Mode = "withFee" | "net";
type Props = { initialDate?: string; initialMonthProfit?: number };
type SavedCard = { profit:number; km:number; hours:number; profitPerKm:number|null; revenuePerKm:number|null; costPerKm:number|null; revenueBase:number };
type TimeSegment = { start:string; end:string };
type FuelPurchase = { id:string; type:"gasoline"|"alcohol"; amount:number; pricePerLiter:number };
type DraftState = { date:string; mode:Mode|null; netFare:number; netApp:RevenueAppName|""; netCustomApp:string; revenueItems:RevenueItem[]; netRevenueItems?:RevenueItem[]; gas:number; alcohol:number; gasPrice:number; alcoholPrice:number; fuelPurchases?:FuelPurchase[]; kmInitial:number; kmFinal:number; fuelConsumption:number; hoursSegments:TimeSegment[]; maintenanceItems:MaintenanceItem[]; extras:{name:string;value:number}[] };

function formatKm(v:number){return v.toLocaleString("pt-BR",{maximumFractionDigits:1});}
function formatCostPerKm(v:number|null){return v===null?"—":`${formatBRL(v)} / km`;}
function formatLiters(v:number){return v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:3});}
function formatPercent(v:number){return `${v.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}%`;}
function DisclosureChevron(){return <span aria-hidden="true" className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-transform duration-200 ease-out group-open:rotate-180"><svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 8 4 4 4-4"/></svg></span>}
export default function EntryForm({initialDate=todayISO(),initialMonthProfit=0}:Props){
 const [mode,setMode]=useState<Mode|null>(null),[date,setDate]=useState(initialDate),[netFare,setNetFare]=useState(0),[netApp,setNetApp]=useState<RevenueAppName|"">(""),[netCustomApp,setNetCustomApp]=useState(""),[revenueItems,setRevenueItems]=useState<RevenueItem[]>([]),[netRevenueItems,setNetRevenueItems]=useState<RevenueItem[]>([]),[gas,setGas]=useState(0),[alcohol,setAlcohol]=useState(0),[gasPrice,setGasPrice]=useState(0),[alcoholPrice,setAlcoholPrice]=useState(0),[fuelPurchases,setFuelPurchases]=useState<FuelPurchase[]>([]),[kmInitial,setKmInitial]=useState(0),[kmFinal,setKmFinal]=useState(0),[fuelConsumption,setFuelConsumption]=useState(0),[vehicleConsumptionReference,setVehicleConsumptionReference]=useState(0),[hoursSegments,setHoursSegments]=useState<TimeSegment[]>([{start:"",end:""}]),[maintenanceItems,setMaintenanceItems]=useState<MaintenanceItem[]>([]),[extras,setExtras]=useState<{name:string;value:number}[]>([]),[monthProfit,setMonthProfit]=useState(initialMonthProfit),[status,setStatus]=useState(""),[savedCard,setSavedCard]=useState<SavedCard|null>(null),[draftReady,setDraftReady]=useState(false);

 function resetForm(){
  setMode(null); setNetApp(""); setNetCustomApp(""); setNetFare(0);
  setRevenueItems([]); setNetRevenueItems([]);
  setGas(0); setAlcohol(0); setGasPrice(0); setAlcoholPrice(0); setFuelPurchases([]);
  setKmInitial(0); setKmFinal(0); setFuelConsumption(0);
  setHoursSegments([{start:"",end:""}]); setMaintenanceItems([]); setExtras([]);
 }

 function restoreDraft(selectedDate:string){
  let draft:Partial<DraftState>={};
  try {
   const raw=window.localStorage.getItem("faturapp:dia-aberto:"+selectedDate);
   if(raw)draft=JSON.parse(raw) as DraftState;
  } catch { /* rascunho inválido: inicia um dia limpo */ }
  let rememberedConsumption=0;
  try { rememberedConsumption=Math.max(0,Number(window.localStorage.getItem("faturapp:veiculo:consumo-km-litro"))||0); } catch { /* preferência indisponível */ }
  if(!rememberedConsumption&&draft.fuelConsumption&&draft.fuelConsumption>0){rememberedConsumption=draft.fuelConsumption;try{window.localStorage.setItem("faturapp:veiculo:consumo-km-litro",String(rememberedConsumption));}catch{/* mantém valor nesta sessão */}}
  setDate(selectedDate); resetForm(); setGas(draft.gas||0); setAlcohol(draft.alcohol||0); setGasPrice(draft.gasPrice||0); setAlcoholPrice(draft.alcoholPrice||0); setFuelPurchases(draft.fuelPurchases||[]); setKmInitial(draft.kmInitial||0); setKmFinal(draft.kmFinal||0); setVehicleConsumptionReference(rememberedConsumption); setFuelConsumption(draft.fuelConsumption||rememberedConsumption); setHoursSegments(draft.hoursSegments?.length?draft.hoursSegments:[{start:"",end:""}]); setMaintenanceItems(draft.maintenanceItems||[]); setExtras(draft.extras||[]); setSavedCard(null);
  setStatus(draft.date?"Rascunho do dia aberto carregado. Você pode continuar editando.":"");
 }

 useEffect(()=>{
  restoreDraft(initialDate);
  setDraftReady(true);
 // O carregamento inicial acontece somente quando a data recebida do servidor muda.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[initialDate]);

 useEffect(()=>{
  if(!draftReady)return;
  const hasDraftData=netFare>0||netCustomApp.trim()!==""||revenueItems.some(item=>item.bruto>0||item.taxa>0||item.nomeAppPersonalizado.trim()!=="")||netRevenueItems.length>0||gas>0||alcohol>0||gasPrice>0||alcoholPrice>0||fuelPurchases.length>0||kmInitial>0||kmFinal>0||fuelConsumption>0||hoursSegments.some(segment=>segment.start!==""||segment.end!=="")||maintenanceItems.length>0||extras.length>0;
  if(!hasDraftData)return;
  const draft:DraftState={date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras};
  try { window.localStorage.setItem("faturapp:dia-aberto:"+date,JSON.stringify(draft)); }
  catch { setStatus("Não foi possível salvar o rascunho neste aparelho."); }
 },[draftReady,date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras]);

 function hoursFromSegments(){ return hoursSegments.reduce((total,segment)=>{ if(!segment.start||!segment.end)return total; const [sh,sm]=segment.start.split(":").map(Number); const [eh,em]=segment.end.split(":").map(Number); let minutes=(eh*60+em)-(sh*60+sm); if(minutes<0)minutes+=1440; return total+minutes/60; },0); }
 const hours=hoursFromSegments();
 function updateSegment(index:number,patch:Partial<TimeSegment>){setHoursSegments(items=>items.map((item,i)=>i===index?{...item,...patch}:item));}
 function addSegment(){setHoursSegments(items=>[...items,{start:"",end:""}]);}
 function removeSegment(index:number){setHoursSegments(items=>items.length>1?items.filter((_,i)=>i!==index):[{start:"",end:""}]);}
 function updateVehicleConsumption(value:number){
  setFuelConsumption(value);
  if(value>0){setVehicleConsumptionReference(value);try{window.localStorage.setItem("faturapp:veiculo:consumo-km-litro",String(value));}catch{/* mantém valor nesta sessão */}}
  else{setVehicleConsumptionReference(0);try{window.localStorage.removeItem("faturapp:veiculo:consumo-km-litro");}catch{/* preferência indisponível */}}
 }
 function addFuelPurchase(){setFuelPurchases(items=>[...items,{id:`fuel-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type:"gasoline",amount:0,pricePerLiter:0}]);}
 function updateFuelPurchase(id:string,patch:Partial<FuelPurchase>){setFuelPurchases(items=>items.map(item=>item.id===id?{...item,...patch}:item));}
 function removeFuelPurchase(id:string){setFuelPurchases(items=>items.filter(item=>item.id!==id));}
 function saveDraft(){
  const draft:DraftState={date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras};
  try {
   window.localStorage.setItem("faturapp:dia-aberto:"+date,JSON.stringify(draft));
   // Mantém o resultado visível no resumo e limpa somente os controles do novo lançamento.
   setSavedCard({profit:dayProfit,km:kmDriven,hours,profitPerKm,revenuePerKm,costPerKm:totalCostPerKm,revenueBase:percentageBaseValue});
   resetForm();
   setStatus("✅ Dia salvo. Formulário limpo para um novo lançamento.");
  } catch { setStatus("❌ Não foi possível salvar o dia neste aparelho."); }
 }



 const revenueSummary=useMemo(()=>summarizeRevenue(revenueItems),[revenueItems]);
 const additionalNetRevenue=netRevenueItems.reduce((total,item)=>total+toNumber(item.bruto),0);
 const fareNet=revenueSummary.liquido+netFare+additionalNetRevenue;
 const feeAmount=revenueSummary.taxaValor;
 const extrasSum=extras.reduce((a,e)=>a+toNumber(e.value),0);
 const maintenanceTotal=maintenanceItems.reduce((a,m)=>a+toNumber(m.value),0);
 const kmDriven=Math.max(0,kmFinal-kmInitial);
 const additionalGasPurchases=fuelPurchases.filter(item=>item.type==="gasoline");
 const additionalAlcoholPurchases=fuelPurchases.filter(item=>item.type==="alcohol");
 const totalGasExpense=gas+additionalGasPurchases.reduce((total,item)=>total+toNumber(item.amount),0);
 const totalAlcoholExpense=alcohol+additionalAlcoholPurchases.reduce((total,item)=>total+toNumber(item.amount),0);
 const gasLiters=(gasPrice>0?gas/gasPrice:0)+additionalGasPurchases.reduce((total,item)=>total+(item.pricePerLiter>0?item.amount/item.pricePerLiter:0),0);
 const alcoholLiters=(alcoholPrice>0?alcohol/alcoholPrice:0)+additionalAlcoholPurchases.reduce((total,item)=>total+(item.pricePerLiter>0?item.amount/item.pricePerLiter:0),0);
 const averageGasPrice=gasLiters>0?totalGasExpense/gasLiters:0;
 const averageAlcoholPrice=alcoholLiters>0?totalAlcoholExpense/alcoholLiters:0;
 const totalPurchasedLiters=gasLiters+alcoholLiters;
 const totalFuelPurchase=totalGasExpense+totalAlcoholExpense;
 const weightedFuelPrice=totalPurchasedLiters>0?totalFuelPurchase/totalPurchasedLiters:0;
 const informedFuelConsumption=fuelConsumption>0?fuelConsumption:vehicleConsumptionReference;
 const effectiveFuelConsumption=informedFuelConsumption;
 const fuelPrice=weightedFuelPrice>0?weightedFuelPrice:(gas>0&&gasPrice>0?gasPrice:alcohol>0&&alcoholPrice>0?alcoholPrice:0);
 const fuelConsumedLiters=kmDriven>0&&effectiveFuelConsumption>0?kmDriven/effectiveFuelConsumption:0;
 const fuelConsumedCost=fuelConsumedLiters*fuelPrice;
 const fuelRemainingLiters=Math.max(0,totalPurchasedLiters-fuelConsumedLiters);
 const fuelRemainingValue=Math.max(0,totalFuelPurchase-fuelConsumedCost);
 const fuelCostForProfit=informedFuelConsumption>0&&totalPurchasedLiters>0?fuelConsumedCost:totalFuelPurchase;
 const totalExpenses=fuelCostForProfit+maintenanceTotal+extrasSum;
 const dayProfit=fareNet-totalExpenses;
 const totalCostPerKm=kmDriven>0?totalExpenses/kmDriven:null;
 const profitPerKm=kmDriven>0?dayProfit/kmDriven:null;
 const revenuePerKm=kmDriven>0?fareNet/kmDriven:null;
 const hasCurrentLaunch=fareNet!==0||totalFuelPurchase!==0||maintenanceTotal!==0||extrasSum!==0||kmDriven>0||fuelConsumption>0;
 const percentageBaseValue=revenueSummary.bruto+netFare+additionalNetRevenue;
 const visibleProfit=savedCard&&!hasCurrentLaunch?savedCard.profit:dayProfit,visibleKm=savedCard&&!hasCurrentLaunch?savedCard.km:kmDriven,visibleProfitPerKm=savedCard&&!hasCurrentLaunch?savedCard.profitPerKm:profitPerKm,visibleRevenuePerKm=savedCard&&!hasCurrentLaunch?savedCard.revenuePerKm:revenuePerKm,visibleCostPerKm=savedCard&&!hasCurrentLaunch?savedCard.costPerKm:totalCostPerKm,visibleHours=savedCard&&!hasCurrentLaunch?savedCard.hours:hours,visibleRevenueBase=savedCard&&!hasCurrentLaunch?savedCard.revenueBase:percentageBaseValue;
 const profitPercent=visibleRevenueBase>0?(visibleProfit/visibleRevenueBase)*100:null;
 const summaryTone=visibleProfit>0?"profit":visibleProfit<0?"loss":"neutral";

 function updateRevenue(id:string,patch:Partial<RevenueItem>){setRevenueItems(items=>items.map(item=>item.id===id?{...item,...patch}:item));}
 function addRevenue(){setRevenueItems(items=>[...items,createRevenueItem()]);}
 function removeRevenue(id:string){setRevenueItems(items=>items.length>1?items.filter(item=>item.id!==id):items);}
 function addNetRevenue(){setNetRevenueItems(items=>[...items,{...createRevenueItem(),taxa:0}]);}
 function updateNetRevenue(id:string,patch:Partial<RevenueItem>){setNetRevenueItems(items=>items.map(item=>item.id===id?{...item,...patch,taxa:0}:item));}
 function removeNetRevenue(id:string){setNetRevenueItems(items=>items.filter(item=>item.id!==id));}

 async function handleSubmit(e:FormEvent){
  e.preventDefault();
  if(kmInitial<0||kmFinal<0||kmFinal<kmInitial||gas<0||alcohol<0||gasPrice<0||alcoholPrice<0||hours<0||fuelConsumption<0){setStatus("❌ Confira os quilômetros, as horas e os valores de combustível. Nenhum valor pode ser negativo e o km final deve ser maior ou igual ao inicial.");return;}
  if(gas>0&&gasPrice<=0){setStatus("❌ Informe o preço por litro da gasolina.");return;}
  if(alcohol>0&&alcoholPrice<=0){setStatus("❌ Informe o preço por litro do álcool.");return;}
  if(fuelPurchases.some(item=>item.amount<0||item.pricePerLiter<0)){setStatus("❌ Os valores dos abastecimentos não podem ser negativos.");return;}
  if(fuelPurchases.some(item=>item.amount>0&&item.pricePerLiter<=0)){setStatus("❌ Informe o preço por litro em cada novo abastecimento.");return;}
  if(revenueSummary.normalized.some(item=>item.bruto>0&&item.app==="Outro"&&!item.nomeAppPersonalizado)){setStatus("❌ Informe o nome do aplicativo quando selecionar Outro.");return;}
  if(netFare>0&&netApp==="Outro"&&!netCustomApp.trim()){setStatus("❌ Informe o nome do aplicativo quando selecionar Outro.");return;}
  const hasRevenueInput=mode!==null||netFare>0||revenueItems.length>0||netRevenueItems.length>0;
  if(hasRevenueInput&&mode===null){setStatus("❌ Selecione Valor bruto + taxa ou Valor já líquido.");return;}
  if(mode==="net"&&(!netApp||netFare<=0)){setStatus("❌ Selecione o aplicativo e informe o valor líquido recebido.");return;}
  if(mode==="withFee"&&(!revenueItems.some(item=>item.bruto>0))){setStatus("❌ Selecione o aplicativo e informe o valor bruto recebido.");return;}
  if(netRevenueItems.some(item=>item.bruto>0&&item.app==="Outro"&&!item.nomeAppPersonalizado.trim())){setStatus("❌ Informe o nome do aplicativo em cada receita líquida.");return;}
  setStatus("Salvando...");
  const combinedRevenueItems=[...revenueItems.filter(item=>item.bruto>0),...(mode==="net"&&netFare>0?[{...createRevenueItem(),app:netApp as RevenueAppName,nomeAppPersonalizado:netApp==="Outro"?netCustomApp.trim():"",bruto:netFare,taxa:0}]:[]),...netRevenueItems.filter(item=>item.bruto>0)];
  const combinedRevenueSummary=summarizeRevenue(combinedRevenueItems);
  const payload={date,gross_amount:combinedRevenueSummary.bruto,fee_percent:combinedRevenueSummary.taxaPercentual,net_fare:combinedRevenueSummary.liquido,revenue_details:combinedRevenueItems,gas_expense:totalGasExpense,alcohol_expense:totalAlcoholExpense,gasoline_price_per_liter:averageGasPrice,alcohol_price_per_liter:averageAlcoholPrice,gasoline_liters:gasLiters,alcohol_liters:alcoholLiters,km_initial:kmInitial,km_final:kmFinal,km_driven:kmDriven,hours_worked:hours,fuel_consumption_km_per_liter:effectiveFuelConsumption,fuel_consumed_liters:fuelConsumedLiters,fuel_consumed_cost:fuelConsumedCost,fuel_remaining_liters:fuelRemainingLiters,fuel_remaining_value:fuelRemainingValue,maintenance_expense:maintenanceTotal,maintenance_details:maintenanceItems.filter(m=>m.description.trim()!==""),extra_expenses:extras.filter(e=>e.name.trim()!=="")};
  const res=await saveEntry(payload);
  if(res.success){window.localStorage.removeItem("faturapp:dia-aberto:"+date);setStatus("✅ Dia registrado e fechado com sucesso!");if(typeof res.monthProfit==="number")setMonthProfit(res.monthProfit);setSavedCard({profit:dayProfit,km:kmDriven,hours,profitPerKm,revenuePerKm,costPerKm:totalCostPerKm,revenueBase:percentageBaseValue});resetForm();setGas(0);setAlcohol(0);setGasPrice(0);setAlcoholPrice(0);setFuelPurchases([]);setKmInitial(0);setKmFinal(0);setFuelConsumption(0);setHoursSegments([{start:"",end:""}]);setMaintenanceItems([]);setExtras([]);}else setStatus(`❌ Erro: ${res.error}`);
 }

 return <div className="flex flex-col gap-4"><form onSubmit={handleSubmit} className="order-2 space-y-3">
  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><label className="text-xs font-bold text-slate-600">Dia aberto</label><input type="date" className="input max-w-[10.5rem] !py-2" value={date} onChange={e=>restoreDraft(e.target.value)} required/></div>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">💰 Receitas <span className="ml-1 text-xs font-normal text-slate-500">{revenueItems.filter(item=>item.bruto>0).length+(netFare>0?1:0)+netRevenueItems.filter(item=>item.bruto>0).length} lanç.</span></span><span className="flex items-center"><strong className="text-sm text-emerald-700">{formatBRL(fareNet)}</strong><DisclosureChevron/></span></summary><div className="space-y-3 border-t border-slate-100 p-3">
   <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={mode==="withFee"} onChange={()=>setMode("withFee")}/>Valor bruto + taxa</label><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={mode==="net"} onChange={()=>setMode("net")}/>Valor já líquido</label></div>
   {mode==="withFee"&&<> <div className="space-y-2">{revenueItems.map((item,index)=><details key={item.id} open={index===revenueItems.length-1?true:undefined} className="rounded-lg border border-slate-200 bg-slate-50/70"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm"><span className="truncate font-medium text-slate-700">{item.app==="Outro"?(item.nomeAppPersonalizado||"Outro aplicativo"):item.app}</span><strong className="text-emerald-700">{formatBRL(summarizeRevenue([item]).liquido)}</strong></summary><div className="space-y-3 border-t border-slate-200 p-3">
     <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-500">Receita {index+1}</p>{revenueItems.length>1&&<button type="button" onClick={()=>removeRevenue(item.id)} className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">Remover</button>}</div>
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="sm:col-span-1"><label className="label">Aplicativo</label><select className="input" value={item.app} onChange={e=>updateRevenue(item.id,{app:e.target.value as RevenueAppName,nomeAppPersonalizado:e.target.value==="Outro"?item.nomeAppPersonalizado:""})}>{REVENUE_APPS.map(app=><option key={app} value={app}>{app}</option>)}</select>{item.app==="Outro"&&<input className="input mt-2" value={item.nomeAppPersonalizado} onChange={e=>updateRevenue(item.id,{nomeAppPersonalizado:e.target.value})} placeholder="Nome do aplicativo regional"/>}</div><div><label className="label">Valor bruto (R$)</label><input type="number" step="0.01" min="0" className="input" value={item.bruto||""} onChange={e=>updateRevenue(item.id,{bruto:toNumber(e.target.value)})} placeholder="Ex.: 150,00"/></div><div><label className="label">Taxa do app (%)</label><input type="number" step="0.01" min="0" max="100" className="input" value={item.taxa||""} onChange={e=>updateRevenue(item.id,{taxa:toNumber(e.target.value)})} placeholder="Ex.: 20"/></div></div>
     <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm"><span className="text-emerald-700">Líquido deste app</span><strong className="text-emerald-800">{formatBRL(summarizeRevenue([item]).liquido)}</strong></div>
   </div></details>)}</div>
   <button type="button" onClick={addRevenue} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50">+ Adicionar receita de outro App</button>
   <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-emerald-700">Receita líquida total do dia</span><strong className="text-xl font-black text-emerald-800">{formatBRL(revenueSummary.liquido)}</strong></div><div className="flex justify-between border-t border-emerald-200 pt-2 text-xs text-emerald-700"><span>Bruto {formatBRL(revenueSummary.bruto)}</span><span>Taxas {formatBRL(revenueSummary.taxaValor)}</span></div></div></>}
   {mode==="net"&&<div className="space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="label">Aplicativo</label><select className="input" value={netApp} onChange={e=>setNetApp(e.target.value as RevenueAppName|"")}><option value="">Selecione o aplicativo</option>{REVENUE_APPS.map(app=><option key={app} value={app}>{app}</option>)}</select>{netApp==="Outro"&&<input className="input mt-2" value={netCustomApp} onChange={e=>setNetCustomApp(e.target.value)} placeholder="Nome do aplicativo"/>}</div><div><label className="label">Valor líquido recebido (R$)</label><input type="number" step="0.01" min="0" className="input" value={netFare||""} onChange={e=>setNetFare(toNumber(e.target.value))} placeholder="Ex.: 250,00"/></div></div>
    {netRevenueItems.map((item,index)=><details key={item.id} open={index===netRevenueItems.length-1?true:undefined} className="rounded-lg border border-slate-200 bg-slate-50/70"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm"><span className="truncate font-medium text-slate-700">{item.app==="Outro"?(item.nomeAppPersonalizado||"Outro aplicativo"):item.app}</span><strong className="text-emerald-700">{formatBRL(item.bruto)}</strong></summary><div className="space-y-3 border-t border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-600">Ganho líquido {index+1}</span><button type="button" onClick={()=>removeNetRevenue(item.id)} className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">Remover</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="label">Aplicativo</label><select className="input" value={item.app} onChange={e=>updateNetRevenue(item.id,{app:e.target.value as RevenueAppName,nomeAppPersonalizado:e.target.value==="Outro"?item.nomeAppPersonalizado:""})}>{REVENUE_APPS.map(app=><option key={app} value={app}>{app}</option>)}</select>{item.app==="Outro"&&<input className="input mt-2" value={item.nomeAppPersonalizado} onChange={e=>updateNetRevenue(item.id,{nomeAppPersonalizado:e.target.value})} placeholder="Nome do aplicativo"/>}</div><div><label className="label">Valor líquido recebido (R$)</label><input type="number" step="0.01" min="0" className="input" value={item.bruto||""} onChange={e=>updateNetRevenue(item.id,{bruto:toNumber(e.target.value)})} placeholder="Ex.: 40,00"/></div></div></div></details>)}
    <button type="button" onClick={addNetRevenue} className="btn btn-secondary w-full">+ Adicionar outro ganho líquido</button><p className="text-xs text-slate-500">Novos ganhos são somados às receitas anteriores do dia.</p>
   </div>}
   <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-emerald-700">Ganhos líquidos acumulados</span><strong className="text-sm text-emerald-800">{formatBRL(fareNet)}</strong></div>{feeAmount>0&&<p className="mt-1 text-xs text-emerald-700">Taxas descontadas: {formatBRL(feeAmount)}</p>}</div>
  </div></details>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">⏱️ Horas trabalhadas <span className="ml-1 text-xs font-normal text-slate-500">{hoursSegments.filter(segment=>segment.start||segment.end).length} períodos</span></span><span className="flex items-center"><strong className="text-sm text-slate-700">{hours.toLocaleString("pt-BR",{maximumFractionDigits:2})} h</strong><DisclosureChevron/></span></summary><div className="space-y-2 border-t border-slate-100 p-3">{hoursSegments.map((segment,index)=><details key={index} open={index===hoursSegments.length-1?true:undefined} className="rounded-lg border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm"><span className="font-medium text-slate-700">{segment.start||"Início"} → {segment.end||"Fim"}</span>{hoursSegments.length>1&&<button type="button" onClick={event=>{event.preventDefault();removeSegment(index);}} className="text-xs font-bold text-rose-600">✕</button>}</summary><div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 border-t border-slate-100 p-2"><div><label className="text-xs text-slate-500">Início</label><input type="time" className="input" value={segment.start} onChange={e=>updateSegment(index,{start:e.target.value})}/></div><span className="pb-3 text-slate-500">até</span><div><label className="text-xs text-slate-500">Fim</label><input type="time" className="input" value={segment.end} onChange={e=>updateSegment(index,{end:e.target.value})}/></div></div></details>)}<button type="button" onClick={addSegment} className="btn btn-secondary w-full">+ Adicionar outro período</button></div></details>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">🚗 Quilometragem</span><span className="flex items-center"><strong className="text-sm text-slate-700">{formatKm(kmDriven)} km</strong><DisclosureChevron/></span></summary><div className="space-y-3 border-t border-slate-100 p-3"><div className="grid grid-cols-2 gap-3"><div><label className="label">Km inicial</label><input type="number" step="0.1" min="0" className="input" value={kmInitial||""} onChange={e=>setKmInitial(toNumber(e.target.value))} placeholder="Ex.: 52.340"/></div><div><label className="label">Km final</label><input type="number" step="0.1" min="0" className="input" value={kmFinal||""} onChange={e=>setKmFinal(toNumber(e.target.value))} placeholder="Ex.: 52.520"/></div></div>
   <div><label className="label">Consumo médio do veículo (km/L)</label><input type="number" inputMode="decimal" step="0.1" min="0" className="input" value={fuelConsumption||""} onChange={e=>updateVehicleConsumption(toNumber(e.target.value))} placeholder="Ex.: 10 km/L"/><p className="mt-1 text-xs text-slate-500">Informe o consumo do veículo para calcular combustível e saldo no tanque.</p></div></div></details>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">⛽ Combustível <span className="ml-1 text-xs font-normal text-slate-500">{(gas>0?1:0)+(alcohol>0?1:0)+fuelPurchases.filter(item=>item.amount>0).length} lanç.</span></span><span className="flex items-center"><strong className="text-sm text-slate-700">{formatBRL(totalFuelPurchase)}</strong><DisclosureChevron/></span></summary><div className="space-y-2 border-t border-slate-100 p-3">
   <details className="rounded-lg border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm"><span className="font-medium text-slate-700">Gasolina{gasPrice>0?` · ${formatBRL(gasPrice)}/L`:""}</span><strong>{formatBRL(gas)}</strong></summary><div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-2"><div><label className="label">Preço/L (R$)</label><input type="number" step="0.001" min="0" className="input" value={gasPrice||""} onChange={e=>setGasPrice(toNumber(e.target.value))} placeholder="6,19"/></div><div><label className="label">Abastecido (R$)</label><input type="number" step="0.01" min="0" className="input" value={gas||""} onChange={e=>setGas(toNumber(e.target.value))} placeholder="100,00"/></div></div></details>
   <details className="rounded-lg border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm"><span className="font-medium text-slate-700">Álcool{alcoholPrice>0?` · ${formatBRL(alcoholPrice)}/L`:""}</span><strong>{formatBRL(alcohol)}</strong></summary><div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-2"><div><label className="label">Preço/L (R$)</label><input type="number" step="0.001" min="0" className="input" value={alcoholPrice||""} onChange={e=>setAlcoholPrice(toNumber(e.target.value))} placeholder="4,39"/></div><div><label className="label">Abastecido (R$)</label><input type="number" step="0.01" min="0" className="input" value={alcohol||""} onChange={e=>setAlcohol(toNumber(e.target.value))} placeholder="80,00"/></div></div></details>
    {fuelPurchases.map((purchase,index)=><details key={purchase.id} open={index===fuelPurchases.length-1?true:undefined} className="rounded-lg border border-slate-200 bg-slate-50/70"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm"><span className="truncate font-medium text-slate-700">{purchase.type==="gasoline"?"Gasolina":"Álcool"}{purchase.pricePerLiter>0?` · ${formatBRL(purchase.pricePerLiter)}/L`:""}</span><strong>{formatBRL(purchase.amount)}</strong></summary><div className="space-y-3 border-t border-slate-200 p-3">
     <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-600">Abastecimento {index+1}</span><button type="button" onClick={()=>removeFuelPurchase(purchase.id)} className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">Remover</button></div>
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="label">Combustível</label><select className="input" value={purchase.type} onChange={e=>updateFuelPurchase(purchase.id,{type:e.target.value as FuelPurchase["type"]})}><option value="gasoline">Gasolina</option><option value="alcohol">Álcool</option></select></div><div><label className="label">Preço por litro (R$)</label><input type="number" step="0.001" min="0" className="input" value={purchase.pricePerLiter||""} onChange={e=>updateFuelPurchase(purchase.id,{pricePerLiter:toNumber(e.target.value)})} placeholder="Ex.: 5,89"/></div><div><label className="label">Valor abastecido (R$)</label><input type="number" step="0.01" min="0" className="input" value={purchase.amount||""} onChange={e=>updateFuelPurchase(purchase.id,{amount:toNumber(e.target.value)})} placeholder="Ex.: 50,00"/></div></div>
     {purchase.amount>0&&purchase.pricePerLiter>0&&<p className="text-xs font-semibold text-emerald-700">{formatLiters(purchase.amount/purchase.pricePerLiter)} L neste abastecimento</p>}
    </div></details>)}
    <button type="button" onClick={addFuelPurchase} className="btn btn-secondary w-full">+ Adicionar novo abastecimento</button>
    {fuelPurchases.length>0&&<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-emerald-700">Total abastecido no dia</span><strong className="text-sm text-emerald-800">{formatBRL(totalFuelPurchase)}</strong></div><p className="mt-1 text-xs text-emerald-700">{formatLiters(totalPurchasedLiters)} L · preço médio {formatBRL(weightedFuelPrice)}/L</p></div>}
    <details className="rounded-xl border border-emerald-200 bg-emerald-50/50"><summary className="cursor-pointer px-3 py-2 text-xs font-bold text-emerald-800">Monitorar abastecimento e histórico</summary><FuelCalculator initialAmount={totalFuelPurchase} initialPricePerLiter={weightedFuelPrice} initialKilometers={kmDriven} initialEfficiency={informedFuelConsumption} onUseEfficiency={updateVehicleConsumption}/></details>
   </div></details>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">🔧 Manutenção <span className="ml-1 text-xs font-normal text-slate-500">{maintenanceItems.length} lanç.</span></span><span className="flex items-center"><strong className="text-sm text-slate-700">{formatBRL(maintenanceTotal)}</strong><DisclosureChevron/></span></summary><div className="border-t border-slate-100 p-3"><MaintenanceExpenses items={maintenanceItems} onChange={setMaintenanceItems}/></div></details>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">🧾 Gastos extras <span className="ml-1 text-xs font-normal text-slate-500">{extras.length} lanç.</span></span><span className="flex items-center"><strong className="text-sm text-slate-700">{formatBRL(extrasSum)}</strong><DisclosureChevron/></span></summary><div className="border-t border-slate-100 p-3"><ExtraExpenses extras={extras} onChange={setExtras}/></div></details>
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={saveDraft} className="btn btn-secondary w-full">Salvar dia aberto</button><button type="submit" className="btn btn-primary w-full">Registrar e fechar dia</button></div>{status&&<p className="text-sm text-center text-slate-600">{status}</p>}
 </form>
 <div className="sticky top-2 z-10 order-1">
  <section className={"rounded-xl border p-3 shadow-md backdrop-blur-sm " + (summaryTone==="profit"?"border-emerald-200 bg-emerald-50/95":summaryTone==="loss"?"border-red-200 bg-red-50/95":"border-amber-200 bg-amber-50/95")} aria-live="polite" aria-label="Resumo financeiro diário">
   <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
     <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">RESUMO DIÁRIO</p>
     <div className="mt-0.5 flex items-baseline gap-2">
      <p className={"text-2xl font-black tracking-tight sm:text-3xl " + (summaryTone==="profit"?"text-emerald-700":summaryTone==="loss"?"text-red-700":"text-amber-700")}>{formatBRL(visibleProfit)}</p>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">LUCRO LÍQUIDO</span>
     </div>
    </div>
    {profitPercent!==null&&<span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-black " + (summaryTone==="profit"?"bg-emerald-100 text-emerald-800":summaryTone==="loss"?"bg-red-100 text-red-800":"bg-amber-100 text-amber-800")}>{summaryTone==="profit"?"↗":summaryTone==="loss"?"↘":"•"} {formatPercent(Math.abs(profitPercent))}<span className="ml-1 text-[9px] font-bold uppercase tracking-wide">MARGEM</span></span>}
   </div>
   <div className="mt-2 grid grid-cols-3 divide-x divide-slate-200/80 border-t border-slate-200/80 pt-2">
    <div className="pr-2">
     <p className="text-base font-black text-slate-800 sm:text-lg"><span className="mr-1 text-sm">↗</span>{visibleRevenuePerKm!==null?formatBRL(visibleRevenuePerKm):"—"}<span className="ml-0.5 text-[10px] font-bold text-slate-500">/km</span></p>
     <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">RECEITA/km</p>
    </div>
    <div className="px-2">
     <p className="text-base font-black text-slate-800 sm:text-lg"><span className="mr-1 text-sm">⛽</span>{visibleCostPerKm!==null?formatBRL(Math.abs(visibleCostPerKm)):"—"}<span className="ml-0.5 text-[10px] font-bold text-slate-500">/km</span></p>
     <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">CUSTO/km</p>
    </div>
    <div className="pl-2"><p className="text-base font-black text-slate-800">{effectiveFuelConsumption>0?formatKm(effectiveFuelConsumption):"—"}<span className="ml-0.5 text-[10px] font-bold text-slate-500">km/L</span></p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">KM/L INFORMADO</p></div>
   </div>
   {(totalPurchasedLiters>0||kmDriven>0)&&<div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-2">
    <div className="rounded-lg border border-emerald-200/70 bg-white/60 px-2 py-1.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Combustível gasto em {formatKm(kmDriven)} km</p><p className="text-sm font-black text-slate-800">{effectiveFuelConsumption>0?`${formatLiters(fuelConsumedLiters)} L`:"—"}</p><p className="text-[11px] font-semibold text-emerald-700">{effectiveFuelConsumption>0?formatBRL(fuelConsumedCost):"Aguardando dados"}</p></div>
    <div className="rounded-lg border border-sky-200/70 bg-white/60 px-2 py-1.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Restante no tanque</p><p className="text-sm font-black text-slate-800">{effectiveFuelConsumption>0?`${formatLiters(fuelRemainingLiters)} L`:"—"}</p><p className="text-[11px] font-semibold text-sky-700">{effectiveFuelConsumption>0?formatBRL(fuelRemainingValue):"Aguardando dados"}</p></div>
   </div>}
   {visibleHours>0&&<div className="mt-2 flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs"><span className="font-semibold text-slate-500">{visibleHours.toLocaleString("pt-BR",{maximumFractionDigits:2})} h trabalhadas</span><strong className={visibleProfit<0?"text-red-700":"text-emerald-700"}>{formatBRL(visibleProfit/visibleHours)}/h</strong></div>}
   <details className="group mt-2 border-t border-slate-200/80 pt-2"><summary className="flex cursor-pointer list-none items-center justify-center text-[10px] font-bold uppercase tracking-wide text-slate-600">Ver balanço completo <DisclosureChevron/></summary><div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><p className="text-slate-500">Ganhos líquidos</p><strong className="text-emerald-700">{formatBRL(fareNet)}</strong></div><div><p className="text-slate-500">Distância</p><strong>{formatKm(visibleKm)} km</strong></div><div><p className="text-slate-500">Combustível gasto no percurso</p><strong>{effectiveFuelConsumption>0?`${formatBRL(fuelConsumedCost)} · ${formatLiters(fuelConsumedLiters)} L`:"Aguardando dados"}</strong></div><div><p className="text-slate-500">Consumo médio</p><strong>{effectiveFuelConsumption>0?`${formatKm(effectiveFuelConsumption)} km/L`:"Aguardando dados"}</strong></div><div><p className="text-slate-500">Restante no tanque</p><strong>{effectiveFuelConsumption>0?`${formatLiters(fuelRemainingLiters)} L · ${formatBRL(fuelRemainingValue)}`:"Aguardando dados"}</strong></div><div><p className="text-slate-500">Preço médio/L</p><strong>{weightedFuelPrice>0?formatBRL(weightedFuelPrice):"—"}</strong></div><div><p className="text-slate-500">Manutenção</p><strong>{formatBRL(maintenanceTotal)}</strong></div><div><p className="text-slate-500">Gastos extras</p><strong>{formatBRL(extrasSum)}</strong></div><div><p className="text-slate-500">Taxas dos apps</p><strong>{formatBRL(feeAmount)}</strong></div><div><p className="text-slate-500">Lucro por km</p><strong>{visibleProfitPerKm!==null?formatBRL(visibleProfitPerKm):"—"}</strong></div><div className="col-span-2 flex items-center justify-between border-t border-slate-200 pt-2"><span className="font-semibold text-slate-600">Total de despesas</span><strong className="text-rose-700">{formatBRL(totalExpenses)}</strong></div></div></details>
  </section>
 </div>
 <div className="order-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-500">Lucro líquido do mês</p><p className="text-xl font-bold text-slate-800">{formatBRL(monthProfit)}</p></div></div>
 {savedCard&&<CardDeLucro profit={savedCard.profit} km={savedCard.km} profitPerHour={savedCard.hours>0?savedCard.profit/savedCard.hours:null} profitPerKm={savedCard.profitPerKm} costPerKm={savedCard.costPerKm} onClose={()=>setSavedCard(null)}/>}</div>;
}
