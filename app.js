(function(){
const $ = id => document.getElementById(id);
const chat = $('chat');
const {G, A, BASIC} = window.GEN;
const history = [];            // for Claude API
let pending = null;            // waiting for a button answer {type, ...}

/* ---------- settings ---------- */
const FIELDS = ['gmx','input','top','proc','solv','p_em','p_nvt','p_npt','p_md','traj','ff','water','box','dist','conc','temp','dt','nvt_ps','npt_ps','md_ns','mdrun','model'];
const NUM = ['dist','conc','temp','dt','nvt_ps','npt_ps','md_ns'];
function loadSettings(){
  try{
    const s = JSON.parse(localStorage.getItem('vbc_settings')||'{}');
    FIELDS.forEach(k=>{ if(s[k]!==undefined && $(k)) $(k).value = s[k]; });
    $('useapi').checked = !!s.useapi;
  }catch(e){}
  try{ $('apikey').value = sessionStorage.getItem('vbc_key')||''; }catch(e){}
}
function saveSettings(){
  const s = {}; FIELDS.forEach(k=> s[k] = $(k).value); s.useapi = $('useapi').checked;
  try{ localStorage.setItem('vbc_settings', JSON.stringify(s)); }catch(e){}
  try{ sessionStorage.setItem('vbc_key', $('apikey').value.trim()); }catch(e){}
}
function cfg(over){
  const c = {};
  FIELDS.forEach(k=>{ let v = $(k).value.trim(); if(NUM.includes(k)){ v = parseFloat(v); if(!isFinite(v)||v<=0) v = {dist:1,conc:0.15,temp:300,dt:0.002,nvt_ps:100,npt_ps:100,md_ns:10}[k]; } c[k]=v; });
  c.gmx = c.gmx || 'gmx';
  return Object.assign(c, over||{});
}

/* ---------- rendering ---------- */
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function inline(t){
  return esc(t).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
}
function md(text){
  const out = []; const parts = text.split(/(^|\n)(```|~~~)[a-z]*\n([\s\S]*?)\n\2(?=\n|$)/);
  // simple scan instead of complex split
  const re = /(```|~~~)[a-z]*\n([\s\S]*?)\n\1/g; let last = 0, m; const html = [];
  while((m = re.exec(text))){ html.push(prose(text.slice(last,m.index))); html.push({code:m[2]}); last = re.lastIndex; }
  html.push(prose(text.slice(last)));
  return html;
}
function prose(t){
  t = t.trim(); if(!t) return '';
  return t.split(/\n{2,}/).map(par=>{
    const lines = par.split('\n');
    if(lines.every(l=>/^\s*[-*] /.test(l))) return '<ul>'+lines.map(l=>'<li>'+inline(l.replace(/^\s*[-*] /,''))+'</li>').join('')+'</ul>';
    return '<p>'+lines.map(inline).join('<br>')+'</p>';
  }).join('');
}
function addMsg(who, text, opts){
  opts = opts || {};
  const wrap = document.createElement('div'); wrap.className = 'msg ' + who;
  if(who==='bot'){ const im = document.createElement('img'); im.src='avatar.png'; im.alt=''; im.className='avatar'; wrap.appendChild(im); }
  const b = document.createElement('div'); b.className = 'bubble';
  if(who==='user'){ b.textContent = text; }
  else{
    md(text).forEach(part=>{
      if(typeof part==='string'){ b.insertAdjacentHTML('beforeend', part); }
      else{
        const tools = document.createElement('div'); tools.className='tools';
        const cp = document.createElement('button'); cp.textContent='Copy';
        cp.onclick = ()=>{ navigator.clipboard.writeText(part.code).then(()=>{cp.textContent='Copied';setTimeout(()=>cp.textContent='Copy',1200);}); };
        tools.appendChild(cp);
        if(opts.file){ const dl = document.createElement('button'); dl.textContent='Download '+opts.file;
          dl.onclick = ()=> download(opts.file, part.code); tools.appendChild(dl); }
        const pre = document.createElement('pre'); const code = document.createElement('code'); code.textContent = part.code; pre.appendChild(code);
        b.appendChild(tools); b.appendChild(pre);
      }
    });
  }
  if(opts.buttons){
    const d = document.createElement('div'); d.className='opts';
    opts.buttons.forEach(([label,q])=>{ const x = document.createElement('button'); x.textContent=label; x.onclick=()=>{ d.remove(); send(q); }; d.appendChild(x); });
    b.appendChild(d);
  }
  wrap.appendChild(b); chat.appendChild(wrap); chat.scrollTop = chat.scrollHeight;
  return b;
}
function download(name, text){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text.replace(/\r\n/g,'\n')],{type:'text/plain'}));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
const script = (title, code, file, extra, buttons) => addMsg('bot', title + '\n\n```bash\n' + code + '\n```' + (extra? '\n\n'+extra : ''), {file, buttons});

/* ---------- intent detection ---------- */
const has = (q, words) => words.some(w => q.includes(w));
function fileOverrides(q){
  const o = {}; const re = /([\w.\-\/]+)\.(gro|xtc|trr|edr|tpr|pdb|cpt|top)\b/gi; let m;
  while((m = re.exec(q))){
    const base = m[1], ext = m[2].toLowerCase();
    if(ext==='xtc'||ext==='trr'){ o.traj = ext; o.p_md = base; }
    else if(ext==='tpr'||ext==='edr'||ext==='cpt'){ o.p_md = base; }
    else if(ext==='pdb'){ o.input = base+'.pdb'; }
    else if(ext==='gro'){ o.input = base+'.gro'; }
    else if(ext==='top'){ o.top = base+'.top'; }
  }
  return o;
}
function pickAnalyses(q){
  const padded = ' '+q.replace(/[^a-z0-9\- ]/g,' ')+' ';
  return Object.keys(A).filter(id => A[id].keys.some(k => padded.includes(' '+k.trim()+' ') || (k.trim().length>5 && padded.includes(k.trim()))));
}
function emAlg(q){
  if(/\bcg\b|conjugate/.test(q)) return 'cg';
  if(/steep|sd\b/.test(q)) return 'steep';
  return null;
}
function search(q){
  const toks = q.split(/[^a-z0-9_\-+.]+/).filter(t=>t.length>1);
  const KB = window.KB; let best = null, bs = 0;
  const all = [];
  KB.commands.forEach(e=> all.push({e, kind:'cmd', title:'gmx '+e.name, keys:[e.name].concat(e.keys), text:e.text}));
  KB.topics.forEach(e=> all.push({e, kind:'topic', title:e.title, keys:e.keys, text:e.text}));
  KB.trouble.forEach(e=> all.push({e, kind:'trouble', title:e.title, keys:e.keys, text:e.text}));
  all.forEach(it=>{
    let s = 0;
    it.keys.forEach(k=>{ k = k.toLowerCase(); if(q.includes(k)) s += 2 + k.length/10; });
    toks.forEach(t=>{ if(it.keys.some(k=>k.toLowerCase()===t)) s += 3; });
    if(s>bs){ bs = s; best = it; }
  });
  return bs >= 2 ? best : null;
}
function mdpLookup(q){
  const hits = window.KB.mdp.filter(([n]) => {
    const re = new RegExp('(^|[^a-z0-9_-])' + n.toLowerCase().replace(/[-_]/g,'[-_]') + '($|[^a-z0-9_-])');
    return re.test(q.replace(/_/g,'-'));
  });
  if(!hits.length) return null;
  hits.sort((a,b)=>b[0].length-a[0].length);
  return hits.slice(0,4).map(([n,t])=>'**'+n+'**: '+t).join('\n\n');
}

const HELP = `I can generate **bash scripts** and answer GROMACS questions offline. Try:
- "full workflow" or "run everything"
- "system preparation", "energy minimization", "equilibration" (or "nvt" / "npt"), "production run"
- "pbc correction", "analysis" (or a specific one: rmsd, rmsf, gyrate, hbond, sasa, dssp, cluster, pca, rdf, msd, energy)
- "how do I extend a run", "what does tau-p do", "LINCS warnings", "gmx trjconv"
- "plot xvg" for a Python plotting script

Open **Settings** to set file names (.gro, .tpr, .edr, .xtc/.trr), force field, water model, box and run lengths. You can also type file names in a message, e.g. "rmsd and rmsf for run1.xtc".`;

async function ask(q, raw){
  const lq = q.toLowerCase();
  const over = fileOverrides(q);
  const c = cfg(over);

  // pending EM algorithm
  if(pending && pending.type==='em'){
    const a = emAlg(lq);
    if(a){ const p = pending; pending = null;
      if(p.full){ return emitFull(c, a); }
      return emitEM(c, a); }
    pending = null;
  }

  if(/^(help|\?|hi|hello|hey|menu)\b/.test(lq)) return addMsg('bot', HELP);

  const wantFull = has(lq, ['full','entire','whole','everything','complete','all steps','all-in-one','end to end','run_all','pipeline']) && !has(lq,['analysis only']);
  if(wantFull && !has(lq,['full analysis'])){
    const a = emAlg(lq);
    if(!a) return askEM(true);
    return emitFull(c, a);
  }
  if(/plot.*xvg|xvg.*plot|plot script|matplotlib script/.test(lq))
    return script('Python script to plot any .xvg files:', G.plot(c), 'plot_xvg.py', 'Run: python plot_xvg.py rmsd.xvg rmsf.xvg (needs numpy and matplotlib).');

  // numbered shortcuts from the quick buttons
  if(/^1[.)]|system prep|prepar|pdb2gmx|solvat|add ions|genion setup|topology setup|set ?up the system|build (the )?system/.test(lq)) return emitPrep(c);
  if(/^2[.)]|minimi|steep|conjugate|\bcg\b|\bem\b/.test(lq)){
    const a = emAlg(lq); return a ? emitEM(c,a) : askEM(false);
  }
  if(/^3[.)]|equilib|\bnvt\b|\bnpt\b/.test(lq)){
    if(/\bnvt\b/.test(lq) && !/\bnpt\b/.test(lq) && !/equilib/.test(lq)) return script('NVT equilibration ('+c.nvt_ps+' ps, position restraints on the protein, '+c.temp+' K):', G.nvt(c), 'nvt.sh', notes(c));
    if(/\bnpt\b/.test(lq) && !/\bnvt\b/.test(lq) && !/equilib/.test(lq)) return script('NPT equilibration ('+c.npt_ps+' ps, C-rescale barostat, 1 bar):', G.npt(c), 'npt.sh', notes(c));
    return script('Equilibration: NVT then NPT, with restraints on heavy atoms:', G.equil(c), 'equilibration.sh', notes(c)+' Check temperature, pressure and density plots before production.');
  }
  if(/^4[.)]|production|prod run|\bmd run\b|run the simulation|main simulation/.test(lq))
    return script('Production run ('+c.md_ns+' ns, dt '+c.dt+' ps, '+c.traj+' output):', G.prod(c), 'production.sh', notes(c)+' To change length edit "nsteps" (ns * 1000 / dt).');
  if(/^5[.)]|pbc|periodic boundary|center|centre|make whole|nojump|unwrap|broken molecule/.test(lq) && !pickAnalyses(lq).length)
    return script('PBC correction and fitting:', G.pbc(c), 'pbc_correct.sh', 'Do this once, then run all analysis on the "'+c.p_md+'_fit.'+c.traj+'" file.');

  if(/analysis menu|analyse|analyze|analysis/.test(lq) || pickAnalyses(lq).length){
    const ids = pickAnalyses(lq);
    if(/basic|standard|all analys|every analys|default/.test(lq)) return emitAnalysis(c, BASIC);
    if(ids.length) return emitAnalysis(c, ids);
    return addMsg('bot','Which analysis? Pick one, or ask for the basic set (RMSD, RMSF, Rg, H-bonds, SASA, energies).',{buttons:[['Basic set','basic analysis'],['RMSD','rmsd'],['RMSF','rmsf'],['Radius of gyration','gyrate'],['H-bonds','hbond'],['SASA','sasa'],['DSSP','dssp'],['Energies','energy'],['Cluster','cluster'],['PCA','pca'],['RDF','rdf'],['MSD','msd']]});
  }

  // mdp parameter lookup
  const mp = mdpLookup(lq);
  if(mp) return addMsg('bot', mp + '\n\nSee the full list: https://manual.gromacs.org/current/user-guide/mdp-options.html');

  // knowledge base
  const hit = search(lq);
  if(hit) return addMsg('bot', '**'+hit.title+'**\n\n'+hit.text);

  // optional Claude API
  if($('useapi').checked && $('apikey').value.trim()) return askClaude(q, c);

  addMsg('bot', "I did not find that in my offline knowledge base. Try rephrasing with a GROMACS command or mdp option name (for example 'gmx trjconv' or 'tau-p'), type 'help' for examples, or turn on the Claude API in Settings for open questions.");
}

