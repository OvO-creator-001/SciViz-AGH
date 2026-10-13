import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Run from the submission package; an explicit source path can be supplied for maintainers.
const base=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(process.argv[2]??path.join(base,'../03_代码/source'));
const cli=path.join(source,'src/cli.mjs');
const out=await fs.mkdtemp(path.join(base,'results-'));
const fixture=JSON.parse(await fs.readFile(path.join(source,'examples/core-content-v1.json'),'utf8'));
fixture.content_kind='synthetic_example';
const boundary=structuredClone(fixture);
boundary.title='边界测试：8节点16关系，来源未人工核对';
boundary.sources[0].verified=false;
boundary.sources[0].excerpt='合成夹具：8个测试节点与16条关系仅用于验证软件边界，不代表真实研究结果。';
boundary.nodes=Array.from({length:8},(_,i)=>({id:`n${i+1}`,label:i===0?'边'.repeat(120):`节点${i+1}`,explanation:'合成测试节点。',source_refs:['s1']}));
boundary.edges=[];
for(let i=0;i<8;i++)for(const offset of [1,2])boundary.edges.push({from:`n${i+1}`,to:`n${(i+offset)%8+1}`,label:'合成关系',source_refs:['s1']});
const bad=structuredClone(fixture);bad.nodes[0].source_refs=['not_a_source'];
const insufficient=structuredClone(fixture);insufficient.nodes[0].source_refs=[];
const cases=[['normal',fixture,'rendered',0],['boundary',boundary,'rendered',0],['failure',bad,'INVALID_INPUT',1],['insufficient',insufficient,'evidence_report',0]];
const results=[];
for(const [name,input,expected,exit]of cases){
 const inputPath=path.join(out,`${name}.input.json`);await fs.writeFile(inputPath,JSON.stringify(input,null,2));
 const run=spawnSync(process.execPath,[cli,'generate',inputPath,out],{encoding:'utf8'});
 await fs.writeFile(path.join(out,`${name}.stdout.json`),run.stdout??'');await fs.writeFile(path.join(out,`${name}.stderr.json`),run.stderr??'');
 assert.equal(run.status,exit,`${name} exit: ${run.stderr}`);
 const actual=JSON.parse(exit?run.stderr:run.stdout);assert.equal(exit?actual.code:actual.status,expected);
 if(name==='boundary')assert.equal(actual.source_review.blocks_generation,false);
 results.push({name,expected,actual:exit?actual.code:actual.status,exitCode:run.status,passed:true});
}
const tests=(await fs.readdir(path.join(source,'tests'))).filter(f=>f.endsWith('.test.mjs')).map(f=>path.join('tests',f));
const run=spawnSync(process.execPath,['--test',...tests],{cwd:source,encoding:'utf8'});
await fs.writeFile(path.join(out,'unit-tests.log'),`${run.stdout}\n${run.stderr}`);
const report={generatedAt:new Date().toISOString(),runtime:process.version,platform:process.platform,cases:results,unitTestExit:run.status};
await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));assert.equal(run.status,0,'unit tests');
console.log(JSON.stringify({output:out,...report},null,2));
