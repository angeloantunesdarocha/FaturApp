"use server";

import { cookies, headers } from "next/headers";
import { createClientServer } from "@/lib/supabase";
import { clearSessionCookie, requireUser, setSessionCookie } from "@/lib/auth";
import { summarizeRevenue, type RevenueItem } from "@/lib/revenue";
import { computeDayProfit, type DailyEntry, type ExtraExpense, type MaintenanceItem } from "@/lib/utils";
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
  maintenance_expense: number;
  maintenance_details: MaintenanceItem[];
  extra_expenses: ExtraExpense[];
};

function sessionToken() { return cookies().get("faturapp_session")?.value ?? null; }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERIC_RESOURCE_ERROR = "Lançamento não encontrado.";
function validatePassword(password: string) { return password.length >= 4 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password); }
export async function loginUser(login: string, password: string) { if (!login.trim() || !password) return { success: false, error: "Informe login e senha." }; const supabase = createClientServer(); const { data, error } = await supabase.rpc("app_login", { p_login: login, p_password: password }); if (error) { console.error("Erro Supabase login:", error); return { success: false, error: "Erro ao validar acesso. Tente novamente." }; } if (!data?.[0]) return { success: false, error: "Login ou senha incorretos." }; setSessionCookie(data[0].session_token); return { success: true }; }
export async function registerUser(login: string, password: string, email: string) { const normalized = login.trim(); const normalizedEmail = email.trim().toLowerCase(); if (!normalized) return { success: false, error: "Informe um login." }; if (normalized.length > 120) return { success: false, error: "O login deve ter no máximo 120 caracteres." }; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { success: false, error: "Informe um e-mail válido para recuperar sua conta." }; if (!validatePassword(password)) return { success: false, error: "A senha deve ter no mínimo 4 caracteres, uma letra maiúscula, um número e um caractere especial." }; const supabase = createClientServer(); const { error: authError } = await supabase.auth.signUp({ email: normalizedEmail, password }); if (authError && !/already registered|already exists/i.test(authError.message)) return { success: false, error: "Não foi possível preparar a recuperação por e-mail." }; const { data, error } = await supabase.rpc("app_register", { p_login: normalized, p_password: password }); if (error || !data?.[0]) return { success: false, error: error?.message || "Não foi possível cadastrar." }; const { error: emailError } = await supabase.rpc("app_set_recovery_email", { p_token: data[0].session_token, p_email: normalizedEmail }); if (emailError) return { success: false, error: "A conta foi criada, mas não foi possível salvar o e-mail de recuperação." }; setSessionCookie(data[0].session_token); revalidatePath("/"); revalidatePath("/relatorios"); return { success: true, role: data[0].role }; }
export async function requestPasswordRecovery(email: string) { const normalizedEmail = email.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { success: false, error: "Informe um e-mail válido." }; const requestHeaders = headers(); const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "fatur-app.vercel.app"; const proto = requestHeaders.get("x-forwarded-proto") ?? "https"; const callback = `${proto}://${host}/auth/callback?next=${encodeURIComponent("/redefinir-senha")}`; const { error } = await createClientServer().auth.resetPasswordForEmail(normalizedEmail, { redirectTo: callback }); if (error) console.error("Erro ao solicitar recuperação:", error); return { success: true }; }
export async function finishPasswordRecovery(sessionToken: string) { if (!/^[0-9a-f-]{36}$/i.test(sessionToken)) return { success: false, error: "Sessão de recuperação inválida." }; setSessionCookie(sessionToken); revalidatePath("/"); revalidatePath("/relatorios"); return { success: true }; }
export async function logoutUser() { const token = sessionToken(); if (token) await createClientServer().rpc("app_logout", { p_token: token }); clearSessionCookie(); redirect("/login"); }

function normalizeEntry(input: SaveEntryInput) {
 const kmInitial=Math.max(0,Number(input.km_initial)||0),kmFinal=Math.max(0,Number(input.km_final)||0),hoursWorked=Math.max(0,Number(input.hours_worked)||0),gasCost=Math.max(0,Number(input.gas_expense)||0),alcoholCost=Math.max(0,Number(input.alcohol_expense)||0),gasPrice=Math.max(0,Number(input.gasoline_price_per_liter)||0),alcoholPrice=Math.max(0,Number(input.alcohol_price_per_liter)||0),manualConsumption=Math.max(0,Number(input.fuel_consumption_km_per_liter)||0);
 const revenue = input.revenue_details?.length ? summarizeRevenue(input.revenue_details) : null;
 const maintenanceDetails=(input.maintenance_details??[]).filter(item=>item.description.trim()!=="").map(item=>({description:item.description.trim(),value:Math.max(0,Number(item.value)||0)}));
 const gasLiters=gasPrice>0?gasCost/gasPrice:0,alcoholLiters=alcoholPrice>0?alcoholCost/alcoholPrice:0,totalLiters=gasLiters+alcoholLiters,totalPurchase=gasCost+alcoholCost,weightedPrice=totalLiters>0?totalPurchase/totalLiters:0,priceUsed=weightedPrice,kmDriven=kmFinal-kmInitial,automaticConsumption=manualConsumption<=0&&kmDriven>0&&totalLiters>0?kmDriven/totalLiters:0,consumption=manualConsumption>0?manualConsumption:automaticConsumption,consumed=consumption>0&&kmDriven>0?kmDriven/consumption:0,consumedCost=consumed*priceUsed;
 return {
   date:input.date,
   gross_amount:revenue?revenue.bruto:(input.gross_amount==null?null:Math.max(0,Number(input.gross_amount)||0)),
   fee_percent:revenue?revenue.taxaPercentual:(input.fee_percent==null?null:Math.min(100,Math.max(0,Number(input.fee_percent)||0))),
   net_fare:revenue?revenue.liquido:(input.net_fare==null?null:Math.max(0,Number(input.net_fare)||0)),
   ...(revenue ? {revenue_details:revenue.normalized} : {}),
   gas_expense:gasCost,alcohol_expense:alcoholCost,gasoline_price_per_liter:gasPrice,alcohol_price_per_liter:alcoholPrice,
   gasoline_liters:gasLiters,alcohol_liters:alcoholLiters,km_initial:kmInitial,km_final:kmFinal,km_driven:kmDriven,hours_worked:hoursWorked,
   fuel_consumption_km_per_liter:consumption,fuel_consumed_liters:consumed,fuel_consumed_cost:consumedCost,
   maintenance_expense:maintenanceDetails.reduce((sum,item)=>sum+item.value,0),maintenance_details:maintenanceDetails,
   extra_expenses:(input.extra_expenses??[]).map(item=>({name:String(item.name||"").trim(),value:Math.max(0,Number(item.value)||0)})).filter(item=>item.name||item.value>0)
 };
}