function notes(c){ return GEN_NOTE(c); }
function GEN_NOTE(c){
  const f = c.ff;
  let n = 'Force field '+f+' with '+c.water+'. ';
  if(/^charmm/.test(f)) n += 'CHARMM needs the force-field folder in your working directory (charmm36 is a separate download).';
  return n;
}
function emitPrep(c){
  return script('System preparation (pdb2gmx, box, solvation, ions):', G.prep(c), 'prepare_system.sh', 'Output: "'+c.solv+'" and "'+c.top+'". Clean the pdb first (remove waters/ligands you do not want, fix missing atoms). Next: energy minimization.');
}
function emitEM(c, a){
  return script('Energy minimization with '+(a==='cg'?'conjugate gradient (flexible bonds, no constraints)':'steepest descent')+':', G.em(c,a), 'minimize_'+a+'.sh', 'Success: "converged to Fmax < 1000". Want the other algorithm?', [[a==='cg'?'Show steepest descent':'Show conjugate gradient', 'minimization '+(a==='cg'?'steep':'cg')]]);
}
function askEM(full){
  pending = {type:'em', full};
  addMsg('bot', 'Which minimizer should I use: steepest descent (robust, good start) or conjugate gradient (efficient near the minimum, no constraints)?', {buttons:[['Steepest descent','steep'],['Conjugate gradient','cg']]});
}
function emitFull(c, a){
  script('Full workflow script (' + (a==='cg'?'conjugate gradient':'steepest descent') + ' minimization). Save as run_all.sh, then: bash run_all.sh', G.full(c,a), 'run_all.sh',
    'Needs the input file "'+c.input+'" in the same folder. Equilibration checks (temperature, pressure, density) are written as .xvg files; inspect them before trusting production data.');
}
function emitAnalysis(c, ids){
  const labels = ids.map(i=>A[i].label).join(', ');
  script('Analysis: '+labels+'.', G.analysis(c, ids), 'analysis.sh', 'Uses "'+c.p_md+'.tpr" and "'+c.p_md+'_fit.'+c.traj+'". Run the PBC step first. Ask "plot xvg" for a plotting script.');
}

