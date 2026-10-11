import { databaseDependencies, dependencies, workerDependencies } from '../supabase/functions/_shared/checkout.ts';
function equal(a:unknown,b:unknown){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('Configuration assertion failed');}
Deno.test('tracking and the private notification worker initialize before Stripe setup; payment creation stays closed',async()=>{
  const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','STRIPE_MODE','CHECKOUT_ENVIRONMENT','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','CHECKOUT_APP_URL'];
  const original=new Map(keys.map(k=>[k,Deno.env.get(k)])); const previous=globalThis.fetch;
  const calls:{path:string;body:Record<string,unknown>|null}[]=[];
  let bucket=false;
  try{
    keys.forEach(k=>Deno.env.delete(k));
    Deno.env.set('SUPABASE_URL','https://configuration-fixture.invalid');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','fixture');
    globalThis.fetch=async(input,init)=>{
      const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      const body=init?.body?JSON.parse(String(init.body)):null;calls.push({path:url.pathname,body});
      const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
      if(url.pathname.endsWith('/rpc/checkout_worker_secret'))return reply('synthetic-worker-credential-with-at-least-32-characters');
      if(url.pathname==='/storage/v1/bucket/b2b-documents')return bucket?reply({id:'b2b-documents',name:'b2b-documents',public:false}):reply({message:'Bucket not found'},404);
      if(url.pathname==='/storage/v1/bucket'&&init?.method==='POST'){bucket=true;return reply({name:'b2b-documents'});}
      throw new Error('Unexpected service call');
    };
    const db=await databaseDependencies();equal(db.config.live,false);
    equal(db.config.appUrl,'https://k-foodvelikotarnovo.com');
    const worker=await workerDependencies();equal(worker.stripe,null);
    const create=calls.find(c=>c.path==='/storage/v1/bucket')!;equal(create.body?.public,false);equal(create.body?.file_size_limit,10485760);
    let rejected=false;try{await dependencies();}catch{rejected=true;}equal(rejected,true);
    equal(calls.some(c=>/stripe|resend/.test(c.path)),false);
    Deno.env.set('SUPABASE_URL','https://quqlovoiwgqfmgjumpgd.supabase.co');
    equal((await databaseDependencies()).config.live,true);
    Deno.env.set('STRIPE_MODE','test');Deno.env.set('CHECKOUT_ENVIRONMENT','production');
    rejected=false;try{await dependencies();}catch{rejected=true;}equal(rejected,true);
  }finally{globalThis.fetch=previous;for(const[k,v]of original){if(v===undefined)Deno.env.delete(k);else Deno.env.set(k,v);}}
});
