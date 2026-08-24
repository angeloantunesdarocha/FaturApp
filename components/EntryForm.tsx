"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatBRL, hojeBrasilia, toNumber } from "@/lib/utils";
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
type LaunchRecord = { id:string; number:number; date:string; createdAt:string; draft:DraftState };
type DayReopenRecord = { at:string };

const LAUNCHES_KEY = "faturapp:lancamentos-dia:";
const CLOSED_DAY_KEY = "faturapp:dia-fechado:";
const REOPEN_HISTORY_KEY = "faturapp:dia-reaberto:";
const NEXT_LAUNCH_NUMBER_KEY = "faturapp:proximo-numero-lancamento";

function draftHasData(draft:DraftState){return draft.netFare>0||draft.netCustomApp.trim()!==""||draft.revenueItems.some(item=>item.bruto>0||item.taxa>0||item.nomeAppPersonalizado.trim()!=="")||(draft.netRevenueItems??[]).some(item=>item.bruto>0)||draft.gas>0||draft.alcohol>0||draft.gasPrice>0||draft.alcoholPrice>0||(draft.fuelPurchases??[]).length>0||draft.kmInitial>0||draft.kmFinal>0||draft.fuelConsumption>0||draft.hoursSegments.some(segment=>segment.start!==""||segment.end!=="")||draft.maintenanceItems.length>0||draft.extras.length>0;}
function mergeDrafts(date:string,drafts:DraftState[]):DraftState{
 const withFee=drafts.flatMap(d=>d.revenueItems.filter(item=>item.bruto>0));
 const net=drafts.flatMap(d=>[...(d.netRevenueItems??[]).filter(item=>item.bruto>0),...(d.mode==="net"&&d.netFare>0?[{...createRevenueItem(),app:d.netApp as RevenueAppName,nomeAppPersonalizado:d.netApp==="Outro"?d.netCustomApp.trim():"",bruto:d.netFare,taxa:0}]:[])]);
 const sum=(pick:(draft:DraftState)=>number)=>drafts.reduce((total,draft)=>total+pick(draft),0);
 const gas=sum(draft=>draft.gas),alcohol=sum(draft=>draft.alcohol),gasPriceBase=gas>0?sum(draft=>draft.gasPrice*draft.gas)/gas:0,alcoholPriceBase=alcohol>0?sum(draft=>draft.alcoholPrice*draft.alcohol)/alcohol:0;
 const kmInitials=drafts.map(d=>d.kmInitial).filter(value=>value>0),kmFinals=drafts.map(d=>d.kmFinal).filter(value=>value>0);
 return {date,mode:withFee.length>0?"withFee":net.length>0?"net":null,netFare:0,netApp:"",netCustomApp:"",revenueItems:withFee,netRevenueItems:net,gas,alcohol,gasPrice:gasPriceBase,alcoholPrice:alcoholPriceBase,fuelPurchases:drafts.flatMap(d=>d.fuelPurchases??[]),kmInitial:kmInitials.length?Math.min(...kmInitials):0,kmFinal:kmFinals.length?Math.max(...kmFinals):0,fuelConsumption:drafts.find(d=>d.fuelConsumption>0)?.fuelConsumption??0,hoursSegments:drafts.flatMap(d=>d.hoursSegments.filter(segment=>segment.start&&segment.end)),maintenanceItems:drafts.flatMap(d=>d.maintenanceItems),extras:drafts.flatMap(d=>d.extras)};
}
type FuelReference = { consumption:number; pricePerLiter:number; remainingLiters:number; remainingValue:number };
type MetricContext = { previousRemainingLiters?:number; previousRemainingValue?:number; inheritedConsumption?:number; inheritedPrice?:number };