/* ---------- Claude API ---------- */
async function askClaude(q, c){
  const sys = 'You are Virtual Bio-Chemist, a concise GROMACS expert. Answer using the GROMACS manual (2023-2024 series) and mention version caveats. Provide bash in ```bash blocks. Use gmx as the command prefix unless told otherwise. Current user settings: ' + JSON.stringify(c) + '. Never invent options; if unsure say so and point to gmx help <command>.';
  history.push({role:'user', content:q});
  const holder = addMsg('bot','Thinking...');
  try{
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'content-type':'application/json','x-api-key':$('apikey').value.trim(),'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body: JSON.stringify({model:$('model').value.trim()||'claude-sonnet-5-5', max_tokens:1500, system:sys, messages:history.slice(-12)})
    });
    const d = await r.json();
    if(!r.ok) throw new Error((d.error && d.error.message) || r.status);
    const text = (d.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
    history.push({role:'assistant', content:text});
    holder.closest('.msg').remove();
    addMsg('bot', text);
  }catch(e){
    history.pop();
    holder.closest('.msg').remove();
    addMsg('bot','Claude API error: '+e.message+'. Check the key, model name and network, or turn the option off in Settings.');
  }
}

/* ---------- wiring ---------- */
function send(q){
  q = (q||'').trim(); if(!q) return;
  addMsg('user', q);
  Promise.resolve(ask(q)).catch(e=> addMsg('bot','Error: '+e.message));
}
$('composer').addEventListener('submit', e=>{ e.preventDefault(); const v = $('msg').value; $('msg').value=''; send(v); });
$('quick').addEventListener('click', e=>{ const q = e.target.dataset && e.target.dataset.q; if(q) send(q); });
$('btnSettings').addEventListener('click', ()=>{ const s = $('settings'); s.hidden = !s.hidden; $('btnSettings').setAttribute('aria-expanded', String(!s.hidden)); });
$('btnSave').addEventListener('click', ()=>{ saveSettings(); $('settings').hidden = true; $('btnSettings').setAttribute('aria-expanded','false'); addMsg('bot','Settings saved. New scripts will use them.'); });

loadSettings();
addMsg('bot', "Hello, I am your Virtual Bio-Chemist for GROMACS. I can write the scripts for system preparation, energy minimization, equilibration, production and PBC correction with analysis, or answer questions about commands and mdp options.\n\nUse the buttons below, or type what you need. Set your file names in **Settings** first if you like.");
})();
