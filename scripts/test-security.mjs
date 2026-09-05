import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { safeAuthPath, trustedAppOrigin } from '../lib/auth-redirect.ts';

const db = new PGlite({ extensions: { pgcrypto } });
const owner='10000000-0000-4000-8000-000000000001';
const regular='10000000-0000-4000-8000-000000000002';
const legacy='10000000-0000-4000-8000-000000000003';
const attacker='20000000-0000-4000-8000-000000000004';
const ownerAuth='20000000-0000-4000-8000-000000000001';
const regularAuth='20000000-0000-4000-8000-000000000002';
const legacyAuth='20000000-0000-4000-8000-000000000003';
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++;};
async function asRole(role,fn){ await db.exec(`set role ${role}`);try{return await fn();}finally{await db.exec('reset role');} }
async function rejected(fn,label){await assert.rejects(fn,undefined,label); checks++;}
async function identity(id){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,session_id:id})]);}
async function google(id,email){await identity(id);return asRole('authenticated',()=>db.query('select * from public.app_google_auth($1,$2)',[email,id]));}
async function snapshot(){return (await db.query(`select jsonb_build_object('users',(select jsonb_agg(to_jsonb(a) order by id) from app_users a),'sessions',(select jsonb_agg(to_jsonb(s) order by token) from app_sessions s),'entries',(select jsonb_agg(to_jsonb(d) order by id) from daily_entries d)) as state`)).rows[0].state;}
try {
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema extensions;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid);
 create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;
 create extension pgcrypto with schema extensions;
 set search_path=public,extensions,pg_catalog;`);
 await db.exec(readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
 await db.exec('alter table app_users add column email text, add column google_id text, add column recovery_email text; create unique index test_google_id on app_users(google_id) where google_id is not null;');
 await db.exec(readFileSync(new URL('./fixtures/auth-before-hardening.sql',import.meta.url),'utf8'));
 for(const [id,email] of [[ownerAuth,'angeloantunesdarocha@gmail.com'],[regularAuth,'regular@example.test'],[legacyAuth,'legacy@example.test'],[attacker,'attacker@example.test']]){
  await db.query('insert into auth.users values($1,$2,now())',[id,email]);await db.query('insert into auth.sessions values($1,$1)',[id]);
 }
 for(const [id,login,role,email,authId] of [[owner,'Angelo Antunes','admin','angeloantunesdarocha@gmail.com',ownerAuth],[regular,'Regular','user','regular@example.test',regularAuth],[legacy,'Legacy','user','legacy@example.test',null]]){
  await db.query("insert into app_users(id,login,role,email,google_id,password_hash) values($1,$2,$3,$4,$5,crypt('Safe1!password',gen_salt('bf',6)))",[id,login,role,email,authId]);
  await db.query('insert into app_sessions(user_id) values($1)',[id]);
 }
 await db.query("insert into daily_entries(user_id,date,gross_amount) values($1,'2026-09-01',123.45)",[regular]);
 // Reproduce the prior vulnerability entirely within a rolled-back fixture.
 await db.exec('begin');
 const stolen=await google(attacker,'legacy@example.test');
 ok(stolen.rows[0].login==='Legacy','baseline reproduces cross-account session issuance');
 await db.exec('rollback');
 const before=await snapshot();
 await db.exec(readFileSync(new URL('../supabase/migrations/20260905030858_critical_identity_owner_security.sql',import.meta.url),'utf8'));
 assert.deepEqual(await snapshot(),before,'installation preserves every user/password/session/financial row');checks++;
 await rejected(()=>google(attacker,'legacy@example.test'),'forged e-mail must fail');
 await rejected(()=>google(attacker,'angeloantunesdarocha@gmail.com'),'forged owner e-mail must fail');
 await identity(attacker);
 await rejected(()=>asRole('authenticated',()=>db.query('select * from app_google_auth($1,$2)',['attacker@example.test',ownerAuth])),'forged identity must fail');
 const legitimate=await google(regularAuth,'regular@example.test');ok(legitimate.rows[0].login==='Regular','existing Google login works');
 const existingOwner=await google(ownerAuth,'angeloantunesdarocha@gmail.com');ok(existingOwner.rows[0].role==='admin','existing owner remains admin');
 const ownerToken=existingOwner.rows[0].session_token;
 ok((await db.query('select private.app_require_admin($1) as id',[ownerToken])).rows[0].id===owner,'existing admin gate works');
 await rejected(()=>db.query('select private.app_require_admin($1)',[legitimate.rows[0].session_token]),'regular user cannot access admin');
 const linkedLegacy=await google(legacyAuth,'legacy@example.test');ok(linkedLegacy.rows[0].login==='Legacy','verified legacy login keeps existing account');
 const newGoogle=await google(attacker,'attacker@example.test');ok(newGoogle.rows[0].role==='user','new Google user cannot become admin');
 for(const role of ['anon','authenticated']){
  await rejected(()=>asRole(role,()=>db.exec('select token from app_sessions')),'session table inaccessible');
  await rejected(()=>asRole(role,()=>db.exec('select password_hash from app_users')),'password table inaccessible');
  await rejected(()=>asRole(role,()=>db.exec('select * from private.app_owner_identity')),'owner anchor inaccessible');
 }
 await rejected(()=>db.query("update app_users set role='admin' where id=$1",[regular]),'even privileged accidental promotion rejected');
 await rejected(()=>db.query("update app_users set role='user' where id=$1",[owner]),'owner cannot be demoted');
 await rejected(()=>db.query('delete from app_users where id=$1',[owner]),'owner cannot be deleted');
 await rejected(()=>db.query("update app_users set email='attacker@example.test' where id=$1",[owner]),'owner identity immutable');
 const login=await asRole('anon',()=>db.query('select * from app_login($1,$2)',['Regular','Safe1!password']));ok(login.rows[0].user_id===regular,'legacy password login unchanged');
 const wrong=await asRole('anon',()=>db.query('select * from app_login($1,$2)',['Regular','Wrong1!password']));ok(wrong.rows.length===0,'wrong password rejected');
 const signup=await asRole('anon',()=>db.query('select * from app_register_with_email($1,$2,$3)',['New User','Safe1!password','new@example.test']));ok(signup.rows[0].role==='user','registration creates ordinary user');
 await identity(attacker);
 await rejected(()=>asRole('anon',()=>db.query('select app_set_recovery_email($1,$2)',[signup.rows[0].session_token,'angeloantunesdarocha@gmail.com'])),'cannot change recovery to owner');
 const sessionsOther=(await db.query('select token from app_sessions where user_id<>$1 order by token',[regular])).rows;
 await identity(regularAuth);
 const recovered=await asRole('authenticated',()=>db.query('select app_complete_password_recovery($1) as token',['Changed1!password']));
 ok(Boolean(recovered.rows[0].token),'recovery returns fresh session');
 ok((await db.query('select count(*)::int as n from app_sessions where user_id=$1',[regular])).rows[0].n===1,'recovery revokes only old sessions of recovered user');
 assert.deepEqual((await db.query('select token from app_sessions where user_id<>$1 order by token',[regular])).rows,sessionsOther);checks++;
 ok((await asRole('anon',()=>db.query('select * from app_login($1,$2)',['Regular','Changed1!password']))).rows.length===1,'new password login works');
 await db.query('delete from auth.sessions where user_id=$1',[attacker]);
 await rejected(()=>google(attacker,'attacker@example.test'),'revoked auth JWT cannot issue sessions');
 await db.query('update auth.users set email_confirmed_at=null where id=$1',[legacyAuth]);
 await rejected(()=>google(legacyAuth,'legacy@example.test'),'unverified identity cannot link/login');
 const origin='https://fatur-app.vercel.app';
 for(const path of ['//evil.test','/\\evil.test','https://evil.test','/\tevil.test'])ok(safeAuthPath(path,origin)==='/','external/control redirect blocked');
 ok(safeAuthPath('/redefinir-senha',origin)==='/redefinir-senha','recovery redirect preserved');
 ok(trustedAppOrigin('https://evil.test/auth/callback')===origin,'unknown callback host not trusted');
 console.log(`Security: ${checks} checks passed; synthetic local PostgreSQL only.`);
} catch(error) { console.error({message:error.message,code:error.code,where:error.where,detail:error.detail}); process.exitCode=1; } finally {await db.close();}
