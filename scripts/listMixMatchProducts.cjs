#!/usr/bin/env node
const https = require('https');
const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
let headers = { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` };

function request(options, data=null){return new Promise((resolve,reject)=>{const req=https.request(options,res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>{try{const j=b?JSON.parse(b):null;if(res.statusCode>=400)return reject(new Error(j?.message||b));resolve(j);}catch(e){reject(e)}})});req.on('error',reject);if(data)req.write(JSON.stringify(data));req.end();});}
async function auth(){const options={hostname:SUPABASE_URL,port:443,path:'/auth/v1/token?grant_type=password',method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY}};const r=await request(options,{email:ADMIN_EMAIL,password:ADMIN_PASSWORD});headers.Authorization=`Bearer ${r.access_token}`;}
async function listMixMatch(){const options={hostname:SUPABASE_URL,port:443,path:'/rest/v1/product_catalog?select=id,product_name,store_id,category_id,categories!inner(name)&is_available=eq.true',method:'GET',headers};const rows=await request(options);const mm=(rows||[]).filter(r=> (r.categories?.name||'').toLowerCase().includes('mix'));mm.sort((a,b)=> (a.product_name||'').localeCompare(b.product_name||''));console.log(`Found ${mm.length} Mix & Match products:`);mm.forEach(r=>console.log(`- ${r.product_name} [${r.categories?.name}]`));}
(async()=>{try{await auth();await listMixMatch();}catch(e){console.error('Error:',e.message);process.exit(1);}})();

