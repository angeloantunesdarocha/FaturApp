"use server";

import { cookies } from "next/headers";
import { createClientServer } from "@/lib/supabase";
import { clearSessionCookie, requireUser, setSessionCookie } from "@/lib/auth";
import { summarizeRevenue, type RevenueItem } from "@/lib/revenue";
import { type ExtraExpense, type MaintenanceItem } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SaveEntryInput = {
  date: string;
  gross_amount: number | null;
  fee_percent: number | null;
  net_fare: number | null;
  revenue_details?: RevenueItem[];
  gas_expense: number;
  alcohol_expense: number;
  gasoline_price_per_liter: number;
  alcohol_price_per_liter: number;
  gasoline_liters: number;
  alcohol_liters: number;
  km_initial: number;
  km_final: number;
  km_driven: number;
  hours_worked: number;
  fuel_consumption_km_per_liter?: number;
  fuel_consumed_liters?: number;
  fuel_consumed_cost?: number;
  fuel_remaining_liters?: number;
  fuel_remaining_value?: number;
  maintenance_expense: number;
  maintenance_details: MaintenanceItem[];
  extra_expenses: ExtraExpense[];
};

function sessionToken() { return cookies().get("faturapp_session")?.value ?? null; }
function validatePassword(password: string) { return password.length >= 4 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password); }
export async function loginUser(login: string, password: string) { if (!login.trim() || !password) return { success: false, error: "Informe login e senha." }; const supabase = createClientServer(); const { data, error } = await supabase.rpc("app_login", { p_login: login, p_password: password }); if (error) { console.error("Erro Supabase login:", error); return { success: false, error: "Erro ao validar acesso. Tente novamente." }; } if (!data?.[0]) return { success: false, error: "Login ou senha incorretos." }; setSessionCookie(data[0].session_token); return { success: true }; }
export async function registerUser(login: string, password: string) { const normalized = login.trim(); if (!normalized) return { success: false, error: "Informe um login." }; if (normalized.length > 120) return { success: false, error: "O login deve ter no máximo 120 caracteres." }; if (!validatePassword(password)) return { success: false, error: "A senha deve ter no mínimo 4 caracteres, uma letra maiúscula, um número e um caractere especial." }; const supabase = createClientServer(); const { data, error } = await supabase.rpc("app_register", { p_login: normalized, p_password: password }); if (error || !data?.[0]) return { success: false, error: error?.message || "Não foi possível cadastrar." }; setSessionCookie(data[0].session_token); revalidatePath("/"); revalidatePath("/relatorios"); return { success: true, role: data[0].role }; }
export async function logoutUser() { const token = sessionToken(); if (token) await createClientServer().rpc("app_logout", { p_token: token }); clearSessionCookie(); redirect("/login"); }

function normalizeEntry(input: SaveEntryInput) {
 const kmInitial=Math.max(0,Number(input.km_initial)||0),kmFinal=Math.max(0,Number(input.km_final)||0),hoursWorked=Math.max(0,Number(input.hours_worked)||0),gasCost=Math.max(0,Number(input.gas_expense)||0),alcoholCost=Math.max(0,Number(input.alcohol_expense)||0),gasPrice=Math.max(0,Number(input.gasoline_price_per_liter)||0),alcoholPrice=Math.max(0,Number(input.alcohol_price_per_liter)||0),consumption=Math.max(0,Number(input.fuel_consumption_km_per_liter)||0);
 const revenue = input.revenue_details?.length ? summarizeRevenue(input.revenue_details) : null;
 const maintenanceDetails=(input.maintenance_details??[]).filter(item=>item.description.trim()!=="").map(item=>({description:item.description.trim(),value:Math.max(0,Number(item.value)||0)}));
 const gasLiters=gasPrice>0?gasCost/gasPrice:0,alcoholLiters=alcoholPrice>0?alcoholCost/alcoholPrice:0,totalLiters=gasLiters+alcoholLiters,totalPurchase=gasCost+alcoholCost,weightedPrice=totalLiters>0?totalPurchase/totalLiters:0,priceUsed=gasCost>0&&gasPrice>0?gasPrice:alcoholCost>0&&alcoholPrice>0?alcoholPrice:weightedPrice,kmDriven=kmFinal-kmInitial,consumed=consumption>0&&kmDriven>0?kmDriven/consumption:0,consumedCost=consumed*priceUsed,remaining=Math.max(0,totalLiters-consumed),remainingValue=remaining*priceUsed;
 return {
   date:input.date,
   gross_amount:revenue?revenue.bruto:(input.gross_amount==null?null:Math.max(0,Number(input.gross_amount)||0)),
   fee_percent:revenue?revenue.taxaPercentual:(input.fee_percent==null?null:Math.max(0,Number(input.fee_percent)||0)),
   net_fare:revenue?revenue.liquido:(input.net_fare==null?null:Number(input.net_fare)||0),
   revenue_details:revenue?.normalized ?? [],
   gas_expense:gasCost,alcohol_expense:alcoholCost,gasoline_price_per_liter:gasPrice,alcohol_price_per_liter:alcoholPrice,
   gasoline_liters:gasLiters,alcohol_liters:alcoholLiters,km_initial:kmInitial,km_final:kmFinal,km_driven:kmDriven,hours_worked:hoursWorked,
   fuel_consumption_km_per_liter:consumption,fuel_consumed_liters:Math.max(0,Number(input.fuel_consumed_liters)||consumed),fuel_consumed_cost:Math.max(0,Number(input.fuel_consumed_cost)||consumedCost),fuel_remaining_liters:Math.max(0,Number(input.fuel_remaining_liters)||remaining),fuel_remaining_value:Math.max(0,Number(input.fuel_remaining_value)||remainingValue),
   maintenance_expense:maintenanceDetails.reduce((sum,item)=>sum+item.value,0),maintenance_details:maintenanceDetails,
   extra_expenses:(input.extra_expenses??[]).map(item=>({name:String(item.name||"").trim(),value:Math.max(0,Number(item.value)||0)})).filter(item=>item.name||item.value>0)
 };
}

