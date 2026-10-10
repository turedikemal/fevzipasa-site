(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const style=document.createElement('style');
 style.textContent=`.ws-text-repeat{display:grid;isolation:isolate;overflow:hidden}.ws-text-repeat>.ws-text-layer{grid-area:1/1;min-width:0;pointer-events:none}.ws-text-repeat>.ws-text-copy{opacity:0;will-change:transform,opacity}.ws-text-repeat>.ws-text-main{position:relative;z-index:1}.ws-text-repeat i{animation:none!important}.ws-text-repeat.reveal{opacity:1;transform:none}@media(prefers-reduced-motion:reduce){.ws-text-copy{display:none}}`;
 document.head.append(style);
 // Only the large section headings; cards, archive labels and footer stay unchanged.
 const titles=[...document.querySelectorAll('.ws-hero .hero-title,.ws-list>.section-top>h2')];
 titles.forEach(title=>{
  const content=title.innerHTML;
  title.setAttribute('aria-label',title.textContent.trim().replace(/\s+/g,' '));
  title.classList.add('ws-text-repeat');
  title.innerHTML=Array.from({length:7},(_,i)=>`<div aria-hidden="true" class="ws-text-layer ${i===6?'ws-text-main':'ws-text-copy'}">${content}</div>`).join('');
 });
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
 document.fonts?.ready.then(schedule);paint();
})();
