// Katılımcılar alanı: panelden gelen marka isimleri siyah oval çerçevelerde, tıklayınca Instagram açılır.
// Efekt: kayan şeritler + spot ışığı. İsimler iki şerit halinde ters yönlere akar; bir ismin üzerine gelince
// şeritler durur, diğer isimler soluklaşır, seçilen isim sarıya döner. Fare çekilince anında normale döner.
(()=>{
const box=document.querySelector('[data-names]');if(!box)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const pill=(p,copy)=>{const hide=copy?' aria-hidden="true" tabindex="-1"':'';return p.instagram
  ?`<a class="name-pill" href="https://www.instagram.com/${encodeURIComponent(p.instagram)}/" target="_blank" rel="noopener"${hide}${copy?'':` aria-label="${esc(p.name)}, Instagram sayfası (yeni sekmede açılır)"`}>${esc(p.name)}</a>`
  :`<span class="name-pill"${copy?' aria-hidden="true"':''}>${esc(p.name)}</span>`};
fetch('/api/public/participants',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(r)).then(({participants:list})=>{
  if(!list.length){box.innerHTML='<p class="name-empty">Katılımcı listesi çok yakında burada.</p>';return}
  if(still){box.innerHTML=`<div class="name-static">${list.map(p=>pill(p)).join('')}</div>`}
  else{
    // İki şerit: isimler sırayla iki satıra dağılır. Her şerit ekranı dolduracak kadar tekrarlanır, sonra kesintisiz dönmesi için ikiye katlanır.
    const rows=list.length<6?[list,[...list].reverse()]:[list.filter((_,i)=>i%2===0),list.filter((_,i)=>i%2===1)];
    box.innerHTML=rows.map((r,i)=>`<div class="name-lane"><div class="name-track${i?' rev':''}">${r.map(p=>pill(p)).join('')}</div></div>`).join('');
    box.querySelectorAll('.name-track').forEach(t=>{const one=t.innerHTML,copy=t.innerHTML.replace(/<a class="name-pill"/g,'<a class="name-pill" aria-hidden="true" tabindex="-1"').replace(/<span class="name-pill"/g,'<span class="name-pill" aria-hidden="true"');
      let set=one;const w=t.scrollWidth||1;const n=Math.max(1,Math.ceil(innerWidth*1.2/w));for(let i=1;i<n;i++)set+=copy;
      t.innerHTML=set+copy.repeat(n);t.style.setProperty('--dur',Math.max(20,t.scrollWidth/2/45)+'s')})}
  const pills=[...box.querySelectorAll('.name-pill')];
  const on=p=>{box.classList.remove('snap');box.classList.add('dim');pills.forEach(x=>x.classList.toggle('hot',x===p))};
  // Fare çekildiği anda geçiş beklemeden normale döner.
  const off=()=>{box.classList.add('snap');box.classList.remove('dim');pills.forEach(x=>x.classList.remove('hot'))};
  pills.forEach(p=>{p.addEventListener('pointerenter',()=>on(p));p.addEventListener('pointerleave',off);p.addEventListener('focus',()=>on(p));p.addEventListener('blur',off)});
  box.addEventListener('pointerleave',off);
  requestAnimationFrame(()=>box.classList.add('shown'));
}).catch(()=>{box.innerHTML='<p class="name-empty">Katılımcılar şu an yüklenemedi.</p>'});
})();
