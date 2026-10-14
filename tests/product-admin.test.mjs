import test from 'node:test';
import assert from 'node:assert/strict';
import { productPatch, productVisibility, matchesProductChannel, requireProductVersion } from '../src/utils/productAdmin.ts';
import { adminErrorMessage } from '../src/utils/admin.ts';

test('the four publication choices keep retail independent of B2B', () => {
  for (const [retail,b2b,visibility,filter] of [
    [true,true,'retail','both'],[true,false,'retail','retail'],
    [false,true,'wholesale','b2b'],[false,false,'hidden','hidden'],
  ]) {
    assert.equal(productVisibility(retail,b2b),visibility);
    const product={visibility,b2b_enabled:b2b};
    for(const value of ['both','retail','b2b','hidden']) assert.equal(matchesProductChannel(product,value),value===filter);
    assert.equal(matchesProductChannel(product,'all'),true);
  }
});

test('a description or channel edit never resends stale inventory, prices or protected fields', () => {
  const opened={id:243,name:'Synthetic Pepero',stock:100,price:2,price_euro:2,
    description:'Old',visibility:'wholesale',b2b_enabled:true,edit_version:7,slug:'stable-slug'};
  assert.deepEqual(productPatch(opened,{...opened,description:'New'}),{description:'New'});
  assert.deepEqual(productPatch(opened,{...opened,visibility:'retail'}),{visibility:'retail'});
  assert.deepEqual(productPatch(opened,{...opened,id:1,edit_version:8,slug:'forged'}),{});
  assert.deepEqual(productPatch(opened,opened),{});
});

test('an intentional price or quantity change remains explicit, including zero stock', () => {
  const opened={price:2,price_euro:2,stock:100,sku:'ORIGINAL'};
  assert.deepEqual(productPatch(opened,{...opened,price:2.5,price_euro:2.5}),{price:2.5,price_euro:2.5});
  assert.deepEqual(productPatch(opened,{...opened,stock:0}),{stock:0});
  assert.deepEqual(productPatch(opened,{...opened,sku:''}),{sku:null});
});

test('missing revision fails visibly instead of issuing an unprotected update', () => {
  for(const edit_version of [undefined,null,-1,1.5,'2',Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(()=>requireProductVersion({edit_version}),/Обновете/);
  }
  assert.equal(requireProductVersion({edit_version:0}),0);
  assert.match(adminErrorMessage({code:'PT409'}),/Промените ви не са записани/);
  assert.match(adminErrorMessage({code:'PT404'}),/не съществува/);
});
