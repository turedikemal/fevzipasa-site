// Fevzipaşa yönetim paneli. Tek sayfa; adres çubuğundaki #/... yolu hangi ekranın açık olduğunu belirler.
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{return localStorage.getItem(k)??d}catch{return d}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const S={versions:null,d:null,market:store.get('fp-market','all'),draft:null,openField:null,modalSubmit:null,searchHits:[]};

const L={
  app:{yeni:'Yeni',inceleniyor:'İnceleniyor',kabul:'Kabul',yedek:'Yedek',red:'Red'},
  form:{taslak:'Taslak',acik:'Yayında',kapali:'Kapalı'},
  market:{planlama:'Planlama',basvuru:'Başvuru dönemi',aktif:'Aktif',tamamlandi:'Tamamlandı'},
  role:{sahip:'Sahip',editor:'Editör',izleyici:'İzleyici'},
  type:{text:'Kısa yazı',textarea:'Uzun yazı',email:'E-posta',phone:'Telefon',url:'Bağlantı',number:'Sayı',date:'Tarih',select:'Tek seçim',checkboxes:'Çoklu seçim',file:'Görsel yükleme',consent:'Onay kutusu',heading:'Bölüm başlığı'},
  fee:{bekliyor:'Bekliyor',kismi:'Kısmi ödendi',odendi:'Ödendi',ucretsiz:'Ücretsiz',tanimsiz:'Ücret girilmedi'},
  method:{nakit:'Nakit',havale:'Havale / EFT',kart:'Kredi kartı',diger:'Diğer'},
  pf:{brandName:'Marka adı',contactName:'İletişim kişisi',email:'E-posta',phone:'Telefon',instagram:'Instagram',website:'Web sitesi',category:'Kategori',description:'Açıklama'}
};

// --- Veri yardımcıları ---
const mk=id=>S.d.markets.find(x=>x.id===id),fm=id=>S.d.forms.find(x=>x.id===id),pt=id=>S.d.participants.find(x=>x.id===id),md=id=>S.d.media.find(x=>x.id===id);
const inScope=marketId=>S.market==='all'||marketId===S.market;
const canEdit=()=>S.d.me.role!=='izleyici',isOwner=()=>S.d.me.role==='sahip';
function profile(app){const f=fm(app.formId),out={};for(const q of f?.fields||[])if(q.mapTo&&app.answers[q.id]!=null)out[q.mapTo]=Array.isArray(app.answers[q.id])?app.answers[q.id].join(', '):String(app.answers[q.id]);return out}
const appName=a=>profile(a).brandName||profile(a).contactName||'İsimsiz başvuru';
const pill=(kind,v)=>`<span class="pill s-${esc(v)}">${esc(L[kind][v]||v)}</span>`;
const date=v=>v?new Date(v.length===10?v+'T12:00':v).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'}):'—';
const ago=v=>{const m=Math.round((Date.now()-new Date(v))/60000);return m<1?'az önce':m<60?m+' dk önce':m<1440?Math.round(m/60)+' sa önce':Math.round(m/1440)+' gün önce'};
const marketRange=m=>m?`${date(m.startDate)}${m.endDate&&m.endDate!==m.startDate?' – '+date(m.endDate):''}`:'';
const pMedia=p=>S.d.media.filter(m=>m.participantId===p.id);
const cover=p=>pMedia(p).find(m=>m.mime.startsWith('image/'));
const avatar=p=>{const c=cover(p);return `<span class="avatar">${c?`<img src="/media/${c.id}" alt="" loading="lazy">`:esc((p.brandName||'?')[0])}</span>`};
const missing=p=>['email','phone'].filter(k=>!p[k]).map(k=>L.pf[k]);
const stars=(n,act)=>`<span class="stars">${[1,2,3,4,5].map(i=>act?`<button type="button" data-act="${act}" data-v="${i}" class="${i<=n?'on':''}" aria-label="${i} yıldız">★</button>`:`<span style="color:${i<=n?'var(--orange)':'#ddd'}">★</span>`).join('')}</span>`;
const publicLink=f=>`${location.origin}/basvuru/${f.id}`;
// Ücretler: katılımcının her pazar için kaydı; kayıt yoksa pazarın varsayılan katılım ücreti beklenir.
const money=n=>(Number(n)||0).toLocaleString('tr-TR',{maximumFractionDigits:2})+' ₺';
const feeOf=(p,m)=>({amount:m.fee||0,paid:0,method:'',date:'',note:'',...(p.fees?.[m.id]||{}),set:!!p.fees?.[m.id]});
const feeState=f=>!f.set&&!f.amount?'tanimsiz':f.amount<=0&&f.paid<=0?'ucretsiz':f.paid>=f.amount?'odendi':f.paid>0?'kismi':'bekliyor';
const feeRows=scope=>S.d.participants.flatMap(p=>p.markets.map(mk).filter(m=>m&&(scope==='all'||m.id===scope)).map(m=>({p,m,f:feeOf(p,m)})));
const feeSum=rows=>{const due=rows.reduce((s,r)=>s+(r.f.amount||0),0),paid=rows.reduce((s,r)=>s+(r.f.paid||0),0);return {due,paid,rest:Math.max(0,due-paid),open:rows.filter(r=>['bekliyor','kismi'].includes(feeState(r.f))).length,unset:rows.filter(r=>feeState(r.f)==='tanimsiz').length}};
const exportBtns=(kind,qs)=>`<span class="xport"><span class="mono">DIŞA AKTAR</span><a class="btn sm" href="/api/export/${kind}.xlsx?${qs}" download>Excel ↓</a><a class="btn sm" href="/api/export/${kind}.csv?${qs}" download>CSV ↓</a></span>`;
const thumb=m=>m.mime.startsWith('image/')?`<img src="/media/${m.id}" alt="${esc(m.title)}" loading="lazy">`:'<span class="mono">PDF</span>';

