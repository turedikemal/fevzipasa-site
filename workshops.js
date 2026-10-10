// Sitedeki Workshoplar sayfası ve her workshopun kendi sayfası. Veriler panelden gelir (/api/public/workshops).
(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const day=d=>d?new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'}):'Tarih yakında';
const short=d=>d?new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'short'}).toLocaleUpperCase('tr'):'YAKINDA';
const money=n=>new Intl.NumberFormat('tr-TR').format(n||0)+' ₺';
const today=new Date().toISOString().slice(0,10);
const upcoming=w=>w.status==='planlandi'&&(!w.date||w.date>=today);
const colors=['var(--pink)','var(--blue)','var(--yellow)','var(--orange)'];
const cover=(w,i)=>w.images[0]?`<img src="/media/${w.images[0]}" alt="${esc(w.title)}" loading="lazy">`:`<span class="ws-ph" style="background:${colors[i%4]}"><b>${esc(w.title)}</b></span>`;
const price=w=>w.paid?money(w.price):'Ücretsiz';
const seats=w=>w.capacity?(w.left?`${w.left} kişilik yer kaldı`:'Kontenjan doldu'):'';
const join=(w,cls='pill')=>!upcoming(w)?'':w.capacity&&!w.left?`<span class="${cls} off">Kontenjan doldu</span>`:`<a class="${cls}" href="/katilim?kayit&ws=${w.id}">Yerini ayırt <span>↗</span></a>`;
const get=u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(r));

const card=(w,i)=>`<a class="ws-card" href="/workshop/${w.id}"><span class="card-image">${cover(w,i)}<span class="card-arrow">↗</span><span class="ws-date">${short(w.date)}${w.time?'<br>'+esc(w.time):''}</span></span><span class="card-caption"><small>${esc((w.organizer||w.brand||'Fevzipaşa').toLocaleUpperCase('tr'))}</small><strong>${esc(w.title)}</strong><span class="ws-meta"><span>${price(w)}</span>${w.duration?`<span>${w.duration} dk</span>`:''}${upcoming(w)&&seats(w)?`<span>${seats(w)}</span>`:''}</span></span></a>`;

const list=document.querySelector('[data-ws-list]');
if(list)get('/api/public/workshops').then(all=>{
  const next=all.filter(upcoming),past=all.filter(w=>!upcoming(w)).reverse();
  list.innerHTML=next.length?next.map(card).join(''):'<p class="ws-empty">Yeni workshoplar çok yakında burada. Takipte kal.</p>';
  const p=document.querySelector('[data-ws-past]');
  if(p&&past.length)p.innerHTML=`<h3 class="ws-past-title">Geçmiş workshoplar</h3><div class="ws-grid">${past.map(card).join('')}</div>`;
}).catch(()=>{list.innerHTML='<p class="ws-empty">Workshoplar şu an yüklenemedi.</p>'});

