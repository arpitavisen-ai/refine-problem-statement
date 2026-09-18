/*
 * Portable by design: point QA_BASE_URL at wherever the four pages actually
 * live (a running dev server, a deployed preview, or a file:// path during
 * local integration) before running this. Examples:
 *   QA_BASE_URL=http://localhost:3000/new-ui node qa_final.mjs
 *   QA_BASE_URL=file:///absolute/path/to/new-ui node qa_final.mjs
 */
// Adapted for this repo: the standalone `playwright` package is not a dependency here —
// only `@playwright/test`, which re-exports the same `chromium` browser type.
import { chromium } from '@playwright/test';
import fs from 'fs';
const b = await chromium.launch();
const BASE = process.env.QA_BASE_URL || 'file://' + process.cwd() + '/prototype';
const F = `${BASE}/spe-framework.html`, FD = `${BASE}/spe-case-foundry.html`, C = `${BASE}/spe-case-01-nhs.html`;
const errs=[]; const fails=[];
const ok=(name,cond,detail='')=>{ console.log(`${cond?'PASS':'FAIL'}  ${name}${detail?'  ['+detail+']':''}`); if(!cond) fails.push(name); };

// ---------- 1 · integrity across all three pages ----------
for (const [n,u] of [['framework',F],['foundry',FD],['case',C]]) {
  const p = await b.newPage({ viewport:{width:1440,height:900} });
  p.on('pageerror', e=>errs.push(n+': '+e));
  await p.goto(u);
  const r = await p.evaluate(()=>{
    const hs=[...document.querySelectorAll('h1,h2,h3,h4')].map(h=>+h.tagName[1]);
    let sk=0; for(let i=1;i<hs.length;i++) if(hs[i]>hs[i-1]+1) sk++;
    const hrefs=[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')))];
    const anchors=hrefs.filter(h=>h.startsWith('#')&&h!=='#');
    return { h1:document.querySelectorAll('h1').length, skips:sk,
      lm:['header','nav','main','footer'].every(t=>document.querySelectorAll(t).length>=1),
      badAnchors:anchors.filter(i=>!document.querySelector(i)),
      files:hrefs.filter(h=>h.startsWith('spe-')).map(h=>h.split('#')[0]),
      docH:document.documentElement.scrollHeight,
      imgAlt:[...document.querySelectorAll('img')].every(i=>i.hasAttribute('alt')),
      langSet:document.documentElement.lang==='en-GB', titleLen:document.title.length };
  });
  ok(`${n}: single h1`, r.h1===1);
  ok(`${n}: no skipped heading levels`, r.skips===0);
  ok(`${n}: landmarks present`, r.lm);
  ok(`${n}: no broken anchors`, r.badAnchors.length===0, r.badAnchors.join(','));
  if (BASE.startsWith('file://')) {
    ok(`${n}: linked files exist`, [...new Set(r.files)].every(f=>fs.existsSync(new URL(f, BASE + '/').pathname)));
  }
  ok(`${n}: lang + title set`, r.langSet && r.titleLen>10);
  console.log(`      height ${r.docH}px`);
  await p.close();
}
ok('no JS errors on any page', errs.length===0, errs.join(' | '));

// ---------- 2 · framework walkthrough behaviour ----------
const d = await b.newPage({ viewport:{width:1440,height:900} });
d.on('pageerror', e=>errs.push('walk: '+e));
await d.goto(F);
await d.locator('#framework').scrollIntoViewIfNeeded();
const tlOn = ()=>d.evaluate(()=>[...document.querySelectorAll('.tl__row[data-row][data-on="true"]')].length);
// 3 rows at load: phase-01 bar, the learning-log bar, and Gate 0 (already satisfied once Strategy is loaded)
ok('timeline starts with 3 rows', await tlOn()===3, String(await tlOn()));
for (let i=1;i<=5;i++){ await d.locator(`#phase-0${i} [data-goto="${i}"]`).click(); await d.waitForTimeout(160); }
// 15 rows once every phase is walked: 6 phases + learning log + 5 gates + 3 loops
ok('timeline fully built (15 rows)', await tlOn()===15, String(await tlOn()));
ok('all three loops visible', await d.evaluate(()=>document.querySelectorAll('.tl__row[data-row="loop"][data-on="true"]').length)===3);

// jump backwards then forwards - no gaps
await d.locator('.step[data-index="1"]').click(); await d.waitForTimeout(200);
ok('jumping back keeps lifecycle history', await tlOn()===15);

// content visible after a click, at two heights
for (const h of [900,720]) {
  const p = await b.newPage({ viewport:{width:1440,height:h} });
  await p.goto(F);
  // realistic journey: scroll to the walkthrough first (a step button can't be
  // clicked before a real visitor has scrolled to see it), then click a step.
  await p.locator('#framework').scrollIntoViewIfNeeded();
  await p.locator('.step[data-index="4"]').click();
  let lastY=-1, stable=0;
  for (let i=0;i<40;i++){ await p.waitForTimeout(100);
    const y=await p.evaluate(()=>window.scrollY);
    stable = (y===lastY) ? stable+1 : 0; lastY=y;
    if (stable>=3) break; }
  const v = await p.evaluate(()=>{ const r=document.querySelector('.phase:not([hidden]) .phase__badge').getBoundingClientRect();
    return { top:Math.round(r.top), vis:r.top>-50 && r.top<window.innerHeight*0.65 }; });
  ok(`clicked phase visible without a large extra scroll (${h}px tall)`, v.vis, 'badge at '+v.top+'px');
  await p.close();
}

// ---------- 3 · show-all + scroll-spy ----------
await d.locator('#show-all').click(); await d.waitForTimeout(300);
const sa = await d.evaluate(()=>({ panels:[...document.querySelectorAll('.phase')].filter(p=>!p.hidden).length,
  tlAll:document.getElementById('timeline').dataset.all, label:document.getElementById('progress-label').textContent }));
ok('show-all reveals six panels', sa.panels===6);
ok('show-all drops the single-column tint', sa.tlAll==='true');
ok('show-all label says all six', /All six phases/.test(sa.label), sa.label);
await d.locator('#phase-05').scrollIntoViewIfNeeded(); await d.waitForTimeout(700);
const spy = await d.evaluate(()=>document.getElementById('progress-label').textContent);
ok('scroll-spy follows the panel being read', /reading 0[45]/.test(spy), spy);
await d.locator('#show-all').click(); await d.waitForTimeout(300);
ok('toggling back restores single-phase mode', await d.evaluate(()=>[...document.querySelectorAll('.phase')].filter(p=>!p.hidden).length)===1);

// ---------- 4 · keyboard + a11y ----------
const k = await b.newPage({ viewport:{width:1440,height:900} });
await k.goto(F);
await k.locator('.step[aria-current="step"]').focus();
await k.keyboard.press('ArrowDown'); await k.keyboard.press('ArrowDown'); await k.waitForTimeout(300);
ok('arrow keys walk the stepper', /Phase 03/.test(await k.evaluate(()=>document.getElementById('progress-label').textContent)));
await k.keyboard.press('End'); await k.waitForTimeout(200);
ok('End jumps to last phase', /Phase 06/.test(await k.evaluate(()=>document.getElementById('progress-label').textContent)));
ok('timeline has a text equivalent', await k.evaluate(()=>{const tl=document.getElementById('timeline');
  return tl.getAttribute('role')==='group' && document.getElementById(tl.getAttribute('aria-describedby')).textContent.length>200; }));
ok('rail disclosure is keyboard reachable', await k.evaluate(()=>document.querySelectorAll('.rail-dark details.dims').length===1));
ok('live region present', await k.evaluate(()=>!!document.querySelector('[role="status"][aria-live="polite"]')));
const small = await k.evaluate(()=>[...document.querySelectorAll('.step,.toggle,.btn,.card__link,.phase__links a,details.dims summary')]
  .filter(el=>el.offsetParent!==null && el.getBoundingClientRect().height>0)
  .filter(el=>el.getBoundingClientRect().height<24)
  .map(el=>(el.className||el.tagName)+':'+Math.round(el.getBoundingClientRect().height)));
ok('every visible interactive target >=24px', small.length===0, small.join(','));
const tapAll = await k.evaluate(()=>{
  document.getElementById('show-all').click();
  const bad=[...document.querySelectorAll('.step,.toggle,.btn,.card__link')]
    .filter(el=>el.offsetParent!==null).filter(el=>el.getBoundingClientRect().height<44)
    .map(el=>(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,20)+':'+Math.round(el.getBoundingClientRect().height));
  document.getElementById('show-all').click();
  return bad;
});
ok('all buttons >=44px with every panel open', tapAll.length===0, tapAll.join(','));

// ---------- 5 · rail dead space ----------
const rail = await k.evaluate(()=>{ const r=document.querySelector('.section--framework .col-rail').getBoundingClientRect();
  const foot=document.querySelector('.rail-foot').getBoundingClientRect();
  return { railBottom:Math.round(r.bottom), footBottom:Math.round(foot.bottom), gap:Math.round(r.bottom-foot.bottom) }; });
ok('rail foot fills the bottom of the rail', rail.gap < 60, rail.gap+'px gap');

// ---------- 6 · print + reduced motion ----------
const pr = await b.newPage({ viewport:{width:1440,height:900} });
await pr.goto(F); await pr.emulateMedia({ media:'print' });
ok('print reveals all six phases', await pr.evaluate(()=>[...document.querySelectorAll('.phase')].filter(p=>getComputedStyle(p).display!=='none').length)===6);
ok('print drops the dark rail', await pr.evaluate(()=>getComputedStyle(document.querySelector('.section--framework .col-rail')).backgroundColor==='rgb(255, 255, 255)'));
const rm = await b.newPage({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
await rm.goto(F); await rm.locator('#framework').scrollIntoViewIfNeeded();
await rm.locator('.step[data-index="2"]').click(); await rm.waitForTimeout(300);
ok('reduced motion still switches phases', await rm.evaluate(()=>document.querySelector('.phase:not([hidden])').id)==='phase-03');

// ---------- 7 · mobile ----------
const m = await b.newPage({ viewport:{width:390,height:844} });
await m.goto(F);
ok('mobile header stays 48px', (await m.locator('.site-header').boundingBox()).height===48);
await m.locator('.site-header__menu-button').click(); await m.waitForTimeout(200);
ok('mobile nav opens', await m.locator('#primary-nav a').first().isVisible());
await m.locator('.site-header__menu-button').click();
await m.locator('#framework').scrollIntoViewIfNeeded();
ok('mobile: all six steps visible without horizontal scroll', await m.evaluate(()=>{
  const steps=[...document.querySelectorAll('.step')];
  return steps.length===6 && steps.every(s=>s.getBoundingClientRect().right<=window.innerWidth+1); }));
ok('no horizontal overflow at 390px', await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),
   await m.evaluate(()=>document.documentElement.scrollWidth+'px'));
await m.screenshot({ path:'final-mobile.png' });

// ---------- 8 · foundry affordances ----------
const fd = await b.newPage({ viewport:{width:1440,height:900} });
await fd.goto(FD);
const rows = await fd.evaluate(()=>[...document.querySelectorAll('.foundry__row')].map(r=>({
  clickable:!!r.querySelector('a'), chip:r.querySelector('.chip').textContent.trim() })));
ok('only the live case is clickable', rows.filter(r=>r.clickable).length===1 && rows[0].chip==='Live');
ok('foundry lists five entries', rows.length===5);

// ---------- 9 · today's additions: stage gates, differentiation, hero, resources ----------
const g = await b.newPage({ viewport:{width:1440,height:900} });
const gerrs = [];
g.on('pageerror', e=>gerrs.push(String(e)));
await g.goto(F);

// stage gate boxes exist and name the right gates
const gateTexts = await g.evaluate(()=>[...document.querySelectorAll('.stagegate__label')].map(e=>e.textContent.trim()));
ok('five distinct stage-gate boxes rendered', new Set(gateTexts).size===5, gateTexts.join(' | '));
ok('Delivery phase shows the flow-note instead of a gate', await g.evaluate(()=>{
  const delivery = document.querySelector('#phase-04');
  return !!delivery.querySelector('.stagegate--flow') && !delivery.querySelector('.stagegate:not(.stagegate--flow)');
}));

// timeline gate diamonds match the same five gates, positioned before their loop rows
const tlGates = await g.evaluate(()=>[...document.querySelectorAll('.tl__row[data-row="gate"]')].map(r=>r.dataset.gate));
ok('timeline has gates 0-4 in order', tlGates.join(',')==='0,1,2,3,4', tlGates.join(','));

// differentiation column: 18 rows on the framework page, zero on the case page
const c2 = await b.newPage({ viewport:{width:1440,height:900} });
await c2.goto(C);
ok('framework page has 18 differentiation cells', await g.evaluate(()=>document.querySelectorAll('.airow p.diff').length)===18);
// AD-15 collapsed the phase table to two client-facing columns on BOTH pages, so the
// case page now carries the differentiator column it previously had by design omitted.
// The old expectation (zero diff cells here) is reversed deliberately, not weakened:
// the checks below are strictly stronger — they pin both columns on both pages and
// assert the retired four-column class is gone.
ok('case page has 18 differentiation cells', await c2.evaluate(()=>document.querySelectorAll('.airow p.diff').length)===18);
ok('framework page has 18 delivery cells', await g.evaluate(()=>document.querySelectorAll('.airow p.deliver').length)===18);
ok('case page has 18 delivery cells', await c2.evaluate(()=>document.querySelectorAll('.airow p.deliver').length)===18);
for (const [n,pg] of [['framework',g],['case',c2]]) {
  ok(`${n}: no four-column rows remain`, await pg.evaluate(()=>document.querySelectorAll('.airow--4col').length)===0);
  ok(`${n}: every phase table heads two columns`, await pg.evaluate(()=>{
    const heads=[...document.querySelectorAll('.airow--head')];
    return heads.length===6 && heads.every(h=>h.querySelectorAll('span').length===2); }));
  // The delivery cell carries the human-decision authority the third column used to hold.
  ok(`${n}: block heading no longer claims AI provenance`, await pg.evaluate(()=>
    [...document.querySelectorAll('.aiblock h4, .phase h4')].every(h=>!/AI in this phase/.test(h.textContent))));
}
await c2.close();

// hero diagram: renders, no errors, has all five gates and stations
const heroChecks = await g.evaluate(()=>{
  const svg = document.querySelector('.hero-diagram svg');
  return {
    present: !!svg,
    gateLabels: document.querySelectorAll('.hero-svg__gatename').length,
    loopBoxes: document.querySelectorAll('.hero-svg__loop').length,
    stationTitles: document.querySelectorAll('.hero-svg__station').length,
  };
});
ok('hero diagram renders with all elements', heroChecks.present && heroChecks.gateLabels===5 && heroChecks.loopBoxes===5 && heroChecks.stationTitles===6, JSON.stringify(heroChecks));
ok('hero diagram produces no page errors', gerrs.length===0, gerrs.join(' | '));

// resources page: exists, nav present on every page, link from aiblock works
const R = `${BASE}/spe-resources.html`;
const rp = await b.newPage({ viewport:{width:1440,height:900} });
const rerrs = [];
rp.on('pageerror', e=>rerrs.push(String(e)));
await rp.goto(R);
ok('resources page loads with no errors', rerrs.length===0);
ok('resources page lists 5 entries', await rp.evaluate(()=>document.querySelectorAll('.resource-row').length)===5);
ok('resources page open buttons are disabled (honest placeholder)', await rp.evaluate(()=>[...document.querySelectorAll('.resource-row__open')].every(b=>b.disabled)));
for (const [n,u] of [['framework',F],['foundry',FD],['case',C],['resources',R]]) {
  const pg = await b.newPage();
  await pg.goto(u);
  const hasNav = await pg.evaluate(()=>!!([...document.querySelectorAll('a')].find(a=>a.textContent.includes('Thought Leadership'))));
  ok(`${n}: Thought Leadership nav link present`, hasNav);
  await pg.close();
}
await g.close();
await rp.close();

// ---------- 10 · case-01 artefact section is manifest-driven ----------
// Every expectation below is read from the page's own CASE_01_ARTEFACTS manifest.
// Nothing here hard-codes a row count: add an entry to the manifest and these
// checks follow it. That is the point of the section.
const ev = await b.newPage({ viewport:{width:1440,height:900} });
const everrs = [];
ev.on('pageerror', e=>everrs.push(String(e)));
await ev.goto(C);

const man = await ev.evaluate(()=>{
  const m = window.__CASE_01_ARTEFACTS__;
  if (!Array.isArray(m)) return null;
  const byPhase = {};
  m.forEach(i=>{ (byPhase[i.phase] = byPhase[i.phase] || []).push(i); });
  return {
    total: m.length,
    ids: m.map(i=>i.id),
    kinds: m.reduce((a,i)=>{ a[i.kind]=(a[i.kind]||0)+1; return a; },{}),
    phases: Object.keys(byPhase).sort(),
    perPhase: Object.fromEntries(Object.entries(byPhase).map(([p,v])=>[p,v.length])),
    hrefs: m.filter(i=>i.kind==='document').map(i=>i.href),
    shapeOk: m.every(i=>
      i.id && i.phase && i.title && i.kind && i.description
      && (i.kind!=='document' || !!i.href)
      && (i.kind!=='content'  || !!i.body)
      && (i.kind!=='pending'  || (!i.body && !i.href))),
    idsMatchPhase: m.every(i=>i.id.startsWith(i.phase + '-')),
    uniqueIds: new Set(m.map(i=>i.id)).size === m.length,
  };
});
ok('case: artefact manifest is exposed and well formed', !!man && man.shapeOk && man.uniqueIds && man.idsMatchPhase,
   man ? JSON.stringify(man.kinds) : 'manifest missing');

// show every phase so all six evidence blocks are in the DOM at once
await ev.locator('#show-all').click();

const rendered = await ev.evaluate(()=>{
  const rows = [...document.querySelectorAll('.evidence-row')];
  const perPhase = {};
  [...document.querySelectorAll('.evidence[data-phase]')].forEach(block=>{
    perPhase[block.dataset.phase] = block.querySelectorAll('.evidence-row').length;
  });
  return {
    total: rows.length,
    ids: rows.map(r=>r.dataset.slot),
    perPhase,
    caps: Object.fromEntries([...document.querySelectorAll('[data-evidence-count]')]
      .map(c=>[c.dataset.evidenceCount, c.textContent.trim()])),
    kinds: rows.reduce((a,r)=>{ a[r.dataset.kind]=(a[r.dataset.kind]||0)+1; return a; },{}),
    contentHasDisclosure: rows.filter(r=>r.dataset.kind==='content')
      .every(r=>!!r.querySelector('details.evidence-row__disclosure > summary')),
    contentHasBody: rows.filter(r=>r.dataset.kind==='content')
      .every(r=>(r.querySelector('.evidence-row__body')?.textContent ?? '').trim().length > 0),
    docsHaveLinks: rows.filter(r=>r.dataset.kind==='document')
      .every(r=>!!r.querySelector('a.evidence-row__preview[target="_blank"][rel="noopener"]')),
    pendingHasNoBody: rows.filter(r=>r.dataset.kind==='pending')
      .every(r=>!r.querySelector('.evidence-row__body') && !r.querySelector('a')),
    allCollapsed: [...document.querySelectorAll('.evidence-row__disclosure')].every(d=>!d.open),
  };
});

ok('case: rendered row count equals the manifest', rendered.total===man.total, rendered.total+' vs '+man.total);
ok('case: rendered rows are exactly the manifest ids',
   rendered.ids.slice().sort().join('|')===man.ids.slice().sort().join('|'));
ok('case: rows keep manifest order within each phase', man.phases.every(p=>{
  const wanted = man.ids.filter(id=>id.startsWith(p + '-')).join('|');
  const got = rendered.ids.filter(id=>id.startsWith(p + '-')).join('|');
  return wanted===got;
}));
ok('case: per-phase row counts equal the manifest',
   man.phases.every(p=>rendered.perPhase[p]===man.perPhase[p]), JSON.stringify(rendered.perPhase));
ok('case: rendered kinds equal the manifest kinds',
   JSON.stringify(rendered.kinds)===JSON.stringify(man.kinds), JSON.stringify(rendered.kinds));
ok('case: every count label is derived from the manifest', man.phases.every(p=>{
  const label = rendered.caps[p] || '';
  return label.startsWith(man.perPhase[p] + ' artefact');
}), JSON.stringify(rendered.caps));
ok('case: every content row is an expandable disclosure with real substance',
   rendered.contentHasDisclosure && rendered.contentHasBody);
ok('case: every document row links out in a new tab', rendered.docsHaveLinks);
ok('case: pending rows carry no body and no link', rendered.pendingHasNoBody);
ok('case: rows start collapsed', rendered.allCollapsed);
ok('case: artefact section raises no page errors', everrs.length===0, everrs.join(' | '));

// keyboard + ARIA on the first content row
const kb = await ev.evaluate(async ()=>{
  const row = document.querySelector('.evidence-row[data-kind="content"]');
  const summary = row.querySelector('summary');
  summary.focus();
  const focused = document.activeElement===summary;
  const before = summary.getAttribute('aria-expanded');
  summary.click();
  await new Promise(r=>setTimeout(r,30));
  const after = summary.getAttribute('aria-expanded');
  const open = row.querySelector('details').open;
  summary.click();
  await new Promise(r=>setTimeout(r,30));
  return { focused, before, after, open, closed: summary.getAttribute('aria-expanded') };
});
ok('case: disclosure is focusable and reports correct ARIA state',
   kb.focused && kb.before==='false' && kb.after==='true' && kb.open && kb.closed==='false',
   JSON.stringify(kb));

// heading order inside expanded bodies must not break the document outline
await ev.evaluate(()=>{ document.querySelectorAll('.evidence-row__disclosure').forEach(d=>{ d.open = true; }); });
const outline = await ev.evaluate(()=>{
  const hs=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h=>+h.tagName[1]);
  let skips=0; for(let i=1;i<hs.length;i++) if(hs[i]>hs[i-1]+1) skips++;
  return skips;
});
ok('case: heading order holds with every artefact expanded', outline===0, String(outline));

// no horizontal overflow at 390px with everything expanded
const evm = await b.newPage({ viewport:{width:390,height:844} });
await evm.goto(C);
await evm.locator('#show-all').click();
await evm.evaluate(()=>{ document.querySelectorAll('.evidence-row__disclosure').forEach(d=>{ d.open = true; }); });
ok('case: no horizontal overflow at 390px with every artefact expanded',
   await evm.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),
   await evm.evaluate(()=>document.documentElement.scrollWidth+'px'));
