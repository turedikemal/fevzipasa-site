// Ana sayfa kuşbakışı fotoğraf: üzerine gelince sokağa doğru yaklaşır, tıklayınca
// Google Haritalar'daki gibi sokağa iner ve tam ekran sokak fotoğrafları açılır.
(()=>{
  const media=document.querySelector('[data-dive]');if(!media)return;
  const layer=media.querySelector('.dive'),pin=media.querySelector('.street-pin');
  const shots=[['/assets/sokak-kitap.webp','Kitaplar, plaklar ve illüstrasyonlar'],['/assets/sokak-tekstil.webp','El emeği tekstil ve örgü stantları'],['/assets/sokak-taki.webp','Takı, seramik ve tasarım objeleri']];
  const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let view=null,i=0,busy=false;
  const build=()=>{
    view=document.createElement('div');view.className='street-view';view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-label','Pazar sokağı fotoğrafları');
    view.innerHTML=`${shots.map(([src,alt],n)=>`<img class="sv-shot" src="${src}" alt="${alt}" ${n?'loading="lazy"':''}>`).join('')}
      <div class="sv-top"><span class="sv-place">FEVZİPAŞA SOKAĞI · ÇANAKKALE</span><button class="sv-close" aria-label="Kapat, yukarı çık">×</button></div>
      <button class="sv-nav sv-prev" aria-label="Önceki">‹</button><button class="sv-nav sv-next" aria-label="Sonraki">›</button>
      <div class="sv-bottom"><p class="sv-cap"></p><div class="sv-dots">${shots.map((_,n)=>`<button aria-label="${n+1}. fotoğraf"></button>`).join('')}</div><button class="sv-up">↑ Kuşbakışına dön</button></div>`;
    document.body.append(view);
    view.querySelector('.sv-close').onclick=close;view.querySelector('.sv-up').onclick=close;
    view.querySelector('.sv-prev').onclick=()=>show(i-1);view.querySelector('.sv-next').onclick=()=>show(i+1);
    view.querySelectorAll('.sv-dots button').forEach((b,n)=>b.onclick=()=>show(n));
    let x0=null;view.addEventListener('pointerdown',e=>{x0=e.clientX});view.addEventListener('pointerup',e=>{if(x0!=null&&Math.abs(e.clientX-x0)>50)show(i+(e.clientX<x0?1:-1));x0=null});
  };
  const show=n=>{
    i=(n+shots.length)%shots.length;
    view.querySelectorAll('.sv-shot').forEach((im,k)=>im.classList.toggle('on',k===i));
    view.querySelectorAll('.sv-dots button').forEach((b,k)=>b.classList.toggle('on',k===i));
    view.querySelector('.sv-cap').textContent=shots[i][1];
  };
  const key=e=>{if(e.key==='Escape')close();else if(e.key==='ArrowRight')show(i+1);else if(e.key==='ArrowLeft')show(i-1)};
  // İniş: fotoğraf karttan tam ekrana açılır, işaretli noktaya dönerek dalar (spiral);
  // en sonda sokak fotoğrafı ters yönde dönerek netleşir.
  const P={x:.53,y:.4};let fly=null;
  const flight=()=>{
    const r=media.getBoundingClientRect(),W=innerWidth,H=innerHeight,px=r.width*P.x,py=r.height*P.y;
    fly=document.createElement('div');fly.className='sv-fly';
    fly.innerHTML=`<div class="sv-sky"></div><img class="sv-ground" src="${media.querySelector('.hero-photo').currentSrc||media.querySelector('.hero-photo').src}" alt="">`;
    document.body.append(fly);
    const g=fly.querySelector('.sv-ground');Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',transformOrigin:`${px}px ${py}px`});
    const dx=W/2-(r.left+px),dy=H*.5-(r.top+py),fill=Math.max(W/r.width,H/r.height);
    return {g,dx,dy,fill};
  };
  function open(){
    if(busy||view?.classList.contains('open'))return;busy=true;
    if(!view)build();show(0);
    const done=()=>{view.classList.add('open');document.documentElement.classList.add('sv-lock');document.addEventListener('keydown',key);view.querySelector('.sv-close').focus();busy=false};
    if(calm){done();return}
    const {g,dx,dy,fill}=flight();media.classList.add('diving');
    const T='translate(0px,0px) scale(1) rotate(0deg)';
    // 1) Kart yerinden tam ekrana açılır, 2) işaretli noktaya dönerek (spiral) dalar.
    g.animate([{transform:T,filter:'none',opacity:1},
      {transform:`translate(${dx}px,${dy}px) scale(${fill*1.05}) rotate(0deg)`,filter:'none',opacity:1,offset:.32},
      {transform:`translate(${dx}px,${dy}px) scale(${fill*2.6}) rotate(40deg)`,filter:'blur(1px)',opacity:1,offset:.66},
      {transform:`translate(${dx}px,${dy}px) scale(${fill*9}) rotate(95deg)`,filter:'blur(10px)',opacity:0}],
      {duration:1900,easing:'cubic-bezier(.5,0,.6,1)',fill:'forwards'});
    fly.querySelector('.sv-sky').animate([{opacity:0},{opacity:1,offset:.3},{opacity:1}],{duration:1900,fill:'forwards'});
    setTimeout(()=>{view.classList.add('landing');done();setTimeout(()=>{fly?.remove();fly=null;view.classList.remove('landing')},1100)},1500);
  }
  function close(){
    if(!view?.classList.contains('open'))return;
    view.classList.remove('open');document.documentElement.classList.remove('sv-lock');document.removeEventListener('keydown',key);
    media.classList.remove('diving');
    if(!calm){media.classList.add('rising');setTimeout(()=>media.classList.remove('rising'),1100)}
    pin?.focus({preventScroll:true});
  }
  media.addEventListener('click',e=>{if(e.target.closest('a'))return;open()});
  pin?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  // Fotoğrafların önceden yüklenmesi: üzerine gelindiğinde iniş beklemeden açılsın.
  media.addEventListener('pointerenter',()=>{for(const [src] of shots){const im=new Image();im.src=src}},{once:true});
})();
