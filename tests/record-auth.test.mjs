import assert from 'node:assert/strict';
import { verifyRecordWriter } from '../record-auth.js';

function client({users=[{id:'writer'}],refreshError=null,role='teacher',active=true,profileError=null}={}) {
  let reads=0,refreshes=0,profiles=0;
  return {auth:{
    getUser:async()=>({data:{user:users[Math.min(reads++,users.length-1)]}}),
    refreshSession:async()=>{refreshes++;return {error:refreshError,data:{session:refreshError?null:{}}};}
  },from:()=>{profiles++;return {select:()=>({eq:()=>({single:async()=>({data:{role,active},error:profileError})})})};},
  counts:()=>({reads,refreshes,profiles})};
}
let db=client();assert.equal(await verifyRecordWriter(db,'writer'),null);
db=client({users:[null,{id:'writer'}]});assert.equal(await verifyRecordWriter(db,'writer'),null);assert.equal(db.counts().refreshes,1);
db=client({users:[null],refreshError:Error('expired')});assert.match(await verifyRecordWriter(db,'writer'),/로그인 연결이 끊겼/);assert.equal(db.counts().profiles,0);
db=client({users:[{id:'other'}]});assert.match(await verifyRecordWriter(db,'writer'),/다른 계정/);assert.equal(db.counts().profiles,0);
for(const role of ['student','parent'])assert.match(await verifyRecordWriter(client({role}),'writer'),/권한이 없/);
assert.match(await verifyRecordWriter(client({active:false}),'writer'),/권한이 없/);
assert.match(await verifyRecordWriter(client({profileError:Error('offline')}),'writer'),/확인하지 못/);
console.log('PASS: legacy journal verifies current writer, refreshes expired auth, and rejects switched or inactive accounts');