// --- Sunucu ---
async function call(method,url,body){
  const r=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(r.status===401&&!url.startsWith('/api/auth')){S.d=null;start();throw new Error('Oturum kapandı, tekrar giriş yap')}
  if(!r.ok)throw new Error(j.error||'Bir şeyler ters gitti');
  return j;
}
const refresh=async()=>{S.d=await call('GET','/api/bootstrap')};
async function act(fn,ok){try{const r=await fn();await refresh();if(ok)toast(ok);render();return r}catch(e){toast(e.message,true)}}
function toast(msg,bad){const t=$('#toast');t.textContent=msg;t.className='show'+(bad?' bad':'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className=bad?'bad':'',2600)}

// --- Modal ---
function modal(html,onSubmit,cls=''){
  const d=$('#modal');d.className=cls;d.innerHTML=`<form class="modal-in" data-modal>${html}<p class="err" id="modal-err"></p></form>`;S.modalSubmit=onSubmit;d.showModal();
  d.querySelector('input,select,textarea')?.focus();
}
const closeModal=()=>$('#modal').close();
const formData=form=>{const o={};for(const el of form.elements){if(!el.name)continue;if(el.type==='checkbox'){if(el.dataset.multi!==undefined){(o[el.name]??=[]);if(el.checked)o[el.name].push(el.value)}else o[el.name]=el.checked}else o[el.name]=el.value}return o};
const field=(label,input,hint='')=>`<label class="f">${label}${hint?` <small>${hint}</small>`:''}${input}</label>`;
const opts=(list,sel,empty)=>(empty!=null?`<option value="">${esc(empty)}</option>`:'')+list.map(([v,t])=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(t)}</option>`).join('');
const marketOpts=(sel,empty)=>opts(S.d.markets.map(m=>[m.id,m.name]),sel,empty);

// --- Giriş ---
async function start(){
  if(!S.versions)S.versions=await fetch('/admin/surumler.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>[]);
  try{const st=await call('GET','/api/auth/state');if(st.me){await refresh();render();return}authScreen(st.needsSetup)}
  catch(e){$('#app').innerHTML=`<p class="boot">${esc(e.message)}</p>`}
}
function authScreen(setup){
  $('#app').innerHTML=`<div class="auth"><div class="auth-brand"><span class="mono">YÖNETİM PANELİ</span><h1 class="auth-title" aria-label="Fevzipaşa Tasarım Pazarı"><span><i>FEVZİPAŞA</i></span><span><i>TASARIM</i></span><span><i>PAZARI</i></span></h1><div class="auth-foot"><span class="mono">Başvurular · Katılımcılar · Görseller</span><a class="credit" href="https://www.thegoatstudio.com" target="_blank" rel="noopener">The Goatz Studio 2026</a></div></div>
  <div class="auth-side"><form id="auth" class="auth-card" novalidate>
  <span class="mono auth-eyebrow">${setup?'İLK KURULUM':'GİRİŞ'}</span>
  <h2>${setup?'Paneli kuralım.':'Tekrar hoş geldin.'}</h2>
  <p class="auth-lead">${setup?'İlk yönetici hesabını oluştur. Bu hesap tüm yetkilere sahip “Sahip” olarak açılır.':'Başvuruları, katılımcıları ve görselleri yönetmek için giriş yap.'}</p>
  ${setup?`<label class="auth-field"><span>Ad soyad</span><input name="name" required autocomplete="name" placeholder="Kemal Türedi"></label>`:''}
  <label class="auth-field"><span>E-posta</span><input name="email" type="email" required autocomplete="email" placeholder="ornek@fevzipasa.com"></label>
  <label class="auth-field"><span>Şifre${setup?' <small>en az 8 karakter</small>':''}</span><span class="pass"><input name="password" type="password" required minlength="${setup?8:1}" autocomplete="${setup?'new-password':'current-password'}" placeholder="••••••••"><button type="button" class="pass-toggle" data-act="pass-toggle" aria-label="Şifreyi göster">Göster</button></span></label>
  <p class="auth-err" id="auth-err" role="alert"></p>
  <button class="auth-submit"><span>${setup?'Kur ve başla':'Giriş yap'}</span><span aria-hidden="true">→</span></button>
  <a class="auth-back" href="/">← Siteye dön</a><span class="ver">${verLabel()}</span></form></div></div>`;
  $('#auth').addEventListener('submit',async e=>{
    e.preventDefault();const f=e.target,err=$('#auth-err'),btn=f.querySelector('.auth-submit');
    const d=formData(f);
    if(setup&&!d.name)return err.textContent='Adını yaz.';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email))return err.textContent='Geçerli bir e-posta yaz.';
    if(setup&&d.password.length<8)return err.textContent='Şifre en az 8 karakter olmalı.';
    if(!d.password)return err.textContent='Şifreni yaz.';
    err.textContent='';btn.disabled=true;
    try{await call('POST',setup?'/api/auth/setup':'/api/auth/login',d);await refresh();location.hash='#/';render()}
    catch(e2){err.textContent=e2.message;btn.disabled=false}
  });
  $('#auth input').focus();
  titleCycle([...document.querySelectorAll('.auth-title i')]);
}
// Ana sayfadaki başlık döngüsünün aynısı: FEVZİPAŞA / TASARIM / PAZARI ↔ KEŞFET / TANIŞ / DESTEKLE.
async function titleCycle(lines){
  if(lines.length!==3)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sets=[['FEVZİPAŞA','TASARIM','PAZARI'],['KEŞFET','TANIŞ','DESTEKLE']];
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const exitAll=(duration,stagger=0)=>Promise.all(lines.map((el,i)=>el.animate([{transform:'translateY(0)'},{transform:'translateY(-115%)'}],{duration:stagger?duration+i*150:duration,delay:i*stagger,easing:'cubic-bezier(.55,0,1,.45)',fill:'forwards'}).finished));
  const enter=stagger=>Promise.all(lines.map((el,i)=>el.animate(stagger?[{transform:'translateY(115%)',easing:'cubic-bezier(.2,.7,.4,1)'},{transform:'translateY(10%)',offset:.3,easing:'cubic-bezier(.1,.6,.2,1)'},{transform:'translateY(0)'}]:[{transform:'translateY(115%)'},{transform:'translateY(0)'}],{duration:stagger?520+i*200:1100,delay:i*stagger,easing:stagger?'linear':'cubic-bezier(.16,1,.3,1)',fill:'both'}).finished));
  let index=0;await wait(1000);
  while(document.body.contains(lines[0])){
    await wait(index===0?1100:2600);if(reduced.matches)continue;
    await exitAll(index===0?320:700,index===0?0:150);
    index=(index+1)%sets.length;
    lines.forEach((el,i)=>{el.style.animation='none';el.textContent=sets[index][i]});
    await enter(index===1?290:0);
  }
}

// --- Yönlendirme ---
function route(){const [path,q]=location.hash.slice(2).split('?');const [view='',id]=path.split('/');return {view:view||'genel',id,q:new URLSearchParams(q||'')}}
const verLabel=()=>S.versions?.[0]?`sürüm ${S.versions[0].v} · ${date(S.versions[0].date).toLocaleLowerCase('tr')}`:'';
const nav=[['genel','Genel bakış'],['pazarlar','Pazarlar'],['formlar','Formlar'],['basvurular','Başvurular'],['katilimcilar','Katılımcılar'],['odemeler','Ödemeler'],['gorseller','Görseller'],['yoneticiler','Yöneticiler']];
const pages={};

function render(){
  if(!S.d)return;
  const r=route(),page=(pages[r.view]||pages.genel)(r);
  const newCount=S.d.applications.filter(a=>a.status==='yeni'&&inScope(a.marketId)).length;
  const scrollY=window.scrollY,focusId=document.activeElement?.id;
  const ni=nav.findIndex(([k])=>k===r.view),eyebrow=!r.id&&ni>=0?`<p class="eyebrow">${String(ni+1).padStart(2,'0')} / ${nav[ni][1].toLocaleUpperCase('tr')}</p>`:'';
  $('#app').innerHTML=`<header class="bar"><a class="wordmark" href="#/">FEVZİPAŞA<br>TASARIM PAZARI<span>YÖNETİM PANELİ</span></a>
  <nav id="side">${nav.map(([k,t])=>`<a href="#/${k}" class="${r.view===k?'on':''}">${t}${k==='basvurular'&&newCount?`<b>${newCount}</b>`:''}</a>`).join('')}
  <a class="nav-pill" href="/" target="_blank">Siteyi aç <span>↗</span></a></nav>
  <div class="who"><span>${esc(S.d.me.name)} · ${L.role[S.d.me.role]}</span><a href="#/hesap">Hesabım</a><button data-act="logout">Çıkış</button></div>
  <button class="menu-btn" data-act="menu">Menü</button></header>
  <div class="tools"><div class="search"><input id="q" placeholder="Ara: marka, kişi, form, görsel…  ( / )" autocomplete="off" value="${esc(S.q||'')}"><div id="results"></div></div>
  <label class="market-pick"><span class="mono hide-sm">PAZAR</span><select id="market-pick">${opts([['all','Tüm pazarlar'],...S.d.markets.map(m=>[m.id,m.name])],S.market)}</select></label></div>
  <main class="page">${eyebrow}${page}</main>
  <footer class="admin-foot"><div class="foot-who"><span>${esc(S.d.me.name)} · ${L.role[S.d.me.role].toLocaleLowerCase('tr')}</span><span><a href="#/hesap">hesabım</a> · <button data-act="logout">çıkış yap</button></span><button class="ver" data-act="versions">${verLabel()}</button></div><a class="credit" href="https://www.thegoatstudio.com" target="_blank" rel="noopener">The Goatz Studio 2026</a></footer>`;
  if(focusId==='q'){const q=$('#q');q.focus();q.setSelectionRange(q.value.length,q.value.length);showResults()}
  if(render.last===location.hash)window.scrollTo(0,scrollY);else window.scrollTo(0,0);
  render.last=location.hash;
}

// --- Genel bakış ---
pages.genel=()=>{
  const apps=S.d.applications.filter(a=>inScope(a.marketId)),markets=S.d.markets.filter(m=>inScope(m.id));
  const parts=S.d.participants.filter(p=>S.market==='all'||p.markets.includes(S.market));
  const accepted=apps.filter(a=>a.status==='kabul').length,capacity=markets.reduce((s,m)=>s+(m.capacity||0),0);
  const media=S.d.media.filter(m=>inScope(m.marketId));
  const openForms=S.d.forms.filter(f=>f.status==='acik'&&inScope(f.marketId));
  const today=new Date().toISOString().slice(0,10);
  const tips=[];
  const fresh=apps.filter(a=>a.status==='yeni').length;
  if(fresh)tips.push([`${fresh} yeni başvuru değerlendirilmeyi bekliyor.`,'#/basvurular?durum=yeni','İncele']);
  for(const f of S.d.forms.filter(f=>inScope(f.marketId)))if(f.status==='acik'&&f.deadline&&f.deadline<today)tips.push([`“${f.title}” formunun son tarihi geçti ama form hâlâ yayında.`,`#/formlar/${f.id}`,'Formu aç','warn']);
  for(const m of markets){
    const acc=S.d.applications.filter(a=>a.marketId===m.id&&a.status==='kabul').length;
    if(m.capacity&&acc>=m.capacity)tips.push([`${m.name} kapasitesi doldu (${acc}/${m.capacity}).`,`#/pazarlar/${m.id}`,'Pazarı aç','warn']);
    if(m.status==='basvuru'&&!S.d.forms.some(f=>f.marketId===m.id&&f.status==='acik'))tips.push([`${m.name} başvuru döneminde ama yayında bir form yok.`,`#/pazarlar/${m.id}`,'Form ekle','warn']);
  }
  const drafts=S.d.forms.filter(f=>f.status==='taslak'&&inScope(f.marketId));
  if(drafts.length)tips.push([`${drafts.length} form taslakta, yayına alınmayı bekliyor.`,`#/formlar/${drafts[0].id}`,'Düzenle']);
  const noImg=parts.filter(p=>!pMedia(p).length);
  if(noImg.length)tips.push([`${noImg.length} katılımcının görsel deposunda hiç görseli yok.`,'#/katilimcilar?eksik=gorsel','Listele']);
  const noContact=parts.filter(p=>missing(p).length);
  if(noContact.length)tips.push([`${noContact.length} katılımcının e-posta veya telefonu eksik.`,'#/katilimcilar?eksik=iletisim','Listele']);
  const cats={};for(const p of parts)cats[p.category||'Belirtilmemiş']=(cats[p.category||'Belirtilmemiş']||0)+1;
  const catMax=Math.max(1,...Object.values(cats));
  const next=S.d.markets.filter(m=>m.endDate>=today||m.startDate>=today).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0];
  const days=next?Math.ceil((new Date(next.startDate+'T00:00')-new Date(today+'T00:00'))/864e5):null;
  const fs=feeSum(feeRows(S.market));
  if(fs.open)tips.push([`${fs.open} katılımcının ödemesi tamamlanmadı, ${money(fs.rest)} bekleniyor.`,'#/odemeler?durum=acik','Ödemeler']);
  if(fs.unset)tips.push([`${fs.unset} katılımcıya henüz ücret girilmedi.`,'#/odemeler?durum=tanimsiz','Ücret gir']);
  return `<div class="head"><div><h1>Merhaba ${esc(S.d.me.name.split(' ')[0])}.</h1><p>${S.market==='all'?'Tüm pazarların özeti':esc(mk(S.market)?.name)+' özeti'}</p></div>
  ${canEdit()?`<div class="row"><a class="btn" href="#/formlar">Formlar</a><a class="btn primary" href="#/gorseller">Görsel yükle <span>↗</span></a></div>`:''}</div>
  <div class="grid g4"><a class="stat o" href="#/basvurular"><strong>${apps.length}</strong><span>Başvuru · ${fresh} yeni</span></a>
  <div class="stat y"><strong>${accepted}${capacity?`<small>/${capacity}</small>`:''}</strong><span>Kabul edilen${capacity?' / kapasite':''}${capacity?`<div class="bar-meter"><i style="width:${Math.min(100,accepted/capacity*100)}%"></i></div>`:''}</span></div>
  <a class="stat p" href="#/katilimcilar"><strong>${parts.length}</strong><span>Katılımcı · ${media.length} görsel</span></a>
  <a class="stat b money" href="#/odemeler"><strong>${money(fs.paid)}</strong><span>Tahsil edilen${fs.due?` · ${money(fs.rest)} kaldı<div class="bar-meter"><i style="width:${Math.min(100,fs.paid/fs.due*100)}%"></i></div>`:''}</span></a></div>
  <div class="grid split" style="margin-top:40px">
  <div class="card"><h3>Yapılacaklar <span class="mono muted">AKILLI UYARILAR</span></h3>${tips.length?`<div class="tips">${tips.map(([t,h,b,w])=>`<div class="tip ${w||''}"><span>${esc(t)}</span><a class="btn sm" href="${h}">${b}</a></div>`).join('')}</div>`:'<div class="empty">Her şey yolunda. Bekleyen iş yok.</div>'}</div>
  ${next?`<a class="next" href="#/pazarlar/${next.id}"><span class="mono">SIRADAKİ PAZAR</span><strong>${esc(next.name)}</strong><span>${marketRange(next)} · ${esc(next.hours)}<br>${esc(next.location)}</span><span class="disc">${days>0?days:days===0?'BUGÜN':'ŞİMDİ'}<span>${days>0?'GÜN KALDI':days===0?'PAZAR GÜNÜ':'DEVAM EDİYOR'}</span></span></a>`:'<div class="next"><span class="mono">SIRADAKİ PAZAR</span><strong>Planlanmış pazar yok.</strong></div>'}</div>
  <div class="grid g3" style="margin-top:40px">
  <div class="card"><h3>Son başvurular <a class="btn sm ghost" href="#/basvurular">Tümü →</a></h3><div class="list">${apps.slice(0,6).map(a=>`<a class="item" href="#/basvurular/${a.id}"><span><b>${esc(appName(a))}</b><br><small class="muted">${esc(profile(a).category||'')} · ${ago(a.createdAt)}</small></span>${pill('app',a.status)}</a>`).join('')||'<div class="empty">Henüz başvuru yok.</div>'}</div></div>
  <div class="card cats"><h3>Kategoriler</h3>${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<div class="c"><div><span>${esc(c)}</span><b>${n}</b></div><div class="bar-meter"><i style="width:${n/catMax*100}%"></i></div></div>`).join('')||'<div class="empty">Katılımcı yok.</div>'}</div>
  <div class="card"><h3>Son hareketler</h3><ul class="feed">${S.d.activity.slice(0,8).map(x=>`<li>${esc(x.text)}<br><small class="muted">${ago(x.at)}${x.adminId?' · '+esc(S.d.admins.find(a=>a.id===x.adminId)?.name||''):''}</small></li>`).join('')||'<li class="muted">Henüz hareket yok.</li>'}</ul></div></div>
  <div class="card" style="margin-top:40px"><h3>Yayındaki formlar</h3>${openForms.length?openForms.map(f=>`<div class="linkbox" style="margin-bottom:8px"><span style="flex:1">${esc(f.title)} — ${esc(publicLink(f))}</span><button class="btn sm" data-act="copy" data-v="${esc(publicLink(f))}">Kopyala</button></div>`).join(''):'<p class="muted" style="margin:0">Şu an yayında form yok.</p>'}</div>`;
};

// --- Pazarlar ---
const marketStats=m=>{const apps=S.d.applications.filter(a=>a.marketId===m.id);return {forms:S.d.forms.filter(f=>f.marketId===m.id),apps,acc:apps.filter(a=>a.status==='kabul').length,parts:S.d.participants.filter(p=>p.markets.includes(m.id)),media:S.d.media.filter(x=>x.marketId===m.id)}};
pages.pazarlar=()=>`<div class="head"><div><h1>Pazarlar</h1><p>Her pazarın kendi formları, başvuruları, katılımcıları ve görsel klasörü var.</p></div>${canEdit()?'<button class="btn primary" data-act="market-new">+ Yeni pazar</button>':''}</div>
  <div class="grid g3">${[...S.d.markets].sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||'')).map(m=>{const s=marketStats(m);return `<a class="card" href="#/pazarlar/${m.id}" style="text-decoration:none;display:grid;gap:10px"><div class="row" style="justify-content:space-between"><span class="mono">${m.edition?m.edition+'. EDİSYON':''}</span>${pill('market',m.status)}</div><strong style="font-size:22px;letter-spacing:-.04em;line-height:1.1">${esc(m.name)}</strong><span class="muted">${marketRange(m)}<br>${esc(m.location)}</span>
  <div class="row mono" style="gap:14px"><span>${s.forms.length} FORM</span><span>${s.apps.length} BAŞVURU</span><span>${s.parts.length} KATILIMCI</span><span>${s.media.length} DOSYA</span></div>${m.capacity?`<div><small class="muted">Kabul ${s.acc}/${m.capacity}</small><div class="bar-meter"><i style="width:${Math.min(100,s.acc/m.capacity*100)}%;background:var(--orange)"></i></div></div>`:''}</a>`}).join('')||'<div class="empty">Henüz pazar yok.</div>'}</div>`;

pages.pazar=pages.pazarlar;
const marketPage=r=>{
  const m=mk(r.id);if(!m)return '<div class="empty">Pazar bulunamadı.</div>';
  const s=marketStats(m),byStatus=k=>s.apps.filter(a=>a.status===k).length;
  const cats=S.d.mediaCategories.map(c=>[c,s.media.filter(x=>x.category===c).length]).filter(([,n])=>n),fs=feeSum(feeRows(m.id));
  return `<div class="crumb"><a href="#/pazarlar">PAZARLAR</a> /</div><div class="head"><div><h1>${esc(m.name)}</h1><p>${marketRange(m)} · ${esc(m.hours)} · ${esc(m.location)} ${pill('market',m.status)}</p></div>
  <div class="row">${S.market!==m.id?`<button class="btn" data-act="scope" data-v="${m.id}">Paneli bu pazara odakla</button>`:''}${canEdit()?`<button class="btn" data-act="market-edit" data-v="${m.id}">Düzenle</button>`:''}${isOwner()?`<button class="btn danger" data-act="market-del" data-v="${m.id}">Sil</button>`:''}</div></div>
  <div class="grid g4"><a class="stat o" href="#/basvurular?pazar=${m.id}"><strong>${s.apps.length}</strong><span>Başvuru · ${byStatus('yeni')} yeni · ${byStatus('inceleniyor')} inceleniyor</span></a><div class="stat y"><strong>${s.acc}${m.capacity?`<small>/${m.capacity}</small>`:''}</strong><span>Kabul / kapasite</span></div><a class="stat p" href="#/katilimcilar?pazar=${m.id}"><strong>${s.parts.length}</strong><span>Katılımcı · ${s.media.length} dosya</span></a><a class="stat b money" href="#/odemeler?pazar=${m.id}"><strong>${money(fs.paid)}</strong><span>Tahsil edilen · ${money(fs.rest)} kaldı${fs.due?`<div class="bar-meter"><i style="width:${Math.min(100,fs.paid/fs.due*100)}%"></i></div>`:''}</span></a></div>
  <div class="grid g2" style="margin-top:40px">
  <div class="card"><h3>Başvuru formları ${canEdit()?`<span class="row"><button class="btn sm" data-act="form-copy-into" data-v="${m.id}">Önceki formu kopyala</button><button class="btn sm primary" data-act="form-new" data-v="${m.id}">+ Form</button></span>`:''}</h3>
  <div class="list">${s.forms.map(f=>`<a class="item" href="#/formlar/${f.id}"><span><b>${esc(f.title)}</b><br><small class="muted">${S.d.applications.filter(a=>a.formId===f.id).length} başvuru · son tarih ${date(f.deadline)}</small></span>${pill('form',f.status)}</a>`).join('')||'<div class="empty">Bu pazar için form yok.</div>'}</div></div>
  <div class="card"><h3>Son başvurular <a class="btn sm ghost" href="#/basvurular?pazar=${m.id}">Tümü →</a></h3><div class="list">${s.apps.slice(0,6).map(a=>`<a class="item" href="#/basvurular/${a.id}"><span><b>${esc(appName(a))}</b><br><small class="muted">${ago(a.createdAt)}</small></span>${pill('app',a.status)}</a>`).join('')||'<div class="empty">Başvuru yok.</div>'}</div></div>
  <div class="card"><h3>Katılımcılar <a class="btn sm ghost" href="#/katilimcilar?pazar=${m.id}">Tümü →</a></h3><div class="list">${s.parts.slice(0,8).map(p=>{const f=feeOf(p,m);return `<a class="item" href="#/katilimcilar/${p.id}"><span class="pcard">${avatar(p)}<span><b>${esc(p.brandName)}</b><br><small class="muted">${esc(p.category)}</small></span></span>${pill('fee',feeState(f))}</a>`}).join('')||'<div class="empty">Katılımcı yok.</div>'}</div></div>
  <div class="card"><h3>Görsel klasörü <a class="btn sm ghost" href="#/gorseller?m=${m.id}">Klasörü aç →</a></h3><div class="list">${cats.map(([c,n])=>`<a class="item" href="#/gorseller?m=${m.id}&c=${encodeURIComponent(c)}"><span>📁 ${esc(c)}</span><b>${n}</b></a>`).join('')||'<div class="empty">Bu pazarın klasörü boş.</div>'}</div></div></div>
  ${m.notes?`<div class="card" style="margin-top:40px"><h3>Notlar</h3><p style="white-space:pre-wrap;margin:0">${esc(m.notes)}</p></div>`:''}`;
};
{const list=pages.pazarlar;pages.pazarlar=r=>r.id?marketPage(r):list(r)}

function marketModal(m){
  m=m||{status:'planlama',edition:(Math.max(0,...S.d.markets.map(x=>x.edition||0))+1)};
  modal(`<h2>${m.id?'Pazarı düzenle':'Yeni pazar'}</h2>${field('Pazar adı',`<input name="name" required value="${esc(m.name||(m.edition?m.edition+'. Fevzipaşa Tasarım Pazarı':''))}">`)}
  <div class="grid g2">${field('Edisyon no',`<input name="edition" type="number" min="1" value="${esc(m.edition||'')}">`)}${field('Durum',`<select name="status">${opts(Object.entries(L.market),m.status)}</select>`)}
  ${field('Başlangıç',`<input name="startDate" type="date" value="${esc(m.startDate||'')}">`)}${field('Bitiş',`<input name="endDate" type="date" value="${esc(m.endDate||'')}">`)}
  ${field('Saatler',`<input name="hours" value="${esc(m.hours||'11.00–21.00')}">`)}${field('Kapasite',`<input name="capacity" type="number" min="0" value="${esc(m.capacity||'')}">`,'stant sayısı')}${field('Katılım ücreti (₺)',`<input name="fee" type="number" min="0" step="any" value="${esc(m.fee||'')}">`,'katılımcı başına varsayılan')}</div>
  ${field('Konum',`<input name="location" value="${esc(m.location||'Fevzipaşa / Çanakkale')}">`)}${field('Notlar',`<textarea name="notes">${esc(m.notes||'')}</textarea>`)}
  <div class="actions"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">Kaydet</button></div>`,
  async d=>{const r=await call(m.id?'PUT':'POST',m.id?`/api/markets/${m.id}`:'/api/markets',d);await refresh();closeModal();toast('Pazar kaydedildi');location.hash=`#/pazarlar/${r.id}`;render()});
}

