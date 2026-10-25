/* 가사 도우미 (스토어용 · 서버 없이 폰/브라우저 안에서 동작) — 개발자 4UCare - 당연히나지 */
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LANGS={ko:'한국어',en:'영어',it:'이탈리아어',de:'독일어',fr:'프랑스어',ru:'러시아어',la:'라틴어'};
const SPEEDS=[0.1,0.2,0.4,0.6,0.8,1.0,1.2,1.4,1.6,1.8,2.0];
const BROWSER_LANG={ko:'ko-KR',en:'en-GB',it:'it-IT',de:'de-DE',fr:'fr-FR',ru:'ru-RU',la:'it-IT'};
const S={lines:[],trans:[],alt:[],det:null,token:0,libTab:'local'};

/* ───── 저장소 (이 기기 안) ───── */
function lsGet(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def;}catch(e){return def;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}
const getSongs=()=>lsGet('lyr_songs',[]);
const getCfg=()=>lsGet('lyr_cfg',{});

/* ───── 1) 언어 자동 분석 (서버 없이) ───── */
const STOP={
 it:'il lo la le gli un una uno di del della dei delle che non per con sono sei è mio mia tuo tua ma se come più già anche quando dove cuore amore vita tu io noi voi lei lui ti mi ci si e ed in al alla nel nella da'.split(' '),
 de:'der die das den dem des ein eine einen und ist nicht ich du er sie es wir ihr mit von zu auf für im am auch wie wenn dann mein dein sein nur noch schon aus bei nach über mich dich uns liebe herz'.split(' '),
 fr:'le la les un une des du de et est je tu il elle nous vous ils elles ne pas que qui dans pour sur avec mon ma mes ton ta tes au aux ce cette ses sont être avoir mais où coeur amour'.split(' '),
 en:'the a an and is are was were i you he she it we they not of to in on for with my your his her our that this be have has will can but as at by from love heart'.split(' '),
 la:'et est sunt qui quae quod non ad cum tibi nobis deus domine sum ego tu mea meus tuum tua pro sed aut enim omnes amor amo amas amat vita mors cor te me nos vos ab ex in de per dona eis requiem sanctus agnus'.split(' ')};