export async function saveEntry(input:SaveEntryInput){const user=await requireUser();const token=sessionToken();if(!token)return{success:false,error:"Sessão inválida."};const row=normalizeEntry(input);if(row.km_final<row.km_initial)return{success:false,error:"O km final não pode ser menor que o km inicial."};if(row.gas_expense>0&&row.gasoline_price_per_liter<=0)return{success:false,error:"Informe o preço por litro da gasolina."};if(row.alcohol_expense>0&&row.alcohol_price_per_liter<=0)return{success:false,error:"Informe o preço por litro do álcool."};if(row.gas_expense+row.alcohol_expense>0&&row.km_driven>0&&row.fuel_consumption_km_per_liter<=0)return{success:false,error:"Informe o consumo médio do veículo (Km/L)."};const{error}=await createClientServer().rpc("app_save_entry",{p_token:token,p_entry:row});if(error)return{success:false,error:error.message};const monthProfit=await getMonthProfit(input.date);revalidatePath("/");revalidatePath("/relatorios");return{success:true,monthProfit,userId:user.user_id};}
export async function updateEntry(id:string,input:SaveEntryInput){await requireUser();const token=sessionToken();if(!token)return{success:false,error:"Sessão inválida."};if(!id)return{success:false,error:"Lançamento inválido."};const row=normalizeEntry(input);if(row.km_final<row.km_initial)return{success:false,error:"O km final não pode ser menor que o km inicial."};if(row.gas_expense>0&&row.gasoline_price_per_liter<=0)return{success:false,error:"Informe o preço por litro da gasolina."};if(row.alcohol_expense>0&&row.alcohol_price_per_liter<=0)return{success:false,error:"Informe o preço por litro do álcool."};if(row.gas_expense+row.alcohol_expense>0&&row.km_driven>0&&row.fuel_consumption_km_per_liter<=0)return{success:false,error:"Informe o consumo médio do veículo (Km/L)."};const{error}=await createClientServer().rpc("app_update_entry",{p_token:token,p_entry_id:id,p_entry:row});if(error)return{success:false,error:error.message};revalidatePath("/");revalidatePath("/relatorios");return{success:true};}
export async function getMonthProfit(dateISO:string):Promise<number>{await requireUser();const token=sessionToken();if(!token)return 0;const[y,m]=dateISO.split("-");const from=`${y}-${m}-01`;const last=new Date(Number(y),Number(m),0).getDate();const to=`${y}-${m}-${String(last).padStart(2,"0")}`;const{data,error}=await createClientServer().rpc("app_get_month_profit",{p_token:token,p_from:from,p_to:to});if(error||data==null)return 0;return Number(data)||0;}
export async function getEntriesInRange(from:string,to:string){await requireUser();const token=sessionToken();if(!token)return[];const{data,error}=await createClientServer().rpc("app_get_entries",{p_token:token,p_from:from,p_to:to});if(error)throw new Error(error.message);return(data??[])as any[];}