function draftMetrics(draft:DraftState,context:MetricContext={}){
 const directNet=draft.mode==="net"&&draft.netFare>0?[{...createRevenueItem(),app:draft.netApp as RevenueAppName,nomeAppPersonalizado:draft.netApp==="Outro"?draft.netCustomApp.trim():"",bruto:draft.netFare,taxa:0}]:[];
 const revenueItems=[...draft.revenueItems.filter(item=>item.bruto>0),...(draft.netRevenueItems??[]).filter(item=>item.bruto>0),...directNet],revenue=summarizeRevenue(revenueItems);
 const gasPurchases=(draft.fuelPurchases??[]).filter(item=>item.type==="gasoline"),alcoholPurchases=(draft.fuelPurchases??[]).filter(item=>item.type==="alcohol");
 const gas=draft.gas+gasPurchases.reduce((total,item)=>total+toNumber(item.amount),0),alcohol=draft.alcohol+alcoholPurchases.reduce((total,item)=>total+toNumber(item.amount),0);
 const gasLiters=(draft.gasPrice>0?draft.gas/draft.gasPrice:0)+gasPurchases.reduce((total,item)=>total+(item.pricePerLiter>0?item.amount/item.pricePerLiter:0),0),alcoholLiters=(draft.alcoholPrice>0?draft.alcohol/draft.alcoholPrice:0)+alcoholPurchases.reduce((total,item)=>total+(item.pricePerLiter>0?item.amount/item.pricePerLiter:0),0),totalLiters=gasLiters+alcoholLiters,totalFuel=gas+alcohol,weightedPrice=totalLiters>0?totalFuel/totalLiters:0;
 const inheritedConsumption=Math.max(0,context.inheritedConsumption??0),inheritedPrice=Math.max(0,context.inheritedPrice??0),consumption=draft.fuelConsumption>0?draft.fuelConsumption:inheritedConsumption,effectivePrice=weightedPrice>0?weightedPrice:inheritedPrice,openingLiters=Math.max(0,context.previousRemainingLiters??0),openingValue=Math.max(0,context.previousRemainingValue??(openingLiters*effectivePrice)),km=Math.max(0,draft.kmFinal-draft.kmInitial),consumed=km>0&&consumption>0?km/consumption:0,consumedCost=consumed*effectivePrice,remaining=Math.max(0,openingLiters+totalLiters-consumed),remainingValue=Math.max(0,openingValue+totalFuel-consumedCost),maintenance=draft.maintenanceItems.filter(item=>item.description.trim()!==""),extras=draft.extras.filter(item=>item.name.trim()!==""),hours=draft.hoursSegments.reduce((total,segment)=>{const [sh,sm]=segment.start.split(":").map(Number),[eh,em]=segment.end.split(":").map(Number);let minutes=(eh*60+em)-(sh*60+sm);if(minutes<0)minutes+=1440;return total+minutes/60;},0);
 return {revenueItems,revenue,gas,alcohol,gasPrice:gasLiters>0?gas/gasLiters:0,alcoholPrice:alcoholLiters>0?alcohol/alcoholLiters:0,gasLiters,alcoholLiters,totalLiters,totalFuel,weightedPrice:effectivePrice,km,kmInitial:draft.kmInitial,kmFinal:draft.kmFinal,hours,consumption,consumed,consumedCost,remaining,remainingValue,maintenance,maintenanceTotal:maintenance.reduce((total,item)=>total+toNumber(item.value),0),extras,extrasTotal:extras.reduce((total,item)=>total+toNumber(item.value),0)};
}
type DraftMetric = ReturnType<typeof draftMetrics>;
function referenceFromMetric(metrics:DraftMetric,previous:FuelReference):FuelReference{return {consumption:metrics.consumption>0?metrics.consumption:previous.consumption,pricePerLiter:metrics.weightedPrice>0?metrics.weightedPrice:previous.pricePerLiter,remainingLiters:metrics.remaining,remainingValue:metrics.remainingValue};}
function chainDraftMetrics(drafts:DraftState[],initial:FuelReference):DraftMetric[]{let reference=initial;return drafts.map(draft=>{const metrics=draftMetrics(draft,{previousRemainingLiters:reference.remainingLiters,previousRemainingValue:reference.remainingValue,inheritedConsumption:reference.consumption,inheritedPrice:reference.pricePerLiter});reference=referenceFromMetric(metrics,reference);return metrics;});}
function aggregateChainedMetrics(date:string,drafts:DraftState[],initial:FuelReference):DraftMetric{const chained=chainDraftMetrics(drafts,initial),merged=draftMetrics(mergeDrafts(date,drafts),{inheritedConsumption:initial.consumption,inheritedPrice:initial.pricePerLiter,previousRemainingLiters:initial.remainingLiters,previousRemainingValue:initial.remainingValue}),last=chained[chained.length-1];return {...merged,km:chained.reduce((total,metrics)=>total+metrics.km,0),hours:chained.reduce((total,metrics)=>total+metrics.hours,0),consumed:chained.reduce((total,metrics)=>total+metrics.consumed,0),consumedCost:chained.reduce((total,metrics)=>total+metrics.consumedCost,0),remaining:last?.remaining??initial.remainingLiters,remainingValue:last?.remainingValue??initial.remainingValue,consumption:last?.consumption??initial.consumption,weightedPrice:last?.weightedPrice??initial.pricePerLiter};}
function profitFromMetrics(metrics:DraftMetric){return metrics.revenue.liquido-(metrics.consumed>0?metrics.consumedCost:metrics.gas+metrics.alcohol)-metrics.maintenanceTotal-metrics.extrasTotal;}
function draftFinancialSummary(draft:DraftState,providedMetrics?:DraftMetric){
 const metrics=providedMetrics??draftMetrics(draft);
 const fuelForProfit=metrics.consumed>0?metrics.consumedCost:metrics.gas+metrics.alcohol;
 return {profit:metrics.revenue.liquido-fuelForProfit-metrics.maintenanceTotal-metrics.extrasTotal, fuelConsumedLiters:metrics.consumed, fuelConsumedCost:metrics.consumedCost, remainingLiters:metrics.remaining, remainingValue:metrics.remainingValue};
}
function readStoredLaunches(){
 const records:LaunchRecord[]=[];
 for(let index=0;index<window.localStorage.length;index++){
  const key=window.localStorage.key(index);
  if(!key?.startsWith(LAUNCHES_KEY))continue;
  try { const value=JSON.parse(window.localStorage.getItem(key)||"[]"); if(Array.isArray(value))records.push(...(value as LaunchRecord[]).filter(record=>record?.draft&&record?.date)); } catch { /* ignora um dia salvo inválido */ }
 }
 return records.sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.number-b.number);
}
function referenceAfterRecords(records:LaunchRecord[],initial:FuelReference){let reference=initial;for(const metrics of chainDraftMetrics(records.map(record=>record.draft).filter(draftHasData),initial))reference=referenceFromMetric(metrics,reference);return reference;}

