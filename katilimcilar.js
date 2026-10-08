// Katılımcılar alanı: panelden gelen marka isimleri siyah oval çerçevelerde, tıklayınca Instagram açılır.
// Efekt: spot ışığı. Bir ismin üzerine gelince diğerleri soluklaşır, seçilen isim sarıya döner.
(()=>{
const box=document.querySelector('[data-names]');if(!box)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
fetch('/api/public/participants',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(r)).then(({participants})=>{
  if(!participants.length){box.innerHTML='<p class="name-empty">Katılımcı listesi çok yakında burada.</p>';return}
  box.innerHTML=participants.map((p,i)=>p.instagram
    ?`<a class="name-pill" style="--i:${i}" href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noopener" aria-label="${esc(p.name)}, Instagram sayfası (yeni sekmede açılır)">${esc(p.name)}</a>`
    :`<span class="name-pill" style="--i:${i}">${esc(p.name)}</span>`).join('');
  const pills=[...box.children];
  const on=p=>{box.classList.add('dim');pills.forEach(x=>x.classList.toggle('hot',x===p))};
  const off=()=>{box.classList.remove('dim');pills.forEach(x=>x.classList.remove('hot'))};
  pills.forEach(p=>{p.addEventListener('pointerenter',()=>on(p));p.addEventListener('focus',()=>on(p));p.addEventListener('blur',off)});
  box.addEventListener('pointerleave',off);
  requestAnimationFrame(()=>box.classList.add('shown'));
  // Kimse dokunmazken ışık isimler arasında kendi kendine gezer.
  if(still||pills.length<2)return;
  let last=0,k=0,inView=false;
  addEventListener('pointermove',()=>last=Date.now(),{passive:true});
  new IntersectionObserver(es=>{inView=es[0].isIntersecting;if(!inView)off()},{threshold:.3}).observe(box);
  setInterval(()=>{if(!inView||document.hidden||Date.now()-last<3000||box.contains(document.activeElement))return;k=(k+1+Math.floor(Math.random()*(pills.length-1)))%pills.length;on(pills[k])},1700);
}).catch(()=>{box.innerHTML='<p class="name-empty">Katılımcılar şu an yüklenemedi.</p>'});
})();
