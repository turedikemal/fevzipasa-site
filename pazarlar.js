/* Fevzipaşa market archive. Kinetic motion inspired by Codrops' TypeTransition;
   implemented with native Web Animations, without third-party runtime dependencies. */
(()=>{
 const host=document.getElementById('market-content'),main=document.getElementById('main');
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),overlay=document.querySelector('.market-transition'),type=overlay.querySelector('.market-type');
 let markets=[],busy=false,listScroll=0,animations=[],generation=0;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const href=m=>'/pazar/'+encodeURIComponent(m.id);
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date());
 const past=m=>m.status==='tamamlandi'||!!((m.endDate||m.startDate)&&(m.endDate||m.startDate)<today());
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
  const pool=markets.flatMap(m=>images(m).map(src=>({m,src}))),tiles=[];
  let n=0;
  for(const [latitude,count] of [[-52,4],[-18,8],[18,8],[52,4]])for(let i=0;i<count;i++){
   if(!pool.length)break;const item=pool[n++%pool.length];
   tiles.push(link(item.m,`<span class="sphere-front">${photo(item.m,item.src)}</span><span class="sphere-back" aria-hidden="true">${photo(item.m,item.src)}</span>`,'market-sphere-tile').replace('class="market-sphere-tile"',`class="market-sphere-tile" tabindex="-1" aria-label="${escape(item.m.name)}" style="--latitude:${latitude}deg;--longitude:${i*360/count+(latitude>0?20:0)}deg"`));
  }
  host.innerHTML=`<section class="market-composition" aria-label="Fevzipaşa pazarları"><div class="market-editorial"><div class="market-spine" aria-hidden="true"></div><div class="market-location"><span>FEVZİPAŞA<br>ÇANAKKALE</span><span>Tasarımın<br>buluşma yeri.</span></div><h1 class="visually-hidden">Fevzipaşa Tasarım Pazarları</h1><div class="market-index">${markets.map((m,i)=>`<section class="market-chapter" style="--column:${[3,2,3,2,4,3][i%6]}"><div class="market-word"><span class="market-number">${String(i+1).padStart(2,'0')}</span><h2>${link(m,heading(m).replace(/<span>(.*?)<\/span>/g,'<span class="market-title-line"><span>$1</span></span>'),'market-title-link')}</h2><p>${escape(dates(m))}</p></div></section>`).join('')}</div><div class="market-editorial-note"><p>Bir sokak.<br>Birçok buluşma.<br>Her pazarın kendi hikâyesi.</p></div><div class="market-signoff"><span>© ’26</span></div></div><div class="market-edge" aria-hidden="true"><span>fevzi</span><span>paşa</span></div></section><section class="market-parallax-gallery" aria-label="Pazardan üç kare"><div class="market-parallax-pin"><div class="market-parallax-heading"><p class="eyebrow">SOKAĞIN İÇİNDEN</p><h2>Pazardan kareler.</h2></div><div class="market-parallax-window"><div class="market-parallax-track">${pool.slice(0,3).map(({m,src})=>link(m,photo(m,src),'market-parallax-card')).join('')}</div></div></div></section><section class="market-work-scene" aria-label="Tüm pazarlar, 2025–2026"><div class="market-work-stage"><h2 class="visually-hidden">Tüm pazarlar / 25–26</h2><div class="market-sphere" aria-label="Pazar fotoğraflarının üç boyutlu arşivi"><div class="market-sphere-rotor">${tiles.join('')}</div></div><a class="market-work-title" href="#market-directory"><span class="market-wave">Tüm pazarlar</span></a><span class="market-work-years" aria-hidden="true"><span class="market-wave">25–26</span></span></div></section><section class="market-directory" id="market-directory"><div class="market-directory-head"><div><p class="eyebrow">FEVZİPAŞA / PAZAR ARŞİVİ</p><h2>Pazar hikâyeleri.</h2></div><span class="market-directory-years">25–26</span></div><ul class="market-all-links">${markets.map((m,i)=>`<li>${link(m,`<span>${String(i+1).padStart(2,'0')}</span><strong>${escape(m.name)}</strong><small>${escape(dates(m))}</small><span aria-hidden="true">↗</span>`)}</li>`).join('')}</ul></section>`;
  updateNav();startHeadings();
 }
 function detail(m){
  stopHeadings();
  document.title=m.name+' | Fevzipaşa';const i=markets.indexOf(m),next=markets[i+1]||markets[0];
  const isPast=past(m),people=Array.isArray(m.participants)?m.participants:[];
  host.innerHTML=`<article><section class="market-detail-head"><a href="/pazarlar" data-market-back class="market-detail-back">← Tüm pazarlar</a><div class="market-detail-top"><div><p class="eyebrow">FEVZİPAŞA / ${isPast?'PAZAR ARŞİVİ':'TASARIM PAZARI'}</p><h1 tabindex="-1">${escape(m.name)}</h1></div><div class="market-detail-facts"><p>${escape(dates(m))}</p>${m.hours?`<p>${escape(m.hours)}</p>`:''}<p>${escape(m.location||'Fevzipaşa / Çanakkale')}</p>${isPast?'<p>Bu buluşma sona erdi.<br>Hikâyesi burada devam ediyor.</p>':''}</div></div></section><div class="market-detail-visual">${cover(m)}</div><section class="market-memory"><h2>${isPast?'SOKAKTA<br>BİRİKENLER.':'YENİ BİR<br>BULUŞMA.'}</h2><div><p class="eyebrow">${escape(m.name)}</p><p>${isPast?'Bu sayfa, '+escape(m.name)+'’nın arşivi. O buluşmanın afişini ve katılımcılarını bir arada tutuyoruz.':'Fevzipaşa’da tasarımın, üretimin ve karşılaşmaların bir araya geldiği yeni bir buluşma. Pazarın tarihi, yeri ve katılımcıları burada.'}</p><p>${isPast?'Bir ürüne yakından bakmak, onu yapan kişiyle tanışmak, sokakta yeni bir hikâyeye rastlamak. Fevzipaşa’daki buluşmaların ortak noktası bu.':'Üreticileri tanımak ve pazarı keşfetmek için aşağıya devam et.'}</p></div></section>${winter(m)?`<section class="market-gallery"><p class="eyebrow">KIŞ PAZARINDAN / SOKAĞIN İÇİNDEN</p><h2>BİR BULUŞMANIN İZLERİ.</h2><div class="market-gallery-grid">${[['sokak-kitap','Kitaplar ve karşılaşmalar'],['sokak-tekstil','Dokular ve üreticiler'],['sokak-taki','Küçük detaylar']].map(([file,caption])=>`<button class="market-photo" data-market-photo="/assets/${file}.webp" data-caption="${caption}" aria-label="${caption} fotoğrafını büyüt"><img src="/assets/${file}.webp" alt="Kış Pazarı — ${caption}" loading="lazy"><span>${caption} ↗</span></button>`).join('')}</div></section>`:''}<section class="market-people"><p class="eyebrow">${isPast?'BU PAZARDA BİZİMLEYDİLER':'BU PAZARIN KATILIMCILARI'}</p><h2>TASARIMIN İNSANLARI.</h2>${people.length?`<ul>${people.map(p=>`<li>${p.instagram?`<a href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noopener noreferrer">${escape(p.name)} ↗</a>`:escape(p.name)}</li>`).join('')}</ul>`:'<p>Bu pazarın katılımcı listesi henüz yayınlanmadı.</p>'}</section>${next&&next!==m?`<section class="market-next"><div><p class="eyebrow">BİR SONRAKİ HİKÂYE</p><h2>${escape(next.name)}</h2></div>${link(next,'Pazarı keşfet ↗','text-link')}</section>`:''}</article>`;
  updateNav();
 }
 function updateNav(){document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')==='/pazarlar')a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}
 function route(focus=false){stopHeadings();const path=location.pathname.replace(/\/$/,'');if(path==='/pazarlar'){listing();if(focus)main.focus({preventScroll:true});return}const key=path.split('/')[2],m=markets.find(x=>x.id===key);if(m){detail(m);if(focus)host.querySelector('h1').focus({preventScroll:true})}else{host.innerHTML='<section class="market-error"><h1>Pazar bulunamadı.</h1><a href="/pazarlar" data-market-back class="text-link">Tüm pazarlara dön ↗</a></section>';updateNav()}}
 let headingObserver=null,sceneFrame=0,entryTimer=0,sceneStart=0,sceneLast=0,sceneSpin=0,galleryX=0,waves=[];
 const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
 const ease=v=>v*v*(3-2*v);
 function stopHeadings(){headingObserver?.disconnect();headingObserver=null;cancelAnimationFrame(sceneFrame);sceneFrame=0;sceneLast=0;clearTimeout(entryTimer);waves=[]}
 function beginWave(el){
  const wave=waves.find(w=>w.el===el);if(!wave||wave.done||wave.start!==null)return;
  wave.start=performance.now();el.closest('.market-chapter')?.classList.add('is-entered');
 }
 function startHeadings(){
  stopHeadings();sceneStart=performance.now();sceneSpin=0;galleryX=innerWidth*.15;
  const texts=[...host.querySelectorAll('.market-word h2,.market-parallax-heading h2,.market-work-title .market-wave,.market-work-years .market-wave,.market-directory-head h2')];
  if(!motion.matches){
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('class','market-wave-defs');svg.setAttribute('aria-hidden','true');
   const defs=document.createElementNS(ns,'defs');svg.append(defs);
   texts.forEach((el,i)=>{
    const filter=document.createElementNS(ns,'filter'),id='market-wave-'+i;filter.id=id;filter.setAttribute('x','-50%');filter.setAttribute('y','-100%');filter.setAttribute('width','200%');filter.setAttribute('height','300%');filter.setAttribute('color-interpolation-filters','sRGB');
    const blur=document.createElementNS(ns,'feGaussianBlur');blur.setAttribute('in','SourceGraphic');blur.setAttribute('stdDeviation','50');blur.setAttribute('result','blur');
    const matrix=document.createElementNS(ns,'feColorMatrix');matrix.setAttribute('in','blur');matrix.setAttribute('mode','matrix');matrix.setAttribute('values','1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 13 -6');matrix.setAttribute('result','goo');
    const composite=document.createElementNS(ns,'feComposite');composite.setAttribute('in','SourceGraphic');composite.setAttribute('in2','goo');composite.setAttribute('operator','atop');
    filter.append(blur,matrix,composite);defs.append(filter);el.style.filter=`url(#${id})`;el.style.opacity='0';waves.push({el,blur,start:null,done:false});
   });host.append(svg);
   if(typeof IntersectionObserver!=='undefined'){
    headingObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){beginWave(entry.target);headingObserver?.unobserve(entry.target)}},{threshold:.12,rootMargin:'0px 0px -10% 0px'});
    entryTimer=setTimeout(()=>texts.forEach(text=>headingObserver?.observe(text)),700);
   }else texts.forEach(beginWave);
  }
  paintScene(sceneStart);if(!motion.matches)sceneFrame=requestAnimationFrame(sceneTick);
 }
 function sceneTick(now){
  sceneFrame=0;if(!host.querySelector('.market-composition'))return;
  const dt=sceneLast?Math.min(64,Math.max(0,now-sceneLast)):0;sceneLast=now;
  if(!document.hidden&&!busy)sceneSpin+=dt*.008;
  paintScene(now,dt);sceneFrame=requestAnimationFrame(sceneTick);
 }
 function paintScene(now=performance.now(),dt=16){
  const intro=host.querySelector('.market-composition'),editorial=host.querySelector('.market-editorial');if(!intro||!editorial)return;
  const vh=innerHeight,vw=innerWidth,header=document.querySelector('header')?.offsetHeight||90,rect=editorial.getBoundingClientRect(),spine=host.querySelector('.market-spine');
  const spineHeight=Math.max(1,editorial.offsetHeight-(vw<=640?120:180)-15);
  const line=clamp((vh*.88-rect.top-15)/spineHeight),boot=motion.matches?1:ease(clamp((now-sceneStart)/650));
  spine.style.transform=`scaleY(${line*boot})`;
  for(const wave of waves){
   if(wave.start===null||wave.done)continue;
   const progress=clamp((now-wave.start)/2000),remaining=progress===1?0:Math.pow(2,-10*progress);
   wave.blur.setAttribute('stdDeviation',String(50*remaining));wave.el.style.opacity=String(1-remaining);
   if(progress===1){wave.done=true;wave.el.style.filter='none';wave.el.style.opacity='1'}
  }
  const gallery=host.querySelector('.market-parallax-gallery'),track=host.querySelector('.market-parallax-track');
  if(gallery&&track){
   const gr=gallery.getBoundingClientRect(),p=clamp((vh-gr.top)/Math.max(1,gallery.offsetHeight+vh));
   const target=p<.55?vw*.15*(1-ease(clamp(p/.55))):vw*.20*ease(clamp((p-.55)/.45));
   galleryX=motion.matches?0:galleryX+(target-galleryX)*(1-Math.exp(-Math.max(dt,1)*.012));track.style.transform=`translate3d(${galleryX.toFixed(2)}px,0,0)`;
   track.querySelectorAll('img').forEach(img=>{const cr=img.parentElement.getBoundingClientRect(),distance=clamp((cr.left+cr.width/2-vw/2)/(vw/2),-1,1);img.style.transform=motion.matches?'none':`translate3d(${-distance*10}%,0,0)`});
  }
  const scene=host.querySelector('.market-work-scene'),stage=host.querySelector('.market-work-stage');if(!scene)return;
  const r=scene.getBoundingClientRect(),h=vh-header,g=clamp((header-r.top)/Math.max(1,scene.offsetHeight-h)),opening=ease(clamp((g-.12)/.28)),roll=ease(clamp((g-.58)/.36));
  const small=vw<=640,ry=h*(small?.29:.31),angle=roll*Math.PI/2;
  const title=host.querySelector('.market-work-title'),years=host.querySelector('.market-work-years'),tw=title.offsetWidth||vw*.31,yw=years.offsetWidth||vw*.14,gap=vw*(small?.035:.04),radius=small?vw*.31:Math.min(vw*.19,270);
  const leftBase=(yw+gap)/2,rightBase=(tw+gap)/2,leftOpen=radius+tw/2+gap*.65,rightOpen=radius+yw/2+gap*.65;
  const titleX=-(leftBase+(leftOpen-leftBase)*opening)*Math.cos(angle),yearX=(rightBase+(rightOpen-rightBase)*opening)*Math.cos(angle);
  stage.style.setProperty('--title-x',titleX+'px');stage.style.setProperty('--year-x',yearX+'px');stage.style.setProperty('--roll-y',ry*Math.sin(angle)+'px');stage.style.setProperty('--roll-angle',roll*360+'deg');
  stage.style.setProperty('--year-opacity',String(1-clamp((roll-.55)/.45)));stage.style.setProperty('--sphere-opacity',String(opening));stage.style.setProperty('--sphere-y',h*.38*(1-opening)-h*.12*roll+'px');
  stage.style.setProperty('--spin',sceneSpin.toFixed(3)+'deg');
  const sphere=host.querySelector('.market-sphere');sphere.inert=opening<.15;
  sphere.classList.toggle('is-visible',opening>.01);
 }
 document.addEventListener('focusin',e=>{
  const title=e.target.closest('.market-title-link')?.closest('h2'),wave=waves.find(w=>w.el===title);
  if(wave){wave.done=true;wave.blur.setAttribute('stdDeviation','0');wave.el.style.filter='none';wave.el.style.opacity='1'}
 });
 addEventListener('resize',()=>paintScene());
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
 async function load(){document.body.classList.add('markets-loading');try{const response=await fetch('/api/public/markets',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();markets=(Array.isArray(data.markets)?data.markets:[]).filter(m=>typeof m.id==='string'&&/^[\w-]+$/.test(m.id)).sort((a,b)=>(a.startDate||'9999').localeCompare(b.startDate||'9999')||(Number(a.edition)||999)-(Number(b.edition)||999));if(!markets.length){host.innerHTML='<section class="market-error"><h1>Pazar hikâyeleri yakında.</h1><p>Yayınlanan pazar kayıtları burada yer alacak.</p></section>';return}if(document.fonts)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1200))]);document.body.classList.remove('markets-loading');route()}catch{host.innerHTML='<section class="market-error"><h1>Pazarlar yüklenemedi.</h1><p>Bağlantını kontrol edip tekrar deneyebilirsin.</p><button class="text-link" id="market-retry">Tekrar dene ↗</button></section>';document.getElementById('market-retry').addEventListener('click',load)}finally{document.body.classList.remove('markets-loading')}}
 load();
})();
