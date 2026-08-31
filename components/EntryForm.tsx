"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatBRL, hojeBrasilia, toNumber } from "@/lib/utils";
import { createRevenueItem, REVENUE_APPS, summarizeRevenue, type RevenueAppName, type RevenueItem } from "@/lib/revenue";
import ExtraExpenses from "./ExtraExpenses";
import MaintenanceExpenses, { type MaintenanceItem } from "./MaintenanceExpenses";
import CardDeLucro from "./CardDeLucro";
import SaveLaunchButton from "./SaveLaunchButton";
import { saveEntry } from "@/app/actions";
import {
  calculateFinancialMetrics,
  recalculateDaySummary,
  type FinancialCalculationResult,
  type FinancialEngineContext,
  type FuelType,
} from "@/lib/financial-engine";

type Mode = "withFee" | "net";
type Props = { initialDate?: string; initialMonthProfit?: number; userId: string };
type SavedCard = { profit:number; km:number; hours:number; profitPerKm:number|null; revenuePerKm:number|null; costPerKm:number|null; revenueBase:number };
type TimeSegment = { start:string; end:string };
type FuelPurchase = { id:string; type:"gasoline"|"alcohol"; amount:number; pricePerLiter:number };
type DraftState = { date:string; mode:Mode|null; netFare:number; netApp:RevenueAppName|""; netCustomApp:string; revenueItems:RevenueItem[]; netRevenueItems?:RevenueItem[]; gas:number; alcohol:number; gasPrice:number; alcoholPrice:number; fuelPurchases?:FuelPurchase[]; fuelType?:FuelType; fullTank?:boolean; kmInitial:number; kmFinal:number; fuelConsumption:number; hoursSegments:TimeSegment[]; maintenanceItems:MaintenanceItem[]; extras:{name:string;value:number}[] };
type LaunchRecord = { id:string; number:number; date:string; createdAt:string; draft:DraftState };
type DayReopenRecord = { at:string };
type StoredVehicleProfile = Required<FinancialEngineContext> & { sourceDate:string; baseContext?:FinancialEngineContext };

function scopedStorageKey(userId:string, key:string){return `faturapp:user:${userId}:${key}`;}
function engineContextOnly(context:FinancialEngineContext):FinancialEngineContext{return {consumoPerfilKmL:context.consumoPerfilKmL,tipoCombustivel:context.tipoCombustivel,hodometroUltimoTanqueCheio:context.hodometroUltimoTanqueCheio,historicoConsumoKmL:context.historicoConsumoKmL,ultimoPrecoPorLitro:context.ultimoPrecoPorLitro};}

function nonNegative(value:number){return Number.isFinite(Number(value))?Math.max(0,Number(value)):0;}
function normalizeMaintenance(items:MaintenanceItem[]){return items.map((item,index)=>({description:item.description.trim()||`Manutenção ${index+1}`,value:nonNegative(item.value)})).filter(item=>item.value>0);}
function normalizeExtras(items:{name:string;value:number}[]){return items.map((item,index)=>({name:item.name.trim()||`Gasto extra ${index+1}`,value:nonNegative(item.value)})).filter(item=>item.value>0);}
function normalizeTimeSegments(items:TimeSegment[]){return items.filter(item=>item.start&&item.end).map(item=>({start:item.start,end:item.end}));}
function normalizeDraftForSave(draft:DraftState):DraftState{return {...draft,netFare:nonNegative(draft.netFare),gas:nonNegative(draft.gas),alcohol:nonNegative(draft.alcohol),gasPrice:nonNegative(draft.gasPrice),alcoholPrice:nonNegative(draft.alcoholPrice),fuelPurchases:(draft.fuelPurchases??[]).map(item=>({...item,amount:nonNegative(item.amount),pricePerLiter:nonNegative(item.pricePerLiter)})).filter(item=>item.amount>0||item.pricePerLiter>0),kmInitial:nonNegative(draft.kmInitial),kmFinal:nonNegative(draft.kmFinal),fuelConsumption:nonNegative(draft.fuelConsumption),hoursSegments:normalizeTimeSegments(draft.hoursSegments),maintenanceItems:normalizeMaintenance(draft.maintenanceItems),extras:normalizeExtras(draft.extras)};}
function validateDraftBeforeSave(draft:DraftState){if(draft.kmFinal<draft.kmInitial)return "O KM final não pode ser menor que o KM inicial.";if(draft.gas>0&&draft.gasPrice<=0)return "Informe o preço por litro da gasolina.";if(draft.alcohol>0&&draft.alcoholPrice<=0)return "Informe o preço por litro do álcool.";if((draft.fuelPurchases??[]).some(item=>item.amount>0&&item.pricePerLiter<=0))return "Informe o preço por litro em cada abastecimento.";if(draft.hoursSegments.some(item=>(item.start&&!item.end)||(!item.start&&item.end)))return "Informe o início e o fim de cada período trabalhado.";return null;}