export async function saveEntry(input:SaveEntryInput){
 const user=await requireUser();
 const token=sessionToken();
 if(!token)return{success:false,error:"Sessão inválida."};
 const row=normalizeEntry(input);
 if(row.km_final<row.km_initial)return{success:false,error:"O km final não pode ser menor que o km inicial."};
 if(row.gas_expense>0&&row.gasoline_price_per_liter<=0)return{success:false,error:"Informe o preço por litro da gasolina."};
 if(row.alcohol_expense>0&&row.alcohol_price_per_liter<=0)return{success:false,error:"Informe o preço por litro do álcool."};
 if(row.gas_expense+row.alcohol_expense>0&&row.km_driven>0&&row.fuel_consumption_km_per_liter<=0)return{success:false,error:"Informe o consumo médio do veículo (Km/L)."};
 const supabase=createClientServer();
 const{data:entriesOnDate,error:lookupError}=await supabase.rpc("app_get_entries",{p_token:token,p_from:row.date,p_to:row.date});
 if(lookupError){console.error("Erro ao verificar lançamento diário:",lookupError.code);return{success:false,error:"Não foi possível verificar o lançamento do dia. Tente novamente."};}
 const existingEntry=(entriesOnDate??[]).find((entry:{id?:string;date?:string})=>entry.date?.slice(0,10)===row.date&&entry.id&&UUID_PATTERN.test(entry.id));
 const{error}=existingEntry
  ?await supabase.rpc("app_update_entry",{p_token:token,p_entry_id:existingEntry.id,p_entry:row})
  :await supabase.rpc("app_save_entry",{p_token:token,p_entry:row});
 if(error){console.error("Erro ao consolidar lançamento diário:",error.code);return{success:false,error:"Não foi possível registrar o dia. Tente novamente."};}
 const monthProfit=await getMonthProfit(input.date);
 revalidatePath("/");
 revalidatePath("/relatorios");
 return{success:true,monthProfit,userId:user.user_id};
}
export async function updateEntry(id:string,input:SaveEntryInput){await requireUser();const token=sessionToken();if(!token)return{success:false,error:"Sessão inválida."};if(!UUID_PATTERN.test(id))return{success:false,error:GENERIC_RESOURCE_ERROR};const row=normalizeEntry(input);if(row.km_final<row.km_initial)return{success:false,error:"O km final não pode ser menor que o km inicial."};if(row.gas_expense>0&&row.gasoline_price_per_liter<=0)return{success:false,error:"Informe o preço por litro da gasolina."};if(row.alcohol_expense>0&&row.alcohol_price_per_liter<=0)return{success:false,error:"Informe o preço por litro do álcool."};if(row.gas_expense+row.alcohol_expense>0&&row.km_driven>0&&row.fuel_consumption_km_per_liter<=0)return{success:false,error:"Informe o consumo médio do veículo (Km/L)."};const{error}=await createClientServer().rpc("app_update_entry",{p_token:token,p_entry_id:id,p_entry:row});if(error){console.error("Erro ao atualizar lançamento:",error.code);return{success:false,error:GENERIC_RESOURCE_ERROR};}revalidatePath("/");revalidatePath("/relatorios");return{success:true};}
export async function getMonthProfit(dateISO:string):Promise<number>{await requireUser();const token=sessionToken();if(!token)return 0;const[y,m]=dateISO.split("-");const from=`${y}-${m}-01`;const last=new Date(Number(y),Number(m),0).getDate();const to=`${y}-${m}-${String(last).padStart(2,"0")}`;const{data,error}=await createClientServer().rpc("app_get_entries",{p_token:token,p_from:from,p_to:to});if(error||!data)return 0;return(data as DailyEntry[]).reduce((sum,entry)=>sum+computeDayProfit(entry),0);}
export async function getEntriesInRange(from:string,to:string){await requireUser();const token=sessionToken();if(!token)return[];const{data,error}=await createClientServer().rpc("app_get_entries",{p_token:token,p_from:from,p_to:to});if(error)throw new Error(error.message);return(data??[])as any[];}
