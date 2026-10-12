import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assessVisualization } from '../src/core/assessment.mjs'
import { generateVisualization } from '../src/core/pipeline.mjs'
const fixture = JSON.parse(await readFile(new URL('../examples/core-content-v1.json', import.meta.url), 'utf8'))
test('normal, missing evidence, invalid references and paid mode', () => {
 assert.equal(assessVisualization(fixture).decision, 'supported')
 const missing=structuredClone(fixture); missing.sources[0].verified=false
 assert.equal(assessVisualization(missing).decision, 'insufficient_evidence')
 const bad=structuredClone(fixture); bad.nodes[0].source_refs=['missing']
 assert.throws(()=>assessVisualization(bad), /source_refs/)
 assert.throws(()=>assessVisualization({...fixture,constraints:{allow_paid:true}}), /free offline/)
})
test('bundles never overwrite; missing evidence skips renderer; renderer failure is explicit', async()=>{
 const root=await mkdtemp(join(tmpdir(),'sciviz-core-'))
 try {
  const a=await generateVisualization(fixture,{root})
  const before=await readFile(a.output_path,'utf8')
  const b=await generateVisualization(fixture,{root})
  assert.notEqual(a.directory,b.directory); assert.equal(a.status,'renderer_pending')
  assert.equal(await readFile(a.output_path,'utf8'),before)
  const missing=structuredClone(fixture); missing.nodes[0].source_refs=[]
  const report=await generateVisualization(missing,{root,renderer:()=>{throw new Error('must not run')}})
  assert.equal(report.status,'evidence_report'); assert.equal(report.renderer_error,null)
  const failed=await generateVisualization(fixture,{root,renderer:()=>{throw new Error('offline render failure')}})
  assert.equal(failed.status,'renderer_failed')
  const rendered=await generateVisualization(fixture,{root,renderer:()=>({svg:'<svg></svg>',html:'<!doctype html><html></html>'})})
  assert.equal(rendered.status,'rendered'); assert.equal(rendered.artifacts.length,4)
 } finally {await rm(root,{recursive:true,force:true})}
})