function draftHasData(draft:DraftState){return draft.netFare>0||draft.netCustomApp.trim()!==""||draft.revenueItems.some(item=>item.bruto>0||item.taxa>0||item.nomeAppPersonalizado.trim()!=="")||(draft.netRevenueItems??[]).some(item=>item.bruto>0)||draft.gas>0||draft.alcohol>0||draft.gasPrice>0||draft.alcoholPrice>0||(draft.fuelPurchases??[]).some(item=>item.amount>0||item.pricePerLiter>0)||Boolean(draft.fullTank)||draft.kmInitial>0||draft.kmFinal>0||draft.fuelConsumption>0||draft.hoursSegments.some(segment=>segment.start!==""||segment.end!=="")||draft.maintenanceItems.some(item=>toNumber(item.value)>0)||draft.extras.some(item=>toNumber(item.value)>0);}
function draftDistance(draft:DraftState){return Math.max(0,draft.kmFinal-draft.kmInitial);}
function mergeDrafts(date:string,drafts:DraftState[]):DraftState{
 const withFee=drafts.flatMap(d=>d.revenueItems.filter(item=>item.bruto>0));
 const net=drafts.flatMap(d=>[...(d.netRevenueItems??[]).filter(item=>item.bruto>0),...(d.mode==="net"&&d.netFare>0?[{...createRevenueItem(),app:d.netApp as RevenueAppName,nomeAppPersonalizado:d.netApp==="Outro"?d.netCustomApp.trim():"",bruto:d.netFare,taxa:0}]:[])]);
 const sum=(pick:(draft:DraftState)=>number)=>drafts.reduce((total,draft)=>total+pick(draft),0);
 const gas=sum(draft=>draft.gas),alcohol=sum(draft=>draft.alcohol),gasLiters=sum(draft=>draft.gasPrice>0?draft.gas/draft.gasPrice:0),alcoholLiters=sum(draft=>draft.alcoholPrice>0?draft.alcohol/draft.alcoholPrice:0),gasPriceBase=gasLiters>0?gas/gasLiters:0,alcoholPriceBase=alcoholLiters>0?alcohol/alcoholLiters:0;
 const totalKm=drafts.reduce((total,draft)=>total+draftDistance(draft),0),firstKmInitial=drafts.find(draft=>draft.kmInitial>0)?.kmInitial??0;
 return {date,mode:withFee.length>0?"withFee":net.length>0?"net":null,netFare:0,netApp:"",netCustomApp:"",revenueItems:withFee,netRevenueItems:net,gas,alcohol,gasPrice:gasPriceBase,alcoholPrice:alcoholPriceBase,fuelPurchases:drafts.flatMap(d=>d.fuelPurchases??[]),fuelType:[...drafts].reverse().find(d=>d.fuelType)?.fuelType??"gasoline",fullTank:false,kmInitial:firstKmInitial,kmFinal:firstKmInitial+totalKm,fuelConsumption:[...drafts].reverse().find(d=>d.fuelConsumption>0)?.fuelConsumption??0,hoursSegments:drafts.flatMap(d=>d.hoursSegments.filter(segment=>segment.start&&segment.end)),maintenanceItems:drafts.flatMap(d=>d.maintenanceItems),extras:drafts.flatMap(d=>d.extras)};
}
function draftFacts(draft:DraftState){
 const directNet=draft.mode==="net"&&draft.netFare>0?[{...createRevenueItem(),app:draft.netApp as RevenueAppName,nomeAppPersonalizado:draft.netApp==="Outro"?draft.netCustomApp.trim():"",bruto:draft.netFare,taxa:0}]:[];
 const revenueItems=[...draft.revenueItems.filter(item=>item.bruto>0),...(draft.netRevenueItems??[]).filter(item=>item.bruto>0),...directNet],revenue=summarizeRevenue(revenueItems);
 const gasPurchases=(draft.fuelPurchases??[]).filter(item=>item.type==="gasoline"),alcoholPurchases=(draft.fuelPurchases??[]).filter(item=>item.type==="alcohol");
 const gas=draft.gas+gasPurchases.reduce((total,item)=>total+toNumber(item.amount),0),alcohol=draft.alcohol+alcoholPurchases.reduce((total,item)=>total+toNumber(item.amount),0);
 const gasLiters=(draft.gasPrice>0?draft.gas/draft.gasPrice:0)+gasPurchases.reduce((total,item)=>total+(item.pricePerLiter>0?item.amount/item.pricePerLiter:0),0),alcoholLiters=(draft.alcoholPrice>0?draft.alcohol/draft.alcoholPrice:0)+alcoholPurchases.reduce((total,item)=>total+(item.pricePerLiter>0?item.amount/item.pricePerLiter:0),0),totalLiters=gasLiters+alcoholLiters,totalFuel=gas+alcohol,weightedPrice=totalLiters>0?totalFuel/totalLiters:0;
 const latestPurchase=[...(draft.fuelPurchases??[])].reverse().find(item=>item.amount>0&&item.pricePerLiter>0),preferredLegacyPrice=draft.fuelType==="ethanol"&&draft.alcohol>0&&draft.alcoholPrice>0?draft.alcoholPrice:draft.fuelType==="gasoline"&&draft.gas>0&&draft.gasPrice>0?draft.gasPrice:0,latestPrice=(latestPurchase?.pricePerLiter??preferredLegacyPrice)||(draft.alcohol>0&&draft.alcoholPrice>0?draft.alcoholPrice:0)||(draft.gas>0&&draft.gasPrice>0?draft.gasPrice:0);
 const km=Math.max(0,draft.kmFinal-draft.kmInitial),maintenance=normalizeMaintenance(draft.maintenanceItems),extras=normalizeExtras(draft.extras),maintenanceTotal=maintenance.reduce((total,item)=>total+toNumber(item.value),0),extrasTotal=extras.reduce((total,item)=>total+toNumber(item.value),0),hours=normalizeTimeSegments(draft.hoursSegments).reduce((total,segment)=>{const [sh,sm]=segment.start.split(":").map(Number),[eh,em]=segment.end.split(":").map(Number);let minutes=(eh*60+em)-(sh*60+sm);if(minutes<0)minutes+=1440;return total+minutes/60;},0);
 const fuelType:FuelType=alcoholLiters>gasLiters?"ethanol":draft.fuelType??"gasoline";
 return {revenueItems,revenue,gas,alcohol,gasPrice:gasLiters>0?gas/gasLiters:0,alcoholPrice:alcoholLiters>0?alcohol/alcoholLiters:0,gasLiters,alcoholLiters,totalLiters,totalFuel,weightedPrice,latestPrice,km,kmInitial:draft.kmInitial,kmFinal:draft.kmFinal,hours,maintenance,maintenanceTotal,extras,extrasTotal,fuelType};
}
function engineInput(draft:DraftState,facts:ReturnType<typeof draftFacts>){return {receitaLiquida:facts.revenue.liquido,horasTrabalhadas:facts.hours,kmInicial:facts.kmInitial,kmFinal:facts.kmFinal,valorAbastecido:facts.totalFuel,precoPorLitro:facts.latestPrice,manutencao:facts.maintenanceTotal,gastosExtras:facts.extrasTotal,tanqueCheio:Boolean(draft.fullTank),consumoPerfilKmL:draft.fuelConsumption,tipoCombustivel:facts.fuelType};}
function draftMetrics(draft:DraftState,providedCalculation?:FinancialCalculationResult,context:FinancialEngineContext={}){
 const facts=draftFacts(draft),calculation=providedCalculation??calculateFinancialMetrics(engineInput(draft,facts),context),expensesTotal=facts.revenue.taxaValor+calculation.custo_total_dia,totalCost=expensesTotal,profit=calculation.lucro_liquido_dia,costPerKm=facts.km>0?totalCost/facts.km:null,grossPerKm=facts.km>0?facts.revenue.bruto/facts.km:null,profitPerKm=facts.km>0?profit/facts.km:null;
 return {...facts,consumption:calculation.km_por_litro_aplicado,consumptionMode:calculation.modo_calculo_km_litro,consumed:calculation.litros_consumidos_rodagem,consumedCost:calculation.gasto_combustivel_rodagem,expensesTotal,totalCost,profit,costPerKm,grossPerKm,profitPerKm,calculation};
}
type DraftMetric = ReturnType<typeof draftMetrics>;
function calculateDraftChain(date:string,drafts:DraftState[],context:FinancialEngineContext={}){
 const facts=drafts.map(draftFacts),chain=recalculateDaySummary(drafts.map((draft,index)=>engineInput(draft,facts[index])),context),launchMetrics=drafts.map((draft,index)=>draftMetrics(draft,chain.lancamentos[index]));
 const metrics=draftMetrics(mergeDrafts(date,drafts),chain.acumuladoDia),km=chain.acumuladoDia.km_rodados,totalLiters=launchMetrics.reduce((total,item)=>total+item.totalLiters,0);
 return {launchMetrics,context:chain.contextoFinal,metrics:{...metrics,totalLiters,latestPrice:chain.contextoFinal.ultimoPrecoPorLitro,km,kmFinal:metrics.kmInitial+km,consumption:chain.acumuladoDia.km_por_litro_aplicado,consumptionMode:chain.acumuladoDia.modo_calculo_km_litro,consumed:chain.acumuladoDia.litros_consumidos_rodagem,consumedCost:chain.acumuladoDia.gasto_combustivel_rodagem,costPerKm:km>0?metrics.totalCost/km:null,grossPerKm:km>0?metrics.revenue.bruto/km:null,profitPerKm:km>0?metrics.profit/km:null} as DraftMetric};
}
function aggregateDraftMetrics(date:string,drafts:DraftState[],context:FinancialEngineContext={}):DraftMetric{return calculateDraftChain(date,drafts,context).metrics;}
function profitFromMetrics(metrics:DraftMetric){return metrics.profit;}
function draftFinancialSummary(draft:DraftState,providedMetrics?:DraftMetric){
 const metrics=providedMetrics??draftMetrics(draft);
 return {profit:metrics.profit,fuelConsumedLiters:metrics.consumed,fuelConsumedCost:metrics.consumedCost,fuelPurchasedLiters:metrics.totalLiters,fuelPurchasedCost:metrics.totalFuel};
}

