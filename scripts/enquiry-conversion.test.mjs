import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=await readFile(new URL('main.js',root),'utf8');
const events=[];
const sandbox=vm.createContext({window:{gtag:(...args)=>events.push(args)}});
vm.runInContext(source.slice(0,source.indexOf("document.addEventListener('DOMContentLoaded'")),sandbox);
const run=code=>vm.runInContext(code,sandbox);
for(const value of ['9876543210','+919876543210','919876543210','+91 98765 43210','98765-43210']){
  test(`accept Indian mobile ${value}`,()=>assert.equal(run(`spacyesEnquiry.mobile(${JSON.stringify(value)})`),'9876543210'));
}
for(const value of ['abc','','123','1234567890','+449876543210','98765432101','+91abc9876543210','9876543210<script>']){
  test(`reject invalid mobile ${value}`,()=>assert.equal(run(`spacyesEnquiry.mobile(${JSON.stringify(value)})`),''));
}
test('analytics only permits catalogue values and finite metadata, never customer data',()=>{
  events.length=0;
  for(const name of ['trial_cta_click','membership_enquiry_click','plan_select','branch_select','contact_click','enquiry_handoff']){
    run(`spacyesEnquiry.event(${JSON.stringify(name)},{branch:'Kandivali East',plan:'Fortnightly',name:'Private Name',phone:'9876543210',email:'private@example.com',message:'secret',url:'https://wa.me/919869622564?text=secret'},'whatsapp','form')`);
  }
  assert.equal(events.length,6);
  for(const event of events){
    assert.equal(event[0],'event');
    assert.deepEqual(JSON.parse(JSON.stringify(event[2])),{branch:'Kandivali East',plan:'Fortnightly',contact_channel:'whatsapp',cta_location:'form',send_to:'G-N36ZSN4PE0'});
    assert.doesNotMatch(JSON.stringify(event),/Private|9876543210|private@example|secret|wa\.me/);
  }
  run("spacyesEnquiry.event('not_allowed',{branch:'private@example.com',plan:'9876543210'},'secret','secret')");
  assert.equal(events.length,6);
  run("spacyesEnquiry.event('contact_click',{branch:'private@example.com',plan:'9876543210'},'private@example.com','secret')");
  assert.deepEqual(JSON.parse(JSON.stringify(events.at(-1)[2])),{branch:'',plan:'',cta_location:'content',send_to:'G-N36ZSN4PE0'});
});
test('all twenty indexable pages have exactly one existing GA loader/config; no extra page_view',async()=>{
  const manifest=JSON.parse(await readFile(new URL('scripts/public-assets.json',root),'utf8'));
  const pages=manifest.filter(f=>f.endsWith('.html')&&f!=='404.html');
  assert.equal(pages.length,20);
  for(const file of pages){
    const html=await readFile(new URL(file,root),'utf8');
    assert.equal((html.match(/src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-N36ZSN4PE0"/g)||[]).length,1,file);
    assert.equal((html.match(/gtag\('config',\s*'G-N36ZSN4PE0'\)/g)||[]).length,1,file);
    assert.doesNotMatch(html,/gtag\(['"]event['"],\s*['"]page_view/);
  }
});
test('no installation/test hook can send a real enquiry or analytics request',()=>{
  assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|sendBeacon/);
});

test('explicit plan clear is stored and synchronised once; invalid values remain rejected',()=>{
  const changes=[];
  const context=vm.createContext({
    selection:{branch:'Kandivali East',plan:'Fortnightly'},
    spacyesEnquiry:{
      context:value=>JSON.parse(JSON.stringify(run(`spacyesEnquiry.context(${JSON.stringify(value)})`))),
      event:(...args)=>changes.push(['event',...JSON.parse(JSON.stringify(args))]),
    },
    remember:()=>changes.push(['store']),
    syncSelection:()=>changes.push(['sync']),
    locationOf:()=>'form',
  });
  vm.runInContext(source.slice(source.indexOf('function choose('),source.indexOf('function validateEnquiry(')),context);
  vm.runInContext("choose('plan','',{})",context);
  assert.equal(context.selection.plan,'');
  assert.equal(context.selection.branch,'Kandivali East');
  assert.deepEqual(changes.map(c=>c[0]),['store','sync','event']);
  assert.equal(changes[2][1],'plan_select');
  assert.equal(changes[2][2].plan,'');
  changes.length=0;
  vm.runInContext("choose('plan','private@example.com',{});choose('branch','',{})",context);
  assert.equal(changes.length,0);
  vm.runInContext("choose('plan','Monthly',{})",context);
  assert.equal(context.selection.plan,'Monthly');
  assert.deepEqual(changes.map(c=>c[0]),['store','sync','event']);
});
