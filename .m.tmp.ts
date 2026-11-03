import './scripts/load-env'
const U=process.env.NEXT_PUBLIC_SUPABASE_URL!,K=process.env.SUPABASE_SERVICE_ROLE_KEY!
;(async()=>{
  for (const fn of ['exec_sql','execute_sql','sql']) {
    const r=await fetch(`${U}/rest/v1/rpc/${fn}`,{method:'POST',headers:{apikey:K,Authorization:`Bearer ${K}`,'Content-Type':'application/json'},body:JSON.stringify({query:'select 1'})})
    console.log(`  rpc/${fn}: ${r.status} ${(await r.text()).slice(0,70).replace(/\s+/g,' ')}`)
  }
})()
