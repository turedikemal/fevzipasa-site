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

const list=document.querySelector('[data-ws-list]');
if(list)get('/api/public/workshops').then(all=>{
  const next=all.filter(upcoming),past=all.filter(w=>!upcoming(w)).reverse();
  list.innerHTML=next.length?next.map((w,i)=>`<a class="ws-card" href="/workshop/${w.id}"><span class="card-image">${cover(w,i)}<span class="card-arrow">↗</span><span class="ws-date">${short(w.date)}${w.time?'<br>'+esc(w.time):''}</span></span><span class="card-caption"><small>${esc((w.organizer||w.brand||'Fevzipaşa').toLocaleUpperCase('tr'))}</small><strong>${esc(w.title)}</strong><span class="ws-meta"><span>${price(w)}</span>${w.duration?`<span>${w.duration} dk</span>`:''}${seats(w)?`<span>${seats(w)}</span>`:''}</span></span></a>`).join(''):'<p class="ws-empty">Yeni workshoplar çok yakında burada. Takipte kal.</p>';
  const p=document.querySelector('[data-ws-past]');
  if(p&&past.length)p.innerHTML=`<h3 class="ws-past-title">Geçmiş workshoplar</h3><div class="ws-past">${past.map(w=>`<a href="/workshop/${w.id}"><span>${short(w.date)}</span><b>${esc(w.title)}</b><small>${esc(w.organizer||w.brand||'')}</small><i>↗</i></a>`).join('')}</div>`;
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
  ${w.images.length>1?`<section class="ws-gallery section"><p class="eyebrow">GÖRSELLER</p><div class="ws-gal">${w.images.slice(1).map(id=>`<button data-photo="/media/${id}" data-caption="${esc(w.title)}"><img src="/media/${id}" alt="" loading="lazy"></button>`).join('')}</div></section>`:''}
  ${upcoming(w)?`<section class="pink-statement section"><p class="eyebrow">YERİN HAZIR MI?</p><h2>Gel.<br>Dene.<br>Üret.</h2>${join(w,'text-link')}</section>`:''}`;
  box.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>{const d=document.getElementById('viewer');if(!d)return;d.querySelector('.dialog-content').innerHTML=`<img src="${b.dataset.photo}" alt=""><p class="dialog-caption">${esc(b.dataset.caption||'')}</p>`;d.showModal()}));
}).catch(()=>{box.innerHTML='<section class="ws-detail-missing section"><h1>Workshop bulunamadı.</h1><a class="pill" href="/workshoplar">Tüm workshoplar <span>↗</span></a></section>'})}
})();
