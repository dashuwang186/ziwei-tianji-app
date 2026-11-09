const $ = (s) => document.querySelector(s);
const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
let LAST = null;

function refreshKeyState(){
  const ready = !!(localStorage.getItem('zw_api_base') && localStorage.getItem('zw_api_key'));
  const model = localStorage.getItem('zw_model') || 'MiniMax-M3.1-Flash';
  $('#keySummary').textContent = ready ? 'MiniMax 已配置 · '+model : '模型配置（MiniMax）';
}

(function applySetup(){
  const m = location.hash.match(/^#setup=([A-Za-z0-9_-]+)$/);
  if(!m) return;
  try{
    const b64 = m[1].replace(/-/g,'+').replace(/_/g,'/');
    const bin = atob(b64.padEnd(Math.ceil(b64.length/4)*4,'='));
    const bytes = Uint8Array.from(bin, c=>c.charCodeAt(0));
    const cfg = JSON.parse(new TextDecoder().decode(bytes));
    if(cfg.base) localStorage.setItem('zw_api_base', cfg.base);
    if(cfg.key) localStorage.setItem('zw_api_key', cfg.key);
    if(cfg.model) localStorage.setItem('zw_model', cfg.model);
    history.replaceState(null, '', location.pathname+location.search);
    setTimeout(()=>alert('MiniMax 已配置到这台手机'), 250);
  }catch(e){
    console.error('配置导入失败', e);
  }
})();

$('#targetYear').value = new Date().getFullYear();

function fmtStar(s){ return s.name + (s.brightnessRaw ? '('+s.brightnessRaw+')' : '') + (s.siHua ? '化'+s.siHua : ''); }

function chartText(b, c, patterns, year){
  const L=[];
  L.push('【基本信息】');
  L.push('公历 '+b.year+'-'+b.month+'-'+b.day+' '+BR[b.hour]+'时 · '+(b.gender==='male'?'男':'女')+(b.city?' · '+b.city:''));
  L.push('农历 '+c.lunarInfo.lunarYear+'年'+(c.lunarInfo.isLeapMonth?'闰':'')+Math.abs(c.lunarInfo.lunarMonth)+'月'+c.lunarInfo.lunarDay+'日');
  L.push('四柱 '+(c.lunarInfo.fourPillars||[]).join(' ')+' · '+c.wuxingJuName+' · 命主'+(c.mingZhu||'-')+' 身主'+(c.shenZhu||'-')+' '+(c.yinYangGender||''));
  L.push('命宫在'+BR[c.mingGongBranch]+' · 身宫在'+BR[c.shenGongBranch]);
  L.push('');
  for(const p of [...c.palaces].sort((a,b)=>a.branch-b.branch)){
    const s=p.stars;
    const major=s.filter(x=>x.type==='major').map(fmtStar).join(' ')||'—';
    const other=s.filter(x=>x.type!=='major').map(fmtStar).join(' ')||'—';
    const tags=[p.isMingGong?'命宫':'',p.isShenGong?'身宫':'',p.isCurrentDaXian?'当前大限':''].filter(Boolean).join('/');
    const self=(p.selfSihua&&p.selfSihua.length)?' 宫干自化：'+p.selfSihua.map(x=>x.starName+'化'+x.siHua).join('、'):'';
    L.push(BR[p.branch]+'宫 '+STEMS[p.stem]+' '+p.name+(tags?'（'+tags+'）':'')+' '+(p.daXianAge?p.daXianAge[0]+'-'+p.daXianAge[1]+'岁':''));
    L.push('  主星：'+major);
    L.push('  辅星：'+other+self);
  }
  L.push('');
  L.push('【大限】');
  c.daXians.forEach((d,i)=>{ const sh=d.siHua?('（'+d.siHua.stemName+'：'+d.siHua.lu+'禄 '+d.siHua.quan+'权 '+d.siHua.ke+'科 '+d.siHua.ji+'忌）'):''; L.push(d.startAge+'-'+d.endAge+'岁 '+d.palaceName+sh+(i===c.currentDaXianIndex?' ←当前':'')); });
  const ln = ZiweiBundle.Ziwei.liunian(year);
  L.push('');
  L.push('【'+year+' 流年四化】'+ln.stemName+'年：'+ln.lu+'化禄 '+ln.quan+'化权 '+ln.ke+'化科 '+ln.ji+'化忌');
  L.push('');
  L.push('【格局】'+(patterns.length? patterns.map(p=>p.name+(p.description?'：'+p.description:'')).join('；') : '未检出明显格局'));
  return L.join('\n');
}

function render(b, c, patterns){
  $('#summary').textContent =
    '公历 '+b.year+'-'+b.month+'-'+b.day+' '+BR[b.hour]+'时 · '+(b.gender==='male'?'男':'女')+(b.city?' · '+b.city:'')+'\n'+
    '农历 '+c.lunarInfo.lunarYear+'年'+(c.lunarInfo.isLeapMonth?'闰':'')+Math.abs(c.lunarInfo.lunarMonth)+'月'+c.lunarInfo.lunarDay+'日 · '+(c.lunarInfo.fourPillars||[]).join(' ')+'\n'+
    c.wuxingJuName+' · 命主'+(c.mingZhu||'-')+' 身主'+(c.shenZhu||'-')+' '+(c.yinYangGender||'')+'\n命宫在'+BR[c.mingGongBranch]+' · 身宫在'+BR[c.shenGongBranch];

  const ph=[];
  for(const p of [...c.palaces].sort((a,b)=>a.branch-b.branch)){
    const major=p.stars.filter(x=>x.type==='major').map(fmtStar).join(' ')||'—';
    const other=p.stars.filter(x=>x.type!=='major').map(fmtStar).join(' ')||'—';
    const tags=[p.isMingGong?'命宫':'',p.isShenGong?'身宫':'',p.isCurrentDaXian?'当前大限':''].filter(Boolean).map(t=>'<span class="tag">'+t+'</span>').join('');
    const self=(p.selfSihua&&p.selfSihua.length)?'<div class="hint">宫干自化：'+p.selfSihua.map(x=>x.starName+'化'+x.siHua).join('、')+'</div>':'';
    ph.push('<div class="p"><b>'+BR[p.branch]+'宫 '+STEMS[p.stem]+' · '+p.name+'</b> '+tags+'<div>主星：'+major+'</div><div class="hint">辅星：'+other+'</div>'+self+'</div>');
  }
  $('#palaces').innerHTML = ph.join('');

  const eh=[];
  c.daXians.forEach((d,i)=>{ const sh=d.siHua?('（'+d.siHua.stemName+'：'+d.siHua.lu+'禄 '+d.siHua.quan+'权 '+d.siHua.ke+'科 '+d.siHua.ji+'忌）'):''; eh.push('<div>'+d.startAge+'-'+d.endAge+'岁 '+d.palaceName+sh+(i===c.currentDaXianIndex?' ←当前':'')+'</div>'); });
  const ln = ZiweiBundle.Ziwei.liunian(Number($('#targetYear').value||new Date().getFullYear()));
  eh.push('<div style="margin-top:8px">'+ln.stemName+'年流年四化：'+ln.lu+'化禄 · '+ln.quan+'化权 · '+ln.ke+'化科 · '+ln.ji+'化忌</div>');
  eh.push('<div style="margin-top:8px">格局：'+(patterns.length?patterns.map(p=>p.name).join('、'):'未检出明显格局')+'</div>');
  $('#extra').innerHTML = eh.join('');
}

function doChart(){
  const b={ year:+$('#year').value, month:+$('#month').value, day:+$('#day').value,
            hour:+$('#hour').value, gender:$('#gender').value, city:$('#city').value.trim(), name:$('#name').value.trim() };
  if(!b.year||!b.month||!b.day){ alert('请填写出生年月日'); return; }
  try{
    const r = ZiweiBundle.Ziwei.chart(b);
    LAST = { b:b, chart:r.chart, patterns:r.patterns };
    render(b, r.chart, r.patterns);
    $('#result').classList.remove('hidden');
    $('#result').scrollIntoView({behavior:'smooth'});
  }catch(e){ alert('排盘失败：'+e.message); }
}

function promptText(){
  if(!LAST) return '';
  const year = $('#targetYear').value||new Date().getFullYear();
  const text = chartText(LAST.b, LAST.chart, LAST.patterns, year);
  return '你是倪海厦《天纪》紫微斗数体系的解读者。请按以下结构解读这张命盘：\n'+
    '1 命格总纲（命宫主星组合+格局+五行局，一句话定基调）\n2 三方四正（命/财帛/官禄/迁移）\n'+
    '3 四化：生年四化落宫 + 宫干自化的含义（倪师体系重点）\n4 当前大限与'+year+'流年要点\n'+
    '5 三条可执行建议与两点风险提醒（医疗/投资/婚恋只作文化参考，不给确定性结论）\n\n'+
    '命盘数据：\n'+text;
}

$('#btnChart').onclick = doChart;

$('#btnCopy').onclick = async ()=>{
  if(!LAST) return alert('先排盘');
  const t = promptText();
  try{ await navigator.clipboard.writeText(t); alert('已复制，发给 Codex/飞书即可解读'); }
  catch(e){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); alert('已复制'); }
};