await evm.close();

// the section still says something useful with JavaScript switched off
const nojsCtx = await b.newContext({ viewport:{width:1440,height:900}, javaScriptEnabled:false });
const nojs = await nojsCtx.newPage();
await nojs.goto(C);
const fallback = await nojs.evaluate(()=>{
  const blocks=[...document.querySelectorAll('.evidence[data-phase]')];
  return {
    blocks: blocks.length,
    // <noscript> content is inert markup when scripting is off; read it as text
    everyBlockHasFallback: blocks.every(b=>{
      const ns=b.querySelector('noscript');
      return !!ns && (ns.textContent||'').trim().length>40;
    }),
    linkCount: (document.body.innerHTML.match(/nhs-feedback-dashboard-v5_1\.html|nhs-performance-analytics\.html/g)||[]).length,
  };
});
ok('case: artefact section is not empty with JavaScript disabled',
   fallback.blocks===6 && fallback.everyBlockHasFallback, JSON.stringify(fallback));
ok('case: both attached prototypes stay reachable with JavaScript disabled',
   fallback.linkCount>=man.hrefs.length, String(fallback.linkCount));
await nojsCtx.close();

// every document href actually resolves
if (!BASE.startsWith('file://')) {
  const origin = new URL(BASE).origin;
  const codes = [];
  for (const href of man.hrefs) {
    const r = await ev.request.get(new URL(href, origin).href);
    codes.push(href + '=' + r.status());
  }
  ok('case: every attached artefact link resolves', codes.every(c=>c.endsWith('=200')), codes.join(', '));
}

