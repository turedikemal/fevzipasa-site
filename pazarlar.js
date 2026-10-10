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
 const live=m=>m.status!=='tamamlandi'&&!!m.startDate&&m.startDate<=today()&&(m.endDate||m.startDate)>=today();
 const date=d=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))return '';const v=new Date(d+'T12:00:00Z');return Number.isNaN(v.getTime())?'':new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Istanbul'}).format(v)};
 const dates=m=>[date(m.startDate),m.endDate!==m.startDate?date(m.endDate):''].filter(Boolean).join(' — ')||'Tarih bilgisi eklenecek';
 const winter=m=>/kış|kis/i.test(m.name)||Number(m.edition)===2;
 const images=m=>m.poster?[`/media/${encodeURIComponent(m.poster)}`]:winter(m)?['/assets/sokak-kitap.webp','/assets/sokak-tekstil.webp','/assets/sokak-taki.webp']:[];
 const photo=(m,src)=>`<img src="${src}" alt="${escape(m.name)}${m.poster?' afişi':' fotoğrafı'}" loading="lazy">`;
 const cover=m=>images(m).length?photo(m,images(m)[0]):'<p class="market-no-cover">Bu pazarın afişi henüz yayınlanmadı.</p>';
 const link=(m,text,cls='')=>`<a class="${cls}" data-market-link href="${href(m)}">${text}</a>`;
 const displayName=m=>m.name.replace(/fevzipaşa\s*/ig,'').replace(/^\d+\.\s*/,'').trim()||m.name;
 const heading=m=>displayName(m).split(/\s+/).map(word=>`<span>${escape(word)}</span>`).join('');
 const repeatedTitle=text=>`<h2 class="market-repeat" aria-label="${escape(text)}">${Array.from({length:8},(_,i)=>`<span aria-hidden="true" class="${i===7?'repeat-main':'repeat-copy'}">${escape(text)}</span>`).join('')}</h2>`;
 const repeatedMarketTitle=m=>`<h2 class="market-repeat market-list-repeat" aria-label="${escape(displayName(m))}">${Array.from({length:8},(_,i)=>`<span aria-hidden="true" class="${i===7?'repeat-main':'repeat-copy'}">${heading(m)}</span>`).join('')}</h2>`;
 function marketStory(m){
  const isPast=past(m),planned=m.status==='planlandi',name=displayName(m);
  const intro=planned?`${name}, 25–27 Aralık 2026 için planlanıyor. Yılın son buluşmasının programı ve katılımcıları bu sayfada duyurulacak.`:isPast?`${name}, ${dates(m)} tarihlerinde Fevzipaşa’daki buluşmalarımızdan biri oldu. Bu sayfada o pazara ait yayınlanan görselleri ve katılımcıları bir arada bulabilirsin.`:`${name}, ${dates(m)} tarihlerinde Fevzipaşa’da. Tarih, konum ve yayınlanan katılımcı listesi bu sayfada.`;
  const meeting=isPast?'Bir ürünün arkasındaki insanla tanışmak. Nasıl üretildiğini dinlemek, dokusuna yakından bakmak. Pazardan geriye kalan hikâyeyi, katılan üreticilerle birlikte keşfet.':planned?'Yeni buluşmaya katılacak üreticiler, liste kesinleştiğinde burada yer alacak. Başvuru ve program duyuruları için bu sayfayı takip edebilirsin.':'Üreticilerle tanış, yaptıkları işlere yakından bak. Katılımcı bölümünden markaların kendi sayfalarına ulaşabilirsin.';
  const discovery=isPast?'Sokağın içinden fotoğraflar, küçük ayrıntılar ve karşılaşmalar. Bu pazara ait yayınlanan görseller aşağıda; her fotoğrafı tıklayarak büyütebilirsin.':planned?'Yılbaşı Tasarım Pazarı’nın görselleri ve ayrıntıları hazırlandıkça burada paylaşılacak. Önceki pazarları keşfetmek için pazarlar sayfasına dönebilirsin.':'Pazarın görsellerini ve katılımcılarını keşfet. Ziyaret bilgileri için sayfanın başındaki tarih ve konum bölümüne bakabilirsin.';
  return `<section class="market-story" aria-label="${escape(name)} hikâyesi"><p class="market-story-intro">${escape(intro)}</p><div class="market-story-chapter">${repeatedTitle('Tanış.')}<p>${escape(meeting)}</p></div><div class="market-story-chapter is-right">${repeatedTitle('Keşfet.')}<p>${escape(discovery)}</p></div><div class="market-story-chapter">${repeatedTitle('Birlikte.')}<p>Fevzipaşa’da tasarımın bir buluşma yeri var. Bir sokağı paylaşmak, el emeğine alan açmak, üreticilerle bağ kurmak. Her pazarın hikâyesini bu karşılaşmalar oluşturuyor.</p></div></section>`;
 }
 function marketHero(m){
  const pics=images(m),isPast=past(m);
  const slides=(duplicate=false)=>pics.map(src=>`<button class="market-hero-photo" data-market-photo="${src}" data-caption="${escape(m.name)}" aria-label="${escape(m.name)} fotoğrafını büyüt" ${duplicate?'tabindex="-1"':''}>${photo(m,src)}</button>`).join('');
  return `<section class="market-split-hero"><a href="/pazarlar" data-market-back class="market-detail-back">← Tüm pazarlar</a><div class="market-split-grid"><div class="market-split-copy"><p class="eyebrow">FEVZİPAŞA / ${m.status==='planlandi'?'PLANLANAN PAZAR':isPast?'PAZAR ARŞİVİ':'TASARIM PAZARI'}</p><h1 tabindex="-1">${heading(m)}</h1><div class="market-detail-facts"><p>${escape(dates(m))}</p>${m.hours?`<p>${escape(m.hours)}</p>`:''}<p>${escape(m.location||'Fevzipaşa / Çanakkale')}</p>${m.status==='planlandi'?'<p>Program ve katılımcılar daha sonra duyurulacak.</p>':''}</div></div><div class="market-hero-gallery" ${winter(m)?'':'id="pazar-gorselleri"'}>${pics.length?`<div class="market-hero-window"><div class="market-hero-track"><div class="market-hero-set">${slides()}</div><div class="market-hero-set" aria-hidden="true">${slides(true)}</div></div></div><button type="button" class="market-gallery-pause" aria-pressed="false">Hareketi durdur Ⅱ</button>`:'<p class="market-hero-empty">Bu pazarın görselleri burada paylaşılacak.</p>'}</div></div></section>`;
 }
 function listing(){
  document.title='Pazarlar | Fevzipaşa';
  const pool=markets.flatMap(m=>images(m).map(src=>({m,src}))),tiles=[];
  let n=0;
  for(const [latitude,count] of [[-50,4],[-16,4],[16,4],[50,4]])for(let i=0;i<count;i++){
   if(!pool.length)break;const item=pool[n++%pool.length];
   tiles.push(link(item.m,`<span class="sphere-front">${photo(item.m,item.src)}</span><span class="sphere-back" aria-hidden="true">${photo(item.m,item.src)}</span>`,'market-sphere-tile').replace('class="market-sphere-tile"',`class="market-sphere-tile" tabindex="-1" aria-label="${escape(item.m.name)}" style="--latitude:${latitude}deg;--longitude:${i*360/count+(latitude>0?20:0)}deg"`));
  }
  host.innerHTML=`<section class="market-composition" aria-label="Fevzipaşa pazarları"><div class="market-editorial"><div class="market-spine" aria-hidden="true"></div><div class="market-location"><span>FEVZİPAŞA<br>ÇANAKKALE</span><span>Tasarımın<br>buluşma yeri.</span></div><h1 class="visually-hidden">Fevzipaşa Tasarım Pazarları</h1><div class="market-index">${markets.map((m,i)=>`<section class="market-chapter" style="--column:${[3,2,3,2,3,2][i%6]}"><div class="market-word">${live(m)?'<span class="market-live"><span aria-hidden="true"></span>Şu anda gerçekleşiyor</span>':''}<span class="market-number">${String(i+1).padStart(2,'0')}</span>${link(m,repeatedMarketTitle(m),'market-title-link')}<p>${escape(dates(m))}${m.status==='planlandi'?'<br><strong>PLANLANAN PAZAR</strong>':''}</p></div>${images(m).length?`<div class="market-local-photos" aria-label="${escape(m.name)} görselleri">${images(m).slice(0,3).map((src,i)=>link(m,photo(m,src),'market-local-photo').replace('data-market-link',`data-market-link data-deck-index="${i}"`)).join('')}<a class="market-photos-all" data-market-link href="${href(m)}#pazar-gorselleri">Tümünü gör <span aria-hidden="true">↗</span></a></div>`:''}</section>${i<markets.length-1&&[1,3,4].includes(i)?`<div class="market-between"><span>${i===4&&markets[i+1]?.startDate==='2026-12-25'?'Yıl bitmeden yeniden buluşalım.':({1:'Tanış.',3:'Keşfet.',4:'Tasarımı destekle.'})[i]}</span>${i===4&&markets[i+1]?.startDate==='2026-12-25'?'<p class="market-between-invitation">25–27 Aralık 2026 · Sizi bekliyoruz.</p>':''}</div>`:''}`).join('')}</div><div class="market-editorial-note"><p>Bir sokak.<br>Birçok buluşma.<br>Her pazarın kendi hikâyesi.</p></div><div class="market-signoff"><span>© ’26</span></div></div><div class="market-edge" aria-hidden="true"><span>fevzi</span><span>paşa</span></div></section><section class="market-work-scene" aria-label="Tüm pazarlar, 2025–2026"><div class="market-work-stage"><h2 class="visually-hidden">Tüm pazarlar / 25–26</h2><div class="market-sphere" aria-label="Pazar fotoğraflarının üç boyutlu arşivi"><div class="market-sphere-rotor">${tiles.join('')}</div></div><a class="market-work-title" href="#market-directory"><span class="market-wave">Tüm pazarlar</span></a><span class="market-work-years" aria-hidden="true"><span class="market-wave">25–26</span></span><a class="market-work-final" href="#market-directory">Tüm pazarlar</a></div></section><section class="market-directory" id="market-directory"><div class="market-directory-head"><div><p class="eyebrow">FEVZİPAŞA / PAZAR ARŞİVİ</p>${repeatedTitle('Pazar hikâyeleri.')}</div><span class="market-directory-years">25–26</span></div><ul class="market-all-links">${markets.map((m,i)=>`<li>${link(m,`<span>${String(i+1).padStart(2,'0')}</span><strong>${escape(m.name)}</strong><small>${escape(dates(m))}</small><span aria-hidden="true">↗</span>`)}</li>`).join('')}</ul></section>`;
  updateNav();startHeadings();
 }
 function detail(m){
  stopHeadings();
  document.title=m.name+' | Fevzipaşa';const i=markets.indexOf(m),next=markets[i+1]||markets[0];
  const isPast=past(m),people=Array.isArray(m.participants)?m.participants:[];
  host.innerHTML=`<article>${marketHero(m)}${marketStory(m)}${winter(m)?`<section class="market-gallery" id="pazar-gorselleri"><p class="eyebrow">KIŞ PAZARINDAN / SOKAĞIN İÇİNDEN</p><h2>BİR BULUŞMANIN İZLERİ.</h2><div class="market-gallery-grid">${[['sokak-kitap','Kitaplar ve karşılaşmalar'],['sokak-tekstil','Dokular ve üreticiler'],['sokak-taki','Küçük detaylar']].map(([file,caption])=>`<button class="market-photo" data-market-photo="/assets/${file}.webp" data-caption="${caption}" aria-label="${caption} fotoğrafını büyüt"><img src="/assets/${file}.webp" alt="Kış Pazarı — ${caption}" loading="lazy"><span>${caption} ↗</span></button>`).join('')}</div></section>`:''}<section class="market-people"><p class="eyebrow">${isPast?'BU PAZARDA BİZİMLEYDİLER':'BU PAZARIN KATILIMCILARI'}</p><h2>TASARIMIN İNSANLARI.</h2>${people.length?`<ul>${people.map(p=>`<li>${p.instagram?`<a href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noopener noreferrer">${escape(p.name)} ↗</a>`:escape(p.name)}</li>`).join('')}</ul>`:'<p>Bu pazarın katılımcı listesi henüz yayınlanmadı.</p>'}</section>${next&&next!==m?`<section class="market-next"><div><p class="eyebrow">BİR SONRAKİ HİKÂYE</p><h2>${escape(next.name)}</h2></div>${link(next,'Pazarı keşfet ↗','text-link')}</section>`:''}</article>`;
  updateNav();startDetailText();
 }
 function updateNav(){document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')==='/pazarlar')a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})}
 function route(focus=false){stopHeadings();const path=location.pathname.replace(/\/$/,'');if(path==='/pazarlar'){listing();if(focus)main.focus({preventScroll:true});return}const key=path.split('/')[2],m=markets.find(x=>x.id===key);if(m){detail(m);if(focus)host.querySelector('h1').focus({preventScroll:true})}else{host.innerHTML='<section class="market-error"><h1>Pazar bulunamadı.</h1><a href="/pazarlar" data-market-back class="text-link">Tüm pazarlara dön ↗</a></section>';updateNav()}}
 let sceneFrame=0,sceneStart=0,sceneLast=0,sceneSpin=0;
 const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
 const ease=v=>v*v*(3-2*v);
 function stopHeadings(){cancelAnimationFrame(sceneFrame);sceneFrame=0;sceneLast=0;}
 function startHeadings(){
  stopHeadings();sceneStart=performance.now();sceneSpin=0;
  paintScene(sceneStart);if(!motion.matches)sceneFrame=requestAnimationFrame(sceneTick);
 }
 function paintDetailText(){
  host.querySelectorAll('.market-repeat').forEach(el=>{
   const mainLayer=el.querySelector('.repeat-main');if(!mainLayer)return;
   const height=Math.max(1,mainLayer.offsetHeight),rect=mainLayer.getBoundingClientRect();
   // Measure the actual text, not the blank space reserved for its copies.
   const isListing=el.classList.contains('market-list-repeat');
   const p=isListing?clamp((innerHeight*.45-rect.top)/Math.max(1,innerHeight*.25)):clamp((innerHeight-rect.top)/Math.max(1,innerHeight+height));
   const maxTrail=Math.min(height*.4,innerWidth<=640?64:112);
   if(isListing)el.style.paddingBottom=(motion.matches?0:maxTrail)+'px';
   const direction=el.closest('.market-chapter')?.style.getPropertyValue('--column')==='2'?-1:1;
   el.querySelectorAll('.repeat-copy').forEach((span,i)=>{
    const rank=8-i,t=motion.matches?0:clamp((p-rank*.01)/.92);
    span.style.transform=isListing?`translate3d(${direction*(rank/8)*24*t}px,${(rank/8)*maxTrail*t}px,0)`:`translate3d(${direction*rank*2*t}%,${rank*16*t}%,0)`;
    span.style.opacity=motion.matches?'0':String(Math.min(i*.15,1)*t);
   });
  });
 }
 function startDetailText(){paintDetailText();if(!motion.matches)sceneFrame=requestAnimationFrame(sceneTick)}
 function sceneTick(now){
  sceneFrame=0;if(!host.querySelector('.market-composition')){if(host.querySelector('.market-repeat')){paintDetailText();sceneFrame=requestAnimationFrame(sceneTick)}return;}
  const dt=sceneLast?Math.min(64,Math.max(0,now-sceneLast)):0;sceneLast=now;
  if(!document.hidden&&!busy)sceneSpin+=dt*.008;
  paintScene(now,dt);sceneFrame=requestAnimationFrame(sceneTick);
 }
 function shuffleDeck(group,now=performance.now()){
  group.dataset.lastShuffle=String(now);group.dataset.shuffleUntil=String(motion.matches?0:now+650);
  const cards=[...group.querySelectorAll('.market-local-photo')].filter(card=>!card.hidden),order=cards.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  cards.forEach((card,i)=>card.dataset.rank=String(order[i]));
 }
 function paintScene(now=performance.now(),dt=16){
  paintDetailText();
  const intro=host.querySelector('.market-composition'),editorial=host.querySelector('.market-editorial');if(!intro||!editorial)return;
  const vh=innerHeight,vw=innerWidth,header=document.querySelector('header')?.offsetHeight||90,rect=editorial.getBoundingClientRect(),spine=host.querySelector('.market-spine');
  const spineHeight=Math.max(1,editorial.offsetHeight-(vw<=640?120:180)-15);
  const line=clamp((vh*.88-rect.top-15)/spineHeight),boot=motion.matches?1:ease(clamp((now-sceneStart)/650));
  spine.style.transform=`scaleY(${line*boot})`;
  host.querySelectorAll('.market-local-photos').forEach(group=>{
   const chapter=group.closest('.market-chapter'),cr=chapter.getBoundingClientRect(),p=clamp((vh-cr.top)/Math.max(1,vh+cr.height));
   const amount=p<.55?1-ease(clamp(p/.55)):ease(clamp((p-.55)/.45)),direction=chapter.style.getPropertyValue('--column')==='2'?-1:1;
   // Fully spread by the time this market reaches the upper half of the viewport.
   const growth=motion.matches?1:ease(clamp((vh*.92-cr.top)/(vh*.37)));
   const available=vw<=640?Math.max(180,cr.width):Math.max(130,vw-cr.right-64);
   const base=Math.min(vw<=640?220:420,available),expanded=available;
   group.style.setProperty('--photo-width',(base+(expanded-base)*growth)+'px');
   chapter.style.setProperty('--chapter-photo-height',((vw<=640?88:114)+(vw<=640?32:180)*growth)+'px');
   group.style.setProperty('--photo-height',((vw<=640?88:114)+(vw<=640?32:180)*growth)+'px');
   const target=motion.matches||vw<=640?0:amount*Math.min(24,Math.max(0,available-expanded))*direction;
   const cards=[...group.querySelectorAll('.market-local-photo')].filter(card=>!card.hidden),count=cards.length;
   group.style.setProperty('--deck-count',String(Math.max(1,count)));
   const shuffle=Number(group.dataset.shuffleUntil||0)>now,spread=shuffle?0:growth;
   if(!motion.matches&&growth<.8&&!busy&&!group.contains(document.activeElement)&&now-Number(group.dataset.lastShuffle||sceneStart)>6000){shuffleDeck(group,now)}
   if(spread>=.995){group.dataset.openSince??=String(now)}else delete group.dataset.openSince;
   const all=group.querySelector('.market-photos-all'),allVisible=spread>=.995&&(motion.matches||now-Number(group.dataset.openSince)>=650);
   if(all){all.classList.toggle('is-visible',allVisible);all.inert=!allVisible;all.setAttribute('aria-hidden',String(!allVisible))}
   const width=base+(expanded-base)*growth,step=(width-8*(count-1))/Math.max(1,count)+8;
   cards.forEach((card,i)=>{const rank=Number(card.dataset.rank??i),x=((count-1)/2-i)*step*(1-spread),angle=(rank-(count-1)/2)*9*(1-spread);card.style.transform=`translate3d(${x}px,${rank*4*(1-spread)}px,0) rotate(${angle}deg)`;card.style.zIndex=String(10+rank)});
   const current=Number(group.dataset.x||target),x=current+(target-current)*(1-Math.exp(-Math.max(dt,1)*.014));
   group.dataset.x=String(x);group.style.transform=`translate3d(${x.toFixed(2)}px,0,0)`;
   group.querySelectorAll('img').forEach(img=>img.style.transform=motion.matches?'none':`translateX(${-amount*direction*7}%)`);
  });
  const scene=host.querySelector('.market-work-scene'),stage=host.querySelector('.market-work-stage');if(!scene)return;
  const r=scene.getBoundingClientRect(),h=vh-header,g=clamp((header-r.top)/Math.max(1,scene.offsetHeight-h));
  const opening=ease(clamp((g-.08)/.18)),sphereOpening=ease(clamp((g-.27)/.12)),roll=clamp((g-.52)/.43),descent=ease(clamp(roll/.6)),merge=ease(clamp((roll-.6)/.4));
  const small=vw<=640,title=host.querySelector('.market-work-title'),years=host.querySelector('.market-work-years'),tw=title.offsetWidth||vw*.29,yw=years.offsetWidth||vw*.13,th=title.offsetHeight||h*.07,yh=years.offsetHeight||h*.07;
  const radius=Math.min(vw*(small?.14:.12),180,h*.19),tileSize=Math.min(vw*(small?.08:.043),68,h*.12),safeRadius=radius*1.18+tileSize*.7,gap=Math.min(vw*.02,32,h*.04);
  const leftBase=(yw+gap)/2,rightBase=(tw+gap)/2,leftOpen=safeRadius+tw/2+gap,rightOpen=safeRadius+yw/2+gap;
  // Descend outside the sphere first. Merge horizontally only below its lowest face.
  const titleX=-(leftBase+(leftOpen-leftBase)*opening)*(1-merge),yearX=(rightBase+(rightOpen-rightBase)*opening)*(1-merge);
  const joinY=Math.max(0,safeRadius+gap+Math.max(th,yh)/2-h*.1),y=joinY*descent;
  const sideOpacity=1-ease(clamp((merge-.2)/.4)),finalOpacity=ease(clamp((merge-.6)/.4));
  stage.style.setProperty('--title-x',titleX+'px');stage.style.setProperty('--year-x',yearX+'px');stage.style.setProperty('--roll-y',y+'px');
  stage.style.setProperty('--side-opacity',String(sideOpacity));stage.style.setProperty('--year-opacity',String(sideOpacity));stage.style.setProperty('--final-opacity',String(finalOpacity));stage.style.setProperty('--sphere-opacity',String(sphereOpening));stage.style.setProperty('--sphere-y',h*.08*(1-sphereOpening)+'px');
  const sphere=host.querySelector('.market-sphere');sphere.style.setProperty('--sphere-radius',radius+'px');sphere.style.setProperty('--tile-size',tileSize+'px');
  const final=host.querySelector('.market-work-final');final.inert=finalOpacity<.5;final.style.visibility=finalOpacity>0?'visible':'hidden';title.inert=sideOpacity<.1;
  stage.style.setProperty('--spin',sceneSpin.toFixed(3)+'deg');
  sphere.inert=sphereOpening<.15;
  sphere.classList.toggle('is-visible',sphereOpening>.01);
 }
 addEventListener('scroll',paintDetailText,{passive:true});
 addEventListener('resize',()=>{paintScene();paintDetailText()});
 motion.addEventListener('change',()=>route());
 async function go(url,m,back=false,source=null){
  if(busy)return;busy=true;const run=++generation;let watchdog,photoLayer;
  const finish=()=>{photoLayer?.remove();if(run!==generation){clearTimeout(watchdog);return}animations.forEach(a=>a.cancel());animations=[];overlay.classList.remove('active');document.body.classList.remove('is-changing');busy=false;clearTimeout(watchdog)};
  try{
   if(location.pathname==='/pazarlar')listScroll=scrollY;
   if(!motion.matches&&source){
    const rect=source.getBoundingClientRect();photoLayer=document.createElement('div');photoLayer.className='market-photo-transition';
    const image=document.createElement('img');image.src=source.currentSrc||source.src;image.alt=source.alt;
    const title=document.createElement('div');title.className='market-photo-marquee';title.setAttribute('aria-hidden','true');title.textContent=Array(5).fill(m.name).join(' / ');
    photoLayer.append(image,title);document.body.append(photoLayer);document.body.classList.add('is-changing');
    const opening=image.animate([{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'},{left:'0px',top:'0px',width:'100vw',height:'100svh'}],{duration:850,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
    animations.push(opening);watchdog=setTimeout(finish,3500);await opening.finished;
   }else if(!motion.matches){
    type.replaceChildren(...Array.from({length:11},(_,i)=>{const line=document.createElement('div');line.className='market-type-line';line.textContent=Array(4).fill(m?.name||'FEVZİPAŞA PAZARLARI').join(' / ');return line}));overlay.classList.add('active');document.body.classList.add('is-changing');
    const easing='cubic-bezier(.65,0,.35,1)';
    animations.push(type.animate([{transform:'scale(1) rotate(0deg)'},{transform:'scale(2.7) rotate(-90deg)'}],{duration:1400,easing,fill:'forwards'}));
    [...type.children].forEach((line,i)=>animations.push(line.animate([{transform:'translateX(0)',opacity:.15},{transform:'translateX(20%)',opacity:1,offset:.4},{transform:'translateX(-200%)',opacity:0}],{duration:2500,delay:i*35,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'})));
    // Reveal the destination underneath the moving type, keeping the same menu.
    watchdog=setTimeout(finish,4200);await new Promise(resolve=>setTimeout(resolve,1050));
   }
   if(run!==generation)return;history.pushState({},'',url.pathname+url.hash);route(true);scrollTo({top:back?listScroll:0,behavior:'instant'});if(url.hash==='#pazar-gorselleri')document.getElementById('pazar-gorselleri')?.scrollIntoView({behavior:'instant',block:'start'});
   if(photoLayer){const content=host.querySelector('article');if(content)animations.push(content.animate([{transform:'translateY(100px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)'}));animations.push(photoLayer.animate([{opacity:1},{opacity:0}],{duration:700,delay:350,fill:'forwards'}))}
   if(animations.length)await Promise.allSettled(animations.map(a=>a.finished));
  }finally{finish()}
 }
 document.addEventListener('click',e=>{const pause=e.target.closest('.market-gallery-pause');if(!pause)return;const gallery=pause.closest('.market-hero-gallery'),paused=gallery.classList.toggle('is-paused');pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Hareketi başlat ▶':'Hareketi durdur Ⅱ'});
 document.addEventListener('click',e=>{const photo=e.target.closest('[data-market-photo]');if(photo){const viewer=document.getElementById('viewer'),content=viewer.querySelector('.dialog-content'),img=document.createElement('img'),p=document.createElement('p');img.src=photo.dataset.marketPhoto;img.alt=photo.dataset.caption;p.textContent=photo.dataset.caption;p.className='dialog-caption';content.replaceChildren(img,p);viewer.showModal();return}const a=e.target.closest('[data-market-link],[data-market-back]');if(!a||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target)return;const url=new URL(a.href);if(url.pathname===location.pathname)return;e.preventDefault();const m=markets.find(x=>href(x)===url.pathname);go(url,m,a.hasAttribute('data-market-back'),a.classList.contains('market-local-photo')?a.querySelector('img'):null).catch(()=>location.assign(a.href))});
 addEventListener('popstate',()=>{generation++;animations.forEach(a=>a.cancel());animations=[];overlay.classList.remove('active');document.body.classList.remove('is-changing');busy=false;route(true);scrollTo({top:location.pathname==='/pazarlar'?listScroll:0,behavior:'instant'})});
 async function load(){document.body.classList.add('markets-loading');try{const response=await fetch('/api/public/markets',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(Array.isArray(data.markets)&&!data.markets.some(m=>m.startDate==='2026-12-25'))data.markets.push({id:'yilbasi-2026-planlanan',name:'Yılbaşı Tasarım Pazarı',edition:6,startDate:'2026-12-25',endDate:'2026-12-27',status:'planlandi',location:'Fevzipaşa / Çanakkale',participants:[],poster:null});markets=(Array.isArray(data.markets)?data.markets:[]).filter(m=>typeof m.id==='string'&&/^[\w-]+$/.test(m.id)).sort((a,b)=>(a.startDate||'9999').localeCompare(b.startDate||'9999')||(Number(a.edition)||999)-(Number(b.edition)||999));if(!markets.length){host.innerHTML='<section class="market-error"><h1>Pazar hikâyeleri yakında.</h1><p>Yayınlanan pazar kayıtları burada yer alacak.</p></section>';return}if(document.fonts)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1200))]);document.body.classList.remove('markets-loading');route();if(location.hash==='#pazar-gorselleri')document.getElementById('pazar-gorselleri')?.scrollIntoView({behavior:'instant',block:'start'})}catch{host.innerHTML='<section class="market-error"><h1>Pazarlar yüklenemedi.</h1><p>Bağlantını kontrol edip tekrar deneyebilirsin.</p><button class="text-link" id="market-retry">Tekrar dene ↗</button></section>';document.getElementById('market-retry').addEventListener('click',load)}finally{document.body.classList.remove('markets-loading')}}
 load();
})();
