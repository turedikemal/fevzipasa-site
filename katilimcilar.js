// Katılımcılar alanı: pazarlar sırayla alt alta (numara, ad, tarih). Bir pazarın üzerine gelince o pazarın afişi
// imleci takip eder (afiş panelde pazarın içinden yüklenir). Pazara tıklayınca altında o pazarın katılımcıları
// iki kayan şeritte açılır: isimler siyah oval çerçevede, üzerine gelince spot ışığı, tıklayınca Instagram.
(()=>{
const list=document.querySelector('[data-markets]'),fl=document.querySelector('[data-mk-float]');if(!list)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const up=s=>s.toLocaleUpperCase('tr');
const d=v=>v?new Date(v+'T12:00:00'):null;
function range(a,b){
  const s=d(a),e=d(b);if(!s)return '';
  const f=(x,o)=>x.toLocaleDateString('tr-TR',o);
  if(!e||a===b)return f(s,{day:'numeric',month:'long',year:'numeric'});
  if(s.getFullYear()!==e.getFullYear())return `${f(s,{day:'numeric',month:'long',year:'numeric'})} – ${f(e,{day:'numeric',month:'long',year:'numeric'})}`;
  if(s.getMonth()!==e.getMonth())return `${f(s,{day:'numeric',month:'long'})} – ${f(e,{day:'numeric',month:'long',year:'numeric'})}`;
  return `${s.getDate()}–${f(e,{day:'numeric',month:'long',year:'numeric'})}`;
}
// Afiş yüklenmemişse yerine sitenin renkleriyle pazarın adı ve tarihi yazan bir kart çıkar.
const poster=(m,i)=>m.poster?`<img class="mk-poster" src="/media/${m.poster}" alt="${esc(m.name)} afişi" loading="lazy">`
  :`<span class="mk-poster mk-ph c${i%4}"><small>FEVZİPAŞA<br>TASARIM PAZARI</small><b>${esc(up(m.name))}</b><i>${esc(up(range(m.startDate,m.endDate)))}</i></span>`;
const pill=(p,copy)=>{const hide=copy?' aria-hidden="true" tabindex="-1"':'';return p.instagram
  ?`<a class="name-pill" href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noopener"${hide}${copy?'':` aria-label="${esc(p.name)}, Instagram sayfası (yeni sekmede açılır)"`}>${esc(p.name)}</a>`
  :`<span class="name-pill"${copy?' aria-hidden="true"':''}>${esc(p.name)}</span>`};

// Kayan şeritler + spot ışığı. Fare çekilince anında normale döner.
function names(box,list){
  if(!list.length){box.innerHTML='<p class="name-empty">Bu pazarın katılımcı listesi çok yakında burada.</p>';return}
  if(still){box.innerHTML=`<div class="name-static">${list.map(p=>pill(p)).join('')}</div>`}
  else{
    const rows=list.length<6?[list,[...list].reverse()]:[list.filter((_,i)=>i%2===0),list.filter((_,i)=>i%2===1)];
    box.innerHTML=rows.map((r,i)=>`<div class="name-lane"><div class="name-track${i?' rev':''}">${r.map(p=>pill(p)).join('')}</div></div>`).join('');
    box.querySelectorAll('.name-track').forEach((t,i)=>{const copy=rows[i].map(p=>pill(p,1)).join('');const n=Math.max(1,Math.ceil(innerWidth*1.2/(t.scrollWidth||1)));
      t.innerHTML+=copy.repeat(n-1)+copy.repeat(n);t.style.setProperty('--dur',Math.max(20,t.scrollWidth/2/45)+'s')})}
  const pills=[...box.querySelectorAll('.name-pill')];
  const on=p=>{box.classList.remove('snap');box.classList.add('dim');pills.forEach(x=>x.classList.toggle('hot',x===p))};
  const off=()=>{box.classList.add('snap');box.classList.remove('dim');pills.forEach(x=>x.classList.remove('hot'))};
  pills.forEach(p=>{p.addEventListener('pointerenter',()=>on(p));p.addEventListener('pointerleave',off);p.addEventListener('focus',()=>on(p));p.addEventListener('blur',off)});
  box.addEventListener('pointerleave',off);
  requestAnimationFrame(()=>requestAnimationFrame(()=>box.classList.add('shown')));
}

fetch('/api/public/markets',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(r)).then(({markets,current})=>{
  if(!markets.length){list.innerHTML='<li class="name-empty">Pazarlar çok yakında burada.</li>';return}
  list.innerHTML=markets.map((m,i)=>{const date=range(m.startDate,m.endDate);return `<li class="mk" data-i="${i}">
    <button class="mk-row" aria-expanded="false" aria-controls="mk-${i}"><span class="mk-no">${String(m.edition||i+1).padStart(2,'0')}</span><span class="mk-name">${esc(m.name)}</span><span class="mk-date">${esc(date)}</span><span class="mk-pm" aria-hidden="true">+</span></button>
    <div class="mk-panel" id="mk-${i}"><div><div class="mk-inner"><p class="mk-meta">${[date,m.location,m.participants.length?m.participants.length+' katılımcı':''].filter(Boolean).map(x=>`<span>${esc(up(x))}</span>`).join('')}</p><div class="mk-poster-inline">${poster(m,i)}</div><div class="name-cloud"></div></div></div></div></li>`}).join('');
  const items=[...list.children];
  const toggle=li=>{const open=!li.classList.contains('open');li.classList.toggle('open',open);li.querySelector('.mk-row').setAttribute('aria-expanded',open);
    const box=li.querySelector('.name-cloud');if(open&&!box.dataset.done){box.dataset.done=1;names(box,markets[li.dataset.i].participants)}};
  list.addEventListener('click',e=>{const r=e.target.closest('.mk-row');if(r)toggle(r.parentElement)});
  // Süren ya da sıradaki pazar açık başlar.
  const start=items[Math.max(0,markets.findIndex(m=>m.id===current))];if(start)toggle(start);

  // Afiş imleci takip eder (yalnızca fareyle; dokunmatikte afiş açılan alanın içinde görünür).
  if(!fl||!matchMedia('(hover:hover)').matches)return;
  fl.innerHTML=markets.map((m,i)=>poster(m,i)).join('');
  const ps=[...fl.children];let fx=0,fy=0,tx=0,ty=0,cur=-1,raf=0;
  const show=i=>{if(i===cur)return;cur=i;ps.forEach((p,k)=>{p.classList.toggle('on',k===i);p.style.zIndex=k===i?2:1});fl.classList.toggle('show',i>=0)};
  const loop=()=>{const px=fx;fx+=(tx-fx)*.15;fy+=(ty-fy)*.15;const v=still?0:fx-px;fl.style.transform=`translate(${fx}px,${fy}px) translate(0,-50%) rotate(${Math.max(-12,Math.min(12,v*.5))}deg)`;
    raf=cur<0&&Math.abs(tx-fx)<.5?0:requestAnimationFrame(loop)};
  list.addEventListener('pointermove',e=>{tx=e.clientX+30;ty=e.clientY;if(cur<0&&!fl.classList.contains('show')){fx=tx;fy=ty}
    const r=e.target.closest('.mk-row');show(r?+r.parentElement.dataset.i:-1);if(!raf)raf=requestAnimationFrame(loop)});
  list.addEventListener('pointerleave',()=>show(-1));
}).catch(()=>{list.innerHTML='<li class="name-empty">Pazarlar şu an yüklenemedi.</li>'});
})();