// commercial exclusions must not appear anywhere in the rendered page
// The commercial exclusion covers the LOI value, the named prospect trust, pricing,
// pipeline, revenue/ARR targets and addressable-market figures. The exclusion applies
// to this repository as well as to the page, so this guard must not restate any of the
// excluded values in order to look for them. It works two ways instead:
//
//   1 · category terms, which are safe to name because they are labels, not figures;
//   2 · a monetary sweep that fails on ANY £ figure other than the two the exclusion
//       permits (staff time saved and CQC remediation cost, neither of which is
//       pricing, revenue or market sizing). That is a stronger guard than a blocklist
//       of known-bad values: it also catches a figure nobody has thought of yet.
//
// `ARR` and `LOI` are matched case-sensitively and on word boundaries -- a lower-cased
// substring search hits "narrative", "arrives" and "carried". `pipeline` is deliberately
// not matched as a bare word: this page used it for the CI and ingest pipelines before
// this change, and the exclusion does not cover that sense, so only the commercial
// senses are matched. No trust name is matched, because naming one here would put it in
// the repository -- the whole commercial gate is omitted from the page instead.
const EXCLUSIONS = [
  { source: '\\bARR\\b',          flags: '',  label: 'ARR' },
  { source: '\\bLOI\\b',          flags: '',  label: 'LOI' },
  { source: 'letter of intent',   flags: 'i', label: 'letter of intent' },
  { source: '\\bpricing\\b',      flags: 'i', label: 'pricing' },
  { source: 'entry price',        flags: 'i', label: 'entry price' },
  { source: 'revenue target',     flags: 'i', label: 'revenue target' },
  { source: 'addressable market', flags: 'i', label: 'addressable market' },
  { source: 'per annum',          flags: 'i', label: 'per annum' },
  { source: 'sales pipeline|pipeline projects', flags: 'i', label: 'commercial pipeline' },
];
// The only monetary figures the exclusion allows on this page. Both are cost-avoidance
// figures in the return case, not pricing, revenue or market sizing.
const PERMITTED_FIGURES = ['£15k', '£200k'];
const hits = await ev.evaluate(({ terms, permitted }) => {
  const text = document.documentElement.innerHTML;
  const found = terms.filter(t => new RegExp(t.source, t.flags).test(text)).map(t => t.label);
  const money = [...text.matchAll(/£\s?\d[\d.,–-]*\s?(?:k|m|bn)?/gi)]
    .map(m => m[0].replace(/\s/g, ''))
    .filter(m => !permitted.includes(m));
  if (money.length) { found.push('unpermitted monetary figure: ' + [...new Set(money)].join(' ')); }
  return found;
}, { terms: EXCLUSIONS, permitted: PERMITTED_FIGURES });
ok('case: no commercially sensitive term appears on the page', hits.length===0, hits.join(', '));
await ev.close();

console.log('\n' + (fails.length===0 ? 'ALL CHECKS PASSED' : 'FAILURES: ' + fails.join(' | ')));
await b.close();
