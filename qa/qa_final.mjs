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
ok('case page has zero differentiation cells (by design)', await c2.evaluate(()=>document.querySelectorAll('.airow p.diff').length)===0);
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

console.log('\n' + (fails.length===0 ? 'ALL CHECKS PASSED' : 'FAILURES: ' + fails.join(' | ')));
await b.close();