// --- Formlar ---
pages.formlar=r=>{
  if(r.id)return formBuilder(r.id);
  const forms=S.d.forms.filter(f=>inScope(f.marketId));
  return `<div class="head"><div><h1>Başvuru formları</h1><p>Her pazar için ayrı form oluştur, yayınla, bağlantısını paylaş.</p></div>${canEdit()?`<div class="row"><button class="btn" data-act="form-copy-into" data-v="${S.market==='all'?'':S.market}">Önceki formdan kopyala</button><button class="btn primary" data-act="form-new" data-v="${S.market==='all'?'':S.market}">+ Yeni form</button></div>`:''}</div>
  ${forms.length?`<div class="table-wrap"><table><thead><tr><th>FORM</th><th class="hide-sm">PAZAR</th><th>DURUM</th><th class="hide-sm">SON TARİH</th><th>BAŞVURU</th><th></th></tr></thead><tbody>${forms.map(f=>{const n=S.d.applications.filter(a=>a.formId===f.id);return `<tr class="click" data-href="#/formlar/${f.id}"><td><b>${esc(f.title)}</b><br><small class="muted">${f.fields.length} soru</small></td><td class="hide-sm">${esc(mk(f.marketId)?.name)}</td><td>${pill('form',f.status)}</td><td class="hide-sm">${date(f.deadline)}</td><td><a href="#/basvurular?form=${f.id}">${n.length}</a>${n.filter(a=>a.status==='yeni').length?` <span class="pill s-yeni">${n.filter(a=>a.status==='yeni').length} yeni</span>`:''}</td><td style="text-align:right">${f.status==='acik'?`<button class="btn sm" data-act="copy" data-v="${esc(publicLink(f))}">Bağlantı</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Bu kapsamda form yok.</div>'}`;
};

function newFormModal(marketId){
  modal(`<h2>Yeni başvuru formu</h2>${field('Pazar',`<select name="marketId" required>${marketOpts(marketId||S.d.markets[0]?.id)}</select>`)}
  ${field('Form başlığı',`<input name="title" required placeholder="Örn. 6. Pazar Katılımcı Başvurusu">`)}
  ${field('Başlangıç',`<select name="start"><option value="hazir">Hazır şablon (marka, iletişim, kategori, görseller…)</option><option value="bos">Boş form</option></select>`)}
  <div class="actions"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">Oluştur</button></div>`,
  async d=>{const body={marketId:d.marketId,title:d.title};if(d.start==='bos')body.fields=[];const f=await call('POST','/api/forms',body);await refresh();closeModal();location.hash=`#/formlar/${f.id}`});
}
function copyFormModal(marketId,formId){
  if(!S.d.forms.length)return toast('Kopyalanacak form yok',true);
  modal(`<h2>Formu kopyala</h2><p class="muted" style="margin:0">Önceki bir pazarın formunu tüm sorularıyla yeni pazara kopyala. Kopya taslak olarak açılır.</p>
  ${field('Kopyalanacak form',`<select name="formId">${opts(S.d.forms.map(f=>[f.id,`${f.title} — ${mk(f.marketId)?.name||''}`]),formId)}</select>`)}
  ${field('Hangi pazar için?',`<select name="marketId">${marketOpts(marketId||S.d.markets[0]?.id)}</select>`)}
  <div class="actions"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">Kopyala</button></div>`,
  async d=>{const f=await call('POST',`/api/forms/${d.formId}/duplicate`,{marketId:d.marketId});await refresh();closeModal();toast('Form kopyalandı');location.hash=`#/formlar/${f.id}`});
}

function formBuilder(id){
  const form=fm(id);if(!form)return '<div class="empty">Form bulunamadı.</div>';
  if(S.draft?.id!==id){S.draft=structuredClone(form);S.openField=null}
  const d=S.draft,ro=!canEdit(),apps=S.d.applications.filter(a=>a.formId===id);
  const dirty=JSON.stringify(d)!==JSON.stringify(form);
  return `<div class="crumb"><a href="#/formlar">FORMLAR</a> / <a href="#/pazarlar/${form.marketId}">${esc(mk(form.marketId)?.name)}</a></div>
  <div class="head"><div><h1>${esc(d.title)}</h1><p>${pill('form',form.status)} · ${apps.length} başvuru · <a href="#/basvurular?form=${id}">başvuruları gör</a></p></div>
  <div class="row">${exportBtns('basvurular','form='+id)}${ro?'':`<button class="btn" data-act="form-copy-into" data-v="" data-form="${id}">Başka pazara kopyala</button>${!apps.length?`<button class="btn danger" data-act="form-del" data-v="${id}">Sil</button>`:''}<button class="btn primary" data-act="form-save" ${dirty?'':'disabled'}>${dirty?'Değişiklikleri kaydet':'Kaydedildi'}</button>`}</div></div>
  <div class="builder"><div>
  <div class="card" style="margin-bottom:16px;display:grid;gap:12px"><h3 style="margin:0">Form ayarları</h3>
  ${field('Başlık',`<input data-bind="title" value="${esc(d.title)}" ${ro?'disabled':''}>`)}
  ${field('Açıklama',`<textarea data-bind="intro" ${ro?'disabled':''}>${esc(d.intro)}</textarea>`,'formun başında görünür')}
  <div class="grid g3">${field('Pazar',`<select data-bind="marketId" ${ro?'disabled':''}>${marketOpts(d.marketId)}</select>`)}${field('Durum',`<select data-bind="status" ${ro?'disabled':''}>${opts(Object.entries(L.form),d.status)}</select>`)}${field('Son başvuru',`<input type="date" data-bind="deadline" value="${esc(d.deadline)}" ${ro?'disabled':''}>`)}</div>
  <div class="linkbox"><span style="flex:1">${esc(publicLink(form))}</span><button class="btn sm" data-act="copy" data-v="${esc(publicLink(form))}">Kopyala</button><a class="btn sm" href="/basvuru/${id}" target="_blank">Aç ↗</a></div>
  ${form.status!=='acik'?'<small class="muted">Bağlantı, durum “Yayında” olduğunda başvuru kabul eder.</small>':''}</div>
  <h3 style="margin:22px 0 10px">Sorular <span class="mono muted">${d.fields.length}</span></h3>
  ${d.fields.map((f,i)=>fieldEditor(f,i,ro)).join('')||'<div class="empty">Henüz soru yok. Aşağıdan ekle.</div>'}
  ${ro?'':`<div class="card" style="margin-top:14px"><h3>Soru ekle</h3><div class="types">${Object.entries(L.type).map(([k,t])=>`<button type="button" data-act="field-add" data-v="${k}">${t}</button>`).join('')}</div></div>`}
  </div><div class="preview" id="preview">${preview(d)}</div></div>`;
}
function fieldEditor(f,i,ro){
  const open=S.openField===f.id,dis=ro?'disabled':'';
  return `<div class="fld ${open?'open':''}"><header data-act="field-open" data-v="${f.id}"><span class="mono">${i+1}</span><span class="t">${esc(f.label)}${f.required?' *':''}</span>${f.mapTo?`<span class="map">→ ${L.pf[f.mapTo]}</span>`:''}<span class="type">${L.type[f.type]}</span></header>
  ${open?`<div class="body">${field(f.type==='heading'?'Başlık metni':f.type==='consent'?'Onay metni':'Soru',`<input data-f="${i}" data-k="label" value="${esc(f.label)}" ${dis}>`)}
  ${f.type!=='heading'?field('Yardım metni',`<input data-f="${i}" data-k="help" value="${esc(f.help)}" ${dis}>`,'sorunun altında küçük yazı'):''}
  ${['select','checkboxes'].includes(f.type)?field('Seçenekler',`<textarea data-f="${i}" data-k="options" ${dis}>${esc(f.options.join('\n'))}</textarea>`,'her satıra bir seçenek'):''}
  <div class="grid g2">${field('Soru tipi',`<select data-f="${i}" data-k="type" data-full ${dis}>${opts(Object.entries(L.type),f.type)}</select>`)}
  ${!['file','consent','heading','checkboxes'].includes(f.type)?field('Katılımcı kartına aktar',`<select data-f="${i}" data-k="mapTo" data-full ${dis}>${opts(Object.entries(L.pf),f.mapTo,'— aktarma —')}</select>`,'kabulde otomatik dolar'):'<span></span>'}</div>
  <div class="row" style="justify-content:space-between">${f.type!=='heading'?`<label class="check"><input type="checkbox" data-f="${i}" data-k="required" ${f.required?'checked':''} ${dis}> Zorunlu</label>`:'<span></span>'}
  ${ro?'':`<span class="row"><button type="button" class="btn sm ghost" data-act="field-move" data-v="${i}" data-dir="-1" ${i?'':'disabled'}>↑</button><button type="button" class="btn sm ghost" data-act="field-move" data-v="${i}" data-dir="1">↓</button><button type="button" class="btn sm ghost" data-act="field-dup" data-v="${i}">Çoğalt</button><button type="button" class="btn sm danger" data-act="field-del" data-v="${i}">Sil</button></span>`}</div></div>`:''}</div>`;
}
function preview(d){
  const m=mk(d.marketId);
  return `<span class="mono">ÖNİZLEME · ${esc(m?.name||'')}</span><h2 style="margin-top:12px">${esc(d.title)}</h2><p style="white-space:pre-wrap">${esc(d.intro)}</p>${d.deadline?`<p class="mono">SON BAŞVURU: ${date(d.deadline)}</p>`:''}
  ${d.fields.map(f=>f.type==='heading'?`<h3 style="margin:22px 0 10px;letter-spacing:-.03em">${esc(f.label)}</h3>`:f.type==='consent'?`<div class="q"><label class="check"><input type="checkbox" disabled> ${esc(f.label)}${f.required?' *':''}</label></div>`:`<div class="q"><b>${esc(f.label)}${f.required?' *':''}</b>${f.help?`<small>${esc(f.help)}</small>`:''}
  ${['select','checkboxes'].includes(f.type)?`<div class="chips" style="margin-top:6px">${f.options.map(o=>`<span class="chip">${esc(o)}</span>`).join('')}</div>`:f.type==='file'?'<div class="fake" style="height:70px;display:grid;place-items:center;border-style:dashed"><small>Görselleri sürükle ya da seç</small></div>':`<div class="fake" ${f.type==='textarea'?'style="height:80px"':''}></div>`}</div>`).join('')}
  <span class="btn primary" style="pointer-events:none">Başvuruyu gönder →</span>`;
}

// --- Başvurular ---
function appFilter(q){
  const form=q.get('form'),status=q.get('durum'),market=q.get('pazar')||S.market,s=(q.get('ara')||'').toLocaleLowerCase('tr');
  let list=S.d.applications.filter(a=>(market==='all'||a.marketId===market)&&(!form||a.formId===form)&&(!status||a.status===status));
  if(s)list=list.filter(a=>JSON.stringify(Object.values(a.answers)).toLocaleLowerCase('tr').includes(s));
  if(q.get('sira')==='puan')list=[...list].sort((a,b)=>(b.rating||0)-(a.rating||0));
  return list;
}
const withQ=(q,k,v)=>{const n=new URLSearchParams(q);v?n.set(k,v):n.delete(k);return '#/basvurular?'+n};
pages.basvurular=r=>{
  if(r.id)return appPage(r.id);
  const q=r.q,base=appFilter(new URLSearchParams([...q].filter(([k])=>k!=='durum'))),list=appFilter(q),form=q.get('form');
  return `<div class="head"><div><h1>Başvurular</h1><p>${form?esc(fm(form)?.title):'Tüm formlar'} · ${list.length} başvuru</p></div>${form?exportBtns('basvurular','form='+form):''}</div>
  <div class="filters"><select data-nav="form">${opts(S.d.forms.filter(f=>inScope(f.marketId)).map(f=>[f.id,f.title]),form,'Tüm formlar')}</select>
  <input data-nav="ara" placeholder="Başvurularda ara" value="${esc(q.get('ara')||'')}"><select data-nav="sira">${opts([['','En yeni'],['puan','En yüksek puan']],q.get('sira')||'')}</select></div>
  <div class="chips" style="margin-bottom:16px"><a class="chip ${!q.get('durum')?'on':''}" href="${withQ(q,'durum','')}">Tümü ${base.length}</a>${Object.entries(L.app).map(([k,t])=>`<a class="chip ${q.get('durum')===k?'on':''}" href="${withQ(q,'durum',k)}" style="text-decoration:none">${t} ${base.filter(a=>a.status===k).length}</a>`).join('')}</div>
  ${list.length?`<div class="table-wrap"><table><thead><tr><th>MARKA</th><th class="hide-sm">KATEGORİ</th><th class="hide-sm">FORM</th><th>TARİH</th><th class="hide-sm">PUAN</th><th>DURUM</th></tr></thead><tbody>${list.map(a=>{const p=profile(a);return `<tr class="click" data-href="#/basvurular/${a.id}"><td><b>${esc(appName(a))}</b>${a.matchedParticipantId&&!a.participantId?' <span class="pill" style="background:#d7e6ff">Tanıdık</span>':''}<br><small class="muted">${esc(p.contactName||'')}</small></td><td class="hide-sm">${esc(p.category||'')}</td><td class="hide-sm"><small>${esc(fm(a.formId)?.title||'')}</small></td><td><small>${ago(a.createdAt)}</small></td><td class="hide-sm">${stars(a.rating||0)}</td><td>${pill('app',a.status)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Bu filtreye uyan başvuru yok.</div>'}`;
};
function appPage(id){
  const a=S.d.applications.find(x=>x.id===id);if(!a)return '<div class="empty">Başvuru bulunamadı.</div>';
  const form=fm(a.formId),p=profile(a),known=pt(a.participantId||a.matchedParticipantId),ro=!canEdit();
  const queue=S.d.applications.filter(x=>x.status==='yeni'&&x.id!==id&&inScope(x.marketId));
  const knownMarkets=known?known.markets.map(mk).filter(Boolean):[];
  return `<div class="crumb"><a href="#/basvurular">BAŞVURULAR</a> / <a href="#/basvurular?form=${a.formId}">${esc(form?.title||'')}</a></div>
  <div class="head"><div><h1>${esc(appName(a))}</h1><p>${pill('app',a.status)} · ${date(a.createdAt)} · ${esc(mk(a.marketId)?.name||'')}</p></div>${queue.length?`<a class="btn" href="#/basvurular/${queue[0].id}">Sıradaki yeni başvuru →</a>`:''}</div>
  <div class="drawer-grid"><div class="card"><h3>Yanıtlar</h3><dl class="answers">${(form?.fields||[]).filter(f=>f.type!=='heading').map(f=>{const v=a.answers[f.id];return `<dt>${esc(f.label).toLocaleUpperCase('tr')}</dt><dd>${f.type==='file'?`<div class="thumbs" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${(v||[]).map(md).filter(Boolean).map(m=>`<button class="thumb" data-act="media-open" data-v="${m.id}"><span class="img">${thumb(m)}</span></button>`).join('')||'—'}</div>`:f.type==='consent'?(v?'✓ Onaylandı':'—'):Array.isArray(v)?esc(v.join(', '))||'—':f.type==='email'&&v?`<a href="mailto:${esc(v)}">${esc(v)}</a>`:f.type==='url'&&v?`<a href="${esc(/^https?:/.test(v)?v:'https://'+v)}" target="_blank" rel="noopener">${esc(v)}</a>`:esc(v)||'—'}</dd>`}).join('')}</dl></div>
  <div style="display:grid;gap:16px">
  ${known?`<a class="badge" href="#/katilimcilar/${known.id}">${avatar(known)}<span>${a.participantId?'Katılımcı kartı':'Tanıdık marka: daha önce kayıtlı'}<br><small>${esc(known.brandName)} · ${knownMarkets.length} pazar${knownMarkets.length?': '+knownMarkets.map(m=>esc(m.edition?m.edition+'.':m.name)).join(', '):''}</small></span></a>`:''}
  <div class="card"><h3>Değerlendirme</h3><div style="display:grid;gap:12px">${ro?pill('app',a.status):`<div class="chips">${Object.entries(L.app).map(([k,t])=>`<button class="chip ${a.status===k?'on':''}" data-act="app-status" data-v="${k}" ${k==='kabul'?'style="display:none"':''}>${t}</button>`).join('')}</div>`}
  <div class="row"><span class="muted">Puan</span>${ro?stars(a.rating||0):stars(a.rating||0,'app-rate')}</div>
  ${field('Ekip notu',`<textarea id="app-notes" ${ro?'disabled':''} placeholder="Sadece ekip görür">${esc(a.notes)}</textarea>`)}
  ${ro?'':a.status==='kabul'&&a.participantId?`<a class="btn" href="#/katilimcilar/${a.participantId}">Katılımcı kartını aç →</a>`:`<button class="btn primary" data-act="app-accept">✓ Kabul et ve katılımcılara ekle</button><small class="muted">${known?`Bilgiler mevcut “${esc(known.brandName)}” kartına işlenir, bu pazar eklenir.`:'Yeni bir katılımcı kartı oluşturulur.'} Başvuru görselleri katılımcının klasörüne taşınır.</small>`}
  ${isOwner()?'<button class="btn sm danger" data-act="app-del" style="justify-self:start">Başvuruyu sil</button>':''}</div></div>
  ${p.email||p.phone||p.instagram?`<div class="card"><h3>Hızlı iletişim</h3><div class="row">${p.email?`<a class="btn sm" href="mailto:${esc(p.email)}">E-posta</a>`:''}${p.phone?`<a class="btn sm" href="tel:${esc(p.phone.replace(/\s/g,''))}">Ara</a><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${esc(p.phone.replace(/\D/g,'').replace(/^0/,'90'))}">WhatsApp</a>`:''}${p.instagram?`<a class="btn sm" target="_blank" rel="noopener" href="https://instagram.com/${esc(p.instagram.replace(/^@|.*instagram\.com\//g,''))}">Instagram</a>`:''}</div></div>`:''}</div></div>`;
}

// --- Katılımcılar ---
pages.katilimcilar=r=>{
  if(r.id)return participantPage(r.id);
  const q=r.q,market=q.get('pazar')||S.market,cat=q.get('kategori'),gap=q.get('eksik'),s=(q.get('ara')||'').toLocaleLowerCase('tr');
  let list=S.d.participants.filter(p=>market==='all'||p.markets.includes(market));
  const cats=[...new Set(list.map(p=>p.category).filter(Boolean))].sort();
  if(cat)list=list.filter(p=>p.category===cat);
  if(gap==='gorsel')list=list.filter(p=>!pMedia(p).length);
  if(gap==='iletisim')list=list.filter(p=>missing(p).length);
  if(s)list=list.filter(p=>[p.brandName,p.contactName,p.email,p.instagram,p.category,...p.tags].join(' ').toLocaleLowerCase('tr').includes(s));
  const link=(k,v)=>{const n=new URLSearchParams(q);v?n.set(k,v):n.delete(k);return '#/katilimcilar?'+n};
  return `<div class="head"><div><h1>Katılımcılar</h1><p>${list.length} marka · tüm pazarlardaki katılım geçmişiyle</p></div><div class="row">${exportBtns('katilimcilar','pazar='+encodeURIComponent(market))}${canEdit()?'<button class="btn sm" data-act="import" data-v="katilimcilar">İçe aktar ↑</button><button class="btn primary" data-act="part-new">+ Katılımcı ekle</button>':''}</div></div>
  <div class="filters"><input data-nav-p="ara" placeholder="Marka, kişi, etiket ara" value="${esc(q.get('ara')||'')}"><select data-nav-p="eksik">${opts([['','Tüm kayıtlar'],['gorsel','Görseli olmayanlar'],['iletisim','İletişimi eksik olanlar']],gap||'')}</select></div>
  <div class="chips" style="margin-bottom:16px"><a class="chip ${!cat?'on':''}" href="${link('kategori','')}" style="text-decoration:none">Tümü</a>${cats.map(c=>`<a class="chip ${cat===c?'on':''}" href="${link('kategori',c)}" style="text-decoration:none">${esc(c)}</a>`).join('')}</div>
  <div class="grid g4">${list.map(p=>{const gaps=[...missing(p),...(pMedia(p).length?[]:['Görsel'])],c=cover(p);return `<a class="pcard-tile" href="#/katilimcilar/${p.id}"><span class="img">${c?`<img src="/media/${c.id}" alt="" loading="lazy">`:`<span>${esc((p.brandName||'?')[0])}</span>`}</span><span class="mono">${esc((p.category||'Kategori yok').toLocaleUpperCase('tr'))}</span><strong>${esc(p.brandName)}</strong>
  <div class="row mono" style="gap:12px"><span>${p.markets.length} PAZAR</span><span>${pMedia(p).length} GÖRSEL</span><span>${S.d.applications.filter(a=>a.participantId===p.id).length} BAŞVURU</span></div>${gaps.length?`<small style="color:var(--red)">Eksik: ${gaps.join(', ')}</small>`:''}</a>`}).join('')||'<div class="empty">Kayıt yok.</div>'}</div>`;
};
function participantForm(p){
  return `<div class="grid g2">${['brandName','contactName','email','phone','instagram','website','category'].map(k=>field(L.pf[k],`<input name="${k}" value="${esc(p[k]||'')}" ${k==='brandName'?'required':''} ${canEdit()?'':'disabled'}>`)).join('')}${field('Etiketler',`<input name="tags" value="${esc((p.tags||[]).join(', '))}" ${canEdit()?'':'disabled'}>`,'virgülle ayır')}</div>
  ${field('Açıklama',`<textarea name="description" ${canEdit()?'':'disabled'}>${esc(p.description||'')}</textarea>`)}
  <div><b style="font-size:13px">Katıldığı pazarlar</b><div class="chips" style="margin-top:8px">${S.d.markets.map(m=>`<label class="chip"><input type="checkbox" name="markets" data-multi value="${m.id}" ${(p.markets||[]).includes(m.id)?'checked':''} ${canEdit()?'':'disabled'}> ${esc(m.name)}</label>`).join('')}</div></div>
  ${field('Ekip notu',`<textarea name="notes" ${canEdit()?'':'disabled'}>${esc(p.notes||'')}</textarea>`)}`;
}
function participantPage(id){
  const p=pt(id);if(!p)return '<div class="empty">Katılımcı bulunamadı.</div>';
  const apps=S.d.applications.filter(a=>a.participantId===id||a.matchedParticipantId===id),media=pMedia(p);
  return `<div class="crumb"><a href="#/katilimcilar">KATILIMCILAR</a> /</div><div class="head"><div class="pcard">${avatar(p)}<div><h1>${esc(p.brandName)}</h1><p>${esc(p.category)}${p.instagram?' · '+esc(p.instagram):''}</p></div></div>${isOwner()?`<button class="btn danger" data-act="part-del" data-v="${id}">Sil</button>`:''}</div>
  <div class="drawer-grid"><form class="card" id="part-form" style="display:grid;gap:12px"><h3 style="margin:0">Bilgiler</h3>${participantForm(p)}${canEdit()?'<button class="btn primary" style="justify-self:start">Kaydet</button>':''}</form>
  <div style="display:grid;gap:16px"><div class="card"><h3>Katılım geçmişi</h3><div class="list">${p.markets.map(mk).filter(Boolean).sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||'')).map(m=>`<a class="item" href="#/pazarlar/${m.id}"><span>${esc(m.name)}</span><small class="muted">${marketRange(m)}</small></a>`).join('')||'<div class="empty">Henüz pazar yok.</div>'}</div></div>
  <div class="card"><h3>Ücretler <span class="mono muted">${money(feeSum(feeRows('all').filter(r=>r.p.id===id)).paid)} ÖDENDİ</span></h3><div class="list">${p.markets.map(mk).filter(Boolean).map(m=>{const f=feeOf(p,m);return `<div class="item fee-item"><span><b>${esc(m.name)}</b><br><small class="muted">${f.set||f.amount?`${money(f.paid)} / ${money(f.amount)}${f.method?' · '+esc(L.method[f.method]||f.method):''}${f.date?' · '+date(f.date):''}`:'Ücret girilmedi'}</small></span><span class="row">${pill('fee',feeState(f))}${canEdit()?`<button class="btn sm" data-act="fee-edit" data-p="${id}" data-m="${m.id}">Düzenle</button>`:''}</span></div>`}).join('')||'<div class="empty">Bir pazara eklenince ücret girilebilir.</div>'}</div></div>
  <div class="card"><h3>Başvurular</h3><div class="list">${apps.map(a=>`<a class="item" href="#/basvurular/${a.id}"><span>${esc(fm(a.formId)?.title||'')}<br><small class="muted">${date(a.createdAt)}</small></span>${pill('app',a.status)}</a>`).join('')||'<div class="empty">Başvuru kaydı yok.</div>'}</div></div>
  ${p.email||p.phone?`<div class="card"><h3>Hızlı iletişim</h3><div class="row">${p.email?`<a class="btn sm" href="mailto:${esc(p.email)}">E-posta</a>`:''}${p.phone?`<a class="btn sm" href="tel:${esc(p.phone.replace(/\s/g,''))}">Ara</a><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${esc(p.phone.replace(/\D/g,'').replace(/^0/,'90'))}">WhatsApp</a>`:''}</div></div>`:''}</div></div>
  <div class="card" style="margin-top:40px"><h3>Görseller <span class="row">${canEdit()?`<button class="btn sm primary" data-act="upload" data-participant="${id}" data-market="${p.markets[p.markets.length-1]||''}" data-cat="Katılımcı ürünleri">+ Görsel yükle</button>`:''}<a class="btn sm ghost" href="#/gorseller?k=${id}">Depoda gör →</a></span></h3>
  ${media.length?`<div class="thumbs">${media.map(mediaThumb).join('')}</div>`:'<div class="empty">Bu katılımcının görseli yok.</div>'}</div>`;
}
function newParticipantModal(){
  modal(`<h2>Yeni katılımcı</h2>${participantForm({markets:S.market==='all'?[]:[S.market]})}<div class="actions"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">Ekle</button></div>`,
  async d=>{const p=await call('POST','/api/participants',d);await refresh();closeModal();location.hash=`#/katilimcilar/${p.id}`});
}

// --- Ödemeler ---
pages.odemeler=r=>{
  const q=r.q,scope=q.get('pazar')||S.market,st=q.get('durum'),find=(q.get('ara')||'').toLocaleLowerCase('tr');
  const all=feeRows(scope).sort((a,b)=>(b.m.startDate||'').localeCompare(a.m.startDate||'')||a.p.brandName.localeCompare(b.p.brandName,'tr'));
  let rows=all;
  if(st)rows=rows.filter(x=>st==='acik'?['bekliyor','kismi'].includes(feeState(x.f)):feeState(x.f)===st);
  if(find)rows=rows.filter(x=>[x.p.brandName,x.p.contactName,x.f.note].join(' ').toLocaleLowerCase('tr').includes(find));
  const sum=feeSum(all),shown=feeSum(rows),paidCount=all.filter(x=>feeState(x.f)==='odendi').length;
  const link=(k,v)=>{const n=new URLSearchParams(q);v?n.set(k,v):n.delete(k);return '#/odemeler?'+n};
  const markets=S.d.markets.filter(m=>scope==='all'||m.id===scope);
  return `<div class="head"><div><h1>Ödemeler</h1><p>Her katılımcının pazar başına katılım ücreti ve tahsilatı. ${scope==='all'?'Tüm pazarlar':esc(mk(scope)?.name||'')}</p></div>
  <div class="row"><select class="pill-select" data-nav-o="pazar">${opts([['all','Tüm pazarlar'],...S.d.markets.map(m=>[m.id,m.name])],scope)}</select>${exportBtns('odemeler','pazar='+encodeURIComponent(scope))}${canEdit()?'<button class="btn sm" data-act="import" data-v="odemeler">İçe aktar ↑</button>':''}</div></div>
  <div class="grid g4"><div class="stat y money"><strong>${money(sum.due)}</strong><span>Toplam ücret</span></div><div class="stat o money"><strong>${money(sum.paid)}</strong><span>Tahsil edilen${sum.due?`<div class="bar-meter"><i style="width:${Math.min(100,sum.paid/sum.due*100)}%"></i></div>`:''}</span></div><div class="stat p money"><strong>${money(sum.rest)}</strong><span>Kalan · ${sum.open} katılımcı</span></div><div class="stat b"><strong>${paidCount}<small>/${all.length}</small></strong><span>Ödemesi tamam</span></div></div>
  ${scope==='all'&&markets.length>1?`<div class="card" style="margin-top:40px"><h3>Pazar bazında</h3><div class="table-wrap"><table><thead><tr><th>PAZAR</th><th>KATILIMCI</th><th>TOPLAM</th><th>TAHSİL</th><th>KALAN</th><th></th></tr></thead><tbody>${markets.map(m=>{const x=feeSum(feeRows(m.id));return `<tr class="click" data-href="#/odemeler?pazar=${m.id}"><td><b>${esc(m.name)}</b></td><td>${feeRows(m.id).length}</td><td>${money(x.due)}</td><td>${money(x.paid)}</td><td>${money(x.rest)}</td><td style="text-align:right"><a class="btn sm" href="/api/export/odemeler.xlsx?pazar=${m.id}" download>Excel</a> <a class="btn sm" href="/api/export/odemeler.csv?pazar=${m.id}" download>CSV</a></td></tr>`}).join('')}</tbody></table></div></div>`:''}
  <div style="margin-top:40px"><div class="filters"><input data-nav-o="ara" placeholder="Marka, kişi, not ara" value="${esc(q.get('ara')||'')}"></div>
  <div class="chips" style="margin-bottom:16px"><a class="chip ${!st?'on':''}" href="${link('durum','')}">Tümü ${all.length}</a><a class="chip ${st==='acik'?'on':''}" href="${link('durum','acik')}">Ödemesi açık ${sum.open}</a>${Object.entries(L.fee).map(([k,t])=>{const n=all.filter(x=>feeState(x.f)===k).length;return n?`<a class="chip ${st===k?'on':''}" href="${link('durum',k)}">${t} ${n}</a>`:''}).join('')}</div>
  ${rows.length?`<div class="table-wrap"><table><thead><tr><th>MARKA</th>${scope==='all'?'<th class="hide-sm">PAZAR</th>':''}<th>ÜCRET</th><th>ÖDENEN</th><th class="hide-sm">KALAN</th><th class="hide-sm">YÖNTEM / TARİH</th><th>DURUM</th><th></th></tr></thead><tbody>${rows.map(({p,m,f})=>`<tr class="click" data-href="#/katilimcilar/${p.id}"><td><b>${esc(p.brandName)}</b>${f.note?`<br><small class="muted">${esc(f.note)}</small>`:''}</td>${scope==='all'?`<td class="hide-sm"><small>${esc(m.name)}</small></td>`:''}<td>${money(f.amount)}</td><td><b>${money(f.paid)}</b></td><td class="hide-sm">${money(Math.max(0,f.amount-f.paid))}</td><td class="hide-sm"><small>${esc(L.method[f.method]||'—')}${f.date?' · '+date(f.date):''}</small></td><td>${pill('fee',feeState(f))}</td><td style="text-align:right;white-space:nowrap">${canEdit()?`${['bekliyor','kismi'].includes(feeState(f))?`<button class="btn sm primary" data-act="fee-paid" data-p="${p.id}" data-m="${m.id}">Ödendi ✓</button> `:''}<button class="btn sm" data-act="fee-edit" data-p="${p.id}" data-m="${m.id}">Düzenle</button>`:''}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td><b>TOPLAM</b></td>${scope==='all'?'<td class="hide-sm"></td>':''}<td><b>${money(shown.due)}</b></td><td><b>${money(shown.paid)}</b></td><td class="hide-sm"><b>${money(shown.rest)}</b></td><td class="hide-sm"></td><td></td><td></td></tr></tfoot></table></div>`:'<div class="empty">Bu filtreye uyan kayıt yok. Katılımcılar bir pazara eklenince burada görünür.</div>'}</div>`;
};
function feeModal(pid,mid){
  const p=pt(pid),m=mk(mid);if(!p||!m)return;const f=feeOf(p,m);
  modal(`<span class="mono">${esc(m.name.toLocaleUpperCase('tr'))}</span><h2>${esc(p.brandName)}</h2>
  <div class="grid g2">${field('Katılım ücreti (₺)',`<input name="amount" type="number" min="0" step="any" value="${f.amount||''}" placeholder="0">`,m.fee?`pazar varsayılanı ${money(m.fee)}`:'')}${field('Ödenen (₺)',`<input name="paid" type="number" min="0" step="any" value="${f.paid||''}" placeholder="0">`)}
  ${field('Ödeme yöntemi',`<select name="method">${opts(Object.entries(L.method),f.method,'— seç —')}</select>`)}${field('Ödeme tarihi',`<input name="date" type="date" value="${esc(f.date)}">`)}</div>
  ${field('Not',`<input name="note" value="${esc(f.note)}" placeholder="Örn. stant indirimi, 2 taksit">`)}
  <div class="actions" style="justify-content:space-between"><button type="button" class="btn sm" data-act="fee-fill">Tamamı ödendi</button><span class="row"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">Kaydet</button></span></div>`,
  async d=>{await call('PUT',`/api/participants/${pid}/fees/${mid}`,d);await refresh();closeModal();toast('Ücret kaydedildi');render()});
}

// --- İçe aktarma ---
const importInfo={
  katilimcilar:['Katılımcıları içe aktar','Sütunlar: Marka adı (zorunlu), İletişim kişisi, E-posta, Telefon, Instagram, Web sitesi, Kategori, Açıklama, Etiketler, Pazarlar, Ekip notu. Aynı e-posta ya da marka adı varsa kart güncellenir, yoksa yeni kart açılır.'],
  odemeler:['Ödemeleri içe aktar','Sütunlar: Pazar, Marka (zorunlu), Ücret, Ödenen, Ödeme yöntemi, Ödeme tarihi, Not. Marka, katılımcılardaki adla eşleşir. Pazar sütunu boşsa aşağıda seçtiğin pazar kullanılır.']
};
function importModal(kind){
  const [title,help]=importInfo[kind];
  modal(`<h2>${title}</h2><p class="muted" style="margin:0">${help}</p><p class="mono" style="margin:0">EN KOLAYI: ÖNCE “DIŞA AKTAR” İLE İNDİR, DÜZENLE, GERİ YÜKLE.</p>
  ${field('Dosya','<input type="file" name="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required>','Excel (.xlsx) ya da CSV')}
  ${field(kind==='odemeler'?'Pazar (dosyada yoksa)':'Bu pazara da ekle',`<select name="marketId">${marketOpts(S.market==='all'?'':S.market,kind==='odemeler'?'— dosyadaki pazar —':'— ekleme —')}</select>`)}
  <div id="import-out"></div>
  <div class="actions"><button type="button" class="btn ghost" data-act="close">Kapat</button><button class="btn primary">İçe aktar ↑</button></div>`,
  async(d,form)=>{
    const file=form.querySelector('[name=file]').files[0];if(!file)throw new Error('Dosya seç');
    const btn=form.querySelector('.btn.primary');btn.textContent='Aktarılıyor…';btn.disabled=true;
    try{
      const [data]=await readFiles([file]);
      const r=await call('POST',`/api/import/${kind}`,{filename:file.name,data:data.data,marketId:d.marketId});
      await refresh();render();
      $('#import-out').innerHTML=`<div class="import-result"><b>${r.created} yeni · ${r.updated} güncellendi${r.skipped?` · ${r.skipped} atlandı`:''}</b>${r.errors.length?`<ul>${r.errors.slice(0,12).map(e=>`<li>${esc(e)}</li>`).join('')}</ul>${r.errors.length>12?`<small>+${r.errors.length-12} satır daha</small>`:''}`:''}</div>`;
      toast('İçe aktarıldı');
    }finally{btn.textContent='İçe aktar ↑';btn.disabled=false}
  });
}

// --- Görsel deposu ---
const mediaThumb=m=>`<button class="thumb" data-act="media-open" data-v="${m.id}"><span class="img">${thumb(m)}</span><span class="cap"><b>${esc(m.title)}</b><small class="muted">${esc(m.category)}${m.participantId?' · '+esc(pt(m.participantId)?.brandName||''):''}</small></span></button>`;
pages.gorseller=r=>{
  const q=r.q,mq=q.get('m')||(S.market==='all'?'':S.market),cat=q.get('c'),who=q.get('k'),s=(q.get('ara')||'').toLocaleLowerCase('tr');
  let list=S.d.media;
  if(mq)list=list.filter(m=>mq==='genel'?!m.marketId:m.marketId===mq);
  if(cat)list=list.filter(m=>m.category===cat);
  if(who)list=list.filter(m=>m.participantId===who);
  if(s)list=list.filter(m=>[m.title,m.filename,...m.tags,pt(m.participantId)?.brandName].join(' ').toLocaleLowerCase('tr').includes(s));
  const link=(m,c)=>`#/gorseller?${new URLSearchParams(Object.entries({m,c}).filter(([,v])=>v))}`;
  const folder=(key,name,items)=>{const on=mq===key;return `<a href="${link(key)}" class="${on&&!cat?'on':''}">📁 ${esc(name)} <small>${items.length}</small></a>${on?S.d.mediaCategories.map(c=>[c,items.filter(x=>x.category===c).length]).map(([c,n])=>`<a class="sub ${cat===c?'on':''}" href="${link(key,c)}">${esc(c)} <small>${n}</small></a>`).join(''):''}`};
  return `<div class="head"><div><h1>Görsel deposu</h1><p>Her pazarın kendi klasörü; içinde kategoriler. Görseller katılımcılara ve başvurulara bağlanır.</p></div>${canEdit()?`<button class="btn primary" data-act="upload" data-market="${mq==='genel'?'':esc(mq)}" data-cat="${esc(cat||'')}" data-participant="${esc(who||'')}">+ Yükle</button>`:''}</div>
  <div class="media-layout"><nav class="tree card" style="padding:10px"><a href="#/gorseller?m=" class="${!mq?'on':''}">Tüm dosyalar <small>${S.d.media.length}</small></a>
  ${[...S.d.markets].sort((a,b)=>(b.startDate||'').localeCompare(a.startDate||'')).map(m=>folder(m.id,m.name,S.d.media.filter(x=>x.marketId===m.id))).join('')}${folder('genel','Genel (pazarsız)',S.d.media.filter(x=>!x.marketId))}</nav>
  <div><div class="filters"><input data-nav-m="ara" placeholder="Başlık, etiket, marka ara" value="${esc(q.get('ara')||'')}"><select data-nav-m="k">${opts(S.d.participants.map(p=>[p.id,p.brandName]),who||'','Tüm katılımcılar')}</select></div>
  ${canEdit()?`<div class="drop" id="drop" data-market="${mq==='genel'?'':esc(mq)}" data-cat="${esc(cat||'')}" data-participant="${esc(who||'')}" style="margin-bottom:16px">Dosyaları buraya sürükle ya da <button class="btn sm" data-act="upload" data-market="${mq==='genel'?'':esc(mq)}" data-cat="${esc(cat||'')}" data-participant="${esc(who||'')}">seç</button><br><small class="muted">${mq?esc(mq==='genel'?'Genel':mk(mq)?.name||''):'Klasör seçmeden yüklersen pazarı sorarız'}${cat?' / '+esc(cat):''}</small></div>`:''}
  ${list.length?`<div class="thumbs">${list.map(mediaThumb).join('')}</div>`:'<div class="empty">Bu klasör boş.</div>'}</div></div>`;
};
function readFiles(files){return Promise.all([...files].map(f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({name:f.name,type:f.type,data:String(r.result).split(',')[1]});r.onerror=rej;r.readAsDataURL(f)})))}
function uploadModal(preset,files){
  modal(`<h2>Görsel yükle</h2>${files?`<p style="margin:0"><b>${files.length}</b> dosya seçildi.</p>`:field('Dosyalar','<input type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" required>','JPG, PNG, WEBP, GIF, PDF · en fazla 15 MB')}
  <div class="grid g2">${field('Pazar klasörü',`<select name="marketId">${marketOpts(preset.market||(S.market==='all'?'':S.market),'Genel (pazarsız)')}</select>`)}${field('Kategori',`<select name="category">${opts(S.d.mediaCategories.map(c=>[c,c]),preset.cat||'Etkinlik fotoğrafları')}</select>`)}</div>
  ${field('Katılımcı',`<select name="participantId">${opts(S.d.participants.map(p=>[p.id,p.brandName]),preset.participant||'','— bağlama —')}</select>`)}${field('Etiketler',`<input name="tags" placeholder="afiş, instagram, gece">`,'virgülle ayır')}
  <div class="actions"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">Yükle</button></div>`,
  async(d,form)=>{
    const list=files||form.querySelector('[name=files]').files;if(!list.length)throw new Error('Dosya seç');
    form.querySelector('.btn.primary').textContent='Yükleniyor…';
    await call('POST','/api/media',{marketId:d.marketId||null,category:d.category,participantId:d.participantId||null,tags:d.tags.split(',').map(t=>t.trim()).filter(Boolean),files:await readFiles(list)});
    await refresh();closeModal();toast(`${list.length} dosya yüklendi`);render();
  });
}
function mediaModal(id){
  const m=md(id);if(!m)return;const app=S.d.applications.find(a=>a.id===m.applicationId);
  modal(`<div style="background:#f1eee6;border-radius:12px;padding:10px">${m.mime.startsWith('image/')?`<img src="/media/${m.id}" alt="${esc(m.title)}" style="max-width:100%;max-height:55svh;display:block;margin:auto">`:`<a class="btn" href="/media/${m.id}" target="_blank">PDF'i aç ↗</a>`}</div>
  ${canEdit()?`${field('Başlık',`<input name="title" value="${esc(m.title)}">`)}<div class="grid g2">${field('Pazar klasörü',`<select name="marketId">${marketOpts(m.marketId||'','Genel (pazarsız)')}</select>`)}${field('Kategori',`<select name="category">${opts(S.d.mediaCategories.map(c=>[c,c]),m.category)}</select>`)}</div>
  ${field('Katılımcı',`<select name="participantId">${opts(S.d.participants.map(p=>[p.id,p.brandName]),m.participantId||'','— bağlama —')}</select>`)}${field('Etiketler',`<input name="tags" value="${esc(m.tags.join(', '))}">`)}`:`<b>${esc(m.title)}</b>`}
  <small class="muted">${esc(m.filename)} · ${(m.size/1024/1024).toFixed(2)} MB · ${date(m.createdAt)}${app?` · <a href="#/basvurular/${app.id}" data-act="close">başvurudan geldi</a>`:''}${m.participantId?` · <a href="#/katilimcilar/${m.participantId}" data-act="close">${esc(pt(m.participantId)?.brandName||'')}</a>`:''}</small>
  <div class="actions" style="justify-content:space-between"><span class="row"><a class="btn sm" href="/media/${m.id}?indir">İndir</a>${canEdit()?`<button type="button" class="btn sm danger" data-act="media-del" data-v="${m.id}">Sil</button>`:''}</span><span class="row"><button type="button" class="btn ghost" data-act="close">Kapat</button>${canEdit()?'<button class="btn primary">Kaydet</button>':''}</span></div>`,
  async d=>{await call('PUT',`/api/media/${id}`,{...d,marketId:d.marketId||null,participantId:d.participantId||null,tags:d.tags.split(',').map(t=>t.trim()).filter(Boolean)});await refresh();closeModal();toast('Kaydedildi');render()},'lightbox');
}

// --- Yöneticiler ve hesap ---
pages.yoneticiler=()=>`<div class="head"><div><h1>Yöneticiler</h1><p>Sahip her şeyi yönetir. Editör içerik ekler ve başvuruları değerlendirir. İzleyici sadece görür.</p></div>${isOwner()?'<button class="btn primary" data-act="admin-new">+ Yönetici ekle</button>':''}</div>
  <div class="table-wrap"><table><thead><tr><th>AD</th><th>E-POSTA</th><th>YETKİ</th><th class="hide-sm">SON GİRİŞ</th><th></th></tr></thead><tbody>${S.d.admins.map(a=>`<tr><td><b>${esc(a.name)}</b>${a.id===S.d.me.id?' <span class="pill">sen</span>':''}${a.active===false?' <span class="pill s-red">pasif</span>':''}</td><td>${esc(a.email)}</td>
  <td>${isOwner()&&a.id!==S.d.me.id?`<select class="inp" style="width:auto" data-admin-role="${a.id}">${opts(Object.entries(L.role),a.role)}</select>`:L.role[a.role]}</td><td class="hide-sm"><small>${a.lastLoginAt?ago(a.lastLoginAt):'—'}</small></td>
  <td style="text-align:right">${isOwner()&&a.id!==S.d.me.id?`<button class="btn sm" data-act="admin-pass" data-v="${a.id}">Şifre</button> <button class="btn sm" data-act="admin-toggle" data-v="${a.id}">${a.active===false?'Etkinleştir':'Pasifleştir'}</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
pages.hesap=()=>`<div class="head"><div><h1>Hesabım</h1><p>${esc(S.d.me.email)} · ${L.role[S.d.me.role]}</p></div></div>
  <form class="card" id="me-form" style="display:grid;gap:12px;max-width:460px">${field('Ad soyad',`<input name="name" value="${esc(S.d.me.name)}">`)}${field('Yeni şifre','<input name="password" type="password" minlength="8" autocomplete="new-password">','değiştirmeyeceksen boş bırak')}<button class="btn primary" style="justify-self:start">Kaydet</button></form>`;

// --- Genel arama ---
function searchAll(s){
  s=s.toLocaleLowerCase('tr');if(s.length<2)return [];
  const has=(...v)=>v.join(' ').toLocaleLowerCase('tr').includes(s),hits=[];
  for(const p of S.d.participants)if(has(p.brandName,p.contactName,p.email,p.instagram,p.category,...p.tags))hits.push(['Katılımcı',p.brandName,`#/katilimcilar/${p.id}`]);
  for(const a of S.d.applications)if(has(...Object.values(a.answers).flat()))hits.push(['Başvuru',appName(a),`#/basvurular/${a.id}`]);
  for(const f of S.d.forms)if(has(f.title))hits.push(['Form',f.title,`#/formlar/${f.id}`]);
  for(const m of S.d.markets)if(has(m.name,m.location))hits.push(['Pazar',m.name,`#/pazarlar/${m.id}`]);
  for(const m of S.d.media)if(has(m.title,m.filename,...m.tags))hits.push(['Görsel',m.title,`#/gorseller?m=${m.marketId||'genel'}&ara=${encodeURIComponent(m.title)}`]);
  return hits.slice(0,14);
}
function showResults(){
  const box=$('#results'),v=$('#q').value;S.q=v;S.searchHits=searchAll(v);
  box.className=S.searchHits.length||v.length>1?'results':'';
  box.innerHTML=v.length>1?(S.searchHits.map(([t,n,h],i)=>`<a href="${h}" class="${i?'':'hl'}"><span>${esc(n)}</span><span class="mono muted">${t}</span></a>`).join('')||'<p class="muted" style="padding:8px;margin:0">Sonuç yok.</p>'):'';
}

// --- Olaylar ---
const actions={
  'pass-toggle':el=>{const i=el.previousElementSibling,show=i.type==='password';i.type=show?'text':'password';el.textContent=show?'Gizle':'Göster';el.setAttribute('aria-label',show?'Şifreyi gizle':'Şifreyi göster')},
  versions:()=>modal(`<span class="mono">SÜRÜM NOTLARI</span><h2>Neler değişti?</h2><div class="versions">${(S.versions||[]).map((x,i)=>`<section class="${i?'':'now'}"><div><b>${esc(x.v)}</b><small>${date(x.date).toLocaleLowerCase('tr')}${i?'':' · kullandığın sürüm'}</small></div><ul>${x.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></section>`).join('')||'<div class="empty">Sürüm bilgisi yok.</div>'}</div><div class="actions"><button type="button" class="btn primary" data-act="close">Tamam</button></div>`,()=>closeModal()),
  logout:async()=>{await call('POST','/api/auth/logout');S.d=null;start()},
  menu:el=>{const o=$('#side').classList.toggle('open');el.textContent=o?'Kapat':'Menü'},
  close:()=>closeModal(),
  copy:async el=>{try{await navigator.clipboard.writeText(el.dataset.v);toast('Bağlantı kopyalandı')}catch{prompt('Bağlantıyı kopyala:',el.dataset.v)}},
  scope:el=>{S.market=el.dataset.v;store.set('fp-market',S.market);render();toast('Panel bu pazara odaklandı')},
  'market-new':()=>marketModal(),
  'market-edit':el=>marketModal(mk(el.dataset.v)),
  'market-del':el=>confirm('Bu pazar silinsin mi?')&&act(async()=>{await call('DELETE',`/api/markets/${el.dataset.v}`);if(S.market===el.dataset.v){S.market='all';store.set('fp-market','all')}location.hash='#/pazarlar'},'Pazar silindi'),
  'form-new':el=>newFormModal(el.dataset.v),
  'form-copy-into':el=>copyFormModal(el.dataset.v,el.dataset.form),
  'form-del':el=>confirm('Bu form silinsin mi?')&&act(async()=>{await call('DELETE',`/api/forms/${el.dataset.v}`);S.draft=null;location.hash='#/formlar'},'Form silindi'),
  'form-save':()=>act(async()=>{const f=await call('PUT',`/api/forms/${S.draft.id}`,S.draft);S.draft=structuredClone(f)},'Form kaydedildi'),
  'field-open':el=>{S.openField=S.openField===el.dataset.v?null:el.dataset.v;render()},
  'field-add':el=>{const t=el.dataset.v,f={id:'fld_'+[...crypto.getRandomValues(new Uint8Array(6))].map(b=>b.toString(16).padStart(2,'0')).join(''),type:t,label:t==='heading'?'Yeni bölüm':t==='consent'?'Koşulları okudum ve kabul ediyorum.':L.type[t],required:false,help:'',options:['select','checkboxes'].includes(t)?['Seçenek 1','Seçenek 2']:[],mapTo:''};S.draft.fields.push(f);S.openField=f.id;render()},
  'field-move':el=>{const i=+el.dataset.v,j=i+ +el.dataset.dir,F=S.draft.fields;if(j<0||j>=F.length)return;[F[i],F[j]]=[F[j],F[i]];render()},
  'field-dup':el=>{const i=+el.dataset.v,c={...structuredClone(S.draft.fields[i]),id:'fld_'+[...crypto.getRandomValues(new Uint8Array(6))].map(b=>b.toString(16).padStart(2,'0')).join('')};c.label+=' (kopya)';S.draft.fields.splice(i+1,0,c);S.openField=c.id;render()},
  'field-del':el=>{S.draft.fields.splice(+el.dataset.v,1);render()},
  'app-status':el=>act(()=>call('PUT',`/api/applications/${route().id}`,{status:el.dataset.v}),'Durum güncellendi'),
  'app-rate':el=>act(()=>call('PUT',`/api/applications/${route().id}`,{rating:+el.dataset.v})),
  'app-accept':()=>act(async()=>{const r=await call('POST',`/api/applications/${route().id}/accept`);location.hash=`#/katilimcilar/${r.participant.id}`},'Kabul edildi, katılımcı kartı hazır'),
  'app-del':()=>confirm('Başvuru ve ona ait görseller silinsin mi?')&&act(async()=>{await call('DELETE',`/api/applications/${route().id}`);location.hash='#/basvurular'},'Başvuru silindi'),
  'part-new':()=>newParticipantModal(),
  'part-del':el=>confirm('Katılımcı silinsin mi? Görselleri depoda kalır.')&&act(async()=>{await call('DELETE',`/api/participants/${el.dataset.v}`);location.hash='#/katilimcilar'},'Katılımcı silindi'),
  upload:el=>uploadModal(el.dataset),
  import:el=>importModal(el.dataset.v),
  'fee-edit':el=>feeModal(el.dataset.p,el.dataset.m),
  'fee-fill':el=>{const f=el.form;f.paid.value=f.amount.value;if(!f.date.value)f.date.value=new Date().toISOString().slice(0,10)},
  'fee-paid':el=>{const p=pt(el.dataset.p),m=mk(el.dataset.m),f=feeOf(p,m);act(()=>call('PUT',`/api/participants/${p.id}/fees/${m.id}`,{...f,paid:f.amount,date:f.date||new Date().toISOString().slice(0,10)}),`${p.brandName} ödendi olarak işaretlendi`)},
  'media-open':el=>mediaModal(el.dataset.v),
  'media-del':el=>confirm('Dosya kalıcı olarak silinsin mi?')&&act(async()=>{await call('DELETE',`/api/media/${el.dataset.v}`);closeModal()},'Dosya silindi'),
  'admin-new':()=>modal(`<h2>Yönetici ekle</h2>${field('Ad soyad','<input name="name" required>')}${field('E-posta','<input name="email" type="email" required>')}${field('Yetki',`<select name="role">${opts(Object.entries(L.role),'editor')}</select>`)}${field('Geçici şifre','<input name="password" required minlength="8">','kişiye ilet, sonra kendisi değiştirsin')}<div class="actions"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">Ekle</button></div>`,async d=>{await call('POST','/api/admins',d);await refresh();closeModal();toast('Yönetici eklendi');render()}),
  'admin-pass':el=>modal(`<h2>Şifre belirle</h2>${field('Yeni şifre','<input name="password" required minlength="8">')}<div class="actions"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">Kaydet</button></div>`,async d=>{await call('PUT',`/api/admins/${el.dataset.v}`,d);closeModal();toast('Şifre güncellendi')}),
  'admin-toggle':el=>act(()=>call('PUT',`/api/admins/${el.dataset.v}`,{active:S.d.admins.find(a=>a.id===el.dataset.v).active===false}),'Güncellendi')
};

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');
  if(el&&actions[el.dataset.act]){if(el.tagName!=='A')e.preventDefault();actions[el.dataset.act](el,e);return}
  const row=e.target.closest('tr[data-href]');if(row&&!e.target.closest('a,button,select'))location.hash=row.dataset.href;
  if(!e.target.closest('.search')&&$('#results'))$('#results').className='';
});
document.addEventListener('submit',async e=>{
  const f=e.target;
  if(f.matches('[data-modal]')){e.preventDefault();try{await S.modalSubmit(formData(f),f)}catch(err){$('#modal-err').textContent=err.message;const b=f.querySelector('.btn.primary');if(b&&b.textContent==='Yükleniyor…')b.textContent='Yükle'}}
  if(f.id==='part-form'){e.preventDefault();act(()=>call('PUT',`/api/participants/${route().id}`,formData(f)),'Katılımcı kaydedildi')}
  if(f.id==='me-form'){e.preventDefault();act(()=>call('PUT','/api/admins/me',formData(f)),'Hesap güncellendi')}
});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.id==='q')return showResults();
  if(el.dataset.bind&&S.draft){S.draft[el.dataset.bind]=el.value;afterDraftEdit()}
  if(el.dataset.f!==undefined&&S.draft&&el.dataset.full===undefined){const f=S.draft.fields[+el.dataset.f],k=el.dataset.k;f[k]=k==='options'?el.value.split('\n').map(s=>s.trim()).filter(Boolean):k==='required'?el.checked:el.value;afterDraftEdit()}
});
function afterDraftEdit(){
  $('#preview').innerHTML=preview(S.draft);
  const dirty=JSON.stringify(S.draft)!==JSON.stringify(fm(S.draft.id)),b=document.querySelector('[data-act="form-save"]');
  if(b){b.disabled=!dirty;b.textContent=dirty?'Değişiklikleri kaydet':'Kaydedildi'}
}
let navTimer;
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.id==='market-pick'){S.market=el.value;store.set('fp-market',S.market);render();return}
  if(el.dataset.f!==undefined&&el.dataset.full!==undefined&&S.draft){const f=S.draft.fields[+el.dataset.f];f[el.dataset.k]=el.value;if(el.dataset.k==='type'){if(!['select','checkboxes'].includes(f.type))f.options=[];else if(!f.options.length)f.options=['Seçenek 1','Seçenek 2'];if(['file','consent','heading','checkboxes'].includes(f.type))f.mapTo=''}render();return}
  if(el.dataset.bind==='marketId'||el.dataset.bind==='status'){afterDraftEdit();return}
  if(el.dataset.adminRole)act(()=>call('PUT',`/api/admins/${el.dataset.adminRole}`,{role:el.value}),'Yetki güncellendi');
  if(el.id==='app-notes')act(()=>call('PUT',`/api/applications/${route().id}`,{notes:el.value}),'Not kaydedildi');
  const navKey=el.dataset.nav||el.dataset.navP||el.dataset.navM||el.dataset.navO;
  if(navKey){const r=route(),q=new URLSearchParams(r.q);el.value?q.set(navKey,el.value):q.delete(navKey);const view=el.dataset.nav?'basvurular':el.dataset.navP?'katilimcilar':el.dataset.navO?'odemeler':'gorseller';location.hash=`#/${view}?${q}`}
});
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&!e.target.closest('input,textarea,select')&&$('#q')){e.preventDefault();$('#q').focus()}
  if(e.target.id==='q'&&e.key==='Enter'&&S.searchHits[0]){location.hash=S.searchHits[0][2];S.q='';e.target.blur()}
  if(e.target.id==='q'&&e.key==='Escape'){e.target.value='';showResults();e.target.blur()}
  if(e.target.matches('[data-nav],[data-nav-p],[data-nav-m],[data-nav-o]')&&e.key==='Enter')e.target.dispatchEvent(new Event('change',{bubbles:true}));
});
// Sürükle bırak yükleme
document.addEventListener('dragover',e=>{const d=e.target.closest('#drop');if(d){e.preventDefault();d.classList.add('over')}});
document.addEventListener('dragleave',e=>{e.target.closest('#drop')?.classList.remove('over')});
document.addEventListener('drop',e=>{const d=e.target.closest('#drop');if(!d)return;e.preventDefault();d.classList.remove('over');if(e.dataTransfer.files.length)uploadModal(d.dataset,e.dataTransfer.files)});
// Kaydedilmemiş form değişikliklerini kaybetmemek için uyar
addEventListener('hashchange',()=>{
  if(S.draft&&route().id!==S.draft.id){const saved=fm(S.draft.id);if(saved&&JSON.stringify(saved)!==JSON.stringify(S.draft)&&!confirm('Formdaki kaydedilmemiş değişiklikler silinsin mi?')){history.back();return}S.draft=null}
  S.q='';$('#side')?.classList.remove('open');render();
  if(S.d)refresh().then(render).catch(()=>{});
});
// Yeni başvurular sayfayı yenilemeden görünsün: sekmeye dönünce ve dakikada bir veriyi tazele.
const live=()=>{if(S.d&&document.visibilityState==='visible'&&!$('#modal').open&&!document.activeElement?.closest('input,textarea,select'))refresh().then(render).catch(()=>{})};
addEventListener('focus',live);setInterval(live,60000);
addEventListener('beforeunload',e=>{if(S.draft&&JSON.stringify(fm(S.draft.id))!==JSON.stringify(S.draft))e.preventDefault()});
start();
