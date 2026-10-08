// Ana sayfa kuşbakışı fotoğraf: üzerine gelince sokağa doğru yaklaşır, tıklayınca
// Google Haritalar'daki gibi sokağa iner ve tam ekran sokak fotoğrafları açılır.
(()=>{
  const media=document.querySelector('[data-dive]');if(!media)return;
  const layer=media.querySelector('.dive'),pin=media.querySelector('.street-pin');
  const shots=[['/assets/sokak-tekstil.webp','El emeği tekstil ve örgü stantları'],['/assets/sokak-kitap.webp','Kitaplar, plaklar ve illüstrasyonlar'],['/assets/sokak-taki.webp','Takı, seramik ve tasarım objeleri']];
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
  function open(){
    if(busy||view?.classList.contains('open'))return;busy=true;
    if(!view)build();show(0);
    media.classList.add('diving');
    setTimeout(()=>{view.classList.add('open');document.documentElement.classList.add('sv-lock');document.addEventListener('keydown',key);view.querySelector('.sv-close').focus();busy=false},calm?0:820);
  }
  function close(){
    if(!view?.classList.contains('open'))return;
    view.classList.remove('open');document.documentElement.classList.remove('sv-lock');document.removeEventListener('keydown',key);
    media.classList.remove('diving');media.classList.add('rising');setTimeout(()=>media.classList.remove('rising'),calm?0:900);pin?.focus({preventScroll:true});
  }
  media.addEventListener('click',e=>{if(e.target.closest('a'))return;open()});
  pin?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  // Fotoğrafların önceden yüklenmesi: üzerine gelindiğinde iniş beklemeden açılsın.
  media.addEventListener('pointerenter',()=>{for(const [src] of shots){const im=new Image();im.src=src}},{once:true});
})();