function formatKm(v:number){return v.toLocaleString("pt-BR",{maximumFractionDigits:1});}
function formatCostPerKm(v:number|null){return v===null?"—":`${formatBRL(v)} / km`;}
function formatLiters(v:number){return v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:3});}
function formatPercent(v:number){return `${v.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}%`;}
function DisclosureChevron(){return <span aria-hidden="true" className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-transform duration-200 ease-out group-open:rotate-180"><svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 8 4 4 4-4"/></svg></span>}
export default function EntryForm({initialDate=hojeBrasilia(),initialMonthProfit=0}:Props){
 const [mode,setMode]=useState<Mode|null>(null),[date,setDate]=useState(initialDate),[netFare,setNetFare]=useState(0),[netApp,setNetApp]=useState<RevenueAppName|"">(""),[netCustomApp,setNetCustomApp]=useState(""),[revenueItems,setRevenueItems]=useState<RevenueItem[]>([]),[netRevenueItems,setNetRevenueItems]=useState<RevenueItem[]>([]),[gas,setGas]=useState(0),[alcohol,setAlcohol]=useState(0),[gasPrice,setGasPrice]=useState(0),[alcoholPrice,setAlcoholPrice]=useState(0),[fuelPurchases,setFuelPurchases]=useState<FuelPurchase[]>([]),[kmInitial,setKmInitial]=useState(0),[kmFinal,setKmFinal]=useState(0),[fuelConsumption,setFuelConsumption]=useState(0),[vehicleConsumptionReference,setVehicleConsumptionReference]=useState(0),[fuelReference,setFuelReference]=useState<FuelReference>({consumption:0,pricePerLiter:0,remainingLiters:0,remainingValue:0}),[hoursSegments,setHoursSegments]=useState<TimeSegment[]>([{start:"",end:""}]),[maintenanceItems,setMaintenanceItems]=useState<MaintenanceItem[]>([]),[extras,setExtras]=useState<{name:string;value:number}[]>([]),[monthProfit,setMonthProfit]=useState(initialMonthProfit),[status,setStatus]=useState(""),[savedCard,setSavedCard]=useState<SavedCard|null>(null),[savedLaunches,setSavedLaunches]=useState<LaunchRecord[]>([]),[editingLaunchId,setEditingLaunchId]=useState<string|null>(null),[dayClosed,setDayClosed]=useState(false),[draftReady,setDraftReady]=useState(false);

 function resetForm(){
  setMode(null); setNetApp(""); setNetCustomApp(""); setNetFare(0);
  setRevenueItems([]); setNetRevenueItems([]);
  setGas(0); setAlcohol(0); setGasPrice(0); setAlcoholPrice(0); setFuelPurchases([]);
  setKmInitial(0); setKmFinal(0); setFuelConsumption(0);
 setHoursSegments([{start:"",end:""}]); setMaintenanceItems([]); setExtras([]);
 }

 function currentDraft():DraftState{return {date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras};}
 function persistLaunches(next:LaunchRecord[]){window.localStorage.setItem(LAUNCHES_KEY+date,JSON.stringify(next));setSavedLaunches(next);}
 function loadLaunchIntoForm(record:LaunchRecord){
  try { window.localStorage.removeItem("faturapp:dia-aberto:"+date); } catch { /* descarta alterações não salvas */ }
  const draft=record.draft;
  setSavedCard(null);
  setEditingLaunchId(record.id);setMode(draft.mode);setNetFare(draft.netFare);setNetApp(draft.netApp);setNetCustomApp(draft.netCustomApp);setRevenueItems(draft.revenueItems??[]);setNetRevenueItems(draft.netRevenueItems??[]);setGas(draft.gas||0);setAlcohol(draft.alcohol||0);setGasPrice(draft.gasPrice||0);setAlcoholPrice(draft.alcoholPrice||0);setFuelPurchases(draft.fuelPurchases??[]);setKmInitial(draft.kmInitial||0);setKmFinal(draft.kmFinal||0);setFuelConsumption(draft.fuelConsumption||0);setHoursSegments(draft.hoursSegments?.length?draft.hoursSegments:[{start:"",end:""}]);setMaintenanceItems(draft.maintenanceItems??[]);setExtras(draft.extras??[]);setStatus("Rascunho aberto para editar. Depois de editar, salve o lançamento.");
 }

 function restoreDraft(selectedDate:string){
  let draft:Partial<DraftState>={};
  let launches:LaunchRecord[]=[];
  let closed=false;
  try {
   const raw=window.localStorage.getItem("faturapp:dia-aberto:"+selectedDate);
   if(raw)draft=JSON.parse(raw) as DraftState;
   const rawLaunches=window.localStorage.getItem(LAUNCHES_KEY+selectedDate);
   if(rawLaunches)launches=JSON.parse(rawLaunches) as LaunchRecord[];
   closed=window.localStorage.getItem(CLOSED_DAY_KEY+selectedDate)==="1";
  } catch { /* rascunho inválido: inicia um dia limpo */ }
  let rememberedConsumption=0;
  try { rememberedConsumption=Math.max(0,Number(window.localStorage.getItem("faturapp:veiculo:consumo-km-litro"))||0); } catch { /* preferência indisponível */ }
  if(!rememberedConsumption&&draft.fuelConsumption&&draft.fuelConsumption>0){rememberedConsumption=draft.fuelConsumption;try{window.localStorage.setItem("faturapp:veiculo:consumo-km-litro",String(rememberedConsumption));}catch{/* mantém valor nesta sessão */}}
  const initialReference:FuelReference={consumption:rememberedConsumption,pricePerLiter:0,remainingLiters:0,remainingValue:0};
  const previousRecords=readStoredLaunches().filter(record=>record.date<selectedDate);
  const inheritedReference=referenceAfterRecords(previousRecords,initialReference);
  const selectedLaunches=launches.filter(record=>record.date===selectedDate);
  setDate(selectedDate); setSavedLaunches(selectedLaunches); setDayClosed(closed); setEditingLaunchId(null); setFuelReference(inheritedReference); resetForm(); setMode(draft.mode??null); setNetFare(draft.netFare||0); setNetApp(draft.netApp||""); setNetCustomApp(draft.netCustomApp||""); setRevenueItems(draft.revenueItems||[]); setNetRevenueItems(draft.netRevenueItems||[]); setGas(draft.gas||0); setAlcohol(draft.alcohol||0); setGasPrice(draft.gasPrice||0); setAlcoholPrice(draft.alcoholPrice||0); setFuelPurchases(draft.fuelPurchases||[]); setKmInitial(draft.kmInitial||0); setKmFinal(draft.kmFinal||0); setVehicleConsumptionReference(inheritedReference.consumption); setFuelConsumption(draft.fuelConsumption||0); setHoursSegments(draft.hoursSegments?.length?draft.hoursSegments:[{start:"",end:""}]); setMaintenanceItems(draft.maintenanceItems||[]); setExtras(draft.extras||[]); setSavedCard(null);
  setStatus(closed?"Dia fechado. Os lançamentos estão bloqueados para edição.":"");
 }

 useEffect(()=>{
  restoreDraft(initialDate);
  setDraftReady(true);
 // O carregamento inicial acontece somente quando a data recebida do servidor muda.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[initialDate]);

 useEffect(()=>{
  if(!draftReady||dayClosed)return;
  const hasDraftData=netFare>0||netCustomApp.trim()!==""||revenueItems.some(item=>item.bruto>0||item.taxa>0||item.nomeAppPersonalizado.trim()!=="")||netRevenueItems.length>0||gas>0||alcohol>0||gasPrice>0||alcoholPrice>0||fuelPurchases.length>0||kmInitial>0||kmFinal>0||fuelConsumption>0||hoursSegments.some(segment=>segment.start!==""||segment.end!=="")||maintenanceItems.length>0||extras.length>0;
  if(!hasDraftData)return;
  const draft:DraftState={date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras};
  try { window.localStorage.setItem("faturapp:dia-aberto:"+date,JSON.stringify(draft)); }
  catch { setStatus("Não foi possível salvar o rascunho neste aparelho."); }
 },[draftReady,dayClosed,date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras]);

 function hoursFromSegments(){ return hoursSegments.reduce((total,segment)=>{ if(!segment.start||!segment.end)return total; const [sh,sm]=segment.start.split(":").map(Number); const [eh,em]=segment.end.split(":").map(Number); let minutes=(eh*60+em)-(sh*60+sm); if(minutes<0)minutes+=1440; return total+minutes/60; },0); }
 const hours=hoursFromSegments();
 function updateSegment(index:number,patch:Partial<TimeSegment>){setHoursSegments(items=>items.map((item,i)=>i===index?{...item,...patch}:item));}
 function addSegment(){setHoursSegments(items=>[...items,{start:"",end:""}]);}
 function removeSegment(index:number){setHoursSegments(items=>items.length>1?items.filter((_,i)=>i!==index):[{start:"",end:""}]);}
 function updateVehicleConsumption(value:number){
  setFuelConsumption(value);
  if(value>0){setVehicleConsumptionReference(value);setFuelReference(reference=>({...reference,consumption:value}));try{window.localStorage.setItem("faturapp:veiculo:consumo-km-litro",String(value));}catch{/* mantém valor nesta sessão */}}
  else{setVehicleConsumptionReference(fuelReference.consumption);try{window.localStorage.removeItem("faturapp:veiculo:consumo-km-litro");}catch{/* preferência indisponível */}}
 }
 function addFuelPurchase(){setFuelPurchases(items=>[...items,{id:`fuel-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type:"gasoline",amount:0,pricePerLiter:0}]);}
 function updateFuelPurchase(id:string,patch:Partial<FuelPurchase>){setFuelPurchases(items=>items.map(item=>item.id===id?{...item,...patch}:item));}
 function removeFuelPurchase(id:string){setFuelPurchases(items=>items.filter(item=>item.id!==id));}
 function saveDraft(){
  if(dayClosed){setStatus("Este dia já foi fechado. Os lançamentos estão somente para leitura.");return;}
  const draft=currentDraft();
  if(!draftHasData(draft)){setStatus("Nenhum dado preenchido para salvar.");return;}
  try {
   window.localStorage.setItem("faturapp:dia-aberto:"+date,JSON.stringify(draft));
   const nextNumber=Number(window.localStorage.getItem(NEXT_LAUNCH_NUMBER_KEY)||"1");
   const record:LaunchRecord={id:editingLaunchId??`launch-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,number:editingLaunchId?(savedLaunches.find(item=>item.id===editingLaunchId)?.number??nextNumber):nextNumber,date,createdAt:new Date().toISOString(),draft};
   if(!editingLaunchId)window.localStorage.setItem(NEXT_LAUNCH_NUMBER_KEY,String(nextNumber+1));
   const next=editingLaunchId?savedLaunches.map(item=>item.id===editingLaunchId?record:item):[...savedLaunches,record];
   persistLaunches(next);
   window.localStorage.removeItem("faturapp:dia-aberto:"+date);
   setEditingLaunchId(null);
   resetForm();
   setStatus(editingLaunchId?`✅ Registro #${String(record.number).padStart(3,"0")} atualizado.`:"✅ Dia salvo. Registro criado para um novo lançamento.");
  } catch { setStatus("❌ Não foi possível salvar o dia neste aparelho."); }
 }



 function reopenDay(){
  if(!dayClosed)return;
  if(!window.confirm("Deseja reabrir este dia para adicionar ou editar lançamentos?"))return;
  try {
   const key=REOPEN_HISTORY_KEY+date;
   let history:DayReopenRecord[]=[];
   const raw=window.localStorage.getItem(key);
   if(raw){
    const parsed=JSON.parse(raw);
    if(Array.isArray(parsed))history=parsed as DayReopenRecord[];
   }
   history.push({at:new Date().toISOString()});
   window.localStorage.setItem(key,JSON.stringify(history));
  } catch { /* o histórico é opcional; a reabertura ainda pode prosseguir */ }
  try {
   window.localStorage.removeItem(CLOSED_DAY_KEY+date);
   setDayClosed(false);
   setEditingLaunchId(null);
   setStatus("Dia reaberto. Você pode adicionar ou editar lançamentos.");
  } catch { setStatus("❌ Não foi possível reabrir este dia neste aparelho."); }
 }

 const revenueSummary=useMemo(()=>summarizeRevenue(revenueItems),[revenueItems]);
 const additionalNetRevenue=netRevenueItems.reduce((total,item)=>total+toNumber(item.bruto),0);
 const fareNet=revenueSummary.liquido+netFare+additionalNetRevenue;
 const feeAmount=revenueSummary.taxaValor;
 const extrasSum=extras.reduce((a,e)=>a+toNumber(e.value),0);
 const maintenanceTotal=maintenanceItems.reduce((a,m)=>a+toNumber(m.value),0);
 const calculationLaunches=useMemo(()=>{if(!editingLaunchId)return savedLaunches;const index=savedLaunches.findIndex(record=>record.id===editingLaunchId);return index<0?savedLaunches:savedLaunches.slice(0,index);},[savedLaunches,editingLaunchId]);
 const savedDrafts=useMemo(()=>calculationLaunches.map(record=>record.draft).filter(draftHasData),[calculationLaunches]);
 const savedChainedMetrics=useMemo(()=>chainDraftMetrics(savedDrafts,fuelReference),[savedDrafts,fuelReference]);
 const displaySavedChainedMetrics=useMemo(()=>chainDraftMetrics(savedLaunches.map(record=>record.draft).filter(draftHasData),fuelReference),[savedLaunches,fuelReference]);
 const savedEndingReference=savedChainedMetrics.reduce((reference,metrics)=>referenceFromMetric(metrics,reference),fuelReference);
 const currentMetrics=draftMetrics(currentDraft(),{previousRemainingLiters:savedEndingReference.remainingLiters,previousRemainingValue:savedEndingReference.remainingValue,inheritedConsumption:savedEndingReference.consumption,inheritedPrice:savedEndingReference.pricePerLiter});
 const kmDriven=currentMetrics.km;
 const additionalGasPurchases=fuelPurchases.filter(item=>item.type==="gasoline");
 const additionalAlcoholPurchases=fuelPurchases.filter(item=>item.type==="alcohol");
 const totalGasExpense=currentMetrics.gas;
 const totalAlcoholExpense=currentMetrics.alcohol;
 const gasLiters=currentMetrics.gasLiters;
 const alcoholLiters=currentMetrics.alcoholLiters;
 const averageGasPrice=gasLiters>0?totalGasExpense/gasLiters:0;
 const averageAlcoholPrice=alcoholLiters>0?totalAlcoholExpense/alcoholLiters:0;
 const totalPurchasedLiters=gasLiters+alcoholLiters;
 const totalFuelPurchase=totalGasExpense+totalAlcoholExpense;
 const weightedFuelPrice=currentMetrics.weightedPrice;
 const informedFuelConsumption=currentMetrics.consumption;
 const effectiveFuelConsumption=informedFuelConsumption;
 const fuelPrice=weightedFuelPrice;
 const fuelConsumedLiters=currentMetrics.consumed;
 const fuelConsumedCost=currentMetrics.consumedCost;
 const fuelRemainingLiters=currentMetrics.remaining;
 const fuelRemainingValue=currentMetrics.remainingValue;
 const fuelCostForProfit=currentMetrics.consumed>0?currentMetrics.consumedCost:currentMetrics.gas+currentMetrics.alcohol;
 const totalExpenses=fuelCostForProfit+maintenanceTotal+extrasSum;
 const dayProfit=fareNet-totalExpenses;
 const totalCostPerKm=kmDriven>0?totalExpenses/kmDriven:null;
 const profitPerKm=kmDriven>0?dayProfit/kmDriven:null;
 const revenuePerKm=kmDriven>0?fareNet/kmDriven:null;
 const hasCurrentLaunch=fareNet!==0||totalFuelPurchase!==0||maintenanceTotal!==0||extrasSum!==0||kmDriven>0||fuelConsumption>0;
 const percentageBaseValue=revenueSummary.bruto+netFare+additionalNetRevenue;
 const consolidatedSavedMetrics=useMemo(()=>aggregateChainedMetrics(date,savedDrafts,fuelReference),[date,savedDrafts,fuelReference]);
 const consolidatedSavedProfit=savedChainedMetrics.reduce((total,metrics)=>total+profitFromMetrics(metrics),0);
 const dailyRevenue=consolidatedSavedMetrics.revenue.liquido+(hasCurrentLaunch?currentMetrics.revenue.liquido:0);
 const dailyRevenueBase=consolidatedSavedMetrics.revenue.bruto+(hasCurrentLaunch?currentMetrics.revenue.bruto:0);
 const dailyKm=consolidatedSavedMetrics.km+(hasCurrentLaunch?currentMetrics.km:0);
 const dailyHours=consolidatedSavedMetrics.hours+(hasCurrentLaunch?currentMetrics.hours:0);
 const dailyConsumed=consolidatedSavedMetrics.consumed+(hasCurrentLaunch?currentMetrics.consumed:0);
 const dailyConsumedCost=consolidatedSavedMetrics.consumedCost+(hasCurrentLaunch?currentMetrics.consumedCost:0);
 const dailyRemainingLiters=hasCurrentLaunch?currentMetrics.remaining:consolidatedSavedMetrics.remaining;
 const dailyRemainingValue=hasCurrentLaunch?currentMetrics.remainingValue:consolidatedSavedMetrics.remainingValue;
 const dailyExpenses=(consolidatedSavedMetrics.revenue.liquido-consolidatedSavedProfit)+(hasCurrentLaunch?totalExpenses:0);
 const dailyProfit=consolidatedSavedProfit+(hasCurrentLaunch?profitFromMetrics(currentMetrics):0);
 const dailyCostPerKm=dailyKm>0?dailyExpenses/dailyKm:null;
 const dailyProfitPerKm=dailyKm>0?dailyProfit/dailyKm:null;
 const dailyRevenuePerKm=dailyKm>0?dailyRevenue/dailyKm:null;
 const dailyEffectiveFuelConsumption=hasCurrentLaunch?currentMetrics.consumption:consolidatedSavedMetrics.consumption;
 const dailyFuelPrice=hasCurrentLaunch?currentMetrics.weightedPrice:consolidatedSavedMetrics.weightedPrice;
 const dailyMaintenance=consolidatedSavedMetrics.maintenanceTotal+(hasCurrentLaunch?maintenanceTotal:0);
 const dailyExtras=consolidatedSavedMetrics.extrasTotal+(hasCurrentLaunch?extrasSum:0);
 const dailyFeeAmount=consolidatedSavedMetrics.revenue.taxaValor+(hasCurrentLaunch?feeAmount:0);
 const visibleProfit=savedCard&&!hasCurrentLaunch?savedCard.profit:dailyProfit,visibleKm=savedCard&&!hasCurrentLaunch?savedCard.km:dailyKm,visibleProfitPerKm=savedCard&&!hasCurrentLaunch?savedCard.profitPerKm:dailyProfitPerKm,visibleRevenuePerKm=savedCard&&!hasCurrentLaunch?savedCard.revenuePerKm:dailyRevenuePerKm,visibleCostPerKm=savedCard&&!hasCurrentLaunch?savedCard.costPerKm:dailyCostPerKm,visibleHours=savedCard&&!hasCurrentLaunch?savedCard.hours:dailyHours,visibleRevenueBase=savedCard&&!hasCurrentLaunch?savedCard.revenueBase:dailyRevenueBase;
 const inheritedConsumptionNotice=!dayClosed&&!editingLaunchId&&fuelConsumption<=0&&savedEndingReference.consumption>0?`Usando a média de ${formatKm(savedEndingReference.consumption)} km/L do seu último lançamento.`:"";
 const profitPercent=visibleRevenueBase>0?(visibleProfit/visibleRevenueBase)*100:null;
 const summaryTone=visibleProfit>0?"profit":visibleProfit<0?"loss":"neutral";
 const hasSavedLaunches=savedDrafts.length>0;

 function updateRevenue(id:string,patch:Partial<RevenueItem>){setRevenueItems(items=>items.map(item=>item.id===id?{...item,...patch}:item));}
 function addRevenue(){setRevenueItems(items=>[...items,createRevenueItem()]);}
 function removeRevenue(id:string){setRevenueItems(items=>items.length>1?items.filter(item=>item.id!==id):items);}
 function addNetRevenue(){setNetRevenueItems(items=>[...items,{...createRevenueItem(),taxa:0}]);}
 function updateNetRevenue(id:string,patch:Partial<RevenueItem>){setNetRevenueItems(items=>items.map(item=>item.id===id?{...item,...patch,taxa:0}:item));}
 function removeNetRevenue(id:string){setNetRevenueItems(items=>items.filter(item=>item.id!==id));}

 async function handleSubmit(e:FormEvent){
  e.preventDefault();
  if(dayClosed){setStatus("Este dia já foi fechado. Os lançamentos estão somente para leitura.");return;}
  const draftBeingSubmitted=currentDraft();
  const recordsToClose=savedLaunches.map(record=>record.draft).filter(draft=>draftHasData(draft));
  if(editingLaunchId){const index=savedLaunches.findIndex(record=>record.id===editingLaunchId);if(index>=0&&draftHasData(draftBeingSubmitted))recordsToClose[index]=draftBeingSubmitted;}
  else if(draftHasData(draftBeingSubmitted))recordsToClose.push(draftBeingSubmitted);
  const consolidated=aggregateChainedMetrics(date,recordsToClose,fuelReference);
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
  if(draftHasData(draftBeingSubmitted)&&kmInitial===0&&kmFinal===0){setStatus("ℹ️ Informe o km inicial e o km final para calcular o combustível gasto e o restante no tanque.");return;}
  if(draftHasData(draftBeingSubmitted)&&kmDriven>0&&informedFuelConsumption<=0){setStatus("ℹ️ Informe o consumo médio do veículo (km/L) ou faça um lançamento anterior com essa média para que o app possa calcular o combustível.");return;}
  setStatus("Salvando...");
  const payload={date,gross_amount:consolidated.revenue.bruto,fee_percent:consolidated.revenue.taxaPercentual,net_fare:consolidated.revenue.liquido,revenue_details:consolidated.revenueItems,gas_expense:consolidated.gas,alcohol_expense:consolidated.alcohol,gasoline_price_per_liter:consolidated.gasPrice,alcohol_price_per_liter:consolidated.alcoholPrice,gasoline_liters:consolidated.gasLiters,alcohol_liters:consolidated.alcoholLiters,km_initial:consolidated.kmInitial,km_final:consolidated.kmFinal,km_driven:consolidated.km,hours_worked:consolidated.hours,fuel_consumption_km_per_liter:consolidated.consumption,fuel_consumed_liters:consolidated.consumed,fuel_consumed_cost:consolidated.consumedCost,fuel_remaining_liters:consolidated.remaining,fuel_remaining_value:consolidated.remainingValue,maintenance_expense:consolidated.maintenanceTotal,maintenance_details:consolidated.maintenance,extra_expenses:consolidated.extras};
  const res=await saveEntry(payload);
  if(res.success){window.localStorage.removeItem("faturapp:dia-aberto:"+date);window.localStorage.setItem(CLOSED_DAY_KEY+date,"1");setDayClosed(true);setEditingLaunchId(null);setStatus("✅ Dia registrado e fechado com sucesso!");if(typeof res.monthProfit==="number")setMonthProfit(res.monthProfit);const consolidatedProfit=profitFromMetrics(consolidated);setSavedCard({profit:consolidatedProfit,km:consolidated.km,hours:consolidated.hours,profitPerKm:consolidated.km>0?consolidatedProfit/consolidated.km:null,revenuePerKm:consolidated.km>0?consolidated.revenue.liquido/consolidated.km:null,costPerKm:consolidated.km>0?((consolidated.consumed>0?consolidated.consumedCost:consolidated.gas+consolidated.alcohol)+consolidated.maintenanceTotal+consolidated.extrasTotal)/consolidated.km:null,revenueBase:consolidated.revenue.bruto});resetForm();}else setStatus(`❌ Erro: ${res.error}`);
 }

 return <div className="flex flex-col gap-4"><form onSubmit={handleSubmit} className="order-2 space-y-3">
  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><label className="text-xs font-bold text-slate-600">Dia aberto</label><input type="date" className="input max-w-[10.5rem] !py-2" value={date} onChange={e=>restoreDraft(e.target.value)} required/></div>
  <fieldset disabled={dayClosed} className="contents">
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
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" onClick={saveDraft} className="btn btn-secondary w-full">Salvar Lançamento</button><button type="submit" className="btn btn-primary w-full">Registrar e fechar dia</button></div>{(status||inheritedConsumptionNotice)&&<p className={"text-sm text-center " + (status.startsWith("Dia reaberto.")?"rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-bold text-emerald-700":editingLaunchId||(!status&&inheritedConsumptionNotice)?"font-bold text-amber-700":"text-slate-600")}>{status||inheritedConsumptionNotice}</p>}
 </fieldset></form>
 {dayClosed&&<div className="order-2 -mt-2 flex justify-center"><button type="button" onClick={reopenDay} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-extrabold text-amber-800 transition hover:bg-amber-100">Reabrir dia</button></div>}
 <section className="order-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Lançamentos do dia aberto">
  <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-800">Lançamentos salvos</p><p className="text-xs text-slate-500">{dayClosed?"Dia fechado · somente leitura":"Use o botão editar para alterar um registro"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{savedLaunches.length}</span></div>
  {savedLaunches.length===0?<p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">Nenhum lançamento salvo ainda.</p>:<div className="mt-3 space-y-2">{savedLaunches.slice().sort((a,b)=>a.number-b.number).map(record=>{const chainIndex=savedLaunches.findIndex(item=>item.id===record.id),summary=draftFinancialSummary(record.draft,displaySavedChainedMetrics[chainIndex]),created=new Date(record.createdAt),isEditing=editingLaunchId===record.id;return <div key={record.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><div className="flex items-center justify-between gap-2"><strong className="text-sm text-slate-800">#{String(record.number).padStart(3,"0")}</strong><div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">{created.toLocaleDateString("pt-BR")} · {created.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span><button type="button" disabled={dayClosed} onClick={()=>isEditing?saveDraft():loadLaunchIntoForm(record)} className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">{isEditing?"salvar":"editar"}</button></div></div><p className="mt-1 text-xs text-slate-600">Lucro líquido <span className="inline-flex items-center gap-1 font-bold"><span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + (summary.profit<0?"bg-red-600":"bg-emerald-600")}></span><span className={summary.profit<0?"text-red-600":"text-emerald-600"}>{formatBRL(summary.profit)}</span></span> · Combustível gasto {summary.fuelConsumedLiters>0?formatLiters(summary.fuelConsumedLiters)+" L ("+formatBRL(summary.fuelConsumedCost)+")":"—"} · Restante no tanque {summary.remainingLiters>0||summary.remainingValue>0?formatLiters(summary.remainingLiters)+" L ("+formatBRL(summary.remainingValue)+")":"—"}</p></div>})}</div>}
 </section>
 <section className="order-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm" aria-label="Resumo do dia até agora">
  <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-800">Resumo do dia até agora</p><p className="text-[11px] text-slate-500">{hasSavedLaunches?"Valores acumulados dos lançamentos salvos":"Nenhum lançamento ainda"}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">{savedLaunches.length}</span></div>
  {hasSavedLaunches&&<div className="mt-3 grid grid-cols-2 gap-2">
   <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">💰 Ganhos líquidos totais</p><div className="mt-1 inline-flex items-center gap-1.5"><span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + (consolidatedSavedProfit<0?"bg-red-600":"bg-emerald-600")}></span><strong className={"text-sm font-black " + (consolidatedSavedProfit<0?"text-red-600":"text-emerald-600")}>{formatBRL(consolidatedSavedProfit)}</strong></div></div>
   <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">🚗 Km percorridos</p><strong className="mt-1 block text-sm font-black text-slate-800">{formatKm(consolidatedSavedMetrics.km)} km</strong></div>
   <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">⛽ Combustível gasto</p><strong className="mt-1 block text-sm font-black text-slate-800">{formatLiters(consolidatedSavedMetrics.consumed)} L</strong><span className="text-[11px] font-semibold text-emerald-700">{formatBRL(consolidatedSavedMetrics.consumedCost)}</span></div>
   <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">🛢️ Restante no tanque</p><strong className="mt-1 block text-sm font-black text-slate-800">{formatLiters(consolidatedSavedMetrics.remaining)} L</strong><span className="text-[11px] font-semibold text-sky-700">{formatBRL(consolidatedSavedMetrics.remainingValue)}</span></div>
  </div>}
 </section>
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
   <div className="mt-2 grid grid-cols-1 gap-2 border-t border-slate-200/80 pt-2 sm:grid-cols-3 sm:divide-x sm:divide-slate-200/80">
    <div className="sm:pr-2">
     <p className="text-sm font-semibold leading-snug text-slate-700"><span className="mr-1 text-sm">↗</span><strong className="font-black text-slate-900">{formatBRL(visibleRevenuePerKm??0)}</strong> ganho por cada KM rodado</p>
    </div>
    <div className="sm:px-2">
     <p className="text-sm font-semibold leading-snug text-slate-700"><span className="mr-1 text-sm">⛽</span><strong className="font-black text-slate-900">{formatBRL(Math.abs(visibleCostPerKm??0))}</strong> pago por cada KM rodado</p>
    </div>
    <div className="sm:pl-2"><p className="text-sm font-semibold leading-snug text-slate-700">Seu carro faz a média de <strong className="font-black text-slate-900">{effectiveFuelConsumption>0?formatKm(effectiveFuelConsumption):"0"} km</strong> por litro de combustível</p></div>
   </div>
   {(consolidatedSavedMetrics.totalLiters>0||dailyKm>0)&&<div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-2">
    <div className="rounded-lg border border-emerald-200/70 bg-white/60 px-2 py-1.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Combustível gasto em {formatKm(dailyKm)} km</p><p className="text-sm font-black text-slate-800">{dailyEffectiveFuelConsumption>0?`${formatLiters(dailyConsumed)} L`:"—"}</p><p className="text-[11px] font-semibold text-emerald-700">{dailyEffectiveFuelConsumption>0?formatBRL(dailyConsumedCost):"Aguardando dados"}</p></div>
    <div className="rounded-lg border border-sky-200/70 bg-white/60 px-2 py-1.5"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Restante no tanque</p><p className="text-sm font-black text-slate-800">{dailyEffectiveFuelConsumption>0?`${formatLiters(dailyRemainingLiters)} L`:"—"}</p><p className="text-[11px] font-semibold text-sky-700">{dailyEffectiveFuelConsumption>0?formatBRL(dailyRemainingValue):"Aguardando dados"}</p></div>
   </div>}
   {visibleHours>0&&<div className="mt-2 flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs"><span className="font-semibold text-slate-500">{visibleHours.toLocaleString("pt-BR",{maximumFractionDigits:2})} h trabalhadas</span><strong className={visibleProfit<0?"text-red-700":"text-emerald-700"}>{formatBRL(visibleProfit/visibleHours)}/h</strong></div>}
   <details className="group mt-2 border-t border-slate-200/80 pt-2"><summary className="flex cursor-pointer list-none items-center justify-center text-[10px] font-bold uppercase tracking-wide text-slate-600">Ver balanço completo <DisclosureChevron/></summary><div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><p className="text-slate-500">Ganhos líquidos</p><strong className="text-emerald-700">{formatBRL(dailyRevenue)}</strong></div><div><p className="text-slate-500">Você percorreu <strong className="font-black text-slate-800">{formatKm(visibleKm)} km</strong></p></div><div><p className="text-slate-500">Combustível gasto no percurso</p><strong>{dailyEffectiveFuelConsumption>0?`${formatBRL(dailyConsumedCost)} · ${formatLiters(dailyConsumed)} L`:"Aguardando dados"}</strong></div><div><p className="text-slate-500">Consumo médio</p><strong>{dailyEffectiveFuelConsumption>0?`${formatKm(dailyEffectiveFuelConsumption)} km/L`:"Aguardando dados"}</strong></div><div><p className="text-slate-500">Restante no tanque</p><strong>{dailyEffectiveFuelConsumption>0?`${formatLiters(dailyRemainingLiters)} L · ${formatBRL(dailyRemainingValue)}`:"Aguardando dados"}</strong></div><div><p className="text-slate-500">Preço médio/L</p><strong>{dailyFuelPrice>0?formatBRL(dailyFuelPrice):"—"}</strong></div><div><p className="text-slate-500">Manutenção</p><strong>{formatBRL(dailyMaintenance)}</strong></div><div><p className="text-slate-500">Gastos extras</p><strong>{formatBRL(dailyExtras)}</strong></div><div><p className="text-slate-500">Taxas dos apps</p><strong>{formatBRL(dailyFeeAmount)}</strong></div><div><p className="text-slate-500">Lucro por km</p><strong>{visibleProfitPerKm!==null?formatBRL(visibleProfitPerKm):"—"}</strong></div><div className="col-span-2 flex items-center justify-between border-t border-slate-200 pt-2"><span className="font-semibold text-slate-600">Total de despesas</span><strong className="text-rose-700">{formatBRL(dailyExpenses)}</strong></div></div></details>
  </section>
 </div>
 {savedCard&&<CardDeLucro profit={savedCard.profit} km={savedCard.km} profitPerHour={savedCard.hours>0?savedCard.profit/savedCard.hours:null} profitPerKm={savedCard.profitPerKm} costPerKm={savedCard.costPerKm} onClose={()=>setSavedCard(null)}/>}</div>;
}
