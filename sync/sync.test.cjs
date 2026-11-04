/* Node built-in tests; no third-party dependencies. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { empty, merge } = require('./merge.js');
const { spawn } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');

const task = (id, title) => ({id, title, date:'2026-11-05', completed:false,
  postponedHistory:[], editHistory:[]});
test('merge preserves edits from two different devices', () => {
  const b = empty(), l = {tasks:[task('a','телефон')], secrets:{}},
    r = {tasks:[task('b','ноутбук')], secrets:{}};
  const out = merge(b,l,r).snapshot;
  assert.deepEqual(new Set(out.tasks.map(x => x.id)), new Set(['a','b']));
});
test('merge carries deletion across devices', () => {
  const b={tasks:[task('a','old')],secrets:{}};
  assert.deepEqual(merge(b,empty(),b).snapshot.tasks,[]);
});
test('merge does not lose conflicting edits', () => {
  const b={tasks:[task('a','original')],secrets:{}};
  const l={tasks:[task('a','изменено на телефоне')],secrets:{}};
  const r={tasks:[task('a','изменено на ноутбуке')],secrets:{}};
  const result=merge(b,l,r);
  assert.equal(result.snapshot.tasks.length,2);
  assert.equal(result.conflicts,1);
});

function freePort() {
  return new Promise((resolve,reject) => {
    const srv=net.createServer();
    srv.once('error',reject);
    srv.listen(0,'127.0.0.1',() => { const port=srv.address().port; srv.close(()=>resolve(port)); });
  });
}
test('password login, isolated account data, revision conflicts and denied access', async t => {
  const dir=mkdtempSync(path.join(os.tmpdir(),'nails-sync-test-'));
  const port=await freePort();
  const child=spawn(process.execPath,['sync/server.mjs'],{
    cwd:path.resolve(__dirname,'..'),
    env:{...process.env, HOST:'127.0.0.1', PORT:String(port), DATA_DIR:dir},
    stdio:['ignore','pipe','pipe']
  });
  let log='';
  child.stdout.on('data',chunk=> {log+=chunk.toString();});
  child.stderr.on('data',chunk=> {log+=chunk.toString();});
  t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true});});
  const url='http://127.0.0.1:'+port;
  let healthy=false;
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw Error('Backend exited: '+log);
    try {healthy=(await fetch(url+'/api/health')).ok;if(healthy)break;}catch{}
    await new Promise(ok=>setTimeout(ok,100));
  }
  assert.equal(healthy,true,'server did not become healthy: '+log);
  async function api(route, method='GET',body,token){
    const headers={};
    if(body!==undefined)headers['Content-Type']='application/json';
    if(token)headers.Authorization='Bearer '+token;
    const res=await fetch(url+'/api/'+route,{method,headers,
      body:body===undefined?undefined:JSON.stringify(body)});
    return {status:res.status,data:await res.json()};
  }
  const weak=await api('register','POST',{username:'alice',password:'123'});
  assert.equal(weak.status,400);
  const first=await api('register','POST',{username:'alice',password:'StrongPassword08'});
  assert.equal(first.status,201);
  assert.match(first.data.token,/^[a-f0-9]{64}$/);
  const second=await api('register','POST',{username:'bob',password:'StrongPassword09'});
  assert.equal(second.status,201);
  assert.equal((await api('login','POST',{username:'alice',password:'wrongword'})).status,401);
  const login=await api('login','POST',{username:'alice',password:'StrongPassword08'});
  assert.equal(login.status,200);
  const before=await api('snapshot','GET',undefined,first.data.token);
  assert.equal(before.data.revision,0);
  const payload={baseRevision:0,snapshot:{tasks:[task('task-1','план')],secrets:{}}};
  const pushed=await api('snapshot','PUT',payload,first.data.token);
  assert.equal(pushed.status,200);
  assert.equal(pushed.data.revision,1);
  const race=await api('snapshot','PUT',payload,login.data.token);
  assert.equal(race.status,409);
  assert.equal(race.data.snapshot.tasks.length,1);
  const other=await api('snapshot','GET',undefined,second.data.token);
  assert.deepEqual(other.data.snapshot.tasks,[]);
  assert.equal((await api('snapshot')).status,401);
  assert.equal((await fetch(url+'/sync/server.mjs')).status,404);
  const disk=readFileSync(path.join(dir,'db.json'),'utf8');
  assert.equal(disk.includes('StrongPassword08'),false);
  assert.equal(disk.includes(first.data.token),false);
});