$('#btnSaveKey').onclick = ()=>{
  localStorage.setItem('zw_api_base', $('#apiBase').value.trim());
  localStorage.setItem('zw_api_key', $('#apiKey').value.trim());
  localStorage.setItem('zw_model', $('#model').value.trim());
  refreshKeyState();
  alert('已存到本机浏览器');
};
$('#apiBase').value = localStorage.getItem('zw_api_base')||'';
$('#apiKey').value = localStorage.getItem('zw_api_key')||'';
$('#model').value = localStorage.getItem('zw_model')||'MiniMax-M3.1-Flash';
refreshKeyState();

$('#btnAI').onclick = async ()=>{
  if(!LAST) return alert('先排盘');
  const base = ($('#apiBase').value.trim()||localStorage.getItem('zw_api_base')||'').replace(/\/$/,'');
  const key = $('#apiKey').value.trim()||localStorage.getItem('zw_api_key')||'';
  const model = $('#model').value.trim()||'MiniMax-M3.1-Flash';
  if(!base||!key) return alert('请先在「设置模型 API」填地址和 Key（只存在本机）');
  const out = $('#aiOut'); out.textContent = '解读中…';
  try{
    const res = await fetch(base+'/chat/completions', { method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
      body: JSON.stringify({ model:model, stream:false, max_tokens:4096, temperature:0.3,
        messages:[{role:'user',content:promptText()}] }) });
    if(!res.ok){
      const raw = await res.text();
      let message = raw;
      try{ const j=JSON.parse(raw); message=(j.error&&j.error.message)||j.message||raw; }catch(e){}
      throw new Error('接口返回 '+res.status+'：'+message);
    }
    const j = await res.json();
    out.textContent = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || JSON.stringify(j).slice(0,500);
  }catch(e){ out.textContent = '解读失败：'+e.message+'\n\n可点「复制解读请求」发给 Codex；若是额度上限，请升级 MiniMax Token Plan 或购买积分。'; }
};

$('#btnSearch').onclick = ()=>{
  const kw = $('#kw').value.trim();
  if(!kw) return;
  const terms = kw.split(/\s+/).filter(Boolean);
  const idx = window.TIANJI||{};
  const hits=[];
  for(const file in idx){
    const lines = idx[file];
    for(let i=0;i<lines.length;i++){
      if(terms.every(t=>lines[i].indexOf(t)>=0)){
        hits.push({file:file, i:i, ctx: lines.slice(Math.max(0,i-1), i+2).join(' / ')});
        break;
      }
    }
  }
  hits.sort((a,b)=>a.file<b.file?-1:1);
  $('#hits').innerHTML = hits.length? hits.slice(0,40).map(h=>'<div class="hit"><div>'+h.ctx.replace(/^#+\s*/,'')+'</div><div class="src">'+h.file+' · 第'+(h.i+1)+'行</div></div>').join('') : '<div class="hint">未找到（可换个词）</div>';
};

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
