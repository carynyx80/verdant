import assert from 'node:assert/strict';
const origin=process.env.TEST_API_URL||'http://localhost:3001';
const health=await fetch(`${origin}/health`);assert.equal(health.status,200);assert.equal((await health.json()).chainId,56);
const tokens=await fetch(`${origin}/tokens`);assert.equal(tokens.status,200);const data=await tokens.json();assert.equal(data.verified,false);assert.deepEqual(data.items,[]);
assert.equal((await fetch(`${origin}/admin/health`)).status,401);
assert.equal((await fetch(`${origin}/tokens/invalid/trades`)).status,400);
assert.equal((await fetch(`${origin}/metadata`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,503);
console.log('5 API checks passed in unconfigured mode: health, honest empty feed, admin authentication, address validation, metadata persistence guard.');