function detectLang(text){
  const t=text||''; const hang=(t.match(/[가-힣ㄱ-ㆎ]/g)||[]).length, cyr=(t.match(/[Ѐ-ӿ]/g)||[]).length, lat=(t.match(/[A-Za-zÀ-ɏ]/g)||[]).length;
  const total=hang+cyr+lat; if(total<2)return {lang:null,prob:0,top:[]};
  if(hang/total>0.5)return {lang:'ko',prob:1,top:[['ko',1]]};
  if(cyr/total>0.5)return {lang:'ru',prob:1,top:[['ru',1]]};
  const words=(t.toLowerCase().match(/[a-zà-ÿāēīōūăĕĭŏŭœæ']+/g)||[]); if(!words.length)return {lang:null,prob:0,top:[]};
  const sc={it:0,de:0,fr:0,en:0,la:0};
  for(const l in STOP){const set=new Set(STOP[l]); for(const w of words){if(set.has(w))sc[l]+=1;}}
  const low=t.toLowerCase();
  sc.de+=3*(low.match(/[äöüß]/g)||[]).length+0.5*words.filter(w=>/(ung|keit|lich|sch|ein)$/.test(w)).length;
  sc.fr+=3*(low.match(/[çêâîûœëï]/g)||[]).length+0.5*words.filter(w=>/(eux|euse|tion|ait|ent)$/.test(w)).length+0.4*(low.match(/\b(l'|d'|j'|qu')/g)||[]).length;
  sc.it+=2*(low.match(/[òìù]/g)||[]).length+0.5*words.filter(w=>/(zione|mente|are|ere|ire|ato|ata|ità)$/.test(w)).length+0.4*(low.match(/\b(l'|un'|dell')/g)||[]).length;
  sc.la+=0.6*words.filter(w=>/(um|us|ae|orum|ibus|tur|nt|bis|tis|mus)$/.test(w)).length+2*(low.match(/[āēīōū]/g)||[]).length;
  sc.en+=0.3*words.filter(w=>/(ing|ed|ly|'s|th)$/.test(w)).length;
  const e=Object.entries(sc).map(([l,s])=>[l,Math.exp(Math.min(s,30)/Math.max(words.length,4)*8)]); const sum=e.reduce((a,x)=>a+x[1],0);
  const top=e.map(([l,v])=>[l,v/sum]).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return {lang:top[0][0],prob:top[0][1],top};
}

/* ───── 2) 라틴어 → 이탈리아식(교회식) 발음 ───── */
function latinPron(text){
  let t=text.normalize('NFD').replace(/\p{Mn}/gu,'');
  t=t.replace(/æ/g,'e').replace(/Æ/g,'E').replace(/œ/g,'e').replace(/Œ/g,'E');
  const kc=r=>m=>(m[0]!==m[0].toLowerCase()?r.charAt(0).toUpperCase()+r.slice(1):r);
  const sub=(re,r)=>{t=t.replace(re,m=>kc(r)(m));};
  sub(/\bmihi\b/gi,'miki'); sub(/\bnihil\b/gi,'nikil'); sub(/ae|oe/gi,'e');
  t=t.replace(/(?<![stx])ti(?=[aeiou])/gi,m=>kc('zi')(m));
  sub(/ch/gi,'k'); sub(/ph/gi,'f'); sub(/th/gi,'t'); sub(/xs/gi,'ks'); sub(/x/gi,'ks'); sub(/y/gi,'i'); sub(/j/gi,'i');
  t=t.replace(/h/gi,'');
  return t;
}

/* ───── 키패드 / 한글 조합 ───── */
const KEYS={it:'àèéìíîòóùú',de:'äöüßÄÖÜ„“”',fr:'àâæçéèêëîïôœùûüÿ«»’',ru:'йцукенгшщзхъфывапролджэячсмитьбюё',
 la:'āēīōūȳăĕĭŏŭæœë',en:'’“”—…',ko:'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅒㅓㅔㅕㅖㅗㅛㅜㅠㅡㅣ'};
let shift=false;
function renderKeys(){
  const l=curLang(); let ks=[...(KEYS[l]||'')]; if(shift&&l!=='ko')ks=ks.map(k=>k.toUpperCase());
  let h=ks.map(k=>'<button type="button" data-k="'+esc(k)+'">'+esc(k)+'</button>').join('');
  if(l!=='ko'&&l!=='en')h+='<button type="button" class="fn" data-fn="shift">'+(shift?'소문자':'대문자')+'</button>';
  h+='<button type="button" class="fn" data-fn="bs">⌫</button><button type="button" class="fn" data-fn="sp">띄어쓰기</button><button type="button" class="fn" data-fn="nl">줄바꿈</button>';
  $('keys').innerHTML=h;
}
$('keys').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return; const t=$('lyr'); t.focus();
  if(b.dataset.fn==='shift'){shift=!shift;renderKeys();return;}
  if(b.dataset.fn==='bs'){const s=t.selectionStart,en=t.selectionEnd; if(s!==en)t.setRangeText('',s,en,'end'); else if(s>0)t.setRangeText('',s-1,s,'end'); changed(); return;}
  if(b.dataset.fn==='sp'){insertAt(' ');return;} if(b.dataset.fn==='nl'){insertAt('\n');return;}
  const ch=b.dataset.k; if(curLang()==='ko'&&/[ㄱ-ㅣ]/.test(ch))hangulInsert(t,ch); else insertAt(ch);
});
function insertAt(ch){const t=$('lyr');t.setRangeText(ch,t.selectionStart,t.selectionEnd,'end');t.focus();changed();}
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ',JUNG='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JP={'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
const VP={'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ','ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ','ㅡㅣ':'ㅢ'};
const JPR=Object.fromEntries(Object.entries(JP).map(([k,v])=>[v,[...k]]));
const syl=(c,j,t)=>String.fromCharCode(0xAC00+c*588+j*28+t);
function hangulCompose(prev,ch){
  const isV=JUNG.includes(ch), isC=CHO.includes(ch)||(JONG.includes(ch)&&ch!=='');
  const code=prev?prev.charCodeAt(0)-0xAC00:-1;
  if(code>=0&&code<11172){
    const c=Math.floor(code/588),j=Math.floor((code%588)/28),t=code%28;
    if(isV){
      if(t===0){const p=JUNG[j]+ch; if(VP[p])return {del:1,text:syl(c,JUNG.indexOf(VP[p]),0)}; return {del:0,text:ch};}
      const J=JONG[t];
      if(JPR[J]){const [a,b]=JPR[J]; return {del:1,text:syl(c,j,JONG.indexOf(a))+syl(CHO.indexOf(b),JUNG.indexOf(ch),0)};}
      return {del:1,text:syl(c,j,0)+syl(CHO.indexOf(J),JUNG.indexOf(ch),0)};
    }
    if(isC){
      if(t===0){if(JONG.includes(ch))return {del:1,text:syl(c,j,JONG.indexOf(ch))}; return {del:0,text:ch};}
      const p=JONG[t]+ch; if(JP[p])return {del:1,text:syl(c,j,JONG.indexOf(JP[p]))};
    }
    return {del:0,text:ch};
  }
  if(prev&&CHO.includes(prev)&&isV)return {del:1,text:syl(CHO.indexOf(prev),JUNG.indexOf(ch),0)};
  if(prev&&JUNG.includes(prev)&&isV&&VP[prev+ch])return {del:1,text:VP[prev+ch]};
  return {del:0,text:ch};
}
function hangulInsert(t,ch){const s=t.selectionStart,e=t.selectionEnd; const prev=(s===e&&s>0)?t.value[s-1]:''; const r=hangulCompose(prev,ch); t.setRangeText(r.text,s-r.del,e,'end'); t.focus(); changed();}

/* ───── 언어·줄 ───── */
function curLang(){const v=$('langSel').value; return v==='auto'?(S.det&&S.det.lang)||'it':v;}
function curSpeed(){return SPEEDS[+$('speed').value];}
function updSpeed(){$('speedLbl').textContent=curSpeed()+'배속';}
function getLines(){return $('lyr').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
let tmr=null;
function changed(){clearTimeout(tmr);tmr=setTimeout(onChange,400);renderLines();}
function onChange(){
  const txt=$('lyr').value;
  if(txt.trim().length>=2){const r=detectLang(txt); S.det=r;
    $('det').textContent=r.lang?('자동 분석: '+LANGS[r.lang]+' '+Math.round(r.prob*100)+'%'+(r.top&&r.top[1]?' (다음: '+LANGS[r.top[1][0]]+')':'')):'언어: -';
  } else {S.det=null;$('det').textContent='언어: -';}
  renderKeys(); latinNote(); fillVoices();
}
function latinNote(){
  const on=curLang()==='la'; $('latinNote').style.display=on?'block':'none';
  if(on)$('latinTxt').textContent=latinPron(getLines().slice(0,2).join(' / '))+(getLines().length>2?' ...':'');
}
$('langSel').onchange=()=>{renderKeys();latinNote();fillVoices();};
function renderLines(){
  S.lines=getLines(); const n=S.lines.length;
  if(+$('rB').value>n)$('rB').value=Math.max(n,1); if(+$('rA').value>n)$('rA').value=Math.max(n,1);
  const a=+$('rA').value,b=+$('rB').value;
  $('lines').innerHTML=S.lines.map((t,i)=>{
    const words=t.split(/(\s+)/).map(w=>/\S/.test(w)?'<span class="w">'+esc(w)+'</span>':esc(w)).join('');
    return '<div class="line'+(i+1>=a&&i+1<=b?' inr':'')+'" id="ln'+i+'"><div class="no">'+(i+1)+'</div><button class="small" data-play="'+i+'">▶</button>'+
      '<div class="txt">'+words+(S.trans[i]?'<div class="tr">'+esc(S.trans[i])+'</div>':'')+(S.alt&&S.alt[i]?'<div class="tr2">↳ '+esc(S.alt[i])+'</div>':'')+'</div>'+
      '<button class="gray small" data-a="'+(i+1)+'">A</button><button class="gray small" data-b="'+(i+1)+'">B</button></div>';
  }).join('');
}
$('lines').addEventListener('click',e=>{
  const t=e.target;
  if(t.dataset.play!==undefined){stop();playSeq(+t.dataset.play,+t.dataset.play,1);}
  else if(t.dataset.a){$('rA').value=t.dataset.a; if(+$('rB').value<+t.dataset.a)$('rB').value=t.dataset.a; renderLines();}
  else if(t.dataset.b){$('rB').value=t.dataset.b; if(+$('rA').value>+t.dataset.b)$('rA').value=t.dataset.b; renderLines();}
  else if(t.classList.contains('w'))wordClick(t.textContent);
});
['rA','rB'].forEach(i=>$(i).addEventListener('change',renderLines));

/* ───── 3) 읽어 주기 (기기에 들어 있는 원어민 음성) ───── */
let VOICES=[];
function loadVoices(){try{VOICES=speechSynthesis.getVoices()||[];}catch(e){VOICES=[];} fillVoices();}
function voicesFor(lang){
  const p=(BROWSER_LANG[lang]||'en').slice(0,2).toLowerCase();
  const vs=VOICES.filter(v=>v.lang.replace('_','-').toLowerCase().startsWith(p));
  const score=v=>(/premium|enhanced|neural|natural|google|siri/i.test(v.name+v.voiceURI)?2:0)+(v.localService?0:0.5);
  return vs.sort((a,b)=>score(b)-score(a));
}
function fillVoices(){
  const sel=$('voice'); const keep=sel.value; const vs=voicesFor(curLang());
  sel.innerHTML=vs.length?vs.map(v=>'<option value="'+esc(v.voiceURI)+'">'+esc(v.name)+' ('+esc(v.lang)+')</option>').join(''):'<option value="">(이 언어의 음성이 없어요)</option>';
  if(keep&&[...sel.options].some(o=>o.value===keep))sel.value=keep;
  $('ttsMsg').textContent=(!vs.length&&VOICES.length)?('⚠ '+LANGS[curLang()]+' 음성이 기기에 없어요. 기기 설정 → 접근성/언어 → 텍스트 읽기(음성) 에서 '+LANGS[curLang()]+' 음성을 내려받으면 정확한 발음으로 읽어요.'):'';
}
if(window.speechSynthesis){loadVoices(); speechSynthesis.onvoiceschanged=loadVoices;}
function stop(){S.token++; try{speechSynthesis.cancel();}catch(e){} document.querySelectorAll('.line.act').forEach(x=>x.classList.remove('act'));}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function speak(text,my){return new Promise(res=>{
  if(!window.speechSynthesis){$('ttsMsg').textContent='이 기기는 음성 읽기를 지원하지 않아요.';return res();}
  const lang=curLang(); const u=new SpeechSynthesisUtterance(lang==='la'?latinPron(text):text);
  u.lang=BROWSER_LANG[lang]||'en-US'; u.rate=curSpeed();
  const id=$('voice').value; const v=VOICES.find(x=>x.voiceURI===id)||voicesFor(lang)[0]; if(v){u.voice=v;u.lang=v.lang;}
  let done=false; const fin=()=>{if(!done){done=true;clearInterval(wd);res();}};
  u.onend=fin; u.onerror=fin;
  const wd=setInterval(()=>{if(my!==S.token)fin();},300);          /* 멈춤 누르면 바로 끝나게 */
  try{speechSynthesis.cancel();}catch(e){} speechSynthesis.speak(u);});}
async function playSeq(a,b,times){
  const my=++S.token; let round=0; const gap=Math.max(0,+$('gap').value||0)*1000;
  do{
    for(let i=a;i<=b;i++){
      if(my!==S.token)return;
      document.querySelectorAll('.line.act').forEach(x=>x.classList.remove('act'));
      const el=$('ln'+i); if(el){el.classList.add('act');el.scrollIntoView({block:'nearest',behavior:'smooth'});}
      await speak(S.lines[i],my); if(my!==S.token)return; await sleep(gap);
    }
    round++;
  }while(times===0||round<times);
  if(my===S.token)document.querySelectorAll('.line.act').forEach(x=>x.classList.remove('act'));
}
$('bAll').onclick=()=>{stop();renderLines();if(S.lines.length)playSeq(0,S.lines.length-1,1);};
$('bRange').onclick=()=>{stop();renderLines();const n=S.lines.length;if(!n)return;
  const a=Math.min(Math.max(+$('rA').value||1,1),n),b=Math.min(Math.max(+$('rB').value||a,a),n); playSeq(a-1,b-1,Math.max(0,+$('times').value||0));};
$('bStop').onclick=stop; $('speed').oninput=updSpeed;

/* ───── 4) 번역 · 옛말 사전 (인터넷) ───── */
async function fetchJson(url,opt,ms){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms||20000);
  try{const r=await fetch(url,Object.assign({signal:c.signal},opt||{})); if(!r.ok)throw new Error('HTTP '+r.status); return await r.json();} finally{clearTimeout(t);}}
async function trGoogle(text,src,tgt){
  const j=await fetchJson('https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl='+src+'&tl='+tgt,
    {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'q='+encodeURIComponent(text)});
  return j[0].map(s=>s&&s[0]||'').join('');}
async function trMyMemory(text,src,tgt){
  const j=await fetchJson('https://api.mymemory.translated.net/get?q='+encodeURIComponent(text.slice(0,480))+'&langpair='+src+'|'+tgt);
  if(String(j.responseStatus)!=='200')throw new Error(j.responseDetails||'MyMemory'); return j.responseData.translatedText;}
async function trLingva(text,src,tgt){const j=await fetchJson('https://lingva.ml/api/v1/'+src+'/'+tgt+'/'+encodeURIComponent(text)); return j.translation;}
const TR={google:trGoogle,mymemory:trMyMemory,lingva:trLingva};
async function translateLines(lines,src,tgt,engine){
  const order=engine==='auto'?['google','mymemory','lingva']:[engine]; const errs=[];
  for(const eng of order){
    try{
      const fn=TR[eng];
      if(eng==='google'&&lines.length>1){const got=(await fn(lines.join('\n'),src,tgt)).split('\n'); if(got.length===lines.length)return {lines:got.map(x=>x.trim()),engine:eng};}
      const out=[]; for(const ln of lines){out.push((await fn(ln,src,tgt)).trim());} return {lines:out,engine:eng};
    }catch(e){errs.push(eng+': '+String(e.message||e).slice(0,80));}
  }
  throw new Error(errs.join(' / '));
}
function findUnknown(src,tgt){
  const re=/[\p{L}]{3,}/gu; const tset=new Set((tgt.match(re)||[]).map(w=>w.toLowerCase())); const out=[],seen=new Set();
  for(const w of (src.match(re)||[])){const l=w.toLowerCase(); if(tset.has(l)&&!seen.has(l)){out.push(w);seen.add(l);}}
  return out.slice(0,30);
}
const ARCH=/\b(archaic|obsolete|dated|poetic|literary|historical|dialectal|regional|nonstandard)\b/gi;
const defCache={};
const stripHtml=s=>(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#?\w+;/g,' ').replace(/\s+/g,' ').trim();
async function defineWord(word,lang,tgt){
  const key=word.toLowerCase()+'|'+lang+'|'+tgt; if(defCache[key])return defCache[key];
  const res={word,lang,found:false,flags:[],defs:[],tgt:''}; let data=null;
  for(const cand of [...new Set([word,word.toLowerCase(),word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()])]){
    try{const r=await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(cand)); if(r.ok){data=await r.json();break;}}
    catch(e){res.error=String(e.message||e).slice(0,80);break;}
  }
  if(data&&data[lang]){
    const flags=new Set();
    for(const ent of data[lang].slice(0,4)){const defs=[];
      for(const dd of (ent.definitions||[]).slice(0,4)){const t=stripHtml(dd.definition); if(t){defs.push(t);(t.match(ARCH)||[]).forEach(m=>flags.add(m.toLowerCase()));}}
      if(defs.length)res.defs.push({pos:ent.partOfSpeech||'',defs});}
    res.found=res.defs.length>0; res.flags=[...flags].sort();
    if(res.found&&tgt!=='en'){const gloss=res.defs.slice(0,2).map(x=>x.defs[0]).join(' ; ').slice(0,300);
      try{res.tgt=await trGoogle(gloss,'en',tgt);}catch(e){try{res.tgt=await trMyMemory(gloss,'en',tgt);}catch(_){}}}
  }
  defCache[key]=res; return res;
}
async function lookupMany(words,lang,tgt,workers){const out=new Array(words.length);let i=0;
  await Promise.all(Array.from({length:workers||4},async()=>{while(i<words.length){const k=i++;out[k]=await defineWord(words[k],lang,tgt);}}));return out;}
function defHtml(r){
  if(!r.found)return '<b>'+esc(r.word)+'</b> — 사전에서 찾지 못했어요'+(r.error?' ('+esc(r.error)+')':'')+'. (활용형이면 기본형으로 찾아보세요)';
  return '<b>'+esc(r.word)+'</b>'+(r.flags||[]).map(f=>'<span class="flag">'+esc(f)+'</span>').join('')+(r.tgt?'<div>'+esc(r.tgt)+'</div>':'')+
    r.defs.map(d=>'<div class="info">'+esc(d.pos)+': '+d.defs.map(esc).join(' ; ')+'</div>').join('');
}
async function wordClick(w){
  w=w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu,''); if(!w)return; stop(); speak(w,S.token);
  const box=$('defBox'); box.style.display='block'; box.textContent='“'+w+'” 뜻을 웹 사전에서 찾는 중...';
  box.innerHTML=defHtml(await defineWord(w,curLang(),$('tgt').value));
}
$('bTr').onclick=async()=>{
  const lines=getLines().slice(0,200); if(!lines.length){$('trMsg').textContent='가사를 먼저 넣어 주세요.';return;}
  const src=curLang(),tgt=$('tgt').value; if(src===tgt){$('trMsg').textContent='원문과 번역 언어가 같아요.';return;}
  $('trMsg').textContent='번역 중...'; $('gloss').innerHTML='';
  try{
    const r=await translateLines(lines,src,tgt,$('trEng').value); S.trans=r.lines; S.alt=[];
    if($('cmp').checked){for(const e2 of ['mymemory','google']){if(e2!==r.engine){try{S.alt=(await translateLines(lines,src,tgt,e2)).lines;break;}catch(_){}}}}
    renderLines();
    const unk=findUnknown(lines.join(' '),r.lines.join(' ')); const gl=unk.length?await lookupMany(unk,src,tgt):[];
    $('trMsg').textContent='✅ '+({google:'구글 번역',mymemory:'MyMemory',lingva:'Lingva'}[r.engine])+' 로 번역했어요'+(gl.length?' · 번역이 안 된 단어 '+gl.length+'개를 웹 사전에서 찾았어요':'');
    $('gloss').innerHTML=gl.length?('<div class="gl"><b>📖 번역이 안 된 단어 풀이</b></div>'+gl.map(g=>'<div class="gl">'+defHtml(g)+'</div>').join('')):'';
  }catch(e){$('trMsg').textContent='❌ 번역하지 못했어요: '+(e.message||e)+' (인터넷 연결을 확인해 주세요)';}
};
$('bArch').onclick=async()=>{
  const lines=getLines(); if(!lines.length){$('trMsg').textContent='가사를 먼저 넣어 주세요.';return;}
  $('trMsg').textContent='모든 단어를 웹 사전에서 확인하는 중... (30초 정도 걸릴 수 있어요)'; $('gloss').innerHTML='';
  const words=[...new Set((lines.join(' ').match(/[\p{L}]{3,}/gu)||[]).map(w=>w.toLowerCase()))].slice(0,80);
  const res=await lookupMany(words,curLang(),$('tgt').value); const flagged=res.filter(r=>r.found&&r.flags.length), missing=res.filter(r=>!r.found).map(r=>r.word);
  $('trMsg').textContent='✅ '+words.length+'개 단어 확인 · 옛말/시어 표시가 붙은 단어 '+flagged.length+'개';
  $('gloss').innerHTML=(flagged.length?flagged.map(g=>'<div class="gl">'+defHtml(g)+'</div>').join(''):'<div class="info">옛말 표시가 붙은 단어를 찾지 못했어요.</div>')+
    (missing.length?'<div class="gl info">사전에 없는 단어(활용형·고어일 수 있어요): '+missing.map(esc).join(', ')+'</div>':'');
};

/* ───── 5) 저장 · 목록 · 구글 시트 ───── */
const normKey=(t,c)=>(t+'|'+c).normalize('NFKC').toLowerCase().replace(/[\s\-_.,'"!?·・:;()\[\]]+/g,'');
function makeFilename(t,c,f){const parts=[t,c,f.slice(0,30)].map(p=>p.replace(/[\\\/:*?"<>|\r\n\t]+/g,' ').trim()); return ((parts.join('-').replace(/^[ .]+|[ .]+$/g,'')).slice(0,150).trim()||'가사')+'.txt';}
function fnPrev(){const t=$('fTitle').value.trim(),c=$('fComp').value.trim(),f=$('fFirst').value.trim().slice(0,30); $('fnPrev').textContent='파일 이름: '+((t||c||f)?(t+'-'+c+'-'+f+'.txt'):'(곡제목-작곡가-첫소절.txt)');}
['fTitle','fComp','fFirst'].forEach(i=>$(i).addEventListener('input',fnPrev));
$('bFirst').onclick=()=>{const l=getLines();if(l.length){$('fFirst').value=l[0];fnPrev();}};
async function sheetCall(payload){
  const c=getCfg(); if(!c.sheet_url)throw new Error("구글 시트 주소가 아직 설정되지 않았어요 (아래 '⚙ 설정'에서 입력)");
  if(!/^https:\/\/script\.google\.com\//.test(c.sheet_url))throw new Error('주소는 https://script.google.com/ 로 시작해야 해요');
  const r=await fetch(c.sheet_url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({},payload,{token:c.sheet_token||''})),redirect:'follow'});
  let j; try{j=await r.json();}catch(e){throw new Error("시트에서 올바른 답이 오지 않았어요. 웹앱 배포 때 '액세스 권한: 모든 사용자'로 했는지 확인하세요");}
  if(!j.ok&&j.error==='token')throw new Error('비밀번호(토큰)가 시트 스크립트와 달라요'); return j;
}
async function doSave(overwrite){
  const title=$('fTitle').value.trim(),composer=$('fComp').value.trim(),first=$('fFirst').value.trim()||(getLines()[0]||''),text=$('lyr').value; const m=$('saveMsg');
  if(!title){m.innerHTML='<span class="err">❌ 곡제목을 써 주세요</span>';return;} if(!text.trim()){m.innerHTML='<span class="err">❌ 저장할 가사가 없어요</span>';return;}
  const key=normKey(title,composer); const songs=getSongs(); const idx=songs.findIndex(s=>normKey(s.title,s.composer)===key); const msgs=[];
  let sheetDup=false;
  if($('toSheet').checked&&!overwrite){try{const j=await sheetCall({action:'check',title,composer}); sheetDup=!!j.exists;}catch(e){m.innerHTML='<span class="err">❌ 구글 시트: '+esc(e.message)+'</span>';return;}}
  if(!overwrite&&(idx>=0||sheetDup)){
    m.innerHTML='<span class="warnc">⚠ 동일한 곡이 이미 있어요 ('+(idx>=0?'이 기기':'')+(idx>=0&&sheetDup?' · ':'')+(sheetDup?'구글 시트':'')+'): '+esc(title)+' - '+esc(composer)+'</span> <button class="small" id="bOver">덮어쓰기</button>';
    $('bOver').onclick=()=>doSave(true); return;
  }
  if($('toLocal').checked){const rec={title,composer,first,text,file:makeFilename(title,composer,first),updated:Date.now()};
    if(idx>=0)songs[idx]=rec; else songs.push(rec);
    if(!lsSet('lyr_songs',songs)){m.innerHTML='<span class="err">❌ 이 기기에 저장하지 못했어요 (저장 공간 부족)</span>';return;} msgs.push('이 기기에 저장: '+rec.file);}
  if($('toSheet').checked){try{const j=await sheetCall({action:'add',title,composer,first,lyrics:text,overwrite:true}); msgs.push(j.ok?('구글 시트 '+(j.updated?'수정':'추가')+' 완료'):('구글 시트 실패: '+(j.error||'')));}catch(e){msgs.push('구글 시트 실패: '+e.message);}}
  m.innerHTML='<span class="okc">✅ '+msgs.map(esc).join(' · ')+'</span>'; loadLib();
}
$('bSave').onclick=()=>doSave(false);
async function shareOrDownload(name,text,mime){
  const file=new File([text],name,{type:mime||'text/plain'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
}
$('bFile').onclick=()=>{const t=$('fTitle').value.trim(),c=$('fComp').value.trim(),f=$('fFirst').value.trim()||(getLines()[0]||''); if(!$('lyr').value.trim()){$('saveMsg').innerHTML='<span class="err">❌ 내보낼 가사가 없어요</span>';return;}
  shareOrDownload(makeFilename(t,c,f),$('lyr').value+(S.trans.length?'\n\n--- 번역 ---\n'+S.trans.join('\n'):''));};
async function loadLib(){
  const box=$('lib'); box.textContent='불러오는 중...';
  if(S.libTab==='local'){const l=getSongs().slice().sort((a,b)=>b.updated-a.updated);
    box.innerHTML=l.length?l.map(x=>'<div><span>'+esc(x.title)+' · '+esc(x.composer)+' · <span class="info">'+esc(x.first)+'</span></span><span><button class="small gray" data-lf="'+esc(normKey(x.title,x.composer))+'">불러오기</button> <button class="small gray" data-del="'+esc(normKey(x.title,x.composer))+'">삭제</button></span></div>').join(''):'<div class="info">저장된 곡이 없어요.</div>';
  } else {
    try{const r=await sheetCall({action:'list'}); box.innerHTML=r.ok?(r.items.length?r.items.map(x=>'<div><span>'+esc(x.title)+' · '+esc(x.composer)+' · <span class="info">'+esc(x.first)+'</span></span><button class="small gray" data-sr="'+x.row+'">불러오기</button></div>').join(''):'<div class="info">시트가 비어 있어요.</div>'):'<div class="err">'+esc(r.error)+'</div>';}
    catch(e){box.innerHTML='<div class="err">'+esc(e.message)+'</div>';}
  }
}
function fillSong(r){$('lyr').value=r.text||r.lyrics||'';$('fTitle').value=r.title||'';$('fComp').value=r.composer||'';$('fFirst').value=r.first||'';S.trans=[];S.alt=[];fnPrev();changed();onChange();}
$('tLocal').onclick=()=>{S.libTab='local';loadLib();};$('tSheet').onclick=()=>{S.libTab='sheet';loadLib();};
$('lib').addEventListener('click',async e=>{
  const b=e.target.closest('button'); if(!b)return;
  if(b.dataset.lf){const s=getSongs().find(x=>normKey(x.title,x.composer)===b.dataset.lf); if(s)fillSong(s);}
  else if(b.dataset.del){if(confirm('이 곡을 이 기기에서 지울까요?')){lsSet('lyr_songs',getSongs().filter(x=>normKey(x.title,x.composer)!==b.dataset.del));loadLib();}}
  else if(b.dataset.sr){try{const r=await sheetCall({action:'get',row:+b.dataset.sr}); if(r.ok)fillSong(r);}catch(err){$('saveMsg').innerHTML='<span class="err">'+esc(err.message)+'</span>';}}
});
$('bBackup').onclick=()=>shareOrDownload('가사도우미-백업.json',JSON.stringify({app:'lyrics-helper',songs:getSongs()},null,1),'application/json');
$('bRestore').onclick=()=>$('fRestore').click();
$('fRestore').onchange=async e=>{const f=e.target.files[0]; if(!f)return; try{const j=JSON.parse(await f.text()); const add=(j.songs||[]).filter(s=>s&&s.title&&s.text); const cur=getSongs();
  let n=0; for(const s of add){const k=normKey(s.title,s.composer||''); const i=cur.findIndex(x=>normKey(x.title,x.composer)===k); if(i<0){cur.push(s);n++;}}
  lsSet('lyr_songs',cur); $('saveMsg').innerHTML='<span class="okc">✅ 새 곡 '+n+'개를 불러왔어요 (같은 곡은 건너뜀)</span>'; loadLib();}catch(err){$('saveMsg').innerHTML='<span class="err">❌ 백업 파일을 읽지 못했어요</span>';} e.target.value='';};
$('bSet').onclick=()=>{const url=$('sUrl').value.trim(); if(url&&!/^https:\/\/script\.google\.com\//.test(url)){$('setMsg').textContent='❌ 주소는 https://script.google.com/ 로 시작해야 해요';return;}
  const c=getCfg(); c.sheet_url=url; if($('sTok').value)c.sheet_token=$('sTok').value; lsSet('lyr_cfg',c); $('sTok').value=''; $('setMsg').textContent='✅ 저장했어요 (이 기기에만 저장돼요)';};
$('bTest').onclick=async()=>{$('setMsg').textContent='연결 확인 중...'; try{const j=await sheetCall({action:'ping'}); $('setMsg').textContent=(j.ok?'✅ 연결됐어요: '+(j.sheet||''):'❌ '+(j.error||'실패'));}catch(e){$('setMsg').textContent='❌ '+e.message;}};

/* ───── 시작 ───── */
(function(){
  $('langSel').innerHTML='<option value="auto">언어: 자동 분석</option>'+Object.entries(LANGS).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('');
  $('tgt').innerHTML=Object.entries(LANGS).map(([k,v])=>'<option value="'+k+'"'+(k==='ko'?' selected':'')+'>'+v+'</option>').join('');
  $('speed').value=SPEEDS.indexOf(0.8); updSpeed(); $('sUrl').value=getCfg().sheet_url||''; if(getCfg().sheet_token)$('sTok').placeholder='(저장됨 — 바꿀 때만 입력)';
  $('lyr').addEventListener('input',changed); renderKeys(); renderLines(); fnPrev(); loadLib();
})();

/* ───── 폰에 설치 안내 (스토어 앱·크롬 확장 안에서는 숨김) ───── */
(function(){
  const box=$('installBox'); if(!box)return;
  const standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
  const inApp=!/^https?:$/.test(location.protocol)||(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())||location.hostname==='localhost'&&!!window.Capacitor;
  let closed=false; try{closed=localStorage.getItem('lyr_install_closed')==='1';}catch(e){}
  if(standalone||inApp||closed)return;
  const ua=navigator.userAgent, ios=/iPhone|iPad|iPod/.test(ua), android=/Android/.test(ua); let ev=null;
  if(ios){$('installTxt').innerHTML='아이폰: <b>Safari</b> 아래 가운데 <b>공유(□↑)</b> → <b>홈 화면에 추가</b> → <b>추가</b>. 그러면 앱처럼 열려요.'; box.style.display='block';}
  else if(android){$('installTxt').textContent='안드로이드: 아래 버튼을 누르거나, Chrome 오른쪽 위 ⋮ → 홈 화면에 추가(앱 설치)를 누르세요.'; box.style.display='block';}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();ev=e;$('bInstall').style.display='inline-block';$('installTxt').textContent='아래 버튼을 누르면 앱처럼 설치돼요.';box.style.display='block';});
  $('bInstall').onclick=async()=>{if(!ev)return;ev.prompt();try{await ev.userChoice;}catch(e){} ev=null;box.style.display='none';};
  $('bInstallX').onclick=()=>{box.style.display='none';try{localStorage.setItem('lyr_install_closed','1');}catch(e){}};
})();