function formatKm(v:number){return v.toLocaleString("pt-BR",{maximumFractionDigits:1});}
function formatCostPerKm(v:number|null){return v===null?"—":`${formatBRL(v)} / km`;}
function formatLiters(v:number){return v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:3});}
function formatPercent(v:number){return `${v.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}%`;}
function DisclosureChevron(){return <span aria-hidden="true" className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-transform duration-200 ease-out group-open:rotate-180"><svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 8 4 4 4-4"/></svg></span>}
export default function EntryForm({initialDate=hojeBrasilia(),initialMonthProfit=0,userId}:Props){
 const [mode,setMode]=useState<Mode|null>(null),[date,setDate]=useState(initialDate),[netFare,setNetFare]=useState(0),[netApp,setNetApp]=useState<RevenueAppName|"">(""),[netCustomApp,setNetCustomApp]=useState(""),[revenueItems,setRevenueItems]=useState<RevenueItem[]>([]),[netRevenueItems,setNetRevenueItems]=useState<RevenueItem[]>([]),[gas,setGas]=useState(0),[alcohol,setAlcohol]=useState(0),[gasPrice,setGasPrice]=useState(0),[alcoholPrice,setAlcoholPrice]=useState(0),[fuelPurchases,setFuelPurchases]=useState<FuelPurchase[]>([]),[fuelType,setFuelType]=useState<FuelType>("gasoline"),[fullTank,setFullTank]=useState(false),[kmInitial,setKmInitial]=useState(0),[kmFinal,setKmFinal]=useState(0),[fuelConsumption,setFuelConsumption]=useState(0),[hoursSegments,setHoursSegments]=useState<TimeSegment[]>([{start:"",end:""}]),[maintenanceItems,setMaintenanceItems]=useState<MaintenanceItem[]>([]),[extras,setExtras]=useState<{name:string;value:number}[]>([]),[monthProfit,setMonthProfit]=useState(initialMonthProfit),[status,setStatus]=useState(""),[savedCard,setSavedCard]=useState<SavedCard|null>(null),[savedLaunches,setSavedLaunches]=useState<LaunchRecord[]>([]),[editingLaunchId,setEditingLaunchId]=useState<string|null>(null),[dayClosed,setDayClosed]=useState(false),[draftReady,setDraftReady]=useState(false),[initialEngineContext,setInitialEngineContext]=useState<FinancialEngineContext>({});
 const launchesKey=(day:string)=>scopedStorageKey(userId,`lancamentos-dia:${day}`),openDayKey=(day:string)=>scopedStorageKey(userId,`dia-aberto:${day}`),closedDayKey=(day:string)=>scopedStorageKey(userId,`dia-fechado:${day}`),reopenHistoryKey=(day:string)=>scopedStorageKey(userId,`dia-reaberto:${day}`),nextLaunchNumberKey=scopedStorageKey(userId,"proximo-numero-lancamento"),vehicleProfileKey=scopedStorageKey(userId,"perfil-consumo-veiculo:v1");

 function resetForm(){
  setMode(null); setNetApp(""); setNetCustomApp(""); setNetFare(0);
  setRevenueItems([]); setNetRevenueItems([]);
  setGas(0); setAlcohol(0); setGasPrice(0); setAlcoholPrice(0); setFuelPurchases([]); setFuelType("gasoline"); setFullTank(false);
  setKmInitial(0); setKmFinal(0); setFuelConsumption(0);
 setHoursSegments([{start:"",end:""}]); setMaintenanceItems([]); setExtras([]);
 }

 function currentDraft():DraftState{return {date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,fuelType,fullTank,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras};}
 function persistLaunches(next:LaunchRecord[]){window.localStorage.setItem(launchesKey(date),JSON.stringify(next));setSavedLaunches(next);}
 function persistVehicleProfile(drafts:DraftState[]){
  const nextContext=calculateDraftChain(date,drafts.filter(draftHasData),initialEngineContext).context;
  try {
   const raw=window.localStorage.getItem(vehicleProfileKey),stored=raw?JSON.parse(raw) as StoredVehicleProfile:null;
   if(stored?.sourceDate&&stored.sourceDate>date)return;
   window.localStorage.setItem(vehicleProfileKey,JSON.stringify({...nextContext,sourceDate:date,baseContext:engineContextOnly(initialEngineContext)} satisfies StoredVehicleProfile));
  } catch { /* o perfil é um apoio; os lançamentos continuam salvos */ }
 }
 function loadLaunchIntoForm(record:LaunchRecord){
  try { window.localStorage.removeItem(openDayKey(date)); } catch { /* descarta alterações não salvas */ }
  const draft=record.draft;
  setSavedCard(null);
  setEditingLaunchId(record.id);setMode(draft.mode);setNetFare(draft.netFare);setNetApp(draft.netApp);setNetCustomApp(draft.netCustomApp);setRevenueItems(draft.revenueItems??[]);setNetRevenueItems(draft.netRevenueItems??[]);setGas(draft.gas||0);setAlcohol(draft.alcohol||0);setGasPrice(draft.gasPrice||0);setAlcoholPrice(draft.alcoholPrice||0);setFuelPurchases(draft.fuelPurchases??[]);setFuelType(draft.fuelType??"gasoline");setFullTank(Boolean(draft.fullTank));setKmInitial(draft.kmInitial||0);setKmFinal(draft.kmFinal||0);setFuelConsumption(draft.fuelConsumption||0);setHoursSegments(draft.hoursSegments?.length?draft.hoursSegments:[{start:"",end:""}]);setMaintenanceItems(draft.maintenanceItems??[]);setExtras(draft.extras??[]);setStatus("Rascunho aberto para editar. Depois de editar, salve o lançamento.");
 }

 function restoreDraft(selectedDate:string){
  let draft:Partial<DraftState>={};
  let launches:LaunchRecord[]=[];
  let closed=false;
  try {
   const raw=window.localStorage.getItem(openDayKey(selectedDate));
   if(raw)draft=JSON.parse(raw) as DraftState;
   const rawLaunches=window.localStorage.getItem(launchesKey(selectedDate));
   if(rawLaunches)launches=JSON.parse(rawLaunches) as LaunchRecord[];
   closed=window.localStorage.getItem(closedDayKey(selectedDate))==="1";
   const rawProfile=window.localStorage.getItem(vehicleProfileKey);
   if(rawProfile){const profile=JSON.parse(rawProfile) as StoredVehicleProfile;setInitialEngineContext(profile.sourceDate<selectedDate?engineContextOnly(profile):profile.sourceDate===selectedDate?engineContextOnly(profile.baseContext??{}):{});}else setInitialEngineContext({});
  } catch { setInitialEngineContext({}); /* rascunho inválido: inicia um dia limpo */ }
  const selectedLaunches=launches.filter(record=>record.date===selectedDate);
  setDate(selectedDate); setSavedLaunches(selectedLaunches); setDayClosed(closed); setEditingLaunchId(null); resetForm(); setMode(draft.mode??null); setNetFare(draft.netFare||0); setNetApp(draft.netApp||""); setNetCustomApp(draft.netCustomApp||""); setRevenueItems(draft.revenueItems||[]); setNetRevenueItems(draft.netRevenueItems||[]); setGas(draft.gas||0); setAlcohol(draft.alcohol||0); setGasPrice(draft.gasPrice||0); setAlcoholPrice(draft.alcoholPrice||0); setFuelPurchases(draft.fuelPurchases||[]); setFuelType(draft.fuelType??"gasoline"); setFullTank(Boolean(draft.fullTank)); setKmInitial(draft.kmInitial||0); setKmFinal(draft.kmFinal||0); setFuelConsumption(draft.fuelConsumption||0); setHoursSegments(draft.hoursSegments?.length?draft.hoursSegments:[{start:"",end:""}]); setMaintenanceItems(draft.maintenanceItems||[]); setExtras(draft.extras||[]); setSavedCard(null);
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
  const hasDraftData=netFare>0||netCustomApp.trim()!==""||revenueItems.some(item=>item.bruto>0||item.taxa>0||item.nomeAppPersonalizado.trim()!=="")||netRevenueItems.length>0||gas>0||alcohol>0||gasPrice>0||alcoholPrice>0||fuelPurchases.length>0||fullTank||kmInitial>0||kmFinal>0||fuelConsumption>0||hoursSegments.some(segment=>segment.start!==""||segment.end!=="")||maintenanceItems.length>0||extras.length>0;
  if(!hasDraftData)return;
  const draft:DraftState={date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,fuelType,fullTank,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras};
  try { window.localStorage.setItem(openDayKey(date),JSON.stringify(draft)); }
  catch { setStatus("Não foi possível salvar o rascunho neste aparelho."); }
 },[draftReady,dayClosed,date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,fuelType,fullTank,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras]);

 function hoursFromSegments(){ return hoursSegments.reduce((total,segment)=>{ if(!segment.start||!segment.end)return total; const [sh,sm]=segment.start.split(":").map(Number); const [eh,em]=segment.end.split(":").map(Number); let minutes=(eh*60+em)-(sh*60+sm); if(minutes<0)minutes+=1440; return total+minutes/60; },0); }
 const hours=hoursFromSegments();
 function updateSegment(index:number,patch:Partial<TimeSegment>){setHoursSegments(items=>items.map((item,i)=>i===index?{...item,...patch}:item));}
 function addSegment(){setHoursSegments(items=>[...items,{start:"",end:""}]);}
 function removeSegment(index:number){setHoursSegments(items=>items.length>1?items.filter((_,i)=>i!==index):[{start:"",end:""}]);}
 function updateVehicleConsumption(value:number){
  setFuelConsumption(value);
 }
 function addFuelPurchase(){setFuelPurchases(items=>[...items,{id:`fuel-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type:"gasoline",amount:0,pricePerLiter:0}]);}
 function updateFuelPurchase(id:string,patch:Partial<FuelPurchase>){setFuelPurchases(items=>items.map(item=>item.id===id?{...item,...patch}:item));}
 function removeFuelPurchase(id:string){setFuelPurchases(items=>items.filter(item=>item.id!==id));}
 function saveDraft():boolean{
  if(dayClosed){setStatus("Este dia já foi fechado. Os lançamentos estão somente para leitura.");return false;}
  const rawDraft=currentDraft(),validationError=validateDraftBeforeSave(rawDraft);
  if(validationError){setStatus(`❌ ${validationError}`);return false;}
  const draft=normalizeDraftForSave(rawDraft);
  if(!draftHasData(draft)){setStatus("Nenhum dado preenchido para salvar.");return false;}
  try {
   window.localStorage.setItem(openDayKey(date),JSON.stringify(draft));
   const nextNumber=Number(window.localStorage.getItem(nextLaunchNumberKey)||"1");
   const record:LaunchRecord={id:editingLaunchId??`launch-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,number:editingLaunchId?(savedLaunches.find(item=>item.id===editingLaunchId)?.number??nextNumber):nextNumber,date,createdAt:new Date().toISOString(),draft};
   if(!editingLaunchId)window.localStorage.setItem(nextLaunchNumberKey,String(nextNumber+1));
   const next=editingLaunchId?savedLaunches.map(item=>item.id===editingLaunchId?record:item):[...savedLaunches,record];
   persistLaunches(next);
   persistVehicleProfile(next.map(item=>item.draft));
   window.localStorage.removeItem(openDayKey(date));
   setEditingLaunchId(null);
   resetForm();
   setStatus(editingLaunchId?`✅ Registro #${String(record.number).padStart(3,"0")} atualizado.`:"✅ Dia salvo. Registro criado para um novo lançamento.");
   return true;
  } catch { setStatus("❌ Não foi possível salvar o dia neste aparelho.");return false; }
 }

 function removeLaunch(record:LaunchRecord){
  if(dayClosed){setStatus("Este dia já foi fechado. Os lançamentos estão somente para leitura.");return;}
  if(!window.confirm(`Remover o registro #${String(record.number).padStart(3,"0")}? O resumo do dia será recalculado.`))return;
  try {
   const next=savedLaunches.filter(item=>item.id!==record.id);
   persistLaunches(next);persistVehicleProfile(next.map(item=>item.draft));
   if(editingLaunchId===record.id){setEditingLaunchId(null);resetForm();}
   setSavedCard(null);setStatus(`✅ Registro #${String(record.number).padStart(3,"0")} removido. Resumo recalculado.`);
  } catch { setStatus("❌ Não foi possível remover este lançamento."); }
 }

 function reopenDay(){
  if(!dayClosed)return;
  if(!window.confirm("Deseja reabrir este dia para adicionar ou editar lançamentos?"))return;
  try {
   const key=reopenHistoryKey(date);
   let history:DayReopenRecord[]=[];
   const raw=window.localStorage.getItem(key);
   if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))history=parsed as DayReopenRecord[];}
   history.push({at:new Date().toISOString()});
   window.localStorage.setItem(key,JSON.stringify(history));
  } catch { /* o histórico é opcional; a reabertura ainda pode prosseguir */ }
  try {
   window.localStorage.removeItem(closedDayKey(date));
   setDayClosed(false);setEditingLaunchId(null);setStatus("Dia reaberto. Você pode adicionar ou editar lançamentos.");
  } catch { setStatus("❌ Não foi possível reabrir este dia neste aparelho."); }
 }



 const revenueSummary=useMemo(()=>summarizeRevenue(revenueItems),[revenueItems]);
 const additionalNetRevenue=netRevenueItems.reduce((total,item)=>total+toNumber(item.bruto),0);
 const fareNet=revenueSummary.liquido+netFare+additionalNetRevenue;
 const feeAmount=revenueSummary.taxaValor;
 const extrasSum=extras.reduce((a,e)=>a+toNumber(e.value),0);
 const maintenanceTotal=maintenanceItems.reduce((a,m)=>a+toNumber(m.value),0);
 const savedDrafts=useMemo(()=>savedLaunches.map(record=>record.draft).filter(draftHasData),[savedLaunches]);
 const savedChain=useMemo(()=>calculateDraftChain(date,savedDrafts,initialEngineContext),[date,savedDrafts,initialEngineContext]);
 const savedMetrics=savedChain.launchMetrics;
 const displaySavedMetrics=savedMetrics;
 const editingIndex=editingLaunchId?savedLaunches.findIndex(record=>record.id===editingLaunchId):-1;
 const draftsBeforeCurrent=editingIndex>=0?savedLaunches.slice(0,editingIndex).map(record=>record.draft).filter(draftHasData):savedDrafts;
 const currentContext=calculateDraftChain(date,draftsBeforeCurrent,initialEngineContext).context;
 const currentMetrics=draftMetrics(currentDraft(),undefined,currentContext);
 const kmDriven=currentMetrics.km;
 const totalGasExpense=currentMetrics.gas;
 const totalAlcoholExpense=currentMetrics.alcohol;
 const gasLiters=currentMetrics.gasLiters;
 const alcoholLiters=currentMetrics.alcoholLiters;
 const totalPurchasedLiters=gasLiters+alcoholLiters;
 const totalFuelPurchase=totalGasExpense+totalAlcoholExpense;
 const weightedFuelPrice=currentMetrics.weightedPrice;
 const informedFuelConsumption=currentMetrics.consumption;
 const hasCurrentLaunch=fareNet!==0||totalFuelPurchase!==0||maintenanceTotal!==0||extrasSum!==0||fullTank||kmDriven>0||fuelConsumption>0||hours>0;
 const percentageBaseValue=revenueSummary.bruto+netFare+additionalNetRevenue;
 const dailyDrafts=useMemo(()=>{if(!hasCurrentLaunch)return savedDrafts;const draft=currentDraft();return editingIndex>=0?savedLaunches.map((record,index)=>index===editingIndex?draft:record.draft).filter(draftHasData):[...savedDrafts,draft];},[hasCurrentLaunch,savedDrafts,savedLaunches,editingIndex,date,mode,netFare,netApp,netCustomApp,revenueItems,netRevenueItems,gas,alcohol,gasPrice,alcoholPrice,fuelPurchases,fuelType,fullTank,kmInitial,kmFinal,fuelConsumption,hoursSegments,maintenanceItems,extras]);
 const dailyMetrics=useMemo(()=>aggregateDraftMetrics(date,dailyDrafts,initialEngineContext),[date,dailyDrafts,initialEngineContext]);
 const dailyRevenue=dailyMetrics.revenue.liquido;
 const dailyRevenueBase=dailyMetrics.revenue.bruto;
 const dailyKm=dailyMetrics.km;
 const dailyHours=dailyMetrics.hours;
 const dailyConsumed=dailyMetrics.consumed;
 const dailyConsumedCost=dailyMetrics.consumedCost;
 const dailyExpenses=dailyMetrics.expensesTotal;
 const dailyProfit=dailyMetrics.profit;
 const dailyCostPerKm=dailyMetrics.costPerKm;
 const dailyGrossPerKm=dailyMetrics.grossPerKm;
 const dailyProfitPerKm=dailyMetrics.profitPerKm;
 const dailyConsumption=dailyMetrics.consumption;
 const dailyConsumptionMode=dailyMetrics.consumptionMode;
 const visibleProfit=savedCard&&!hasCurrentLaunch?savedCard.profit:dailyProfit,visibleKm=savedCard&&!hasCurrentLaunch?savedCard.km:dailyKm,visibleProfitPerKm=savedCard&&!hasCurrentLaunch?savedCard.profitPerKm:dailyProfitPerKm,visibleRevenuePerKm=savedCard&&!hasCurrentLaunch?savedCard.revenueBase/Math.max(savedCard.km,1):dailyGrossPerKm,visibleCostPerKm=savedCard&&!hasCurrentLaunch?savedCard.costPerKm:dailyCostPerKm,visibleHours=savedCard&&!hasCurrentLaunch?savedCard.hours:dailyHours,visibleRevenueBase=savedCard&&!hasCurrentLaunch?savedCard.revenueBase:dailyRevenueBase;
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
  if(dayClosed){setStatus("Este dia já foi fechado. Os lançamentos estão somente para leitura.");return;}
  const rawDraft=currentDraft(),validationError=validateDraftBeforeSave(rawDraft);
  if(validationError){setStatus(`❌ ${validationError}`);return;}
  const draftBeingSubmitted=normalizeDraftForSave(rawDraft);
  const recordsToClose=savedLaunches.map(record=>normalizeDraftForSave(record.draft)).filter(draft=>draftHasData(draft));
  if(editingLaunchId){const index=savedLaunches.findIndex(record=>record.id===editingLaunchId);if(index>=0&&draftHasData(draftBeingSubmitted))recordsToClose[index]=draftBeingSubmitted;}
  else if(draftHasData(draftBeingSubmitted))recordsToClose.push(draftBeingSubmitted);
  const consolidated=aggregateDraftMetrics(date,recordsToClose,initialEngineContext);
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
  if(draftHasData(draftBeingSubmitted)&&consolidated.km<=0){setStatus("ℹ️ Informe o KM inicial e o KM final para calcular a distância e o consumo.");return;}
  if(draftHasData(draftBeingSubmitted)&&consolidated.km>0&&consolidated.consumption<=0){setStatus("ℹ️ Informe o consumo médio ou informe o valor abastecido e o preço por litro para calcular o consumo automaticamente.");return;}
  setStatus("Salvando...");
  const payload={date,gross_amount:consolidated.revenue.bruto,fee_percent:consolidated.revenue.taxaPercentual,net_fare:consolidated.revenue.liquido,revenue_details:consolidated.revenueItems,gas_expense:consolidated.gas,alcohol_expense:consolidated.alcohol,gasoline_price_per_liter:consolidated.gasPrice,alcohol_price_per_liter:consolidated.alcoholPrice,gasoline_liters:consolidated.gasLiters,alcohol_liters:consolidated.alcoholLiters,fuel_price_per_liter_current:consolidated.latestPrice,km_initial:consolidated.kmInitial,km_final:consolidated.kmFinal,km_driven:consolidated.km,hours_worked:consolidated.hours,fuel_consumption_km_per_liter:consolidated.consumption,fuel_consumed_liters:consolidated.consumed,fuel_consumed_cost:consolidated.consumedCost,maintenance_expense:consolidated.maintenanceTotal,maintenance_details:consolidated.maintenance,extra_expenses:consolidated.extras};
  const res=await saveEntry(payload);
  if(res.success){window.localStorage.removeItem(openDayKey(date));window.localStorage.setItem(closedDayKey(date),"1");persistVehicleProfile(recordsToClose);setDayClosed(true);setEditingLaunchId(null);setStatus("✅ Dia registrado e fechado com sucesso!");if(typeof res.monthProfit==="number")setMonthProfit(res.monthProfit);const consolidatedProfit=profitFromMetrics(consolidated);setSavedCard({profit:consolidatedProfit,km:consolidated.km,hours:consolidated.hours,profitPerKm:consolidated.profitPerKm,revenuePerKm:consolidated.grossPerKm,costPerKm:consolidated.costPerKm,revenueBase:consolidated.revenue.bruto});resetForm();}else setStatus(`❌ Erro: ${res.error}`);
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
   <div><label className="label">Média de consumo do veículo (km/L)</label><input type="number" inputMode="decimal" step="0.1" min="0" className="input" value={fuelConsumption||""} onChange={e=>updateVehicleConsumption(toNumber(e.target.value))} placeholder="Ex.: 10 km/L"/><p className="mt-1 text-xs text-slate-500">Se informada, esta média será herdada pelos próximos lançamentos. Entre dois registros de tanque cheio, o cálculo exato terá prioridade.</p></div></div></details>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">⛽ Combustível <span className="ml-1 text-xs font-normal text-slate-500">{(gas>0?1:0)+(alcohol>0?1:0)+fuelPurchases.filter(item=>item.amount>0).length} lanç.</span></span><span className="flex items-center"><strong className="text-sm text-slate-700">{formatBRL(totalFuelPurchase)}</strong><DisclosureChevron/></span></summary><div className="space-y-2 border-t border-slate-100 p-3">
   <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2"><div><label className="label">Combustível de referência</label><select className="input" value={fuelType} onChange={e=>setFuelType(e.target.value as FuelType)}><option value="gasoline">Gasolina</option><option value="ethanol">Etanol</option></select><p className="mt-1 text-xs text-slate-500">Usado apenas na estimativa inicial sem histórico.</p></div><label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200 bg-white p-3"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={fullTank} onChange={e=>setFullTank(e.target.checked)}/><span><strong className="block text-sm text-slate-800">Completei o tanque</strong><span className="mt-1 block text-xs text-slate-500">A partir do segundo tanque cheio, o app calcula o km/L exato entre os abastecimentos.</span></span></label></div>
   <details className="rounded-lg border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm"><span className="font-medium text-slate-700">Gasolina{gasPrice>0?` · ${formatBRL(gasPrice)}/L`:""}</span><strong>{formatBRL(gas)}</strong></summary><div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-2"><div><label className="label">Preço/L (R$)</label><input type="number" step="0.001" min="0" className="input" value={gasPrice||""} onChange={e=>setGasPrice(toNumber(e.target.value))} placeholder="6,19"/></div><div><label className="label">Abastecido (R$)</label><input type="number" step="0.01" min="0" className="input" value={gas||""} onChange={e=>setGas(toNumber(e.target.value))} placeholder="100,00"/></div></div></details>
   <details className="rounded-lg border border-slate-200"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm"><span className="font-medium text-slate-700">Álcool{alcoholPrice>0?` · ${formatBRL(alcoholPrice)}/L`:""}</span><strong>{formatBRL(alcohol)}</strong></summary><div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-2"><div><label className="label">Preço/L (R$)</label><input type="number" step="0.001" min="0" className="input" value={alcoholPrice||""} onChange={e=>setAlcoholPrice(toNumber(e.target.value))} placeholder="4,39"/></div><div><label className="label">Abastecido (R$)</label><input type="number" step="0.01" min="0" className="input" value={alcohol||""} onChange={e=>setAlcohol(toNumber(e.target.value))} placeholder="80,00"/></div></div></details>
    {fuelPurchases.map((purchase,index)=><details key={purchase.id} open={index===fuelPurchases.length-1?true:undefined} className="rounded-lg border border-slate-200 bg-slate-50/70"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm"><span className="truncate font-medium text-slate-700">{purchase.type==="gasoline"?"Gasolina":"Álcool"}{purchase.pricePerLiter>0?` · ${formatBRL(purchase.pricePerLiter)}/L`:""}</span><strong>{formatBRL(purchase.amount)}</strong></summary><div className="space-y-3 border-t border-slate-200 p-3">
     <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-600">Abastecimento {index+1}</span><button type="button" onClick={()=>removeFuelPurchase(purchase.id)} className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">Remover</button></div>
     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div><label className="label">Combustível</label><select className="input" value={purchase.type} onChange={e=>updateFuelPurchase(purchase.id,{type:e.target.value as FuelPurchase["type"]})}><option value="gasoline">Gasolina</option><option value="alcohol">Álcool</option></select></div><div><label className="label">Preço por litro (R$)</label><input type="number" step="0.001" min="0" className="input" value={purchase.pricePerLiter||""} onChange={e=>updateFuelPurchase(purchase.id,{pricePerLiter:toNumber(e.target.value)})} placeholder="Ex.: 5,89"/></div><div><label className="label">Valor abastecido (R$)</label><input type="number" step="0.01" min="0" className="input" value={purchase.amount||""} onChange={e=>updateFuelPurchase(purchase.id,{amount:toNumber(e.target.value)})} placeholder="Ex.: 50,00"/></div></div>
     {purchase.amount>0&&purchase.pricePerLiter>0&&<p className="text-xs font-semibold text-emerald-700">{formatLiters(purchase.amount/purchase.pricePerLiter)} L neste abastecimento</p>}
    </div></details>)}
    <button type="button" onClick={addFuelPurchase} className="btn btn-secondary w-full">+ Adicionar novo abastecimento</button>
    {fuelPurchases.length>0&&<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-emerald-700">Total abastecido no dia</span><strong className="text-sm text-emerald-800">{formatBRL(totalFuelPurchase)}</strong></div><p className="mt-1 text-xs text-emerald-700">{formatLiters(totalPurchasedLiters)} L · preço médio {formatBRL(weightedFuelPrice)}/L</p></div>}
   </div></details>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">🔧 Manutenção <span className="ml-1 text-xs font-normal text-slate-500">{maintenanceItems.length} lanç.</span></span><span className="flex items-center"><strong className="text-sm text-slate-700">{formatBRL(maintenanceTotal)}</strong><DisclosureChevron/></span></summary><div className="border-t border-slate-100 p-3"><MaintenanceExpenses items={maintenanceItems} onChange={setMaintenanceItems}/></div></details>
  <details className="group rounded-xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-bold text-slate-800">🧾 Gastos extras <span className="ml-1 text-xs font-normal text-slate-500">{extras.length} lanç.</span></span><span className="flex items-center"><strong className="text-sm text-slate-700">{formatBRL(extrasSum)}</strong><DisclosureChevron/></span></summary><div className="border-t border-slate-100 p-3"><ExtraExpenses extras={extras} onChange={setExtras}/></div></details>
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><SaveLaunchButton onSave={saveDraft} disabled={dayClosed}/><button type="submit" className="btn btn-primary w-full">Registrar e fechar dia</button></div>{status&&<p className={"text-sm text-center " + (status.startsWith("Dia reaberto.")?"rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-bold text-emerald-700":editingLaunchId?"font-bold text-amber-700":"text-slate-600")}>{status}</p>}
 </fieldset></form>
 {dayClosed&&<div className="order-2 -mt-2 flex justify-center"><button type="button" onClick={reopenDay} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-extrabold text-amber-800 transition hover:bg-amber-100">Reabrir dia</button></div>}
 <section className="order-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="Lançamentos do dia aberto">
  <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-800">Lançamentos salvos</p><p className="text-xs text-slate-500">{dayClosed?"Dia fechado · somente leitura":"Use o botão editar para alterar um registro"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{savedLaunches.length}</span></div>
  {savedLaunches.length===0?<p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">Nenhum lançamento salvo ainda.</p>:<div className="mt-3 space-y-2">{savedLaunches.slice().sort((a,b)=>a.number-b.number).map(record=>{const recordIndex=savedLaunches.findIndex(item=>item.id===record.id),summary=draftFinancialSummary(record.draft,displaySavedMetrics[recordIndex]),created=new Date(record.createdAt),isEditing=editingLaunchId===record.id,fuelText=summary.fuelConsumedLiters>0?`Combustível gasto ${formatLiters(summary.fuelConsumedLiters)} L (${formatBRL(summary.fuelConsumedCost)})`:summary.fuelPurchasedLiters>0?`Combustível abastecido ${formatLiters(summary.fuelPurchasedLiters)} L (${formatBRL(summary.fuelPurchasedCost)})`:"Combustível gasto —";return <div key={record.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-slate-800">#{String(record.number).padStart(3,"0")}</strong><div className="flex flex-wrap items-center justify-end gap-2"><span className="text-xs font-medium text-slate-500">{created.toLocaleDateString("pt-BR")} · {created.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span><button type="button" disabled={dayClosed} onClick={()=>isEditing?saveDraft():loadLaunchIntoForm(record)} className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">{isEditing?"salvar":"editar"}</button><button type="button" disabled={dayClosed} onClick={()=>removeLaunch(record)} className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">remover</button></div></div><p className="mt-1 text-xs text-slate-600">Lucro líquido <span className="inline-flex items-center gap-1 font-bold"><span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + (summary.profit<0?"bg-red-600":"bg-emerald-600")}></span><span className={summary.profit<0?"text-red-600":"text-emerald-600"}>{formatBRL(summary.profit)}</span></span> · {fuelText}</p></div>})}</div>}
 </section>
 <div className="sticky top-2 z-10 order-1">
  <section className={"rounded-xl border p-3 shadow-md backdrop-blur-sm " + (summaryTone==="profit"?"border-emerald-200 bg-emerald-50/95":summaryTone==="loss"?"border-red-200 bg-red-50/95":"border-amber-200 bg-amber-50/95")} aria-live="polite" aria-label="Resumo financeiro diário">
   <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
     <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">RESUMO DIÁRIO</p><span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-slate-600 shadow-sm">{savedLaunches.length} {savedLaunches.length===1?"lançamento salvo":"lançamentos salvos"}</span></div>
     <p className="mt-0.5 text-[11px] text-slate-500">{savedLaunches.length>0?(hasCurrentLaunch?"Valores acumulados dos lançamentos salvos + lançamento atual em tempo real":"Valores acumulados dos lançamentos salvos"):hasCurrentLaunch?"Valores do lançamento atual em tempo real":"Nenhum lançamento salvo ainda"}</p>
     <div className="mt-0.5 flex items-baseline gap-2">
      <p className={"text-2xl font-black tracking-tight sm:text-3xl " + (summaryTone==="profit"?"text-emerald-700":summaryTone==="loss"?"text-red-700":"text-amber-700")}>{formatBRL(visibleProfit)}</p>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">LUCRO LÍQUIDO</span>
     </div>
    </div>
    {profitPercent!==null&&<span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-black " + (summaryTone==="profit"?"bg-emerald-100 text-emerald-800":summaryTone==="loss"?"bg-red-100 text-red-800":"bg-amber-100 text-amber-800")}>{summaryTone==="profit"?"↗":summaryTone==="loss"?"↘":"•"} {formatPercent(Math.abs(profitPercent))}<span className="ml-1 text-[9px] font-bold uppercase tracking-wide">MARGEM</span></span>}
   </div>
   <div className="mt-2 grid grid-cols-1 gap-2 border-t border-slate-200/80 pt-2 sm:grid-cols-4 sm:divide-x sm:divide-slate-200/80">
    <div className="sm:pr-2">
     <p className="text-sm font-semibold leading-snug text-slate-700"><span className="mr-1 text-sm">↗</span><strong className="font-black text-slate-900">{formatBRL(visibleRevenuePerKm??0)}</strong> ganho por cada KM rodado</p>
    </div>
     <div className="sm:px-2">
     <p className="text-sm font-semibold leading-snug text-slate-700"><span className="mr-1 text-sm">💸</span><strong className="font-black text-slate-900">{formatBRL(Math.abs(visibleCostPerKm??0))}</strong> de custo total por cada KM rodado</p>
    </div>
    <div className="sm:pl-2"><p className="text-sm font-semibold leading-snug text-slate-700">{dailyConsumptionMode==="exato_tanque_cheio"?<>O consumo exato calculado entre tanques cheios é de <strong className="font-black text-slate-900">{formatKm(dailyConsumption)} km/L</strong></>:dailyConsumptionMode==="media_perfil"?<>Seu carro faz a média de <strong className="font-black text-slate-900">{formatKm(dailyConsumption)} km/L</strong></>:<>Estimativa inicial de <strong className="font-black text-slate-900">{formatKm(dailyConsumption)} km/L</strong></>}</p></div>
    <div className="sm:pl-2"><p className="text-sm font-semibold leading-snug text-slate-700"><strong className="font-black text-slate-900">{formatBRL(Math.abs(dailyProfitPerKm??0))}</strong> de lucro por cada KM rodado</p></div>
   </div>
   {visibleHours>0&&<div className="mt-2 flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs"><span className="font-semibold text-slate-500">{visibleHours.toLocaleString("pt-BR",{maximumFractionDigits:2})} h trabalhadas</span><strong className={visibleProfit<0?"text-red-700":"text-emerald-700"}>{formatBRL(visibleProfit/visibleHours)}/h</strong></div>}
   <details className="group mt-2 border-t border-slate-200/80 pt-2"><summary className="flex cursor-pointer list-none items-center justify-center text-[10px] font-bold uppercase tracking-wide text-slate-600">Ver balanço completo <DisclosureChevron/></summary><div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><p className="text-slate-500">Você percorreu</p><strong className="text-slate-800">{formatKm(visibleKm)} km</strong></div><div><p className="text-slate-500">Consumo médio</p><strong>{dailyConsumption>0?`${formatKm(dailyConsumption)} km/L`:"—"}</strong></div><div><p className="text-slate-500">Custo por KM</p><strong>{formatCostPerKm(dailyCostPerKm)}</strong></div><div><p className="text-slate-500">Ganho por KM</p><strong>{formatCostPerKm(dailyGrossPerKm)}</strong></div><div><p className="text-slate-500">Lucro por KM</p><strong>{formatCostPerKm(dailyProfitPerKm)}</strong></div><div><p className="text-slate-500">Lucro líquido</p><strong className={dailyProfit<0?"text-red-700":"text-emerald-700"}>{formatBRL(dailyProfit)}</strong></div></div></details>
  </section>
 </div>
 {savedCard&&<CardDeLucro profit={savedCard.profit} km={savedCard.km} profitPerHour={savedCard.hours>0?savedCard.profit/savedCard.hours:null} profitPerKm={savedCard.profitPerKm} costPerKm={savedCard.costPerKm} onClose={()=>setSavedCard(null)}/>}</div>;
}