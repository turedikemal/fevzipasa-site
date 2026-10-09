/* Fevzipaşa market archive. Kinetic motion inspired by Codrops' TypeTransition;
   implemented with native Web Animations, without third-party runtime dependencies. */
(()=>{
 const host=document.getElementById('market-content'),main=document.getElementById('main');
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),overlay=document.querySelector('.market-transition'),type=overlay.querySelector('.market-type');
 let markets=[],busy=false,frame=0,listScroll=0,animations=[],generation=0;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const href=m=>'/pazar/'+encodeURIComponent(m.id);
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date());
 const past=m=>m.status==='tamamlandi'||!!((m.endDate||m.startDate)&&(m.endDate||m.startDate)<today());
 const state=m=>past(m)?'GEÇMİŞ PAZAR':m.startDate&&m.startDate>today()?'YAKLAŞAN PAZAR':'TASARIM PAZARI';
 const date=d=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return '';const v=new Date(d+'T12:00:00Z');return Number.isNaN(v.getTime())?'':new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Istanbul'}).format(v)};
 const dates=m=>[date(m.startDate),m.endDate!==m.startDate?date(m.endDate):''].filter(Boolean).join(' — ')||'Tarih bilgisi eklenecek';
 const winter=m=>/kış|kis/i.test(m.name)||Number(m.edition)===2;
 const images=m=>m.poster?[`/media/${encodeURIComponent(m.poster)}`]:winter(m)?['/assets/sokak-kitap.webp','/assets/sokak-tekstil.webp','/assets/sokak-taki.webp']:[];
 const photo=(m,src)=>`<img src="${src}" alt="${escape(m.name)}${m.poster?' afişi':' fotoğrafı'}" loading="lazy">`;
 const cover=m=>images(m).length?photo(m,images(m)[0]):'<p class="market-no-cover">Bu pazarın afişi henüz yayınlanmadı.</p>';
 const link=(m,text,cls='')=>`<a class="${cls}" data-market-link href="${href(m)}">${text}</a>`;
 const displayName=m=>m.name.replace(/fevzipaşa\s*/ig,'').replace(/^\d+\.\s*/,'').trim()||m.name;
 const heading=m=>displayName(m).split(/\s+/).map(word=>`<span>${escape(word)}</span>`).join('');
 function listing(){
  document.title='Pazarlar | Fevzipaşa';
  host.innerHTML=`<section class="market-composition" aria-label="Fevzipaşa pazarları"><div class="market-editorial"><div class="market-location"><span>FEVZİPAŞA<br>ÇANAKKALE</span><span>Tasarımın<br>buluşma yeri.</span></div><h1 class="visually-hidden">Fevzipaşa Tasarım Pazarları</h1><div class="market-index">${markets.map((m,i)=>`<section class="market-chapter" style="--column:${[3,2,3,2,4,3][i%6]}"><div class="market-word"><span class="market-number">${String(i+1).padStart(2,'0')} / ${escape(state(m))}</span><h2>${link(m,heading(m).replace(/<span>(.*?)<\/span>/g,'<span class="market-title-line"><span>$1</span></span>'),'market-title-link')}</h2><p>${escape(dates(m))}</p></div></section>`).join('')}</div><div class="market-editorial-note"><p>Bir sokak.<br>Birçok buluşma.<br>Her pazarın kendi hikâyesi.</p></div><div class="market-signoff"><span>© ’26</span></div></div><div class="market-edge" aria-hidden="true"><span>fevzi</span><span>paşa</span></div></section><section class="market-directory" id="market-directory"><div class="market-directory-head"><div><p class="eyebrow">FEVZİPAŞA / PAZAR ARŞİVİ</p><h2>Tüm tasarım<br>pazarlarımız.</h2></div><span class="market-directory-years">25–26</span></div><ul class="market-all-links">${markets.map((m,i)=>`<li>${link(m,`<span>${String(i+1).padStart(2,'0')}</span><strong>${escape(m.name)}</strong><small>${escape(dates(m))}</small><span aria-hidden="true">↗</span>`)}</li>`).join('')}</ul></section>`;
  updateNav();startHeadings();
 }
 function detail(m){
  stopHeadings();
  document.title=m.name+' | Fevzipaşa';const i=markets.indexOf(m),next=markets[i+1]||markets[0];
  const isPast=past(m),people=Array.isArray(m.participants)?m.participants:[];
  host.innerHTML=`<article><section class="market-detail-head"><a href="/pazarlar" data-market-back class="market-detail-back">← Tüm pazarlar</a><div class="market-detail-top"><div><p class="eyebrow">${escape(state(m))} / FEVZİPAŞA</p><h1 tabindex="-1">${escape(m.name)}</h1></div><div class="market-detail-facts"><p>${escape(dates(m))}</p>${m.hours?`<p>${escape(m.hours)}</p>`:''}<p>${escape(m.location||'Fevzipaşa / Çanakkale')}</p>${isPast?'<p>Bu buluşma sona erdi.<br>Hikâyesi burada devam ediyor.</p>':''}</div></div></section><div class="market-detail-visual">${cover(m)}</div><section class="market-memory"><h2>${isPast?'SOKAKTA<br>BİRİKENLER.':'YENİ BİR<br>BULUŞMA.'}</h2><div><p class="eyebrow">${escape(m.name)}</p><p>${isPast?'Bu sayfa, '+escape(m.name)+'’nın arşivi. O buluşmanın afişini ve katılımcılarını bir arada tutuyoruz.':'Fevzipaşa’da tasarımın, üretimin ve karşılaşmaların bir araya geldiği yeni bir buluşma. Pazarın tarihi, yeri ve katılımcıları burada.'}</p><p>${isPast?'Bir ürüne yakından bakmak, onu yapan kişiyle tanışmak, sokakta yeni bir hikâyeye rastlamak. Fevzipaşa’daki buluşmaların ortak noktası bu.':'Üreticileri tanımak ve pazarı keşfetmek için aşağıya devam et.'}</p></div></section>${winter(m)?`<section class="market-gallery"><p class="eyebrow">KIŞ PAZARINDAN / SOKAĞIN İÇİNDEN</p><h2>BİR BULUŞMANIN İZLERİ.</h2><div class="market-gallery-grid">${[['sokak-kitap','Kitaplar ve karşılaşmalar'],['sokak-tekstil','Dokular ve üreticiler'],['sokak-taki','Küçük detaylar']].map(([file,caption])=>`<button class="market-photo" data-market-photo="/assets/${file}.webp" data-caption="${caption}" aria-label="${caption} fotoğrafını büyüt"><img src="/assets/${file}.webp" alt="Kış Pazarı — ${caption}" loading="lazy"><span>${caption} ↗</span></button>`).join('')}</div></section>`:''}<section class="market-people"><p class="eyebrow">${isPast?'BU PAZARDA BİZİMLEYDİLER':'BU PAZARIN KATILIMCILARI'}</p><h2>TASARIMIN İNSANLARI.</h2>${people.length?`<ul>${people.map(p=>`<li>${p.instagram?`<a href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noopener noreferrer">${escape(p.name)} ↗</a>`:escape(p.name)}</li>`).join('')}</ul>`:'<p>Bu pazarın katılımcı listesi henüz yayınlanmadı.</p>'}</section>${next&&next!==m?`<section class="market-next"><div><p class="eyebrow">BİR SONRAKİ HİKÂYE</p><h2>${escape(next.name)}</h2></div>${link(next,'Pazarı keşfet ↗','text-link')}</section>`:''}</article>`;
  updateNav();
 }
 function updateNav(){document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')==='/pazarlar')a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}
 function route(focus=false){const path=location.pathname.replace(/\/$/,'');if(path==='/pazarlar'){listing();if(focus)main.focus({preventScroll:true});return}const key=path.split('/')[2],m=markets.find(x=>x.id===key);if(m){detail(m);if(focus)host.querySelector('h1').focus({preventScroll:true})}else{host.innerHTML='<section class="market-error"><h1>Pazar bulunamadı.</h1><a href="/pazarlar" data-market-back class="text-link">Tüm pazarlara dön ↗</a></section>';updateNav()}}
 let headingObserver=null;
 function stopHeadings(){headingObserver?.disconnect();headingObserver=null}
 function startHeadings(){
  stopHeadings();
  const chapters=[...host.querySelectorAll('.market-chapter')];
  if(motion.matches||typeof IntersectionObserver==='undefined')return;
  headingObserver=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-entered');headingObserver.unobserve(entry.target)}
  },{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  chapters.forEach(chapter=>{chapter.classList.add('has-entry');headingObserver.observe(chapter)});
 }
 motion.addEventListener('change',()=>{if(location.pathname==='/pazarlar')listing()});
 async function go(url,m,back=false){
  if(busy)return;busy=true;const run=++generation;let watchdog;
  const finish=()=>{if(run!==generation){clearTimeout(watchdog);return}animations.forEach(a=>a.cancel());animations=[];overlay.classList.remove('active');document.body.classList.remove('is-changing');busy=false;clearTimeout(watchdog)};
  try{
   if(location.pathname==='/pazarlar')listScroll=scrollY;
   if(!motion.matches){
    type.replaceChildren(...Array.from({length:11},(_,i)=>{const line=document.createElement('div');line.className='market-type-line';line.textContent=Array(4).fill(m?.name||'FEVZİPAŞA PAZARLARI').join(' / ');return line}));overlay.classList.add('active');document.body.classList.add('is-changing');
    const easing='cubic-bezier(.65,0,.35,1)';
    animations.push(type.animate([{transform:'scale(1) rotate(0deg)'},{transform:'scale(2.7) rotate(-90deg)'}],{duration:1400,easing,fill:'forwards'}));
    [...type.children].forEach((line,i)=>animations.push(line.animate([{transform:'translateX(0)',opacity:.15},{transform:'translateX(20%)',opacity:1,offset:.4},{transform:'translateX(-200%)',opacity:0}],{duration:2500,delay:i*35,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'})));
    // Reveal the destination underneath the moving type, keeping the same menu.
    watchdog=setTimeout(finish,4200);await new Promise(resolve=>setTimeout(resolve,1050));
   }
   if(run!==generation)return;history.pushState({},'',url.pathname);route(true);scrollTo({top:back?listScroll:0,behavior:'instant'});
   if(animations.length)await Promise.allSettled(animations.map(a=>a.finished));
  }finally{finish()}
 }
 document.addEventListener('click',e=>{const photo=e.target.closest('[data-market-photo]');if(photo){const viewer=document.getElementById('viewer'),content=viewer.querySelector('.dialog-content'),img=document.createElement('img'),p=document.createElement('p');img.src=photo.dataset.marketPhoto;img.alt=photo.dataset.caption;p.textContent=photo.dataset.caption;p.className='dialog-caption';content.replaceChildren(img,p);viewer.showModal();return}const a=e.target.closest('[data-market-link],[data-market-back]');if(!a||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target)return;const url=new URL(a.href);if(url.pathname===location.pathname)return;e.preventDefault();const m=markets.find(x=>href(x)===url.pathname);go(url,m,a.hasAttribute('data-market-back')).catch(()=>location.assign(a.href))});
 addEventListener('popstate',()=>{generation++;animations.forEach(a=>a.cancel());animations=[];overlay.classList.remove('active');document.body.classList.remove('is-changing');busy=false;route(true);scrollTo({top:location.pathname==='/pazarlar'?listScroll:0,behavior:'instant'})});
 async function load(){try{const response=await fetch('/api/public/markets',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();markets=(Array.isArray(data.markets)?data.markets:[]).filter(m=>typeof m.id==='string'&&/^[\w-]+$/.test(m.id)).sort((a,b)=>(a.startDate||'9999').localeCompare(b.startDate||'9999')||(Number(a.edition)||999)-(Number(b.edition)||999));if(!markets.length){host.innerHTML='<section class="market-error"><h1>Pazar hikâyeleri yakında.</h1><p>Yayınlanan pazar kayıtları burada yer alacak.</p></section>';return}route()}catch{host.innerHTML='<section class="market-error"><h1>Pazarlar yüklenemedi.</h1><p>Bağlantını kontrol edip tekrar deneyebilirsin.</p><button class="text-link" id="market-retry">Tekrar dene ↗</button></section>';document.getElementById('market-retry').addEventListener('click',load)}}
 load();
})();