const box=document.querySelector('[data-ws-detail]');
if(box){const wid=location.pathname.split('/').filter(Boolean)[1];get('/api/public/workshops/'+encodeURIComponent(wid)).then(w=>{
  document.title=`${w.title} | Fevzipaşa Workshop`;
  const facts=[['Tarih',day(w.date)],['Saat',[w.time,w.duration?w.duration+' dakika':''].filter(Boolean).join(' · ')],['Yer',w.location||w.market?.location||'Fevzipaşa / Çanakkale'],['Düzenleyen',[...new Set([w.organizer,w.brand].filter(Boolean))].join(' · ')],['Ücret',price(w)],['Kontenjan',w.capacity?`${w.capacity} kişi${w.left!==null?' · '+seats(w):''}`:'']].filter(x=>x[1]);
  box.innerHTML=`<section class="ws-detail"><div class="ws-detail-copy"><a class="ws-back" href="/workshoplar">← Tüm workshoplar</a><p class="eyebrow">WORKSHOP${w.market?' / '+esc(w.market.name.toLocaleUpperCase('tr')):''}</p><h1>${esc(w.title)}</h1>
  <dl class="ws-facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  ${upcoming(w)?`<div class="ws-cta">${join(w,'pill big')}<small>Kayıt için hesabını aç ya da giriş yap; ekip onaylayınca yerin kesinleşir.${w.paid?' Ödeme havale/EFT ile yapılır, bilgiler panelinde.':''}</small></div>`:`<p class="ws-done">${w.status==='yapildi'?'Bu workshop yapıldı.':'Bu workshopun tarihi geçti.'}</p>`}</div>
  <button class="ws-detail-media" ${w.images[0]?`data-photo="/media/${w.images[0]}" data-caption="${esc(w.title)}"`:''} aria-label="Görseli büyüt">${cover(w,1)}</button></section>
  ${w.description?`<section class="ws-about section"><p class="eyebrow">NE YAPACAĞIZ?</p><p class="ws-desc">${esc(w.description).replace(/\n/g,'<br>')}</p></section>`:''}
  ${w.images.length>1?`<section class="ws-gallery section"><p class="eyebrow">GÖRSELLER</p><div class="ws-gal">${w.images.slice(1).map(id=>`<span><img src="/media/${id}" alt="" loading="lazy"></span>`).join('')}</div></section>`:''}
  ${upcoming(w)?`<section class="ws-come section"><div class="ws-come-copy"><p class="eyebrow">YERİN HAZIR MI?</p><h2>Gel.<br>Dene.<br>Üret.</h2>${join(w,'pill big')}</div><aside class="ws-market" data-ws-market></aside></section>`:''}`;
  const mbox=box.querySelector('[data-ws-market]');
  if(mbox){const m=w.market,range=m?.startDate?[short(m.startDate),m.endDate&&m.endDate!==m.startDate?short(m.endDate):''].filter(Boolean).join(' – '):'';
    const paint=others=>{mbox.innerHTML=`<p class="eyebrow">${m?'BU WORKSHOP BİR PAZARIN PARÇASI':'FEVZİPAŞA TASARIM PAZARI'}</p>
    <h3>${esc(m?.name||'Fevzipaşa Tasarım Pazarı')}</h3>
    <p class="ws-market-lead">${m?`Workshop, ${m.edition?m.edition+'. ':''}Fevzipaşa Tasarım Pazarı sırasında yapılıyor. Atölyeden sonra pazarı gez, üreticilerle tanış; aynı gün birçok tasarımı yakından gör.`:'Atölyeden sonra pazarı gez, üreticilerle tanış.'}</p>
    <dl class="ws-facts">${[['Pazar günleri',range],['Saatler',m?.hours],['Yer',m?.location]].filter(x=>x[1]).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    ${others.length?`<p class="eyebrow" style="margin-top:28px">BU PAZARDAKİ DİĞER WORKSHOPLAR</p><div class="ws-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${others.slice(0,4).map(card).join('')}</div>`:''}
    <div class="ws-market-links"><a class="text-link" href="/ziyaret">Ziyaret bilgileri ↗</a><a class="text-link" href="/katilimcilar">Katılımcılar ↗</a></div>`};
    paint([]);get('/api/public/workshops').then(all=>paint(all.filter(o=>o.id!==w.id&&upcoming(o)&&(m?o.market?.id===m.id:true)))).catch(()=>{});
  }
;
}).catch(()=>{box.innerHTML='<section class="ws-detail-missing section"><h1>Workshop bulunamadı.</h1><a class="pill" href="/workshoplar">Tüm workshoplar <span>↗</span></a></section>'})}
})();


(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const style=document.createElement('style');
 style.textContent=`.ws-text-repeat{display:grid;isolation:isolate;overflow:hidden}.ws-text-repeat>.ws-text-layer{grid-area:1/1;min-width:0;pointer-events:none}.ws-text-repeat>.ws-text-copy{opacity:0;will-change:transform,opacity}.ws-text-repeat>.ws-text-main{position:relative;z-index:1}.ws-detail-copy>.ws-text-repeat{width:100%;overflow-wrap:anywhere}.ws-text-repeat i{animation:none!important}.ws-text-repeat.reveal{opacity:1;transform:none}@media(prefers-reduced-motion:reduce){.ws-text-copy{display:none}}`;
 document.head.append(style);
 // Only the large section headings; cards, archive labels and footer stay unchanged.
 const titles=[];
 function initialize(){
 document.querySelectorAll('.ws-hero .hero-title,.ws-list>.section-top>h2,.ws-detail-copy>h1').forEach(title=>{
  if(title.classList.contains('ws-text-repeat'))return;
  titles.push(title);
  const content=title.innerHTML;
  title.setAttribute('aria-label',title.textContent.trim().replace(/\s+/g,' '));
  title.classList.add('ws-text-repeat');
  title.innerHTML=Array.from({length:7},(_,i)=>`<div aria-hidden="true" class="ws-text-layer ${i===6?'ws-text-main':'ws-text-copy'}">${content}</div>`).join('');
 });
 }
 initialize();
 const clamp=n=>Math.max(0,Math.min(1,n));
 function paint(){
  titles.forEach(title=>{
   const main=title.querySelector('.ws-text-main'),rect=main.getBoundingClientRect();
   const distance=Math.min(main.offsetHeight*.4,innerWidth<=640?64:112);
   const p=clamp((innerHeight*.45-rect.top)/Math.max(1,innerHeight*.25));
   title.style.paddingBottom=(reduced.matches?0:distance)+'px';
   title.querySelectorAll('.ws-text-copy').forEach((copy,i)=>{
    const rank=7-i,t=reduced.matches?0:clamp((p-rank*.01)/.92);
    copy.style.transform=`translate3d(${rank/7*24*t}px,${rank/7*distance*t}px,0)`;
    copy.style.opacity=String(Math.min(i*.15,1)*t);
   });
  });
 }
 let frame=0;
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;paint()})}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);reduced.addEventListener('change',schedule);
 const detail=document.querySelector('[data-ws-detail]');
 if(detail)new MutationObserver(()=>{initialize();schedule()}).observe(detail,{childList:true,subtree:true});
 document.fonts?.ready.then(schedule);paint();
})();
