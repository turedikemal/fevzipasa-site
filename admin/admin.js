// Fevzipaşa yönetim paneli. Tek sayfa; adres çubuğundaki #/... yolu hangi ekranın açık olduğunu belirler.
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{return localStorage.getItem(k)??d}catch{return d}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const S={versions:null,d:null,market:store.get('fp-market','all'),view:store.get('fp-view','grid'),sel:new Set(),draft:null,openField:null,modalSubmit:null,searchHits:[]};

const L={
  reg:{bekliyor:'Onay bekliyor',onay:'Onaylandı',red:'Onaylanmadı'},
  app:{yeni:'Yeni',inceleniyor:'İnceleniyor',kabul:'Kabul',yedek:'Yedek',red:'Red'},
  form:{taslak:'Taslak',acik:'Yayında',kapali:'Kapalı'},
  market:{planlama:'Planlama',basvuru:'Başvuru dönemi',aktif:'Aktif',tamamlandi:'Tamamlandı'},
  type:{text:'Kısa yazı',textarea:'Uzun yazı',email:'E-posta',phone:'Telefon',url:'Bağlantı',number:'Sayı',date:'Tarih',select:'Tek seçim',checkboxes:'Çoklu seçim',file:'Görsel yükleme',consent:'Onay kutusu',heading:'Bölüm başlığı'},
  fee:{bekliyor:'Bekliyor',kismi:'Kısmi ödendi',odendi:'Ödendi',ucretsiz:'Ücretsiz',tanimsiz:'Ücret girilmedi'},
  method:{nakit:'Nakit',havale:'Havale / EFT',kart:'Kredi kartı',diger:'Diğer'},
  workshop:{planlandi:'Planlandı',yapildi:'Yapıldı',iptal:'İptal'},
  ledger:{gider:'Gider',gelir:'Gelir'},
  invoice:{geldi:'Fatura geldi',bekleniyor:'Fatura bekleniyor',yok:'Fatura yok'},
  join:{yeni:'İlk kez',devam:'Devam ediyor',donen:'Geri döndü',katilmadi:'Bu pazara katılmadı'},
  pf:{brandName:'Marka adı',contactName:'İletişim kişisi',email:'E-posta',phone:'Telefon',instagram:'Instagram',website:'Web sitesi',category:'Kategori',description:'Açıklama'}
};

// --- Veri yardımcıları ---
const mk=id=>S.d.markets.find(x=>x.id===id),fm=id=>S.d.forms.find(x=>x.id===id),pt=id=>S.d.participants.find(x=>x.id===id),md=id=>S.d.media.find(x=>x.id===id),ad=id=>S.d.admins.find(x=>x.id===id);
const inScope=marketId=>S.market==='all'||marketId===S.market;
const P=k=>!!S.d.perms?.[k];
const isAna=()=>S.d.me.role==='ana';
// Kayıt sahipliği: ana yönetici her şeyi, diğerleri yalnızca kendi girdiklerini değiştirir.
const mine=(rec,key='createdBy')=>isAna()||(rec?.[key]?rec[key]===S.d.me.id:S.d.me.role==='yonetici');
const ownerName=(rec,key='createdBy')=>ad(rec?.[key])?.name||'';
function profile(app){const f=fm(app.formId),out={};for(const q of f?.fields||[])if(q.mapTo&&app.answers[q.id]!=null)out[q.mapTo]=Array.isArray(app.answers[q.id])?app.answers[q.id].join(', '):String(app.answers[q.id]);return out}
const appName=a=>profile(a).brandName||profile(a).contactName||'İsimsiz başvuru';
const pill=(kind,v)=>`<span class="pill s-${esc(v)}">${esc(L[kind][v]||v)}</span>`;
const date=v=>v?new Date(v.length===10?v+'T12:00':v).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'}):'—';
const ago=v=>{const m=Math.round((Date.now()-new Date(v))/60000);return m<1?'az önce':m<60?m+' dk önce':m<1440?Math.round(m/60)+' sa önce':Math.round(m/1440)+' gün önce'};
const today=()=>new Date().toISOString().slice(0,10);
const marketRange=m=>m?`${date(m.startDate)}${m.endDate&&m.endDate!==m.startDate?' – '+date(m.endDate):''}`:'';
const mShort=m=>m?(m.edition?m.edition+'. pazar':m.name):'';
const pMedia=p=>S.d.media.filter(m=>m.participantId===p.id);
const logoOf=p=>pMedia(p).find(m=>m.category==='Logo'&&m.mime.startsWith('image/'));
const cover=p=>logoOf(p)||pMedia(p).find(m=>m.mime.startsWith('image/'));
const avatar=p=>{const l=logoOf(p),c=l||cover(p);return `<span class="avatar ${l?'logo':''}">${c?`<img src="/media/${c.id}" alt="" loading="lazy">`:esc((p.brandName||'?')[0])}</span>`};
const missing=p=>['email','phone'].filter(k=>!p[k]).map(k=>L.pf[k]);
const stars=(n,act)=>`<span class="stars">${[1,2,3,4,5].map(i=>act?`<button type="button" data-act="${act}" data-v="${i}" class="${i<=n?'on':''}" aria-label="${i} yıldız">★</button>`:`<span style="color:${i<=n?'var(--orange)':'#ddd'}">★</span>`).join('')}</span>`;
const publicLink=f=>`${location.origin}/basvuru/${f.id}`;
const thumb=m=>m.mime.startsWith('image/')?`<img src="/media/${m.id}" alt="${esc(m.title)}" loading="lazy">`:'<span class="mono">PDF</span>';
const igLink=v=>v?`<a href="https://instagram.com/${esc(v.replace(/^@/,''))}" target="_blank" rel="noopener">${esc(v)}</a>`:'';

// Katılım: pazarlar sıra numarasına göre; katılımcının geçmişi ve seçili pazara göre durumu.
const marketsAsc=()=>[...S.d.markets].sort((a,b)=>(a.edition||0)-(b.edition||0));
const prevMarket=m=>marketsAsc().filter(x=>(x.edition||0)<(m.edition||0)).at(-1);
function joinState(p,m){
  if(!p.markets.includes(m.id)){const prev=prevMarket(m);return prev&&p.markets.includes(prev.id)?'katilmadi':null}
  const before=marketsAsc().filter(x=>(x.edition||0)<(m.edition||0)&&p.markets.includes(x.id));
  if(!before.length)return 'yeni';
  const prev=prevMarket(m);return prev&&p.markets.includes(prev.id)?'devam':'donen';
}
const loyalty=n=>n>=4?'Sadık':n>=2?'Tekrar eden':'Tek pazar';

// Ücretler: katılımcının her pazar için kaydı; kayıt yoksa pazarın varsayılan katılım ücreti beklenir.
const money=n=>(Number(n)||0).toLocaleString('tr-TR',{maximumFractionDigits:2})+' ₺';
const feeOf=(p,m)=>({amount:m.fee||0,paid:0,method:'',date:'',note:'',...(p.fees?.[m.id]||{}),set:!!p.fees?.[m.id]});
const feeState=f=>!f.set&&!f.amount?'tanimsiz':f.amount<=0&&f.paid<=0?'ucretsiz':f.paid>=f.amount?'odendi':f.paid>0?'kismi':'bekliyor';
const feeRows=scope=>S.d.participants.flatMap(p=>p.markets.map(mk).filter(m=>m&&(scope==='all'||m.id===scope)).map(m=>({p,m,f:feeOf(p,m)})));
const feeSum=rows=>{const due=rows.reduce((s,r)=>s+(r.f.amount||0),0),paid=rows.reduce((s,r)=>s+(r.f.paid||0),0);return {due,paid,rest:Math.max(0,due-paid),open:rows.filter(r=>['bekliyor','kismi'].includes(feeState(r.f))).length,unset:rows.filter(r=>feeState(r.f)==='tanimsiz').length}};
function kasa(scope){
  const fees=feeSum(feeRows(scope)).paid,led=S.d.ledger.filter(e=>scope==='all'||e.marketId===scope);
  const inc=led.filter(e=>e.type==='gelir').reduce((s,e)=>s+e.amount,0),exp=led.filter(e=>e.type==='gider').reduce((s,e)=>s+e.amount,0);
  return {fees,inc,exp,cash:fees+inc-exp,led,noInvoice:led.filter(e=>e.type==='gider'&&e.invoice==='bekleniyor'),noReceipt:led.filter(e=>e.type==='gider'&&!e.receipt)};
}

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
function toast(msg,bad){const t=$('#toast');t.textContent=msg;t.className='show'+(bad?' bad':'');clearTimeout(toast.t);toast.t=setTimeout(()=>t.className=bad?'bad':'',3200)}

// --- Modal ---
function modal(html,onSubmit,cls=''){
  const d=$('#modal');d.className=cls;d.innerHTML=`<form class="modal-in" data-modal novalidate><button type="button" class="modal-x" data-act="close" aria-label="Kapat">×</button>${html}<p class="err" id="modal-err"></p></form>`;S.modalSubmit=onSubmit;d.showModal();
  d.querySelector('input:not([type=hidden]),select,textarea')?.focus();
}
const closeModal=()=>$('#modal').close();
const formData=form=>{const o={};for(const el of form.elements){if(!el.name)continue;if(el.type==='checkbox'){if(el.dataset.multi!==undefined){(o[el.name]??=[]);if(el.checked)o[el.name].push(el.value)}else o[el.name]=el.checked}else if(el.type==='radio'){if(el.checked)o[el.name]=el.value}else if(el.type!=='file')o[el.name]=el.value}return o};
const field=(label,input,hint='')=>`<label class="f">${label}${hint?` <small>${hint}</small>`:''}${input}</label>`;
const opts=(list,sel,empty)=>(empty!=null?`<option value="">${esc(empty)}</option>`:'')+list.map(([v,t])=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(t)}</option>`).join('');
const marketOpts=(sel,empty)=>opts(S.d.markets.map(m=>[m.id,m.name]),sel,empty);
const actions2=(save='Kaydet',extra='')=>`<div class="actions">${extra?`<span class="row">${extra}</span>`:''}<span class="row" style="margin-left:auto"><button type="button" class="btn ghost" data-act="close">Vazgeç</button><button class="btn primary">${save}</button></span></div>`;
const section=(title,html)=>`<fieldset class="msec"><legend>${title}</legend>${html}</fieldset>`;

// Dışa aktar / içe aktar / şablon: her bölümde aynı çubuk.
const ioBar=(kind,qs='',imp=true)=>`<div class="io"><span class="mono">DIŞA AKTAR</span><a class="btn sm" href="/api/export/${kind}.xlsx?${qs}" download>Excel ↓</a><a class="btn sm" href="/api/export/${kind}.csv?${qs}" download>CSV ↓</a>${imp&&(kind==='kasa'?P('ledgerWrite'):kind==='formlar'?P('formWrite'):P('import'))?`<button class="btn sm dark" data-act="import" data-v="${kind}">İçe aktar ↑</button>`:''}</div>`;

// --- Giriş ---
async function start(){
  if(!S.versions)S.versions=await fetch('/admin/surumler.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>[]);
  try{const st=await call('GET','/api/auth/state');if(st.me){await refresh();render();return}authScreen(st.needsSetup)}
  catch(e){$('#app').innerHTML=`<p class="boot">${esc(e.message)}</p>`}
}
function authScreen(setup){
  const isK=location.pathname.startsWith('/katilim');
  if(S.authMode==null)S.authMode=isK&&/kayit/.test(location.search)?'signup':'login';
  const up=!setup&&S.authMode==='signup';
  $('#app').innerHTML=`<div class="auth"><div class="auth-brand"><span class="mono">${isK||up?'FEVZİPAŞA PANELİ':'YÖNETİM PANELİ'}</span><h1 class="auth-title" aria-label="Fevzipaşa Tasarım Pazarı"><span><i>FEVZİPAŞA</i></span><span><i>TASARIM</i></span><span><i>PAZARI</i></span></h1><div class="auth-foot"><span class="mono">${isK||up?'Pazara başvur · Workshoplara katıl · Markanı yönet':'Başvurular · Katılımcılar · Kasa'}</span><span class="foot-right"><small class="copy">© 2026 Fevzipaşa Tasarım Pazarı. Tüm hakları saklıdır.</small><a class="credit" href="https://thegoatzstudio.com/" target="_blank" rel="noopener">Bu site <b>THE GOATZ STUDIO</b> tarafından yapılmıştır.<img src="https://thegoatzstudio.com/favicon.ico" alt="" onerror="this.remove()"></a></span></div></div>
  <div class="auth-side"><form id="auth" class="auth-card" novalidate>
  ${setup?'':`<div class="auth-tabs" role="tablist"><button type="button" class="${up?'':'on'}" data-act="auth-mode" data-v="login">Giriş yap</button><button type="button" class="${up?'on':''}" data-act="auth-mode" data-v="signup">Kayıt ol</button></div>`}
  <span class="mono auth-eyebrow">${setup?'İLK KURULUM':up?'KATILIMCI KAYDI':'GİRİŞ'}</span>
  <h2>${setup?'Paneli kuralım.':up?'Aramıza katıl.':isK?'Hoş geldin.':'Tekrar hoş geldin.'}</h2>
  <p class="auth-lead">${setup?'İlk hesabı oluştur. Bu hesap her şeyi görebilen ve yönetebilen “Ana yönetici” olarak açılır.':up?'Hesabını aç; pazara başvur, workshoplara katıl, başvurunu ve ödemeni buradan takip et.':isK?'Katılımcı da yönetici de buradan girer. Hesabın yoksa “Kayıt ol”a geç; stant başvurusu ve workshop kaydı panelinde.':'Başvuruları, katılımcıları ve kasayı yönetmek için giriş yap.'}</p>
  ${up?`<label class="auth-field"><span>Marka adı</span><input name="brandName" required placeholder="Örn. Kil & Ateş Seramik"></label>`:''}
  ${setup||up?`<label class="auth-field"><span>Ad soyad</span><input name="name" required autocomplete="name" placeholder="${up?'Adın ve soyadın':'Kemal Türedi'}"></label>`:''}
  <label class="auth-field"><span>E-posta</span><input name="email" type="email" required autocomplete="email" placeholder="ornek@eposta.com"></label>
  ${up?`<label class="auth-field"><span>Instagram <small>isteğe bağlı</small></span><span class="auth-ig"><b>@</b><input name="instagram" placeholder="markan" autocapitalize="off" autocomplete="off"></span></label>`:''}
  <label class="auth-field"><span>Şifre${setup||up?' <small>en az 8 karakter</small>':''}</span><span class="pass"><input name="password" type="password" required minlength="${setup||up?8:1}" autocomplete="${setup||up?'new-password':'current-password'}" placeholder="••••••••"><button type="button" class="pass-toggle" data-act="pass-toggle" aria-label="Şifreyi göster">Göster</button></span></label>
  <p class="auth-err" id="auth-err" role="alert"></p>
  <button class="auth-submit"><span>${setup?'Kur ve başla':up?'Kayıt ol':'Giriş yap'}</span><span aria-hidden="true">↗</span></button>
  ${setup?'':`<p class="auth-switch">${up?'Zaten hesabın var mı? <button type="button" data-act="auth-mode" data-v="login">Giriş yap</button>':'Pazara katılmak mı istiyorsun? <button type="button" data-act="auth-mode" data-v="signup">Katılımcı olarak kayıt ol</button>'}</p>`}
  <a class="auth-back" href="/">← Siteye dön</a><span class="ver">${verLabel()}</span></form></div></div>`;
  $('#auth').addEventListener('submit',async e=>{
    e.preventDefault();const f=e.target,err=$('#auth-err'),btn=f.querySelector('.auth-submit');
    const d=formData(f);
    if(up&&!d.brandName)return err.textContent='Marka adını yaz.';
    if((setup||up)&&!d.name)return err.textContent='Adını yaz.';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email))return err.textContent='Geçerli bir e-posta yaz.';
    if((setup||up)&&d.password.length<8)return err.textContent='Şifre en az 8 karakter olmalı.';
    if(!d.password)return err.textContent='Şifreni yaz.';
    err.textContent='';btn.disabled=true;
    try{await call('POST',setup?'/api/auth/setup':up?'/api/auth/signup':'/api/auth/login',d);await refresh();location.hash='#/';render()}
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
const navAll=[['genel','Genel bakış'],['pazarlar','Pazarlar'],['formlar','Formlar'],['basvurular','Başvurular'],['katilimcilar','Katılımcılar'],['workshoplar','Workshoplar'],['kasa','Kasa','ledgerRead'],['gorseller','Görseller'],['yoneticiler','Kullanıcılar']];
const nav=()=>navAll.filter(([,,perm])=>!perm||P(perm));
const pages={};
const demoBar=r=>!isAna()?'':S.d.demo?`<div class="demobar"><span><b>Örnek verileri görüyorsun.</b> Pazarlar, katılımcılar, ödemeler, workshoplar, kasa ve yöneticilerde “örnek” işaretli kayıtlar var. Gerçek kayıtlarına dokunulmadı.</span><button class="btn sm dark" data-act="demo-all-del">Örnekleri sil</button></div>`
  :`<div class="demobar off"><span><b>Paneli örneklerle tanı.</b> Geçmiş ve yaklaşan pazarlar, katılımcılar, ödemeler, workshoplar, kasa hareketleri ve örnek yöneticiler eklenir. Tek tıkla silinir, gerçek kayıtlarına dokunmaz.</span><button class="btn sm primary" data-act="demo-all">Örnek verileri yükle</button></div>`;

function render(){
  if(!S.d)return;
  if(S.d.portal)return renderPortal();
  const r=route();if(r.view==='odemeler'){location.replace('#/kasa?sekme=tahsilat'+(r.q.get('pazar')?'&pazar='+r.q.get('pazar'):''));return}
  const page=(pages[r.view]||pages.genel)(r);
  const newCount=S.d.applications.filter(a=>a.status==='yeni'&&inScope(a.marketId)).length;
  const scrollY=window.scrollY,focusId=document.activeElement?.id;
  const N=nav(),ni=N.findIndex(([k])=>k===r.view),eyebrow=!r.id&&ni>=0?`<p class="eyebrow">${String(ni+1).padStart(2,'0')} / ${N[ni][1].toLocaleUpperCase('tr')}</p>`:'';
  $('#app').innerHTML=`<header class="bar"><div class="bar-top"><a class="wordmark" href="#/">FEVZİPAŞA<br>TASARIM PAZARI<span>YÖNETİM PANELİ</span></a>
  <div class="bar-right"><a class="acc ${r.view==='hesap'?'on':''}" href="#/hesap">Hesabım · ${esc(S.d.me.name.split(' ')[0])}</a><a class="nav-pill" href="/" target="_blank">Site <span>↗</span></a><button class="acc out" data-act="logout">Çıkış</button><button class="menu-btn" data-act="menu">Menü</button></div></div>
  <nav id="side">${N.map(([k,t])=>`<a href="#/${k}" class="${r.view===k?'on':''}">${t}${k==='basvurular'&&newCount?`<b>${newCount}</b>`:''}</a>`).join('')}</nav></header>
  <div class="tools"><div class="search"><input id="q" placeholder="⌕  Ara…  ( / )" autocomplete="off" value="${esc(S.q||'')}"><div id="results"></div></div>
  <label class="market-pick"><span class="mono hide-sm">PAZAR</span><select id="market-pick">${opts([['all','Tüm pazarlar'],...S.d.markets.map(m=>[m.id,m.name])],S.market)}</select></label></div>
  <main class="page">${r.view!=='genel'||r.id?`<button class="back" data-act="back">← Geri</button>`:''}${demoBar(r)}${eyebrow}${page}</main>
  <footer class="admin-foot"><div class="foot-who"><span>${esc(S.d.me.name)} · ${esc(S.d.roles[S.d.me.role]).toLocaleLowerCase('tr')}</span><span><a href="#/hesap">hesabım</a> · <button data-act="logout">çıkış yap</button></span><button class="ver" data-act="versions">${verLabel()}</button></div><span class="foot-right"><small class="copy">© 2026 Fevzipaşa Tasarım Pazarı. Tüm hakları saklıdır.</small><a class="credit" href="https://thegoatzstudio.com/" target="_blank" rel="noopener">Bu site <b>THE GOATZ STUDIO</b> tarafından yapılmıştır.<img src="https://thegoatzstudio.com/favicon.ico" alt="" onerror="this.remove()"></a></span></footer>`;
  if(focusId==='q'){const q=$('#q');q.focus();q.setSelectionRange(q.value.length,q.value.length);showResults()}
  if(render.last===location.hash)window.scrollTo(0,scrollY);else window.scrollTo(0,0);
  render.last=location.hash;
  syncBulk();
}

// --- Genel bakış ---
pages.genel=()=>{
  const apps=S.d.applications.filter(a=>inScope(a.marketId)),markets=S.d.markets.filter(m=>inScope(m.id));
  const parts=S.d.participants.filter(p=>S.market==='all'||p.markets.includes(S.market));
  const accepted=apps.filter(a=>a.status==='kabul').length,capacity=markets.reduce((s,m)=>s+(m.capacity||0),0);
  const media=S.d.media.filter(m=>inScope(m.marketId));
  const openForms=S.d.forms.filter(f=>f.status==='acik'&&inScope(f.marketId));
  const t=today(),tips=[];
  const fresh=apps.filter(a=>a.status==='yeni').length;
  if(fresh)tips.push([`${fresh} yeni başvuru değerlendirilmeyi bekliyor.`,'#/basvurular?durum=yeni','İncele']);
  if(!S.d.forms.some(f=>inScope(f.marketId)))tips.push(['Bu kapsamda başvuru formu yok. Katılımcı toplamak için bir form oluştur.','#/formlar','Form oluştur','warn']);
  for(const f of S.d.forms.filter(f=>inScope(f.marketId)))if(f.status==='acik'&&f.deadline&&f.deadline<t)tips.push([`“${f.title}” formunun son tarihi geçti ama form hâlâ yayında.`,`#/formlar/${f.id}`,'Formu aç','warn']);
  for(const m of markets){
    const acc=S.d.applications.filter(a=>a.marketId===m.id&&a.status==='kabul').length;
    if(m.capacity&&acc>=m.capacity)tips.push([`${m.name} kapasitesi doldu (${acc}/${m.capacity}).`,`#/pazarlar/${m.id}`,'Pazarı aç','warn']);
    if(m.status==='basvuru'&&!S.d.forms.some(f=>f.marketId===m.id&&f.status==='acik'))tips.push([`${m.name} başvuru döneminde ama yayında bir form yok.`,`#/pazarlar/${m.id}`,'Form ekle','warn']);
  }
  const drafts=S.d.forms.filter(f=>f.status==='taslak'&&inScope(f.marketId));
  if(drafts.length)tips.push([`${drafts.length} form taslakta, yayına alınmayı bekliyor.`,`#/formlar/${drafts[0].id}`,'Düzenle']);
  const claims=S.d.admins.filter(a=>a.claim);
  if(claims.length&&P('users'))tips.unshift([`${claims.length} katılımcı hesabı markasıyla eşleştirilmeyi bekliyor.`,'#/yoneticiler','Eşleştir']);
  const regWait=S.d.workshops.reduce((s,w)=>s+wsPending(w),0);
  if(regWait)tips.unshift([`${regWait} workshop kaydı onay bekliyor.`,'#/workshoplar?durum=yaklasan','Workshoplar']);
  const pendingCh=S.d.participants.filter(p=>p.pending);
  if(pendingCh.length&&P('changeApprove'))tips.unshift([`${pendingCh.length} katılımcı marka bilgilerini değiştirdi, onayını bekliyor.`,`#/katilimcilar/${pendingCh[0].id}`,'İncele']);
  const noLogo=parts.filter(p=>!logoOf(p));
  if(noLogo.length)tips.push([`${noLogo.length} katılımcının logosu yok.`,'#/katilimcilar?eksik=logo','Listele']);
  const noContact=parts.filter(p=>missing(p).length);
  if(noContact.length)tips.push([`${noContact.length} katılımcının e-posta veya telefonu eksik.`,'#/katilimcilar?eksik=iletisim','Listele']);
  const fs=P('ledgerRead')?feeSum(feeRows(S.market)):null,k=P('ledgerRead')?kasa(S.market):null;
  if(fs?.open)tips.push([`${fs.open} katılımcının ödemesi tamamlanmadı, ${money(fs.rest)} bekleniyor.`,'#/kasa?sekme=tahsilat&durum=acik','Tahsilat']);
  if(k?.noInvoice.length)tips.push([`${k.noInvoice.length} giderin faturası bekleniyor.`,'#/kasa?sekme=masraflar&fatura=bekleniyor','Kasaya git','warn']);
  const upcoming=S.d.workshops.filter(w=>inScope(w.marketId)&&w.status==='planlandi'&&w.date>=t).sort((a,b)=>a.date.localeCompare(b.date));
  const cats={};for(const p of parts)cats[p.category||'Belirtilmemiş']=(cats[p.category||'Belirtilmemiş']||0)+1;
  const catMax=Math.max(1,...Object.values(cats));
  const next=S.d.markets.filter(m=>m.endDate>=t||m.startDate>=t).sort((a,b)=>a.startDate.localeCompare(b.startDate))[0];
  const days=next?Math.ceil((new Date(next.startDate+'T00:00')-new Date(t+'T00:00'))/864e5):null;
  const myAct=S.d.activity.filter(a=>a.adminId===S.d.me.id);
  return `<div class="head"><div><h1>Merhaba ${esc(S.d.me.name.split(' ')[0])}.</h1><p>${S.market==='all'?'Tüm pazarların özeti':esc(mk(S.market)?.name)+' özeti'} · ${esc(S.d.roles[S.d.me.role])}</p></div>
  <div class="row">${P('formWrite')?`<button class="btn primary" data-act="form-new" data-v="${S.market==='all'?'':S.market}">+ Yeni başvuru formu</button>`:''}${P('participantWrite')?'<button class="btn" data-act="part-new">+ Katılımcı</button>':''}${P('ledgerWrite')?'<button class="btn" data-act="ledger-new" data-v="gider">+ Masraf</button>':''}</div></div>
  <div class="grid g4"><a class="stat o" href="#/basvurular"><strong>${apps.length}</strong><span>Başvuru · ${fresh} yeni</span></a>
  <div class="stat y"><strong>${accepted}${capacity?`<small>/${capacity}</small>`:''}</strong><span>Kabul edilen${capacity?' / kapasite':''}${capacity?`<div class="bar-meter"><i style="width:${Math.min(100,accepted/capacity*100)}%"></i></div>`:''}</span></div>
  <a class="stat p" href="#/katilimcilar"><strong>${parts.length}</strong><span>Katılımcı · ${media.length} görsel</span></a>
  ${k?`<a class="stat b money" href="#/kasa"><strong>${money(k.cash)}</strong><span>Kasada · ${money(fs.rest)} tahsil edilecek</span></a>`:`<a class="stat b" href="#/workshoplar"><strong>${upcoming.length}</strong><span>Yaklaşan workshop</span></a>`}</div>
  <div class="grid split" style="margin-top:40px">
  <div class="card"><h3>Yapılacaklar <span class="mono muted">AKILLI UYARILAR</span></h3>${tips.length?`<div class="tips">${tips.map(([t,h,b,w])=>`<div class="tip ${w||''}"><span>${esc(t)}</span><a class="btn sm" href="${h}">${b}</a></div>`).join('')}</div>`:'<div class="empty">Her şey yolunda. Bekleyen iş yok.</div>'}</div>
  ${next?`<a class="next" href="#/pazarlar/${next.id}"><span class="mono">SIRADAKİ PAZAR</span><strong>${esc(next.name)}</strong><span>${marketRange(next)} · ${esc(next.hours)}<br>${esc(next.location)}</span><span class="disc">${days>0?days:days===0?'BUGÜN':'ŞİMDİ'}<span>${days>0?'GÜN KALDI':days===0?'PAZAR GÜNÜ':'DEVAM EDİYOR'}</span></span></a>`:'<div class="next"><span class="mono">SIRADAKİ PAZAR</span><strong>Planlanmış pazar yok.</strong></div>'}</div>
  <div class="grid g3" style="margin-top:40px">
  <div class="card"><h3>Son başvurular <a class="btn sm ghost" href="#/basvurular">Tümü →</a></h3><div class="list">${apps.slice(0,6).map(a=>`<a class="item" href="#/basvurular/${a.id}"><span><b>${esc(appName(a))}</b>${a.demo?' <span class="pill">örnek</span>':''}<br><small class="muted">${esc(profile(a).category||'')} · ${ago(a.createdAt)}</small></span>${pill('app',a.status)}</a>`).join('')||'<div class="empty">Henüz başvuru yok.</div>'}</div></div>
  <div class="card cats"><h3>Kategoriler <span class="mono muted">TIKLA, MARKALARI GÖR</span></h3>${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<a class="c" href="#/katilimcilar?kategori=${encodeURIComponent(c)}"><div><span>${esc(c)}</span><b>${n}</b></div><div class="bar-meter"><i style="width:${n/catMax*100}%"></i></div></a>`).join('')||'<div class="empty">Katılımcı yok.</div>'}</div>
  <div class="card"><h3>${isAna()?'Son hareketler':'Senin son işlemlerin'}</h3><ul class="feed">${(isAna()?S.d.activity:myAct).slice(0,8).map(x=>`<li>${esc(x.text)}<br><small class="muted">${ago(x.at)}${x.adminId&&isAna()?' · '+esc(ad(x.adminId)?.name||''):''}</small></li>`).join('')||'<li class="muted">Henüz hareket yok.</li>'}</ul></div></div>
  ${upcoming.length?`<div class="card" style="margin-top:40px"><h3>Yaklaşan workshoplar <a class="btn sm ghost" href="#/workshoplar">Tümü →</a></h3><div class="list">${upcoming.slice(0,4).map(w=>`<a class="item" href="#/workshoplar?ac=${w.id}"><span><b>${esc(w.title)}</b><br><small class="muted">${date(w.date)} ${esc(w.time)} · ${esc(w.organizer||pt(w.participantId)?.brandName||'')}</small></span><span class="pill ${w.paid?'s-acik':''}">${w.paid?money(w.price):'Ücretsiz'}</span></a>`).join('')}</div></div>`:''}
  <div class="card" style="margin-top:40px"><h3>Yayındaki formlar</h3>${openForms.length?openForms.map(f=>`<div class="linkbox" style="margin-bottom:8px"><span style="flex:1">${esc(f.title)} — ${esc(publicLink(f))}</span><button class="btn sm" data-act="copy" data-v="${esc(publicLink(f))}">Kopyala</button></div>`).join(''):'<p class="muted" style="margin:0">Şu an yayında form yok. <a href="#/formlar">Formlar</a> sayfasından bir form oluşturup yayına al.</p>'}</div>`;
};

// --- Pazarlar ---
const marketStats=m=>{const apps=S.d.applications.filter(a=>a.marketId===m.id);return {forms:S.d.forms.filter(f=>f.marketId===m.id),apps,acc:apps.filter(a=>a.status==='kabul').length,parts:S.d.participants.filter(p=>p.markets.includes(m.id)),media:S.d.media.filter(x=>x.marketId===m.id),workshops:S.d.workshops.filter(w=>w.marketId===m.id)}};
pages.pazarlar=r=>{
  if(r.id)return marketPage(r);
  return `<div class="head"><div><h1>Pazarlar</h1><p>Sıra numarasına göre, en yeni üstte. Her pazarın kendi formları, başvuruları, katılımcıları, workshopları ve kasası var.</p></div><div class="row">${ioBar('pazarlar')}${P('marketWrite')?'<button class="btn primary" data-act="market-new">+ Yeni pazar</button>':''}</div></div>
  <div class="grid g3">${S.d.markets.map(m=>{const s=marketStats(m);return `<a class="card" href="#/pazarlar/${m.id}" style="text-decoration:none;display:grid;gap:10px"><div class="row" style="justify-content:space-between"><span class="mono">${m.edition?'SIRA NO '+String(m.edition).padStart(2,'0'):''}</span>${pill('market',m.status)}</div><strong style="font-size:22px;letter-spacing:-.04em;line-height:1.1">${esc(m.name)}</strong><span class="muted">${marketRange(m)}<br>${esc(m.location)}</span>
  <div class="row mono" style="gap:14px"><span>${s.forms.length} FORM</span><span>${s.apps.length} BAŞVURU</span><span>${s.parts.length} KATILIMCI</span><span>${s.workshops.length} WORKSHOP</span></div>${m.capacity?`<div><small class="muted">Kabul ${s.acc}/${m.capacity}</small><div class="bar-meter"><i style="width:${Math.min(100,s.acc/m.capacity*100)}%;background:var(--orange)"></i></div></div>`:''}</a>`}).join('')||'<div class="empty">Henüz pazar yok.</div>'}</div>`;
};
function marketPage(r){
  const m=mk(r.id);if(!m)return '<div class="empty">Pazar bulunamadı.</div>';
  const s=marketStats(m),byStatus=k=>s.apps.filter(a=>a.status===k).length;
  const cats=S.d.mediaCategories.map(c=>[c,s.media.filter(x=>x.category===c).length]).filter(([,n])=>n);
  const k=P('ledgerRead')?kasa(m.id):null,fs=k?feeSum(feeRows(m.id)):null;
  const states={};for(const p of S.d.participants){const st=joinState(p,m);if(st)states[st]=(states[st]||0)+1}
  return `<div class="crumb"><a href="#/pazarlar">PAZARLAR</a> / SIRA NO ${String(m.edition||'').padStart(2,'0')}</div><div class="head"><div><h1>${esc(m.name)}</h1><p>${marketRange(m)} · ${esc(m.hours)} · ${esc(m.location)} ${pill('market',m.status)}${m.fee?` · katılım ücreti ${money(m.fee)}`:''}</p></div>
  <div class="row">${S.market!==m.id?`<button class="btn" data-act="scope" data-v="${m.id}">Paneli bu pazara odakla</button>`:''}${P('marketWrite')&&mine(m)?`<button class="btn" data-act="market-edit" data-v="${m.id}">Düzenle</button><button class="btn danger" data-act="market-del" data-v="${m.id}">Sil</button>`:''}</div></div>
  <div class="grid g4"><a class="stat o" href="#/basvurular?pazar=${m.id}"><strong>${s.apps.length}</strong><span>Başvuru · ${byStatus('yeni')} yeni · ${byStatus('inceleniyor')} inceleniyor</span></a><div class="stat y"><strong>${s.acc}${m.capacity?`<small>/${m.capacity}</small>`:''}</strong><span>Kabul / kapasite</span></div><a class="stat p" href="#/katilimcilar?pazar=${m.id}"><strong>${s.parts.length}</strong><span>Katılımcı · ${states.yeni||0} ilk kez · ${states.katilmadi||0} gelmedi</span></a>${k?`<a class="stat b money" href="#/kasa?pazar=${m.id}"><strong>${money(k.cash)}</strong><span>Bu pazarın kasası · ${money(fs.rest)} tahsil edilecek</span></a>`:`<a class="stat b" href="#/workshoplar?pazar=${m.id}"><strong>${s.workshops.length}</strong><span>Workshop</span></a>`}</div>
  <div class="grid g2" style="margin-top:40px">
  <div class="card"><h3>Başvuru formları ${P('formWrite')?`<span class="row"><button class="btn sm" data-act="form-copy-into" data-v="${m.id}">Önceki formu kopyala</button><button class="btn sm primary" data-act="form-new" data-v="${m.id}">+ Form</button></span>`:''}</h3>
  <div class="list">${s.forms.map(f=>`<a class="item" href="#/formlar/${f.id}"><span><b>${esc(f.title)}</b><br><small class="muted">${S.d.applications.filter(a=>a.formId===f.id).length} başvuru · son tarih ${date(f.deadline)}</small></span>${pill('form',f.status)}</a>`).join('')||'<div class="empty">Bu pazar için form yok.</div>'}</div></div>
  <div class="card"><h3>Katılım <a class="btn sm ghost" href="#/katilimcilar?pazar=${m.id}">Katılımcılar →</a></h3><div class="list">${Object.entries(L.join).map(([k2,t])=>`<a class="item" href="#/katilimcilar?pazar=${m.id}&katilim=${k2}"><span>${t}</span><b>${states[k2]||0}</b></a>`).join('')}</div></div>
  <div class="card"><h3>Son başvurular <a class="btn sm ghost" href="#/basvurular?pazar=${m.id}">Tümü →</a></h3><div class="list">${s.apps.slice(0,6).map(a=>`<a class="item" href="#/basvurular/${a.id}"><span><b>${esc(appName(a))}</b><br><small class="muted">${ago(a.createdAt)}</small></span>${pill('app',a.status)}</a>`).join('')||'<div class="empty">Başvuru yok.</div>'}</div></div>
  <div class="card"><h3>Workshoplar <a class="btn sm ghost" href="#/workshoplar?pazar=${m.id}">Tümü →</a></h3><div class="list">${s.workshops.slice(0,6).map(w=>`<a class="item" href="#/workshoplar?ac=${w.id}"><span><b>${esc(w.title)}</b><br><small class="muted">${date(w.date)} ${esc(w.time)}</small></span>${pill('workshop',w.status)}</a>`).join('')||'<div class="empty">Workshop yok.</div>'}</div></div>
  <div class="card"><h3>Görsel klasörü <a class="btn sm ghost" href="#/gorseller?m=${m.id}">Klasörü aç →</a></h3><div class="list">${cats.map(([c,n])=>`<a class="item" href="#/gorseller?m=${m.id}&c=${encodeURIComponent(c)}"><span>📁 ${esc(c)}</span><b>${n}</b></a>`).join('')||'<div class="empty">Bu pazarın klasörü boş.</div>'}</div></div>
  ${k?`<div class="card"><h3>Kasa <a class="btn sm ghost" href="#/kasa?pazar=${m.id}">Kasaya git →</a></h3><div class="list"><div class="item"><span>Tahsil edilen ücretler</span><b>${money(k.fees)}</b></div><div class="item"><span>Diğer gelirler</span><b>${money(k.inc)}</b></div><div class="item"><span>Giderler</span><b>− ${money(k.exp)}</b></div><div class="item"><span><b>Kasada</b></span><b>${money(k.cash)}</b></div></div></div>`:''}</div>
  ${m.notes?`<div class="card" style="margin-top:40px"><h3>Notlar</h3><p style="white-space:pre-wrap;margin:0">${esc(m.notes)}</p></div>`:''}`;
}
function marketModal(m){
  const isNew=!m;m=m||{status:'planlama',edition:S.d.nextEdition,hours:'11.00–21.00',location:'Fevzipaşa / Çanakkale'};
  modal(`<span class="mono">${isNew?'YENİ PAZAR':'PAZARI DÜZENLE'} · SIRA NO ${String(m.edition||'').padStart(2,'0')}</span><h2>${isNew?'Yeni pazar':esc(m.name)}</h2>
  ${section('Kimlik',`<div class="grid g3">${field('Sıra no',`<input name="edition" type="number" min="1" step="1" value="${esc(m.edition||'')}" required>`,'tekrar kullanılamaz')}<div style="grid-column:span 2">${field('Pazar adı',`<input name="name" required value="${esc(m.name||(m.edition?m.edition+'. Fevzipaşa Tasarım Pazarı':''))}">`)}</div></div>${field('Durum',`<div class="seg">${Object.entries(L.market).map(([k,t])=>`<label><input type="radio" name="status" value="${k}" ${m.status===k?'checked':''}><span>${t}</span></label>`).join('')}</div>`)}`)}
  ${section('Tarih ve yer',`<div class="grid g2">${field('Başlangıç',`<input name="startDate" type="date" value="${esc(m.startDate||'')}">`)}${field('Bitiş',`<input name="endDate" type="date" value="${esc(m.endDate||'')}">`)}${field('Saatler',`<input name="hours" value="${esc(m.hours||'')}">`)}${field('Konum',`<input name="location" value="${esc(m.location||'')}">`)}</div>`)}
  ${section('Kapasite ve ücret',`<div class="grid g2">${field('Kapasite',`<input name="capacity" type="number" min="0" value="${esc(m.capacity||'')}">`,'stant sayısı')}${field('Katılım ücreti (₺)',`<input name="fee" type="number" min="0" step="any" value="${esc(m.fee||'')}">`,'kabul edilene otomatik atanır')}</div>`)}
  ${section('Notlar',field('Ekip notu',`<textarea name="notes">${esc(m.notes||'')}</textarea>`))}
  ${actions2(isNew?'Pazarı oluştur':'Kaydet')}`,
  async d=>{const r=await call(m.id?'PUT':'POST',m.id?`/api/markets/${m.id}`:'/api/markets',d);await refresh();closeModal();toast('Pazar kaydedildi');location.hash=`#/pazarlar/${r.id}`;render()},'wide');
}

// --- Formlar ---
const howForms=`<ol class="how"><li><b>Formu oluştur</b><span>“+ Yeni başvuru formu” ile hazır şablondan başla, soruları düzenle.</span></li><li><b>Yayınla, bağlantıyı paylaş</b><span>Durumu “Yayında” yap; bağlantıyı Instagram’da, WhatsApp’ta paylaş.</span></li><li><b>Başvurular gelir</b><span>Her gönderim Başvurular’a düşer. Puanla, not al, kabul et.</span></li><li><b>Kabul et, kart oluşsun</b><span>Kabul edilen başvuru katılımcı kartına dönüşür; görseller klasörüne taşınır.</span></li></ol>`;
pages.formlar=r=>{
  if(r.id)return formBuilder(r.id);
  const forms=S.d.forms.filter(f=>inScope(f.marketId));
  return `<div class="head"><div><h1>Başvuru formları</h1><p>Her pazar için katılımcı başvuru formu. Form oluştur, yayınla, bağlantıyı paylaş; gelen başvurular “Başvurular”a düşer.</p></div>${P('formWrite')?`<div class="row">${ioBar('formlar','',true).replace(/<span class="mono">DIŞA AKTAR<\/span><a[^>]*>Excel ↓<\/a><a[^>]*>CSV ↓<\/a>/,'')}<button class="btn" data-act="form-copy-into" data-v="${S.market==='all'?'':S.market}">Önceki formdan kopyala</button><button class="btn primary big" data-act="form-new" data-v="${S.market==='all'?'':S.market}">+ Yeni başvuru formu</button></div>`:''}</div>
  ${howForms}
  ${forms.length?`<div class="table-wrap"><table><thead><tr><th>FORM</th><th class="hide-sm">PAZAR</th><th>DURUM</th><th class="hide-sm">SON TARİH</th><th>BAŞVURU</th><th></th></tr></thead><tbody>${forms.map(f=>{const n=S.d.applications.filter(a=>a.formId===f.id);return `<tr class="click" data-href="#/formlar/${f.id}"><td><b>${esc(f.title)}</b><br><small class="muted">${f.fields.length} soru</small></td><td class="hide-sm">${esc(mk(f.marketId)?.name)}</td><td>${pill('form',f.status)}</td><td class="hide-sm">${date(f.deadline)}</td><td><a href="#/basvurular?form=${f.id}">${n.length}</a>${n.filter(a=>a.status==='yeni').length?` <span class="pill s-yeni">${n.filter(a=>a.status==='yeni').length} yeni</span>`:''}</td><td style="text-align:right">${f.status==='acik'?`<button class="btn sm" data-act="copy" data-v="${esc(publicLink(f))}">Bağlantı</button>`:`<a class="btn sm ghost" href="${esc(publicLink(f))}" target="_blank">Önizle</a> ${P('formWrite')&&mine(f)?`<button class="btn sm primary" data-act="form-publish" data-v="${f.id}">Yayınla</button>`:''}`}</td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty big">Bu kapsamda form yok.${P('formWrite')?` <button class="btn primary" data-act="form-new" data-v="${S.market==='all'?'':S.market}">+ İlk formu oluştur</button>`:''}</div>`}`;
};
function newFormModal(marketId){
  if(!S.d.markets.length)return toast('Önce bir pazar oluştur',true);
  modal(`<span class="mono">YENİ BAŞVURU FORMU</span><h2>Hangi pazar için?</h2>${field('Pazar',`<select name="marketId" required>${marketOpts(marketId||S.d.markets[0]?.id)}</select>`)}
  ${field('Form başlığı',`<input name="title" required placeholder="Örn. ${S.d.nextEdition}. Pazar Katılımcı Başvurusu">`)}
  ${field('Nasıl başlayalım?',`<div class="seg col"><label><input type="radio" name="start" value="hazir" checked><span><b>Hazır şablon</b> marka, iletişim, Instagram, kategori, görseller, günler, onay</span></label><label><input type="radio" name="start" value="bos"><span><b>Boş form</b> soruları kendin ekle</span></label></div>`)}
  ${actions2('Oluştur ve düzenle')}`,
  async d=>{if(!d.title)throw new Error('Form başlığı yaz');const body={marketId:d.marketId,title:d.title};if(d.start==='bos')body.fields=[];const f=await call('POST','/api/forms',body);await refresh();closeModal();location.hash=`#/formlar/${f.id}`});
}
function copyFormModal(marketId,formId){
  if(!S.d.forms.length)return toast('Kopyalanacak form yok',true);
  modal(`<span class="mono">FORM KOPYALA</span><h2>Önceki formu kullan</h2><p class="muted" style="margin:0">Önceki bir pazarın formunu tüm sorularıyla yeni pazara kopyala. Kopya taslak olarak açılır.</p>
  ${field('Kopyalanacak form',`<select name="formId">${opts(S.d.forms.map(f=>[f.id,`${f.title} — ${mk(f.marketId)?.name||''}`]),formId)}</select>`)}
  ${field('Hangi pazar için?',`<select name="marketId">${marketOpts(marketId||S.d.markets[0]?.id)}</select>`)}
  ${actions2('Kopyala')}`,
  async d=>{const f=await call('POST',`/api/forms/${d.formId}/duplicate`,{marketId:d.marketId});await refresh();closeModal();toast('Form kopyalandı');location.hash=`#/formlar/${f.id}`});
}
function formBuilder(id){
  const form=fm(id);if(!form)return '<div class="empty">Form bulunamadı.</div>';
  if(S.draft?.id!==id){S.draft=structuredClone(form);S.openField=null}
  const d=S.draft,ro=!P('formWrite')||!mine(form),apps=S.d.applications.filter(a=>a.formId===id);
  const dirty=JSON.stringify(d)!==JSON.stringify(form);
  return `<div class="crumb"><a href="#/formlar">FORMLAR</a> / <a href="#/pazarlar/${form.marketId}">${esc(mk(form.marketId)?.name)}</a></div>
  <div class="head"><div><h1>${esc(d.title)}</h1><p>${pill('form',form.status)} · ${apps.length} başvuru · <a href="#/basvurular?form=${id}">başvuruları gör</a>${ro&&P('formWrite')?` · bu formu ${esc(ownerName(form))} oluşturdu, yalnızca o ya da ana yönetici değiştirebilir`:''}</p></div>
  <div class="row">${ioBar('formlar','form='+id,false)}${P('formWrite')?`<button class="btn" data-act="form-copy-into" data-v="" data-form="${id}">Başka pazara kopyala</button>`:''}${ro?'':`${!apps.filter(a=>!a.demo).length?`<button class="btn danger" data-act="form-del" data-v="${id}">Sil</button>`:''}<button class="btn ${dirty?'dark':''}" data-act="form-save" ${dirty?'':'disabled'}>${dirty?'Değişiklikleri kaydet':'Kaydedildi'}</button>`}<a class="btn" href="/basvuru/${id}" target="_blank" rel="noopener">${form.status==='acik'?'Formu aç ↗':'Önizle ↗'}</a>${ro?'':form.status==='acik'?`<button class="btn" data-act="form-pub" data-v="kapali">Yayından kaldır</button>`:`<button class="btn primary" data-act="form-pub" data-v="acik">Yayınla</button>`}</div></div>
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
  ${['select','checkboxes'].includes(f.type)?`<div class="chips" style="margin-top:6px">${f.options.map(o=>`<span class="chip">${esc(o)}</span>`).join('')}</div>`:f.type==='file'?'<div class="fake" style="height:70px;display:grid;place-items:center;border-style:dashed"><small>Görselleri sürükle ya da seç</small></div>':f.mapTo==='instagram'?'<div class="fake ig">@</div>':`<div class="fake" ${f.type==='textarea'?'style="height:80px"':''}></div>`}</div>`).join('')}
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
  const demo=S.d.applications.some(a=>a.demo);
  return `<div class="head"><div><h1>Başvurular</h1><p>${form?esc(fm(form)?.title):'Tüm formlar'} · ${list.length} başvuru</p></div><div class="row">${form?ioBar('basvurular','form='+form,false):''}${P('demo')?(demo?'<button class="btn" data-act="demo-del">Örnek başvuruları sil</button>':'<button class="btn" data-act="demo-add">Örnek başvurular ekle</button>'):''}</div></div>
  <details class="explain" ${S.d.applications.length?'':'open'}><summary>Başvurular nereden geliyor, ne içeriyor?</summary><div>
  <p><b>Nereden:</b> Formlar sayfasında oluşturup “Yayında” yaptığın formun bağlantısından (ör. <code>${esc(location.origin)}/basvuru/…</code>). Marka bu bağlantıyı açar, soruları doldurur, ürün görsellerini yükler ve gönderir. Gönderim anında burada “Yeni” olarak görünür.</p>
  <p><b>Ne içerir:</b> Formda hangi soruları sorduysan onların yanıtları: marka adı, ad soyad, e-posta, telefon, Instagram, kategori, açıklama, katılacağı günler, görseller. Görseller pazarın görsel klasörüne “Başvuru görselleri” olarak kaydedilir.</p>
  <p><b>Neye göre eşleşir:</b> E-posta, Instagram ya da marka adı daha önce kayıtlı bir katılımcıyla aynıysa “Tanıdık” etiketi çıkar; kabul edersen bilgiler o karta işlenir, bu pazar katılım geçmişine eklenir. Yeni markaysa yeni kart açılır.</p>
  <p><b>Sen ne yaparsın:</b> İncele → puan ver → not yaz → Kabul / Yedek / Red. Kabulde ücret varsayılanı ve görseller otomatik bağlanır.</p>
  ${P('demo')&&!demo?'<p>Nasıl göründüğünü görmek için yukarıdan <b>“Örnek başvurular ekle”</b>ye bas; 4 örnek başvuru eklenir, sonra tek tıkla silebilirsin.</p>':''}</div></details>
  <div class="filters"><select data-nav="form">${opts(S.d.forms.filter(f=>inScope(f.marketId)).map(f=>[f.id,f.title]),form,'Tüm formlar')}</select>
  <input data-nav="ara" placeholder="Başvurularda ara" value="${esc(q.get('ara')||'')}"><select data-nav="sira">${opts([['','En yeni'],['puan','En yüksek puan']],q.get('sira')||'')}</select></div>
  <div class="chips" style="margin-bottom:16px"><a class="chip ${!q.get('durum')?'on':''}" href="${withQ(q,'durum','')}">Tümü ${base.length}</a>${Object.entries(L.app).map(([k,t])=>`<a class="chip ${q.get('durum')===k?'on':''}" href="${withQ(q,'durum',k)}">${t} ${base.filter(a=>a.status===k).length}</a>`).join('')}</div>
  ${list.length?`<div class="table-wrap"><table><thead><tr><th>MARKA</th><th>DAHA ÖNCE KATILDIĞI PAZARLAR</th><th class="hide-sm">KATEGORİ</th><th class="hide-sm">INSTAGRAM</th><th>TARİH</th><th class="hide-sm">PUAN</th><th>DURUM</th></tr></thead><tbody>${list.map(a=>{const p=profile(a);return `<tr class="click" data-href="#/basvurular/${a.id}"><td><b>${esc(appName(a))}</b>${a.demo?' <span class="pill">örnek</span>':''}${a.matchedParticipantId&&!a.participantId?' <span class="pill s-yeni">Tanıdık</span>':''}<br><small class="muted">${esc(p.contactName||'')}</small></td><td>${pastMarkets(a)}</td><td class="hide-sm">${esc(p.category||'')}</td><td class="hide-sm"><small>${esc(p.instagram||'')}</small></td><td><small>${ago(a.createdAt)}</small></td><td class="hide-sm">${stars(a.rating||0)}</td><td>${pill('app',a.status)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Bu filtreye uyan başvuru yok.</div>'}`;
};
function pastMarkets(a){
  const k=pt(a.participantId||a.matchedParticipantId),ms=k?k.markets.filter(x=>x!==a.marketId).map(mk).filter(Boolean).sort((x,y)=>(x.startDate||'').localeCompare(y.startDate||'')):[];
  return ms.length?`<span class="past">${ms.map(m=>`<span class="pill">${esc(mShort(m))}</span>`).join('')}</span>`:'<small class="muted">İlk kez başvuruyor</small>';
}
function appPage(id){
  const a=S.d.applications.find(x=>x.id===id);if(!a)return '<div class="empty">Başvuru bulunamadı.</div>';
  const form=fm(a.formId),p=profile(a),known=pt(a.participantId||a.matchedParticipantId),review=P('appReview'),note=P('appNote');
  const queue=S.d.applications.filter(x=>x.status==='yeni'&&x.id!==id&&inScope(x.marketId));
  const knownMarkets=known?known.markets.map(mk).filter(Boolean):[];
  return `<div class="crumb"><a href="#/basvurular">BAŞVURULAR</a> / <a href="#/basvurular?form=${a.formId}">${esc(form?.title||'')}</a></div>
  <div class="head"><div><h1>${esc(appName(a))}</h1><p>${pill('app',a.status)}${a.demo?' <span class="pill">örnek başvuru</span>':''} · ${date(a.createdAt)} · ${esc(mk(a.marketId)?.name||'')}${a.reviewedBy?` · son işlem: ${esc(ad(a.reviewedBy)?.name||'')}`:''}</p></div>${queue.length?`<a class="btn" href="#/basvurular/${queue[0].id}">Sıradaki yeni başvuru →</a>`:''}</div>
  <div class="drawer-grid"><div class="card"><h3>Yanıtlar</h3><dl class="answers">${(form?.fields||[]).filter(f=>f.type!=='heading').map(f=>{const v=a.answers[f.id];return `<dt>${esc(f.label).toLocaleUpperCase('tr')}</dt><dd>${f.type==='file'?`<div class="thumbs" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">${(v||[]).map(md).filter(Boolean).map(m=>`<button class="thumb" data-act="media-open" data-v="${m.id}"><span class="img">${thumb(m)}</span></button>`).join('')||'—'}</div>`:f.type==='consent'?(v?'✓ Onaylandı':'—'):Array.isArray(v)?esc(v.join(', '))||'—':f.type==='email'&&v?`<a href="mailto:${esc(v)}">${esc(v)}</a>`:f.mapTo==='instagram'&&v?igLink(v):f.type==='url'&&v?`<a href="${esc(/^https?:/.test(v)?v:'https://'+v)}" target="_blank" rel="noopener">${esc(v)}</a>`:esc(v)||'—'}</dd>`}).join('')}</dl></div>
  <div style="display:grid;gap:16px">
  ${known?`<a class="badge" href="#/katilimcilar/${known.id}">${avatar(known)}<span>${a.participantId?'Katılımcı kartı':'Tanıdık marka: daha önce kayıtlı'}<br><small>${esc(known.brandName)} · ${knownMarkets.length} pazar${knownMarkets.length?': '+knownMarkets.map(mShort).join(', '):''}</small></span></a>`:''}
  <div class="card"><h3>Değerlendirme</h3><div style="display:grid;gap:12px">${review?`<div class="chips">${Object.entries(L.app).filter(([k])=>k!=='kabul').map(([k,t])=>`<button class="chip ${a.status===k?'on':''}" data-act="app-status" data-v="${k}">${t}</button>`).join('')}</div>`:pill('app',a.status)}
  <div class="row"><span class="muted">Puan</span>${review?stars(a.rating||0,'app-rate'):stars(a.rating||0)}</div>
  ${field('Ekip notu',`<textarea id="app-notes" ${note?'':'disabled'} placeholder="Sadece ekip görür">${esc(a.notes)}</textarea>`)}
  ${a.status==='kabul'&&a.participantId?`<a class="btn" href="#/katilimcilar/${a.participantId}">Katılımcı kartını aç →</a>`:P('appAccept')?`<button class="btn primary" data-act="app-accept">✓ Kabul et ve katılımcılara ekle</button><small class="muted">${known?`Bilgiler mevcut “${esc(known.brandName)}” kartına işlenir, bu pazar eklenir.`:'Yeni bir katılımcı kartı oluşturulur.'} Başvuru görselleri katılımcının klasörüne taşınır.</small>`:''}
  ${P('appDelete')?'<button class="btn sm danger" data-act="app-del" style="justify-self:start">Başvuruyu sil</button>':''}</div></div>
  ${p.email||p.phone||p.instagram?`<div class="card"><h3>Hızlı iletişim</h3><div class="row">${p.email?`<a class="btn sm" href="mailto:${esc(p.email)}">E-posta</a>`:''}${p.phone?`<a class="btn sm" href="tel:${esc(p.phone.replace(/\s/g,''))}">Ara</a><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${esc(p.phone.replace(/\D/g,'').replace(/^0/,'90'))}">WhatsApp</a>`:''}${p.instagram?`<a class="btn sm" target="_blank" rel="noopener" href="https://instagram.com/${esc(p.instagram.replace(/^@/,''))}">Instagram</a>`:''}</div></div>`:''}</div></div>`;
}

// --- Katılımcılar ---
function partList(q){
  const market=q.get('pazar')||S.market,m=mk(market),cat=q.get('kategori'),gap=q.get('eksik'),join=q.get('katilim'),freq=q.get('siklik'),s=(q.get('ara')||'').toLocaleLowerCase('tr');
  let list=join&&m?S.d.participants.filter(p=>joinState(p,m)===join):S.d.participants.filter(p=>market==='all'||p.markets.includes(market));
  const base=list;
  if(cat)list=list.filter(p=>p.category===cat);
  if(gap==='gorsel')list=list.filter(p=>!pMedia(p).length);
  if(gap==='logo')list=list.filter(p=>!logoOf(p));
  if(gap==='iletisim')list=list.filter(p=>missing(p).length);
  if(freq==='1')list=list.filter(p=>p.markets.length===1);
  if(freq==='2')list=list.filter(p=>p.markets.length>=2&&p.markets.length<=3);
  if(freq==='4')list=list.filter(p=>p.markets.length>=4);
  if(s)list=list.filter(p=>[p.brandName,p.contactName,p.email,p.instagram,p.category,...p.tags].join(' ').toLocaleLowerCase('tr').includes(s));
  return {list:list.sort((a,b)=>a.brandName.localeCompare(b.brandName,'tr')),base,market,m};
}
pages.katilimcilar=r=>{
  if(r.id)return participantPage(r.id);
  const q=r.q,{list,base,market,m}=partList(q),cat=q.get('kategori'),gap=q.get('eksik'),join=q.get('katilim'),freq=q.get('siklik');
  const link=(k,v)=>{const n=new URLSearchParams(q);v?n.set(k,v):n.delete(k);return '#/katilimcilar?'+n};
  const allIn=S.d.participants.filter(p=>market==='all'||p.markets.includes(market));
  const catCount=c=>allIn.filter(p=>p.category===c).length;
  const joinCount=k=>m?S.d.participants.filter(p=>joinState(p,m)===k).length:0;
  const bulk=P('bulk');
  S.listIds=list.map(p=>p.id);
  return `<div class="head"><div><h1>Katılımcılar</h1><p>${list.length} marka${m?` · ${esc(m.name)}`:' · tüm pazarlar'} · katılım geçmişiyle</p></div><div class="row">${ioBar('katilimcilar','pazar='+encodeURIComponent(market))}${P('participantWrite')?'<button class="btn primary" data-act="part-new">+ Katılımcı ekle</button>':''}</div></div>
  <div class="filters"><input data-nav-p="ara" placeholder="Marka, kişi, @instagram, etiket ara" value="${esc(q.get('ara')||'')}"><select data-nav-p="eksik">${opts([['','Tüm kayıtlar'],['logo','Logosu olmayanlar'],['gorsel','Görseli olmayanlar'],['iletisim','İletişimi eksik olanlar']],gap||'')}</select>
  <select data-nav-p="pazar">${opts([['all','Tüm pazarlar'],...S.d.markets.map(x=>[x.id,x.name])],market)}</select>
  <span class="viewsw"><button class="${S.view==='grid'?'on':''}" data-act="view" data-v="grid">Kartlar</button><button class="${S.view==='table'?'on':''}" data-act="view" data-v="table">Tablo${bulk?' · toplu işlem':''}</button></span></div>
  <div class="filters f2">${m?`<select data-nav-p="katilim" aria-label="Katılım">${opts([['',`Bu pazardakiler (${allIn.length})`],...Object.entries(L.join).map(([k,t])=>[k,`${t} (${joinCount(k)})`])],join||'')}</select>`
  :`<select data-nav-p="siklik" aria-label="Kaç pazar">${opts([['','Kaç pazar: tümü'],['1',`Tek pazar (${allIn.filter(p=>p.markets.length===1).length})`],['2',`2–3 pazar (${allIn.filter(p=>p.markets.length>=2&&p.markets.length<=3).length})`],['4',`Sadık · 4+ pazar (${allIn.filter(p=>p.markets.length>=4).length})`]],freq||'')}</select>`}
  <select data-nav-p="kategori" aria-label="Kategori">${opts([['','Tüm kategoriler'],...S.d.categories.filter(c=>catCount(c)||cat===c).map(c=>[c,`${c} (${catCount(c)})`])],cat||'')}</select></div>
  ${!list.length?'<div class="empty">Kayıt yok.</div>':S.view==='table'?partTable(list,m,bulk):`<div class="grid g4">${list.map(p=>partTile(p,m)).join('')}</div>`}
  ${bulk?`<div class="bulkbar" id="bulkbar" hidden><b id="bulk-n">0 seçili</b><select id="bulk-market">${marketOpts(m?.id||S.d.markets[0]?.id)}</select><button class="btn sm" data-act="bulk" data-v="addMarket">Pazara ekle</button><button class="btn sm" data-act="bulk" data-v="removeMarket">Pazardan çıkar</button><select id="bulk-cat">${opts(S.d.categories.map(c=>[c,c]),'','Kategori seç')}</select><button class="btn sm" data-act="bulk" data-v="category">Kategori ata</button><button class="btn sm" data-act="bulk" data-v="tag">Etiket ekle</button>${P('participantDelete')?'<button class="btn sm danger" data-act="bulk" data-v="delete">Sil</button>':''}<button class="btn sm ghost" data-act="bulk-clear">Seçimi kaldır</button></div>`:''}`;
};
function partTile(p,m){
  const l=logoOf(p),c=l||cover(p),st=m&&joinState(p,m);
  return `<a class="pcard-tile" href="#/katilimcilar/${p.id}"><span class="img ${l?'logo':''}">${c?`<img src="/media/${c.id}" alt="" loading="lazy">`:`<span>${esc((p.brandName||'?')[0])}</span>`}</span><span class="row" style="justify-content:space-between"><span class="mono">${esc((p.category||'Kategori yok').toLocaleUpperCase('tr'))}</span>${st?pill('join',st):''}</span><strong>${esc(p.brandName)}</strong>
  <span class="row mono" style="gap:12px"><span>${p.markets.length} PAZAR · ${loyalty(p.markets.length).toLocaleUpperCase('tr')}</span>${p.instagram?`<span>${esc(p.instagram)}</span>`:''}</span>${[...missing(p),...(l?[]:['Logo'])].length?`<small style="color:var(--red)">Eksik: ${[...missing(p),...(l?[]:['Logo'])].join(', ')}</small>`:''}</a>`;
}
function partTable(list,m,bulk){
  const ms=marketsAsc().slice(-6);
  return `<div class="table-wrap"><table class="ptable"><thead><tr>${bulk?`<th><input type="checkbox" data-act="sel-all" ${list.every(p=>S.sel.has(p.id))?'checked':''} aria-label="Tümünü seç"></th>`:''}<th>MARKA</th><th class="hide-sm">KATEGORİ</th><th class="hide-sm">INSTAGRAM</th>${ms.map(x=>`<th class="hide-sm c" title="${esc(x.name)}">${x.edition||''}</th>`).join('')}<th>TOPLAM</th>${m?'<th>DURUM</th>':''}</tr></thead>
  <tbody>${list.map(p=>`<tr class="click" data-href="#/katilimcilar/${p.id}">${bulk?`<td><input type="checkbox" data-sel="${p.id}" ${S.sel.has(p.id)?'checked':''} aria-label="Seç"></td>`:''}<td><span class="pcard">${avatar(p)}<b>${esc(p.brandName)}</b></span></td><td class="hide-sm"><small>${esc(p.category)}</small></td><td class="hide-sm"><small>${esc(p.instagram)}</small></td>${ms.map(x=>`<td class="hide-sm c">${p.markets.includes(x.id)?'<span class="dot on">✓</span>':'<span class="dot">–</span>'}</td>`).join('')}<td><b>${p.markets.length}</b></td>${m?`<td>${joinState(p,m)?pill('join',joinState(p,m)):''}</td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
function syncBulk(){
  const bar=$('#bulkbar');if(!bar)return;
  const ids=new Set(S.listIds||[]);for(const id of [...S.sel])if(!ids.has(id))S.sel.delete(id);
  bar.hidden=!S.sel.size;$('#bulk-n').textContent=`${S.sel.size} seçili`;
}
function participantForm(p,ro){
  const dis=ro?'disabled':'';
  const cats=[...S.d.categories];if(p.category&&!cats.includes(p.category))cats.push(p.category);
  return `<div class="grid g2">${['brandName','contactName','email','phone'].map(k=>field(L.pf[k],`<input name="${k}" value="${esc(p[k]||'')}" ${k==='brandName'?'required':''} ${dis}>`)).join('')}
  ${field('Instagram',`<span class="ig-in"><span>@</span><input name="instagram" value="${esc((p.instagram||'').replace(/^@/,''))}" placeholder="kullaniciadi" ${dis}></span>`,'@ otomatik eklenir')}${field('Web sitesi',`<input name="website" value="${esc(p.website||'')}" ${dis}>`)}
  ${field('Kategori',`<select name="category" ${dis}>${opts(cats.map(c=>[c,c]),p.category||'','— seç —')}</select>`)}${field('Etiketler',`<input name="tags" value="${esc((p.tags||[]).join(', '))}" ${dis}>`,'virgülle ayır')}</div>
  ${field('Açıklama',`<textarea name="description" ${dis}>${esc(p.description||'')}</textarea>`)}
  <div><b class="mono" style="font-size:10px">KATILDIĞI PAZARLAR</b><div class="chips" style="margin-top:8px">${S.d.markets.map(m=>`<label class="chip"><input type="checkbox" name="markets" data-multi value="${m.id}" ${(p.markets||[]).includes(m.id)?'checked':''} ${dis}> ${esc(mShort(m))}</label>`).join('')}</div></div>
  ${field('Ekip notu',`<textarea name="notes" ${dis}>${esc(p.notes||'')}</textarea>`)}`;
}
function participantPage(id){
  const p=pt(id);if(!p)return '<div class="empty">Katılımcı bulunamadı.</div>';
  const apps=S.d.applications.filter(a=>a.participantId===id||a.matchedParticipantId===id),media=pMedia(p).filter(m=>m.category!=='Logo'),logo=logoOf(p);
  const ro=!P('participantWrite')||!mine(p);
  const ms=marketsAsc(),joined=ms.filter(m=>p.markets.includes(m.id));
  let streak=0;for(const m of [...ms].reverse()){if(p.markets.includes(m.id))streak++;else if(streak)break}
  const similar=S.d.participants.filter(x=>x.id!==id&&p.category&&x.category===p.category).map(x=>({x,shared:x.markets.filter(mm=>p.markets.includes(mm)).length})).sort((a,b)=>b.shared-a.shared||a.x.brandName.localeCompare(b.x.brandName,'tr')).slice(0,8);
  const ws=S.d.workshops.filter(w=>w.participantId===id);
  return `<div class="crumb"><a href="#/katilimcilar">KATILIMCILAR</a> / ${esc((p.category||'').toLocaleUpperCase('tr'))}</div><div class="head"><div class="pcard">${avatar(p)}<div><h1>${esc(p.brandName)}</h1><p>${esc(p.category)}${p.instagram?' · '+igLink(p.instagram):''} · ${joined.length} pazar · ${loyalty(joined.length)}${ownerName(p)?` · kaydı giren: ${esc(ownerName(p))}`:''}</p></div></div>${P('participantDelete')&&mine(p)?`<button class="btn danger" data-act="part-del" data-v="${id}">Sil</button>`:''}</div>
  ${ro&&P('participantWrite')?`<p class="note">Bu kartı ${esc(ownerName(p)||'başka bir yönetici')} girdi. Yalnızca o ya da ana yönetici değiştirebilir.</p>`:''}
  ${p.pending?`<div class="warnbox"><b>${esc(ad(p.pending.by)?.name||'Katılımcı')} marka bilgilerini değiştirdi, onay bekliyor.</b><table class="diff"><thead><tr><th>ALAN</th><th>ŞU AN</th><th>YENİ</th></tr></thead><tbody>${Object.entries(p.pending.changes).map(([k,v])=>`<tr><td>${esc(L.pf?.[k]||k)}</td><td>${esc(p[k]||'—')}</td><td><b>${esc(v||'—')}</b></td></tr>`).join('')}</tbody></table>${P('changeApprove')?`<div class="row"><button class="btn sm dark" data-act="change-ok" data-v="${id}">Onayla ve yayımla</button><button class="btn sm" data-act="change-no" data-v="${id}">Reddet</button></div>`:'<small>Organizatör ya da yönetici onaylayacak.</small>'}</div>`:''}
  <div class="drawer-grid"><form class="card" id="part-form" style="display:grid;gap:14px"><h3 style="margin:0">Bilgiler</h3>${participantForm(p,ro)}${ro?'':'<div class="row"><button class="btn primary">Kaydet ve listeye dön</button><button type="button" class="btn ghost" data-act="part-save-stay">Kaydet, burada kal</button></div>'}</form>
  <div style="display:grid;gap:28px">
  <div class="card"><h3>Logo ${P('mediaWrite')?`<button class="btn sm" data-act="upload" data-participant="${id}" data-market="" data-cat="Logo">${logo?'Değiştir':'+ Logo yükle'}</button>`:''}</h3><div class="logo-box">${logo?`<button data-act="media-open" data-v="${logo.id}"><img src="/media/${logo.id}" alt="${esc(p.brandName)} logosu"></button>`:'<span>Logo yok</span>'}</div><small class="muted">Logo kare alana sığdırılır, kesilmez. PNG ya da SVG önerilir.</small></div>
  <div class="card"><h3>Katılım geçmişi <span class="mono muted">${joined.length}/${ms.length} PAZAR</span></h3>
  <div class="timeline">${ms.map(m=>`<a href="#/pazarlar/${m.id}" class="${p.markets.includes(m.id)?'on':''}" title="${esc(m.name)}"><b>${m.edition||'?'}</b><span>${p.markets.includes(m.id)?'✓':'–'}</span></a>`).join('')}</div>
  <div class="list">${joined.length?`<div class="item"><span>İlk pazarı</span><b>${esc(joined[0].name)}</b></div><div class="item"><span>Son pazarı</span><b>${esc(joined.at(-1).name)}</b></div><div class="item"><span>Kaçırdığı pazar (ilkinden beri)</span><b>${ms.filter(m=>(m.edition||0)>(joined[0].edition||0)&&!p.markets.includes(m.id)).length}</b></div><div class="item"><span>Son pazarlarda üst üste</span><b>${streak}</b></div>`:'<div class="empty">Henüz pazar yok.</div>'}</div></div>
  ${P('ledgerRead')?`<div class="card"><h3>Ücretler <span class="mono muted">${money(feeSum(feeRows('all').filter(r=>r.p.id===id)).paid)} ÖDENDİ</span></h3><div class="list">${p.markets.map(mk).filter(Boolean).map(m=>{const f=feeOf(p,m);return `<div class="item fee-item"><span><b>${esc(m.name)}</b><br><small class="muted">${f.set||f.amount?`${money(f.paid)} / ${money(f.amount)}${f.method?' · '+esc(L.method[f.method]||f.method):''}${f.date?' · '+date(f.date):''}`:'Ücret girilmedi'}</small></span><span class="row">${pill('fee',feeState(f))}${P('feeWrite')&&(!f.by||mine(f,'by'))?`<button class="btn sm" data-act="fee-edit" data-p="${id}" data-m="${m.id}">Düzenle</button>`:''}</span></div>`}).join('')||'<div class="empty">Bir pazara eklenince ücret girilebilir.</div>'}</div></div>`:''}
  ${ws.length?`<div class="card"><h3>Düzenlediği workshoplar</h3><div class="list">${ws.map(w=>`<a class="item" href="#/workshoplar?ac=${w.id}"><span><b>${esc(w.title)}</b><br><small class="muted">${date(w.date)} · ${w.paid?money(w.price):'Ücretsiz'}</small></span>${pill('workshop',w.status)}</a>`).join('')}</div></div>`:''}
  <div class="card"><h3>Başvurular</h3><div class="list">${apps.map(a=>`<a class="item" href="#/basvurular/${a.id}"><span>${esc(fm(a.formId)?.title||'')}<br><small class="muted">${date(a.createdAt)}</small></span>${pill('app',a.status)}</a>`).join('')||'<div class="empty">Başvuru kaydı yok.</div>'}</div></div>
  ${p.email||p.phone?`<div class="card"><h3>Hızlı iletişim</h3><div class="row">${p.email?`<a class="btn sm" href="mailto:${esc(p.email)}">E-posta</a>`:''}${p.phone?`<a class="btn sm" href="tel:${esc(p.phone.replace(/\s/g,''))}">Ara</a><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${esc(p.phone.replace(/\D/g,'').replace(/^0/,'90'))}">WhatsApp</a>`:''}</div></div>`:''}</div></div>
  <div class="card" style="margin-top:40px"><h3>Benzer markalar <span class="mono muted">${esc((p.category||'KATEGORİ YOK').toLocaleUpperCase('tr'))}</span><a class="btn sm ghost" href="#/katilimcilar?kategori=${encodeURIComponent(p.category||'')}&pazar=all">Kategorinin tümü →</a></h3>${similar.length?`<div class="grid g4">${similar.map(({x,shared})=>`<a class="pcard sim" href="#/katilimcilar/${x.id}">${avatar(x)}<span><b>${esc(x.brandName)}</b><br><small class="muted">${shared?`${shared} ortak pazar`:'ortak pazar yok'} · ${x.markets.length} pazar</small></span></a>`).join('')}</div>`:'<div class="empty">Bu kategoride başka marka yok.</div>'}</div>
  <div class="card" style="margin-top:40px"><h3>Görseller <span class="row">${P('mediaWrite')?`<button class="btn sm primary" data-act="upload" data-participant="${id}" data-market="${p.markets[p.markets.length-1]||''}" data-cat="Katılımcı ürünleri">+ Görsel yükle</button>`:''}<a class="btn sm ghost" href="#/gorseller?k=${id}">Depoda gör →</a></span></h3>
  ${media.length?`<div class="thumbs">${media.map(mediaThumb).join('')}</div>`:'<div class="empty">Bu katılımcının görseli yok.</div>'}</div>`;
}
function newParticipantModal(){
  modal(`<span class="mono">YENİ KATILIMCI</span><h2>Katılımcı ekle</h2>${participantForm({markets:S.market==='all'?[]:[S.market]})}${actions2('Ekle')}`,
  async d=>{const p=await call('POST','/api/participants',d);await refresh();closeModal();toast('Katılımcı eklendi');location.hash=`#/katilimcilar/${p.id}`},'wide');
}

// --- Workshoplar ---
pages.workshoplar=r=>{
  const q=r.q,scope=q.get('pazar')||S.market,st=q.get('durum')||'',t=today();
  const all=S.d.workshops.filter(w=>scope==='all'||w.marketId===scope);
  let list=all;
  if(st==='yaklasan')list=list.filter(w=>w.status==='planlandi'&&(!w.date||w.date>=t));
  else if(st)list=list.filter(w=>w.status===st);
  list=[...list].sort((a,b)=>(a.date||'9').localeCompare(b.date||'9'));
  const link=v=>{const n=new URLSearchParams(q);v?n.set('durum',v):n.delete('durum');n.delete('ac');return '#/workshoplar?'+n};
  const paid=all.filter(w=>w.paid),reg=all.reduce((s,w)=>s+wsTaken(w),0),cap=all.reduce((s,w)=>s+(w.capacity||0),0);
  if(q.get('ac'))setTimeout(()=>{const w=S.d.workshops.find(x=>x.id===q.get('ac'));if(w&&!$('#modal').open)workshopModal(w)});
  return `<div class="head"><div><h1>Workshoplar</h1><p>Yapılan ve yapılacak workshoplar: kim düzenliyor, ücretli mi, kontenjan, kayıtlar.</p></div><div class="row">${ioBar('workshoplar','pazar='+encodeURIComponent(scope))}${P('workshopWrite')?'<button class="btn primary" data-act="ws-new">+ Workshop ekle</button>':''}</div></div>
  <div class="grid g4"><div class="stat o"><strong>${all.length}</strong><span>Workshop</span></div><div class="stat y"><strong>${all.filter(w=>w.status==='planlandi'&&(!w.date||w.date>=t)).length}</strong><span>Yaklaşan</span></div><div class="stat p"><strong>${paid.length}<small>/${all.length}</small></strong><span>Ücretli · ${all.length-paid.length} ücretsiz</span></div><div class="stat b"><strong>${reg}${cap?`<small>/${cap}</small>`:''}</strong><span>Kayıtlı kişi / kontenjan</span></div></div>
  <div class="chips" style="margin:40px 0 16px"><a class="chip ${!st?'on':''}" href="${link('')}">Tümü ${all.length}</a><a class="chip ${st==='yaklasan'?'on':''}" href="${link('yaklasan')}">Yaklaşan</a>${Object.entries(L.workshop).map(([k,v])=>`<a class="chip ${st===k?'on':''}" href="${link(k)}">${v} ${all.filter(w=>w.status===k).length}</a>`).join('')}</div>
  ${list.length?`<div class="table-wrap"><table><thead><tr><th>WORKSHOP</th><th>TARİH</th><th class="hide-sm">DÜZENLEYEN</th><th>ÜCRET</th><th class="hide-sm">KAYIT</th><th>DURUM</th><th class="hide-sm">GİREN</th></tr></thead><tbody>${list.map(w=>`<tr class="click" data-act="ws-open" data-v="${w.id}"><td><b>${esc(w.title)}</b><br><small class="muted">${esc(mShort(mk(w.marketId)))}${w.location?' · '+esc(w.location):''}</small></td><td>${date(w.date)}<br><small class="muted">${esc(w.time)}${w.duration?' · '+w.duration+' dk':''}</small></td><td class="hide-sm">${esc(w.organizer)}${w.participantId?`<br><small><a href="#/katilimcilar/${w.participantId}">${esc(pt(w.participantId)?.brandName||'')}</a></small>`:''}</td><td>${w.paid?`<b>${money(w.price)}</b>`:'<span class="pill">Ücretsiz</span>'}</td><td class="hide-sm">${wsTaken(w)}${w.capacity?'/'+w.capacity:''}${wsPending(w)?` <span class="pill s-bekliyor">${wsPending(w)} onay bekliyor</span>`:''}</td><td>${pill('workshop',w.status)}</td><td class="hide-sm"><small>${esc(ownerName(w))}</small></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">Workshop yok.${P('workshopWrite')?' <button class="btn primary" data-act="ws-new">+ İlk workshopu ekle</button>':''}</div>`}`;
};
const wsTaken=w=>(w.registered||0)+(w.registrations||[]).filter(r=>r.status!=='red').length,wsPending=w=>(w.registrations||[]).filter(r=>r.status==='bekliyor').length;
function workshopModal(w){
  const isNew=!w;w=w||{status:'planlandi',marketId:S.market==='all'?S.d.markets[0]?.id:S.market,paid:false};
  const ro=!isNew&&(!P('workshopWrite')||!mine(w));const dis=ro?'disabled':'';
  modal(`<span class="mono">${isNew?'YENİ WORKSHOP':'WORKSHOP'}${!isNew&&ownerName(w)?' · GİREN: '+esc(ownerName(w)).toLocaleUpperCase('tr'):''}</span><h2>${isNew?'Workshop ekle':esc(w.title)}</h2>
  ${section('Workshop',`${field('Workshop adı',`<input name="title" required value="${esc(w.title||'')}" ${dis}>`)}<div class="grid g2">${field('Pazar',`<select name="marketId" ${dis}>${marketOpts(w.marketId,'— pazarsız —')}</select>`)}${field('Durum',`<select name="status" ${dis}>${opts(Object.entries(L.workshop),w.status)}</select>`)}</div>${field('Açıklama',`<textarea name="description" ${dis}>${esc(w.description||'')}</textarea>`)}`)}
  ${section('Zaman ve yer',`<div class="grid g4">${field('Tarih',`<input name="date" type="date" value="${esc(w.date||'')}" ${dis}>`)}${field('Saat',`<input name="time" value="${esc(w.time||'')}" placeholder="14.00" ${dis}>`)}${field('Süre (dk)',`<input name="duration" type="number" min="0" value="${esc(w.duration||'')}" ${dis}>`)}${field('Yer',`<input name="location" value="${esc(w.location||'')}" ${dis}>`)}</div>`)}
  ${section('Düzenleyen',`<div class="grid g2">${field('Kim düzenliyor',`<input name="organizer" value="${esc(w.organizer||'')}" placeholder="Kişi ya da ekip" ${dis}>`)}${field('Katılımcı marka',`<select name="participantId" ${dis}>${opts(S.d.participants.map(p=>[p.id,p.brandName]),w.participantId||'','— bağlama —')}</select>`,'varsa')}</div>`)}
  ${section('Ücret ve kontenjan',`${field('Ücret',`<div class="seg"><label><input type="radio" name="paid" value="false" ${!w.paid?'checked':''} ${dis}><span>Ücretsiz</span></label><label><input type="radio" name="paid" value="true" ${w.paid?'checked':''} ${dis}><span>Ücretli</span></label></div>`)}<div class="grid g3">${field('Kişi başı ücret (₺)',`<input name="price" type="number" min="0" step="any" value="${esc(w.price||'')}" ${dis}>`)}${field('Kontenjan',`<input name="capacity" type="number" min="0" value="${esc(w.capacity||'')}" ${dis}>`)}${field('Kayıtlı kişi',`<input name="registered" type="number" min="0" value="${esc(w.registered||'')}" ${dis}>`)}</div>${field('Not',`<input name="notes" value="${esc(w.notes||'')}" ${dis}>`)}`)}
  ${section('Görseller · sitede görünür',isNew?'<p class="muted">Görselleri workshop kaydedildikten sonra ekleyebilirsin.</p>':`<div class="ws-imgs">${S.d.media.filter(m=>m.workshopId===w.id).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')).map((m,i)=>`<figure><img src="/media/${m.id}" alt="">${i===0?'<span class="pill">kapak</span>':''}${ro?'':`<button type="button" class="btn sm" data-act="ws-img-del" data-w="${w.id}" data-v="${m.id}">Sil</button>`}</figure>`).join('')}${ro?'':`<label class="ws-up"><input type="file" accept="image/*" multiple data-ws-up="${w.id}" hidden><span>+ Görsel ekle</span><small>ilk görsel kapak olur</small></label>`}</div><p style="margin:12px 0 0"><a href="/workshop/${w.id}" target="_blank" rel="noopener">Sitedeki sayfasını aç ↗</a></p>`)}
  ${isNew?'':section(`Panelden kayıt olanlar · ${(w.registrations||[]).length}`,(w.registrations||[]).length?`<div class="list regs">${w.registrations.map(r=>`<div class="item"><span><b>${esc(r.name)}</b>${r.brand?' · '+esc(r.brand):''}<br><small class="muted">${esc(r.email)}${r.phone?' · '+esc(r.phone):''} · ${ago(r.at)}</small></span><span class="row">${pill('reg',r.status)}${P('workshopWrite')?`${r.status!=='onay'?`<button type="button" class="btn sm dark" data-act="reg-set" data-w="${w.id}" data-r="${r.id}" data-v="onay">Onayla</button>`:''}${r.status!=='red'?`<button type="button" class="btn sm" data-act="reg-set" data-w="${w.id}" data-r="${r.id}" data-v="red">Reddet</button>`:''}`:''}</span></div>`).join('')}</div><p class="muted" style="font-size:12px;margin:0">Kontenjan: elle girilen ${w.registered||0} + panelden ${(w.registrations||[]).filter(r=>r.status!=='red').length} = ${wsTaken(w)}${w.capacity?' / '+w.capacity:''}</p>`:'<div class="empty">Katılımcı panelinden henüz kayıt yok. Workshop “Planlandı” durumundayken katılımcılar panelden yer ayırtabilir.</div>')}
  ${ro?`<p class="note">Bu kaydı ${esc(ownerName(w)||'başka bir yönetici')} girdi; yalnızca o ya da ana yönetici değiştirebilir.</p><div class="actions"><button type="button" class="btn primary" data-act="close">Kapat</button></div>`:actions2(isNew?'Ekle':'Kaydet',isNew?'':`<button type="button" class="btn sm danger" data-act="ws-del" data-v="${w.id}">Sil</button>`)}`,
  async d=>{if(ro)return closeModal();await call(isNew?'POST':'PUT',isNew?'/api/workshops':`/api/workshops/${w.id}`,d);await refresh();closeModal();toast('Workshop kaydedildi');if(route().q.get('ac'))location.hash='#/workshoplar';else render()},'wide');
  const up=$('#modal [data-ws-up]');if(up)up.addEventListener('change',async()=>{if(!up.files.length)return;try{await call('POST',`/api/workshops/${w.id}/images`,{files:await readFiles([...up.files])});await refresh();toast('Görsel eklendi');workshopModal(S.d.workshops.find(x=>x.id===w.id))}catch(e){toast(e.message,true)}});
}

// --- Kasa: katılımcı ödemeleri, masraflar, diğer gelirler ---
const kasaTabs=[['ozet','Özet'],['masraflar','Masraflar'],['gelirler','Gelirler'],['tahsilat','Katılımcı ödemeleri']];
pages.kasa=r=>{
  if(!P('ledgerRead'))return '<div class="empty">Kasayı görme yetkin yok.</div>';
  const q=r.q,scope=q.get('pazar')||S.market;
  let tab=q.get('sekme')||'ozet';if(tab==='hareketler')tab=q.get('tur')==='gelir'?'gelirler':'masraflar';
  const tabLink=t=>{const n=new URLSearchParams();n.set('sekme',t);if(q.get('pazar'))n.set('pazar',q.get('pazar'));return '#/kasa?'+n};
  const k=kasa(scope);
  const head=`<div class="head"><div><h1>Kasa</h1><p>Ne aldık, ne harcadık, kasada ne var. Her yönetici kendi girdiği kaydı düzenler.</p></div>
  <div class="row"><select class="pill-select" data-nav-o="pazar">${opts([['all','Tüm pazarlar'],...S.d.markets.map(m=>[m.id,m.name])],scope)}</select>${tab==='tahsilat'?ioBar('odemeler','pazar='+encodeURIComponent(scope)):ioBar('kasa','pazar='+encodeURIComponent(scope))}</div></div>
  <div class="kasa-flow"><a class="kf in ${tab==='gelirler'?'on':''}" href="${tabLink('gelirler')}"><span>GELİRLER</span><strong>+ ${money(k.fees+k.inc)}</strong><small>katılım ücreti ${money(k.fees)} · diğer ${money(k.inc)}</small></a><i>−</i><a class="kf out ${tab==='masraflar'?'on':''}" href="${tabLink('masraflar')}"><span>MASRAFLAR</span><strong>− ${money(k.exp)}</strong><small>${k.led.filter(e=>e.type==='gider').length} kayıt · ${k.noInvoice.length} faturası bekleniyor</small></a><i>=</i><a class="kf cash ${tab==='ozet'?'on':''}" href="${tabLink('ozet')}"><span>KASADA</span><strong>${money(k.cash)}</strong><small>${scope==='all'?'tüm pazarlar':esc(mk(scope)?.name||'')}</small></a></div>
  <nav class="tabs">${kasaTabs.map(([t,n])=>`<a href="${tabLink(t)}" class="${tab===t?'on':''}">${n}</a>`).join('')}</nav>`;
  const pay=S.d.settings?.payment||{};
  const payCard=`<div class="paycard"><div><span class="mono">HAVALE / EFT BİLGİLERİ · KATILIMCI PANELİNDE GÖRÜNÜR</span>${pay.iban?`<b>${esc(pay.bank||'')} · ${esc(pay.holder||'')}</b><code>${esc(pay.iban)}</code>`:'<b>Henüz eklenmedi.</b><small>Katılımcılar ödeme yapabilsin diye banka ve IBAN bilgisini ekle.</small>'}</div>${P('ledgerWrite')?`<button class="btn sm ${pay.iban?'':'primary'}" data-act="pay-edit">${pay.iban?'Düzenle':'+ Ödeme bilgisi ekle'}</button>`:''}</div>`;
  if(tab==='tahsilat')return head+payCard+feesTab(q,scope);
  if(tab==='masraflar')return head+expenseTab(q,scope);
  if(tab==='gelirler')return head+incomeTab(q,scope,k);
  const fs=feeSum(feeRows(scope)),byCat={};for(const e of k.led.filter(e=>e.type==='gider'))byCat[e.category]=(byCat[e.category]||0)+e.amount;
  const catMax=Math.max(1,...Object.values(byCat)),byAdmin={};for(const e of k.led)byAdmin[e.createdBy]=(byAdmin[e.createdBy]||0)+1;
  return head+payCard+`<div class="grid g3">
  <div class="card"><h3>Dikkat</h3><div class="tips">${fs.open?`<div class="tip"><span>${fs.open} katılımcıdan ${money(fs.rest)} tahsil edilecek.</span><a class="btn sm" href="${tabLink('tahsilat')}&durum=acik">Gör</a></div>`:''}${k.noInvoice.length?`<div class="tip warn"><span>${k.noInvoice.length} giderin faturası bekleniyor.</span><a class="btn sm" href="${tabLink('masraflar')}&fatura=bekleniyor">Gör</a></div>`:''}${k.noReceipt.length?`<div class="tip warn"><span>${k.noReceipt.length} giderin fişi yok.</span><a class="btn sm" href="${tabLink('masraflar')}&fis=yok">Gör</a></div>`:''}${!fs.open&&!k.noInvoice.length&&!k.noReceipt.length?'<div class="empty">Her şey tamam.</div>':''}</div></div>
  <div class="card cats"><h3>Gider dağılımı</h3>${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<a class="c" href="${tabLink('masraflar')}&kategori=${encodeURIComponent(c)}"><div><span>${esc(c)}</span><b>${money(n)}</b></div><div class="bar-meter"><i style="width:${n/catMax*100}%"></i></div></a>`).join('')||'<div class="empty">Gider yok.</div>'}</div>
  <div class="card"><h3>Pazar bazında</h3><div class="list">${S.d.markets.filter(m=>scope==='all'||m.id===scope).map(m=>{const x=kasa(m.id);return `<a class="item" href="#/kasa?pazar=${m.id}"><span><b>${esc(mShort(m))}</b><br><small class="muted">+${money(x.fees+x.inc)} · −${money(x.exp)}</small></span><b>${money(x.cash)}</b></a>`}).join('')}</div>${isAna()?`<h3 style="margin-top:24px">Kim girdi</h3><div class="list">${Object.entries(byAdmin).map(([a,n])=>`<div class="item"><span>${esc(ad(a)?.name||'—')}</span><b>${n} kayıt</b></div>`).join('')||'<div class="empty">Kayıt yok.</div>'}</div>`:''}</div></div>
  <div class="card" style="margin-top:40px"><h3>Son hareketler <span class="row"><a class="btn sm ghost" href="${tabLink('gelirler')}">Gelirler →</a><a class="btn sm ghost" href="${tabLink('masraflar')}">Masraflar →</a></span></h3>${ledgerTable([...k.led].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8))}</div>`;
};
function feesTab(q,scope){
  const st=q.get('durum'),find=(q.get('ara')||'').toLocaleLowerCase('tr');
  const all=feeRows(scope).sort((a,b)=>(b.m.edition||0)-(a.m.edition||0)||a.p.brandName.localeCompare(b.p.brandName,'tr'));
  let rows=all;
  if(st)rows=rows.filter(x=>st==='acik'?['bekliyor','kismi'].includes(feeState(x.f)):feeState(x.f)===st);
  if(find)rows=rows.filter(x=>[x.p.brandName,x.p.contactName,x.f.note].join(' ').toLocaleLowerCase('tr').includes(find));
  const sum=feeSum(all),shown=feeSum(rows);
  const link=(k,v)=>{const n=new URLSearchParams(q);v?n.set(k,v):n.delete(k);return '#/kasa?'+n};
  const methods={};for(const r of all)if(r.f.paid)methods[r.f.method||'']=(methods[r.f.method||'']||0)+r.f.paid;
  return `<div class="row" style="margin-bottom:16px;gap:24px"><span class="mono">TOPLAM ÜCRET ${money(sum.due)}</span><span class="mono">TAHSİL ${money(sum.paid)}</span><span class="mono">KALAN ${money(sum.rest)}</span>${Object.entries(methods).map(([k2,v])=>`<span class="mono">${esc((L.method[k2]||'Yöntem girilmedi').toLocaleUpperCase('tr'))} ${money(v)}</span>`).join('')}</div>
  <div class="filters"><input data-nav-o="ara" placeholder="Marka, kişi, not ara" value="${esc(q.get('ara')||'')}"></div>
  <div class="chips" style="margin-bottom:16px"><a class="chip ${!st?'on':''}" href="${link('durum','')}">Tümü ${all.length}</a><a class="chip ${st==='acik'?'on':''}" href="${link('durum','acik')}">Ödemesi açık ${sum.open}</a>${Object.entries(L.fee).map(([k2,t])=>{const n=all.filter(x=>feeState(x.f)===k2).length;return n?`<a class="chip ${st===k2?'on':''}" href="${link('durum',k2)}">${t} ${n}</a>`:''}).join('')}</div>
  ${rows.length?`<div class="table-wrap"><table><thead><tr><th>MARKA</th>${scope==='all'?'<th class="hide-sm">PAZAR</th>':''}<th>ÜCRET</th><th>ÖDENEN</th><th class="hide-sm">KALAN</th><th>ÖDEME TİPİ</th><th class="hide-sm">TARİH</th><th>DURUM</th><th></th></tr></thead><tbody>${rows.map(({p,m,f})=>{const edit=P('feeWrite')&&(!f.by||mine(f,'by'));return `<tr class="click" data-href="#/katilimcilar/${p.id}"><td><b>${esc(p.brandName)}</b>${f.note?`<br><small class="muted">${esc(f.note)}</small>`:''}</td>${scope==='all'?`<td class="hide-sm"><small>${esc(mShort(m))}</small></td>`:''}<td>${money(f.amount)}</td><td><b>${money(f.paid)}</b></td><td class="hide-sm">${money(Math.max(0,f.amount-f.paid))}</td><td>${f.method?`<span class="pill m-${f.method}">${esc(L.method[f.method])}</span>`:'<small class="muted">—</small>'}</td><td class="hide-sm"><small>${f.date?date(f.date):'—'}</small></td><td>${pill('fee',feeState(f))}</td><td style="text-align:right;white-space:nowrap">${edit?`${['bekliyor','kismi'].includes(feeState(f))?`<button class="btn sm primary" data-act="fee-paid" data-p="${p.id}" data-m="${m.id}">Ödendi ✓</button> `:''}<button class="btn sm" data-act="fee-edit" data-p="${p.id}" data-m="${m.id}">Düzenle</button>`:f.by?`<small class="muted">${esc(ad(f.by)?.name||'')}</small>`:''}</td></tr>`}).join('')}</tbody>
  <tfoot><tr><td><b>TOPLAM</b></td>${scope==='all'?'<td class="hide-sm"></td>':''}<td><b>${money(shown.due)}</b></td><td><b>${money(shown.paid)}</b></td><td class="hide-sm"><b>${money(shown.rest)}</b></td><td></td><td class="hide-sm"></td><td></td><td></td></tr></tfoot></table></div>`:'<div class="empty">Bu filtreye uyan kayıt yok. Katılımcılar bir pazara eklenince burada görünür.</div>'}`;
}
// Masraflar ve gelirler ayrı ekranlar: üstte toplam ve ekleme butonu, ortada kategori dağılımı, altta liste
function ledgerScreen(q,scope,type){
  const isExp=type==='gider',cat=q.get('kategori'),inv=q.get('fatura'),rec=q.get('fis');
  const all=S.d.ledger.filter(e=>e.type===type&&(scope==='all'||e.marketId===scope));
  let list=all;
  if(cat)list=list.filter(e=>e.category===cat);
  if(inv)list=list.filter(e=>e.invoice===inv);
  if(rec==='yok')list=list.filter(e=>!e.receipt);
  list=[...list].sort((a,b)=>b.date.localeCompare(a.date));
  const link=(k,v)=>{const n=new URLSearchParams(q);v?n.set(k,v):n.delete(k);return '#/kasa?'+n};
  const sum=l=>l.reduce((s,e)=>s+e.amount,0),byCat={};for(const e of all)byCat[e.category]=(byCat[e.category]||0)+e.amount;
  const catMax=Math.max(1,...Object.values(byCat)),byMethod={};for(const e of all)byMethod[e.method||'']=(byMethod[e.method||'']||0)+e.amount;
  const word=isExp?'masraf':'gelir';
  return `<div class="ledger-hero ${isExp?'out':'in'}"><div><span class="mono">${isExp?'TOPLAM MASRAF':'DİĞER GELİRLER'}</span><strong>${isExp?'−':'+'} ${money(sum(all))}</strong><small>${all.length} kayıt${isExp?` · ${all.filter(e=>e.invoice==='bekleniyor').length} faturası bekleniyor · ${all.filter(e=>!e.receipt).length} fişi yok`:''}</small></div>
  ${P('ledgerWrite')?`<button class="btn big ${isExp?'dark':'primary'}" data-act="ledger-new" data-v="${type}">+ ${isExp?'Masraf':'Gelir'} ekle</button>`:''}</div>
  <div class="grid split" style="margin-top:30px"><div class="card cats"><h3>Kategoriye göre</h3>${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<a class="c ${cat===c?'on':''}" href="${link('kategori',cat===c?'':c)}"><div><span>${esc(c)}</span><b>${money(n)}</b></div><div class="bar-meter"><i style="width:${n/catMax*100}%"></i></div></a>`).join('')||`<div class="empty">Henüz ${word} yok.</div>`}</div>
  <div class="card"><h3>Ödeme şekli</h3><div class="list">${Object.entries(byMethod).map(([m,n])=>`<div class="item"><span>${esc(L.method[m]||'Belirtilmemiş')}</span><b>${money(n)}</b></div>`).join('')||'<div class="empty">—</div>'}</div></div></div>
  <div class="card" style="margin-top:40px"><h3>${isExp?'Masraflar':'Gelirler'} <span class="mono muted">${list.length} KAYIT · ${money(sum(list))}</span></h3>
  <div class="chips" style="margin-bottom:16px"><a class="chip ${!cat&&!inv&&!rec?'on':''}" href="${link('kategori','').replace(/&?(fatura|fis)=[^&]*/g,'')}">Tümü ${all.length}</a>${isExp?`<a class="chip ${inv==='bekleniyor'?'on':''}" href="${link('fatura',inv==='bekleniyor'?'':'bekleniyor')}">Faturası bekleniyor ${all.filter(e=>e.invoice==='bekleniyor').length}</a><a class="chip ${rec==='yok'?'on':''}" href="${link('fis',rec==='yok'?'':'yok')}">Fişi yok ${all.filter(e=>!e.receipt).length}</a>`:''}${cat?`<a class="chip on" href="${link('kategori','')}">${esc(cat)} ×</a>`:''}</div>
  ${list.length?`<div class="table-wrap"><table><thead><tr><th>TARİH</th><th>AÇIKLAMA</th><th class="hide-sm">PAZAR</th><th>TUTAR</th><th class="hide-sm">ÖDEME</th><th class="hide-sm">${isExp?'KİM ÖDEDİ':'KİMDEN'}</th>${isExp?'<th>FATURA</th><th>FİŞ</th>':''}<th class="hide-sm">GİREN</th></tr></thead><tbody>${list.map(e=>`<tr class="click" data-act="ledger-open" data-v="${e.id}"><td><small>${date(e.date)}</small></td><td><b>${esc(e.title)}</b><br><small class="muted">${esc(e.category)}</small></td><td class="hide-sm"><small>${e.marketId?esc(mShort(mk(e.marketId))):'Genel'}</small></td><td class="${isExp?'out':'in'}"><b>${isExp?'−':'+'} ${money(e.amount)}</b></td><td class="hide-sm">${e.method?`<span class="pill m-${e.method}">${esc(L.method[e.method])}</span>`:'<small class="muted">—</small>'}</td><td class="hide-sm"><small>${esc(e.paidBy||'—')}</small></td>${isExp?`<td><span class="pill inv-${e.invoice}">${esc(L.invoice[e.invoice])}</span></td><td><span class="pill ${e.receipt?'rc-var':'rc-yok'}">${e.receipt?'Var':'Yok'}</span>${e.mediaId?' 📎':''}</td>`:''}<td class="hide-sm"><small>${esc(ownerName(e))}</small></td></tr>`).join('')}</tbody><tfoot><tr><td></td><td><b>TOPLAM</b></td><td class="hide-sm"></td><td class="${isExp?'out':'in'}"><b>${isExp?'−':'+'} ${money(sum(list))}</b></td><td colspan="${isExp?5:3}"></td></tr></tfoot></table></div>`:`<div class="empty big">Bu filtrede ${word} yok.${P('ledgerWrite')?`<button class="btn primary" data-act="ledger-new" data-v="${type}">+ ${isExp?'Masraf':'Gelir'} ekle</button>`:''}</div>`}</div>`;
}
const expenseTab=(q,scope)=>ledgerScreen(q,scope,'gider');
function incomeTab(q,scope,k){
  const fs=feeSum(feeRows(scope));
  return `<div class="grid g2" style="margin-bottom:30px"><a class="income-card" href="#/kasa?sekme=tahsilat${scope!=='all'?'&pazar='+scope:''}"><span class="mono">KATILIM ÜCRETLERİ</span><strong>+ ${money(fs.paid)}</strong><small>${fs.open?`${fs.open} katılımcıdan ${money(fs.rest)} bekleniyor`:'bekleyen ödeme yok'} · ödemeleri gör →</small></a><div class="income-card alt"><span class="mono">DİĞER GELİRLER</span><strong>+ ${money(k.inc)}</strong><small>sponsorluk, workshop geliri, bağış, satış</small></div></div>`+ledgerScreen(q,scope,'gelir');
}
const ledgerTable=list=>list.length?`<div class="table-wrap"><table><thead><tr><th>TARİH</th><th>AÇIKLAMA</th><th>TUTAR</th><th class="hide-sm">ÖDEME</th><th class="hide-sm">KİM ÖDEDİ</th><th>FATURA / FİŞ</th><th class="hide-sm">GİREN</th></tr></thead><tbody>${list.map(e=>`<tr class="click" data-act="ledger-open" data-v="${e.id}"><td><small>${date(e.date)}</small></td><td><b>${esc(e.title)}</b><br><small class="muted">${esc(e.category)}${e.marketId?' · '+esc(mShort(mk(e.marketId))):''}</small></td><td class="${e.type==='gelir'?'in':'out'}"><b>${e.type==='gelir'?'+':'−'} ${money(e.amount)}</b></td><td class="hide-sm"><small>${esc(L.method[e.method]||'—')}</small></td><td class="hide-sm"><small>${esc(e.paidBy||'—')}</small></td><td>${e.type==='gider'?`<span class="pill inv-${e.invoice}">${esc(L.invoice[e.invoice])}</span> <span class="pill ${e.receipt?'rc-var':'rc-yok'}">${e.receipt?'Fiş var':'Fiş yok'}</span>`:'<small class="muted">—</small>'}${e.mediaId?' 📎':''}</td><td class="hide-sm"><small>${esc(ownerName(e))}</small></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Kayıt yok.</div>';
function ledgerModal(e,type){
  const isNew=!e;e=e||{type,date:today(),marketId:S.market==='all'?'':S.market,invoice:'bekleniyor',receipt:false,paidBy:S.d.me.name};
  const ro=!isNew&&!mine(e),dis=ro?'disabled':'',cats=e.type==='gelir'?S.d.incomeCategories:S.d.expenseCategories,att=e.mediaId&&md(e.mediaId);
  modal(`<span class="mono">${e.type==='gelir'?'GELİR':'MASRAF'}${!isNew?' · GİREN: '+esc(ownerName(e)||'—').toLocaleUpperCase('tr'):''}</span><h2>${isNew?(e.type==='gelir'?'Gelir ekle':'Masraf ekle'):esc(e.title)}</h2>
  <input type="hidden" name="type" value="${e.type}">
  ${section('Ne için',`${field('Açıklama',`<input name="title" required value="${esc(e.title||'')}" placeholder="${e.type==='gelir'?'Örn. Sponsor katkısı':'Örn. Stant brandaları'}" ${dis}>`)}<div class="grid g3">${field('Tutar (₺)',`<input name="amount" type="number" min="0" step="any" required value="${esc(e.amount||'')}" ${dis}>`)}${field('Kategori',`<select name="category" ${dis}>${opts(cats.map(c=>[c,c]),e.category||cats[0])}</select>`)}${field('Tarih',`<input name="date" type="date" value="${esc(e.date)}" ${dis}>`)}</div>${field('Pazar',`<select name="marketId" ${dis}>${marketOpts(e.marketId||'','— genel —')}</select>`)}`)}
  ${section('Ödeme',`<div class="grid g2">${field('Ödeme tipi',`<select name="method" ${dis}>${opts(Object.entries(L.method),e.method||'','— seç —')}</select>`)}${field(e.type==='gelir'?'Kimden / kim aldı':'Ödemeyi kim yaptı',`<input name="paidBy" value="${esc(e.paidBy||'')}" ${dis}>`)}</div>`)}
  ${e.type==='gider'?section('Belge',`${field('Fatura',`<div class="seg">${Object.entries(L.invoice).map(([k,t])=>`<label><input type="radio" name="invoice" value="${k}" ${e.invoice===k?'checked':''} ${dis}><span>${t}</span></label>`).join('')}</div>`)}<label class="check"><input type="checkbox" name="receipt" ${e.receipt?'checked':''} ${dis}> Fiş var</label>
  <div class="attach">${att?`<a href="/media/${att.id}" target="_blank" class="btn sm">📎 ${esc(att.title)} ↗</a>`:''}${ro?'':field(att?'Belgeyi değiştir':'Fatura / fiş fotoğrafı ekle','<input type="file" name="doc" accept="image/*,application/pdf">','isteğe bağlı')}</div><input type="hidden" name="mediaId" value="${esc(e.mediaId||'')}">`):''}
  ${field('Not',`<input name="note" value="${esc(e.note||'')}" ${dis}>`)}
  ${ro?`<p class="note">Bu kaydı ${esc(ownerName(e)||'başka bir yönetici')} girdi; yalnızca o ya da ana yönetici değiştirebilir.</p><div class="actions"><button type="button" class="btn primary" data-act="close">Kapat</button></div>`:actions2(isNew?'Ekle':'Kaydet',isNew?'':`<button type="button" class="btn sm danger" data-act="ledger-del" data-v="${e.id}">Sil</button>`)}`,
  async(d,form)=>{
    if(ro)return closeModal();
    const file=form.querySelector('[name=doc]')?.files[0];
    if(file){const [f]=await readFiles([file]);const [m]=await call('POST','/api/media',{marketId:d.marketId||null,category:'Fatura & fiş',tags:['kasa'],files:[f]});d.mediaId=m.id}
    await call(isNew?'POST':'PUT',isNew?'/api/ledger':`/api/ledger/${e.id}`,d);await refresh();closeModal();toast('Kasa kaydı kaydedildi');render();
  },'wide');
}
function feeModal(pid,mid){
  const p=pt(pid),m=mk(mid);if(!p||!m)return;const f=feeOf(p,m);
  modal(`<span class="mono">${esc(m.name.toLocaleUpperCase('tr'))}</span><h2>${esc(p.brandName)}</h2>
  <div class="grid g2">${field('Katılım ücreti (₺)',`<input name="amount" type="number" min="0" step="any" value="${f.amount||''}" placeholder="0">`,m.fee?`pazar varsayılanı ${money(m.fee)}`:'')}${field('Ödenen (₺)',`<input name="paid" type="number" min="0" step="any" value="${f.paid||''}" placeholder="0">`)}</div>
  ${field('Ödeme tipi',`<div class="seg">${Object.entries(L.method).map(([k,t])=>`<label><input type="radio" name="method" value="${k}" ${f.method===k?'checked':''}><span>${t}</span></label>`).join('')}</div>`)}
  <div class="grid g2">${field('Ödeme tarihi',`<input name="date" type="date" value="${esc(f.date)}">`)}${field('Not',`<input name="note" value="${esc(f.note)}" placeholder="Örn. 2 taksit, indirim">`)}</div>
  ${actions2('Kaydet','<button type="button" class="btn sm" data-act="fee-fill">Tamamı ödendi</button>')}`,
  async d=>{await call('PUT',`/api/participants/${pid}/fees/${mid}`,d);await refresh();closeModal();toast('Ödeme kaydedildi');render()});
}
function paidModal(pid,mid){
  const p=pt(pid),m=mk(mid),f=feeOf(p,m);
  modal(`<span class="mono">ÖDEME ALINDI</span><h2>${esc(p.brandName)} · ${money(f.amount)}</h2><p class="muted" style="margin:0">Nasıl ödedi?</p>
  <div class="paybtns">${Object.entries(L.method).map(([k,t])=>`<button type="button" class="pay" data-act="fee-paid-go" data-p="${pid}" data-m="${mid}" data-v="${k}">${t}</button>`).join('')}</div>
  ${field('Ödeme tarihi',`<input name="date" id="paid-date" type="date" value="${today()}">`)}`,()=>{});
}

// --- İçe aktarma ---
const importInfo={
  katilimcilar:['Katılımcıları içe aktar','Aynı marka adı, e-posta ya da Instagram varsa kart güncellenir, yoksa yeni kart açılır. Pazar sütunlarına (ör. “5. pazar”) X yazılan markalar o pazara eklenir; böylece kim hangi pazara katıldı tek tabloda düzenlenir.'],
  odemeler:['Ödemeleri içe aktar','Marka, katılımcılardaki adla eşleşir. Pazar sütunu boşsa aşağıda seçtiğin pazar kullanılır.'],
  pazarlar:['Pazarları içe aktar','Sıra no’su var olan pazar güncellenir; yeni numara yeni pazar açar. Silinmiş bir pazarın numarası kullanılamaz.'],
  workshoplar:['Workshopları içe aktar','Aynı ad, tarih ve pazardaki workshop güncellenir; diğerleri yeni eklenir.'],
  kasa:['Kasa hareketlerini içe aktar','Her satır bir gider ya da gelir olarak eklenir ve senin adınla kaydedilir.'],
  formlar:['Formu dosyadan oluştur','Her satır bir soru olur. Yeni form taslak olarak açılır; sonra düzenleyip yayınlarsın.']
};
function importModal(kind){
  const [title,help]=importInfo[kind];
  modal(`<span class="mono">İÇE AKTAR</span><h2>${title}</h2>
  <div class="warnbox"><b>Önce şablonu indir.</b> Sütun başlıklarını değiştirme, örnek satırları silip kendi verini yaz. Excel şablonunda “Nasıl doldurulur” sayfası her sütunu anlatır.<div class="row" style="margin-top:12px"><a class="btn sm dark" href="/api/template/${kind}.xlsx" download>Şablon · Excel ↓</a><a class="btn sm" href="/api/template/${kind}.csv" download>Şablon · CSV ↓</a></div></div>
  <p class="muted" style="margin:0">${help}</p>
  ${field('Dosya','<input type="file" name="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required>','Excel (.xlsx) ya da CSV')}
  ${kind==='formlar'?`<div class="grid g2">${field('Form başlığı','<input name="title" required placeholder="Örn. 6. Pazar Katılımcı Başvurusu">')}${field('Pazar',`<select name="marketId" required>${marketOpts(S.market==='all'?S.d.markets[0]?.id:S.market)}</select>`)}</div>`
  :['katilimcilar','odemeler','workshoplar','kasa'].includes(kind)?field(kind==='katilimcilar'?'Bu pazara da ekle':'Pazar (dosyada yoksa)',`<select name="marketId">${marketOpts(S.market==='all'?'':S.market,kind==='katilimcilar'?'— ekleme —':'— dosyadaki pazar —')}</select>`):''}
  ${kind==='katilimcilar'?'<label class="check"><input type="checkbox" name="strict"> Pazar sütununda boş bırakılanı “katılmadı” say (o pazardan çıkar)</label>':''}
  <div id="import-out"></div>
  <div class="actions"><span class="row" style="margin-left:auto"><button type="button" class="btn ghost" data-act="close">Kapat</button><button class="btn primary">İçe aktar ↑</button></span></div>`,
  async(d,form)=>{
    const file=form.querySelector('[name=file]').files[0];if(!file)throw new Error('Dosya seç');
    const btn=form.querySelector('.btn.primary');btn.textContent='Aktarılıyor…';btn.disabled=true;
    try{
      const [data]=await readFiles([file]);
      const r=await call('POST',`/api/import/${kind}`,{filename:file.name,data:data.data,marketId:d.marketId,strict:d.strict,title:d.title});
      await refresh();
      if(r.formId){closeModal();toast('Form oluşturuldu');location.hash=`#/formlar/${r.formId}`;return}
      render();
      $('#import-out').innerHTML=`<div class="import-result"><b>${r.created} yeni · ${r.updated} güncellendi${r.skipped?` · ${r.skipped} atlandı`:''}</b>${r.errors.length?`<ul>${r.errors.slice(0,12).map(e=>`<li>${esc(e)}</li>`).join('')}</ul>${r.errors.length>12?`<small>+${r.errors.length-12} satır daha</small>`:''}`:''}</div>`;
      toast('İçe aktarıldı');
    }finally{btn.textContent='İçe aktar ↑';btn.disabled=false}
  },'wide');
}

// --- Görsel deposu ---
const mediaThumb=m=>`<button class="thumb ${m.category==='Logo'?'is-logo':''}" data-act="media-open" data-v="${m.id}"><span class="img">${thumb(m)}</span><span class="cap"><b>${esc(m.title)}</b><small class="muted">${esc(m.category)}${m.participantId?' · '+esc(pt(m.participantId)?.brandName||''):''}</small></span></button>`;
pages.gorseller=r=>{
  const q=r.q,mq=q.get('m')||(S.market==='all'?'':S.market),cat=q.get('c'),who=q.get('k'),s=(q.get('ara')||'').toLocaleLowerCase('tr');
  let list=S.d.media;
  if(mq)list=list.filter(m=>mq==='genel'?!m.marketId:m.marketId===mq);
  if(cat)list=list.filter(m=>m.category===cat);
  if(who)list=list.filter(m=>m.participantId===who);
  if(s)list=list.filter(m=>[m.title,m.filename,...m.tags,pt(m.participantId)?.brandName].join(' ').toLocaleLowerCase('tr').includes(s));
  const link=(m,c)=>`#/gorseller?${new URLSearchParams(Object.entries({m,c}).filter(([,v])=>v))}`;
  const folder=(key,name,items)=>{const on=mq===key;return `<a href="${link(key)}" class="${on&&!cat?'on':''}">📁 ${esc(name)} <small>${items.length}</small></a>${on?S.d.mediaCategories.map(c=>[c,items.filter(x=>x.category===c).length]).map(([c,n])=>`<a class="sub ${cat===c?'on':''}" href="${link(key,c)}">${esc(c)} <small>${n}</small></a>`).join(''):''}`};
  return `<div class="head"><div><h1>Görsel deposu</h1><p>Her pazarın kendi klasörü; içinde kategoriler. Logolar “Logo” klasöründe, kare alana sığdırılarak gösterilir.</p></div>${P('mediaWrite')?`<button class="btn primary" data-act="upload" data-market="${mq==='genel'?'':esc(mq)}" data-cat="${esc(cat||'')}" data-participant="${esc(who||'')}">+ Yükle</button>`:''}</div>
  <div class="media-layout"><nav class="tree"><a href="#/gorseller?m=" class="${!mq?'on':''}">Tüm dosyalar <small>${S.d.media.length}</small></a>
  ${S.d.markets.map(m=>folder(m.id,m.name,S.d.media.filter(x=>x.marketId===m.id))).join('')}${folder('genel','Genel (pazarsız)',S.d.media.filter(x=>!x.marketId))}</nav>
  <div><div class="filters"><input data-nav-m="ara" placeholder="Başlık, etiket, marka ara" value="${esc(q.get('ara')||'')}"><select data-nav-m="c">${opts(S.d.mediaCategories.map(c=>[c,c]),cat||'','Tüm kategoriler')}</select><select data-nav-m="k">${opts(S.d.participants.map(p=>[p.id,p.brandName]),who||'','Tüm katılımcılar')}</select></div>
  ${P('mediaWrite')?`<div class="drop" id="drop" data-market="${mq==='genel'?'':esc(mq)}" data-cat="${esc(cat||'')}" data-participant="${esc(who||'')}" style="margin-bottom:16px">Dosyaları buraya sürükle ya da <button class="btn sm" data-act="upload" data-market="${mq==='genel'?'':esc(mq)}" data-cat="${esc(cat||'')}" data-participant="${esc(who||'')}">seç</button><br><small class="muted">${mq?esc(mq==='genel'?'Genel':mk(mq)?.name||''):'Klasör seçmeden yüklersen pazarı sorarız'}${cat?' / '+esc(cat):''}</small></div>`:''}
  ${list.length?`<div class="thumbs">${list.map(mediaThumb).join('')}</div>`:'<div class="empty">Bu klasör boş.</div>'}</div></div>`;
};
function readFiles(files){return Promise.all([...files].map(f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({name:f.name,type:f.type,data:String(r.result).split(',')[1]});r.onerror=rej;r.readAsDataURL(f)})))}
function uploadModal(preset,files){
  const logo=preset.cat==='Logo';
  modal(`<span class="mono">${logo?'LOGO':'YÜKLE'}</span><h2>${logo?'Logo yükle':'Görsel yükle'}</h2>${files?`<p style="margin:0"><b>${files.length}</b> dosya seçildi.</p>`:field('Dosyalar',`<input type="file" name="files" ${logo?'':'multiple'} accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf" required>`,'JPG, PNG, WEBP, GIF, SVG, PDF · en fazla 15 MB')}
  <div class="grid g2">${field('Pazar klasörü',`<select name="marketId">${marketOpts(preset.market||(S.market==='all'?'':S.market),'Genel (pazarsız)')}</select>`)}${field('Kategori',`<select name="category">${opts(S.d.mediaCategories.map(c=>[c,c]),preset.cat||'Etkinlik fotoğrafları')}</select>`)}</div>
  ${field('Katılımcı',`<select name="participantId">${opts(S.d.participants.map(p=>[p.id,p.brandName]),preset.participant||'','— bağlama —')}</select>`)}${field('Etiketler',`<input name="tags" placeholder="afiş, instagram, gece">`,'virgülle ayır')}
  ${actions2('Yükle')}`,
  async(d,form)=>{
    const list=files||form.querySelector('[name=files]').files;if(!list.length)throw new Error('Dosya seç');
    form.querySelector('.btn.primary').textContent='Yükleniyor…';
    await call('POST','/api/media',{marketId:d.marketId||null,category:d.category,participantId:d.participantId||null,tags:d.tags.split(',').map(t=>t.trim()).filter(Boolean),files:await readFiles(list)});
    await refresh();closeModal();toast(`${list.length} dosya yüklendi`);render();
  });
}
function mediaModal(id){
  const m=md(id);if(!m)return;const app=S.d.applications.find(a=>a.id===m.applicationId),edit=P('mediaWrite')&&mine(m,'uploadedBy');
  modal(`<div class="mview ${m.category==='Logo'?'logo':''}">${m.mime.startsWith('image/')?`<img src="/media/${m.id}" alt="${esc(m.title)}">`:`<a class="btn" href="/media/${m.id}" target="_blank">PDF'i aç ↗</a>`}</div>
  ${edit?`${field('Başlık',`<input name="title" value="${esc(m.title)}">`)}<div class="grid g2">${field('Pazar klasörü',`<select name="marketId">${marketOpts(m.marketId||'','Genel (pazarsız)')}</select>`)}${field('Kategori',`<select name="category">${opts(S.d.mediaCategories.map(c=>[c,c]),m.category)}</select>`)}</div>
  ${field('Katılımcı',`<select name="participantId">${opts(S.d.participants.map(p=>[p.id,p.brandName]),m.participantId||'','— bağlama —')}</select>`)}${field('Etiketler',`<input name="tags" value="${esc(m.tags.join(', '))}">`)}`:`<b>${esc(m.title)}</b>`}
  <small class="muted">${esc(m.filename)} · ${(m.size/1024/1024).toFixed(2)} MB · ${date(m.createdAt)}${m.uploadedBy?' · yükleyen: '+esc(ad(m.uploadedBy)?.name||''):''}${app?` · <a href="#/basvurular/${app.id}" data-act="close">başvurudan geldi</a>`:''}${m.participantId?` · <a href="#/katilimcilar/${m.participantId}" data-act="close">${esc(pt(m.participantId)?.brandName||'')}</a>`:''}</small>
  <div class="actions" style="justify-content:space-between"><span class="row"><a class="btn sm" href="/media/${m.id}?indir">İndir</a>${edit?`<button type="button" class="btn sm danger" data-act="media-del" data-v="${m.id}">Sil</button>`:''}</span><span class="row"><button type="button" class="btn ghost" data-act="close">Kapat</button>${edit?'<button class="btn primary">Kaydet</button>':''}</span></div>`,
  async d=>{await call('PUT',`/api/media/${id}`,{...d,marketId:d.marketId||null,participantId:d.participantId||null,tags:d.tags.split(',').map(t=>t.trim()).filter(Boolean)});await refresh();closeModal();toast('Kaydedildi');render()},'lightbox');
}

// --- Yöneticiler, yetkiler, iz haritası ---
const roleOrder=['ana','yonetici','organizator','editor','katilimci'];
const roleDesc={
  ana:'Her şeyin üzerindedir; tüm kayıtları görür ve değiştirir, yönetici ekler, herkesin iz haritasını izler.',
  yonetici:'Tüm alanları yönetir; kullanıcı ekler, roller ve yetkiler belirler.',
  organizator:'Pazarları ve workshopları, katılımcı başvurularını, katılımcıları ve ödemeleri yönetir; katılımcı değişikliklerini onaylar.',
  editor:'Görselleri ve workshop programını düzenler, başvurulara not ekler.',
  katilimci:'Kendi marka profilini düzenler, görsel ekler, başvurusunu ve katılım durumunu görür.'
};
const roleRules=[
  'Her kullanıcı yalnızca rolünün izin verdiği alanlara erişebilir.',
  'Katılımcılar yalnızca kendi marka bilgilerini değiştirebilir; değişiklikler organizatör onayıyla yayımlanır.',
  'Kullanıcı ekleme ve yetki değiştirme yalnızca yöneticiye aittir. Yönetici eklemeyi yalnızca ana yönetici yapar.',
  'Herkes yalnızca kendi girdiği kaydı değiştirebilir; ana yönetici hepsini değiştirebilir.',
  'Silme, onaylama ve önemli değişiklikler işlem geçmişine kaydedilir. İz haritasını yalnızca ana yönetici görür.',
  'Yeni hesaplara yönetici tarafından rol atanır.'
];
const permTable=[
  ['Yönetici ekleme, iz haritası, başkasının kaydını değiştirme',['ana']],
  ['Kullanıcı ekleme, rol verme, pasifleştirme',['ana','yonetici']],
  ['Başvuru ve katılımcı silme',['ana','yonetici']],
  ['Pazar ve başvuru formu oluşturma',['ana','yonetici','organizator']],
  ['Başvuru değerlendirme ve kabul',['ana','yonetici','organizator']],
  ['Katılımcı ekleme, toplu işlem, içe aktarma',['ana','yonetici','organizator']],
  ['Katılımcı değişikliklerini onaylama',['ana','yonetici','organizator']],
  ['Kasa: ödemeler, masraflar, gelirler',['ana','yonetici','organizator']],
  ['Workshop programı',['ana','yonetici','organizator','editor']],
  ['Görsel yükleme, başvurulara not',['ana','yonetici','organizator','editor']],
  ['Yönetim panelini görme',['ana','yonetici','organizator','editor']],
  ['Kendi marka profilini düzenleme (onayla)',['katilimci']]
];
pages.yoneticiler=r=>{
  if(r.id)return trailPage(r.id);
  const week=a=>S.d.activity.filter(x=>x.adminId===a.id&&Date.now()-new Date(x.at)<7*864e5).length;
  const can=a=>a.role!=='ana'&&a.id!==S.d.me.id&&(S.d.assignable||[]).includes(a.role);
  const staffRoles=(S.d.assignable||[]).filter(k=>k!=='katilimci');
  const prt=a=>a.participantId?pt(a.participantId):null;
  return `<div class="head"><div><h1>Kullanıcılar</h1><p>Yöneticiler, organizatörler, editörler ve katılımcılar aynı giriş sayfasından girer; herkes rolünün izin verdiği alanı görür.</p></div>${P('users')?'<button class="btn primary" data-act="admin-new">+ Kullanıcı ekle</button>':''}</div>
  <div class="rolebox"><table class="roletable"><thead><tr><th>Rol</th><th>Yetkileri</th></tr></thead><tbody>${roleOrder.map(k=>`<tr><td><b>${esc(S.d.roles[k])}</b></td><td>${roleDesc[k]}</td></tr>`).join('')}</tbody></table>
  <h3>Kullanıcı yetki kuralları:</h3><ul class="rules">${roleRules.map(t=>`<li>${t}</li>`).join('')}</ul></div>
  <div class="table-wrap" style="margin-top:50px"><table class="admins"><thead><tr><th>AD</th><th class="hide-sm">E-POSTA</th><th>ROL</th><th class="hide-sm">SON GİRİŞ</th>${isAna()?'<th class="hide-sm">7 GÜN</th>':''}<th></th></tr></thead>${roleOrder.map(k=>{const list=S.d.admins.filter(a=>a.role===k).sort((a,b)=>(a.active===false)-(b.active===false)||a.name.localeCompare(b.name,'tr'));return list.length?`<tbody><tr class="group"><td colspan="${isAna()?6:5}"><b>${esc(S.d.roles[k])}</b> <span class="mono muted">${list.length} KİŞİ</span></td></tr>${list.map(a=>`<tr${isAna()?` class="click" data-href="#/yoneticiler/${a.id}"`:''}><td><b>${esc(a.name)}</b>${a.id===S.d.me.id?' <span class="pill">sen</span>':''}${a.active===false?' <span class="pill s-red">pasif</span>':''}${a.demo?' <span class="pill demo">örnek</span>':''}${prt(a)?`<br><small class="muted">Marka: <a href="#/katilimcilar/${a.participantId}">${esc(prt(a).brandName)}</a></small>`:''}${a.claim&&pt(a.claim)?`<br><small class="claim">“${esc(pt(a.claim).brandName)}” markasıyla eşleşmek istiyor ${P('users')?`<button class="btn sm dark" data-act="claim-link" data-v="${a.id}" data-ok="1">Eşleştir</button> <button class="btn sm" data-act="claim-link" data-v="${a.id}" data-ok="0">Reddet</button>`:''}</small>`:''}${a.selfSignup?' <span class="pill">kendi kaydı</span>':''}</td><td class="hide-sm">${esc(a.email)}</td>
  <td>${can(a)&&a.role!=='katilimci'?`<select class="inp" style="width:auto" data-admin-role="${a.id}">${opts(staffRoles.map(k=>[k,S.d.roles[k]]),a.role)}</select>`:`<span class="pill r-${a.role}">${esc(S.d.roles[a.role])}</span>`}</td><td class="hide-sm"><small>${a.lastLoginAt?ago(a.lastLoginAt):'—'}</small></td>${isAna()?`<td class="hide-sm"><small>${week(a)} işlem</small></td>`:''}
  <td style="text-align:right;white-space:nowrap">${isAna()?`<a class="btn sm" href="#/yoneticiler/${a.id}">İz haritası</a> `:''}${can(a)?`<button class="btn sm" data-act="admin-pass" data-v="${a.id}">Şifre</button> <button class="btn sm" data-act="admin-toggle" data-v="${a.id}">${a.active===false?'Etkinleştir':'Pasifleştir'}</button>`:''}</td></tr>`).join('')}</tbody>`:''}).join('')}</table></div>
  <div class="card" style="margin-top:50px"><h3>Kim ne yapabilir?</h3><div class="table-wrap"><table class="perm"><thead><tr><th>YETKİ</th>${roleOrder.map(k=>`<th class="c">${esc(S.d.roles[k]).toLocaleUpperCase('tr')}</th>`).join('')}</tr></thead><tbody>${permTable.map(([t,rs])=>`<tr><td>${t}</td>${roleOrder.map(k=>`<td class="c">${rs.includes(k)?'<span class="dot on">✓</span>':'<span class="dot">–</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
};
function trailPage(id){
  if(!isAna())return '<div class="empty">İz haritasını yalnızca ana yönetici görür.</div>';
  const a=ad(id);if(!a)return '<div class="empty">Yönetici bulunamadı.</div>';
  if(S.trail?.id!==id){S.trail={id,list:null};call('GET','/api/activity?admin='+id).then(list=>{S.trail={id,list};render()}).catch(e=>toast(e.message,true))}
  const list=S.trail.list;
  const head=`<div class="crumb"><a href="#/yoneticiler">YÖNETİCİLER</a> / İZ HARİTASI</div><div class="head"><div><h1>${esc(a.name)}</h1><p><span class="pill r-${a.role}">${esc(S.d.roles[a.role])}</span> · ${esc(a.email)} · son giriş ${a.lastLoginAt?ago(a.lastLoginAt):'—'}</p></div></div>`;
  if(!list)return head+'<div class="empty">Yükleniyor…</div>';
  const days={};for(const x of list){const d=x.at.slice(0,10);days[d]=(days[d]||0)+1}
  const max=Math.max(1,...Object.values(days)),cells=[];
  const start=new Date();start.setDate(start.getDate()-7*16+1);start.setDate(start.getDate()-((start.getDay()+6)%7));
  for(let d=new Date(start);d<=new Date();d.setDate(d.getDate()+1)){const k=d.toISOString().slice(0,10),n=days[k]||0;cells.push(`<i title="${date(k)}: ${n} işlem" style="--a:${n?(.25+.75*n/max).toFixed(2):0}"></i>`)}
  const types={};for(const x of list){const t=x.ref?.type||'diğer';types[t]=(types[t]||0)+1}
  const tName={login:'Giriş / çıkış',participant:'Katılımcı',application:'Başvuru',market:'Pazar',form:'Form',media:'Görsel',fee:'Ödeme',ledger:'Kasa',workshop:'Workshop',import:'İçe aktarma',bulk:'Toplu işlem',demo:'Örnek','diğer':'Diğer'};
  const grouped={};for(const x of list.slice(0,300)){(grouped[x.at.slice(0,10)]??=[]).push(x)}
  return head+`<div class="grid g4"><div class="stat o"><strong>${list.length}</strong><span>Toplam işlem</span></div><div class="stat y"><strong>${list.filter(x=>x.ref?.type==='login'&&/Giriş/.test(x.text)).length}</strong><span>Giriş</span></div><div class="stat p"><strong>${Object.keys(days).length}</strong><span>Aktif gün</span></div><div class="stat b"><strong>${list.filter(x=>Date.now()-new Date(x.at)<7*864e5).length}</strong><span>Son 7 gün</span></div></div>
  <div class="card" style="margin-top:40px"><h3>Son 16 hafta <span class="mono muted">HER KARE BİR GÜN</span></h3><div class="heat">${cells.join('')}</div></div>
  <div class="grid split" style="margin-top:40px"><div class="card"><h3>Zaman çizelgesi</h3>${Object.entries(grouped).map(([d,xs])=>`<div class="day"><span class="mono">${date(d).toLocaleUpperCase('tr')}</span><ul class="feed">${xs.map(x=>`<li>${esc(x.text)}<br><small class="muted">${new Date(x.at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</small></li>`).join('')}</ul></div>`).join('')||'<div class="empty">Henüz işlem yok.</div>'}</div>
  <div class="card cats"><h3>Ne üzerinde çalışmış</h3>${Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<div class="c"><div><span>${esc(tName[t]||t)}</span><b>${n}</b></div><div class="bar-meter"><i style="width:${n/list.length*100}%"></i></div></div>`).join('')}</div></div>`;
}
pages.hesap=()=>{
  const me=S.d.me,dt=x=>x?new Date(x).toLocaleString('tr-TR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  return `<div class="head"><div><h1>Hesabım</h1><p>${esc(me.name)} · <span class="pill r-${me.role}">${esc(S.d.roles[me.role])}</span></p></div><button class="btn" data-act="logout">Çıkış yap</button></div>
  <div class="grid split"><div class="card"><h3>Hesap bilgileri</h3><div class="list">
  <div class="item"><span>E-posta</span><b>${esc(me.email)}</b></div>
  <div class="item"><span>Rol</span><b>${esc(S.d.roles[me.role])}</b></div>
  <div class="item"><span>Hesap açılışı</span><b>${dt(me.createdAt)}</b></div>
  <div class="item"><span>Son giriş</span><b>${dt(me.lastLoginAt)}</b></div></div>
  <p class="muted" style="margin-top:18px"><b>Bu rolde neler yapabilirsin:</b> ${esc(roleDesc[me.role]||'')}</p></div>
  <form class="card" id="me-form" style="display:grid;gap:12px;align-content:start"><h3 style="margin:0">Bilgilerini güncelle</h3>${field('Ad soyad',`<input name="name" value="${esc(me.name)}">`)}${field('Yeni şifre','<input name="password" type="password" minlength="8" autocomplete="new-password">','değiştirmeyeceksen boş bırak · en az 8 karakter')}<button class="btn primary" style="justify-self:start">Kaydet</button><small class="muted">E-posta ya da rol değişikliği için ana yöneticiye yaz.</small></form></div>`;
};

// --- Katılımcı paneli: marka sahibi kendi sayfasını görür ---
const appStatusText={yeni:'Başvurun alındı, incelenecek',inceleniyor:'İnceleniyor',kabul:'Kabul edildi',yedek:'Yedek listedesin',red:'Bu sefer olmadı'};
const regText={bekliyor:'Kaydın alındı, onay bekliyor',onay:'Yerin ayrıldı',red:'Kayıt onaylanmadı'};
function renderPortal(){
  const d=S.d,p=d.participant,r=route(),v=['basvurularim','workshoplarim','markam','odeme','hesap'].includes(r.view)?r.view:'ana';
  const tabs=[['ana','Ana sayfa'],['basvurularim','Başvurularım'],['workshoplarim','Workshoplarım'],['markam','Markam'],['odeme','Ödeme bilgileri']];
  const pages={ana:portalHome,basvurularim:portalApps,workshoplarim:portalWs,markam:portalBrand,odeme:portalPay,hesap:portalAccount};
  $('#app').innerHTML=`<header class="bar"><div class="bar-top"><a class="wordmark" href="#/">FEVZİPAŞA<br>TASARIM PAZARI<span>KATILIMCI PANELİ</span></a><div class="bar-right"><a class="acc ${v==='hesap'?'on':''}" href="#/hesap">Hesabım · ${esc(d.me.name.split(' ')[0])}</a><a class="nav-pill" href="/" target="_blank">Site <span>↗</span></a><button class="acc out" data-act="logout">Çıkış</button><button class="menu-btn" data-act="menu">Menü</button></div></div>
  <nav id="side">${tabs.map(([k,t])=>`<a href="#/${k==='ana'?'':k}" class="${v===k?'on':''}">${t}</a>`).join('')}</nav></header>
  <main class="page">${v!=='ana'?'<button class="back" data-act="back">← Geri</button>':''}
  ${d.claimPending?`<div class="warnbox"><b>Hesabın markanla eşleştirilmeyi bekliyor.</b><span>Bu e-posta kayıtlı bir markaya ait. Ekibimiz onaylayınca marka bilgilerin ve ödemelerin burada görünür. Bu sırada başvuru yapabilir, workshoplara katılabilirsin.</span></div>`:''}
  ${pages[v]()}</main>
  <footer class="admin-foot"><div class="foot-who"><span>${esc(d.me.name)} · katılımcı</span><span><button data-act="logout">çıkış yap</button></span><button class="ver" data-act="versions">${verLabel()}</button></div><span class="foot-right"><small class="copy">© 2026 Fevzipaşa Tasarım Pazarı. Tüm hakları saklıdır.</small><a class="credit" href="https://thegoatzstudio.com/" target="_blank" rel="noopener">Bu site <b>THE GOATZ STUDIO</b> tarafından yapılmıştır.<img src="https://thegoatzstudio.com/favicon.ico" alt="" onerror="this.remove()"></a></span></footer>`;
  const wsq=new URLSearchParams(location.search).get('ws');if(wsq&&v==='ana'&&!S.wsJumped){S.wsJumped=true;const el=document.getElementById('ws-'+wsq);if(el){el.classList.add('hl');setTimeout(()=>el.scrollIntoView({block:'center'}),50)}}
}
function portalAccount(){
  const d=S.d,me=d.me,p=d.participant,dt=x=>x?new Date(x).toLocaleString('tr-TR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  return `<div class="head"><div><h1>Hesabım</h1><p>${esc(me.name)} · katılımcı</p></div><button class="btn" data-act="logout">Çıkış yap</button></div>
  <div class="grid split"><div class="card"><h3>Hesap bilgileri</h3><div class="list">
  <div class="item"><span>E-posta</span><b>${esc(me.email)}</b></div>
  <div class="item"><span>Marka</span>${p?`<a href="#/markam"><b>${esc(p.brandName)} →</b></a>`:'<b>Eşleştirme bekliyor</b>'}</div>
  <div class="item"><span>Hesap açılışı</span><b>${dt(me.createdAt)}</b></div>
  <div class="item"><span>Son giriş</span><b>${dt(me.lastLoginAt)}</b></div></div>
  <p class="muted" style="margin-top:18px">Marka bilgilerini <a href="#/markam">Markam</a> sekmesinden, ödeme bilgilerini <a href="#/odeme">Ödeme bilgileri</a> sekmesinden görebilirsin.</p></div>
  <form class="card" id="me-form" style="display:grid;gap:12px;align-content:start"><h3 style="margin:0">Bilgilerini güncelle</h3>${field('Ad soyad',`<input name="name" value="${esc(me.name)}">`)}${field('Yeni şifre','<input name="password" type="password" minlength="8" autocomplete="new-password">','değiştirmeyeceksen boş bırak · en az 8 karakter')}<button class="btn primary" style="justify-self:start">Kaydet</button><small class="muted">E-posta değişikliği için ekibe yaz.</small></form></div>`;
}
const dRange=(a,b)=>a?date(a)+(b&&b!==a?' – '+date(b):''):'Tarih yakında';
function formCard(f){
  return `<div class="pcard-row"><div><span class="mono">${esc(f.market.toLocaleUpperCase('tr'))}</span><b>${esc(f.title)}</b><small>${dRange(f.startDate,f.endDate)}${f.location?' · '+esc(f.location):''}${f.fee?' · katılım ücreti '+money(f.fee):''}${f.deadline?' · son başvuru '+date(f.deadline):''}</small></div>
  ${f.applied?`<span class="state">${pill('app',f.applied.status)}<small>${appStatusText[f.applied.status]||''}</small></span>`:`<a class="btn primary big" href="/basvuru/${f.id}">Başvur ↗</a>`}</div>`;
}
function wsCard(w){
  const full=w.left===0&&!w.reg;
  return `<div class="pcard-row" id="ws-${w.id}"><div><span class="mono">${esc((w.market||'WORKSHOP').toLocaleUpperCase('tr'))}${w.date?' · '+date(w.date).toLocaleUpperCase('tr'):''}${w.time?' · '+esc(w.time):''}</span><b>${esc(w.title)}</b><small>${w.organizer?'Düzenleyen: '+esc(w.organizer)+' · ':''}${w.paid?`<b class="price">${money(w.price)}</b>`:'<b class="price free">Ücretsiz</b>'}${w.duration?' · '+w.duration+' dk':''}${w.left!=null?` · ${w.left?w.left+' kişilik yer kaldı':'kontenjan dolu'}`:''}${w.location?' · '+esc(w.location):''}</small>${w.description?`<small class="desc">${esc(w.description)}</small>`:''}</div>
  ${w.reg?`<span class="state">${pill('reg',w.reg.status)}<small>${regText[w.reg.status]}</small>${w.reg.status!=='red'?`<button class="btn sm ghost" data-act="ws-leave" data-v="${w.id}">Kaydı iptal et</button>`:''}</span>`:full?'<span class="state"><small>Kontenjan dolu</small></span>':`<button class="btn big blue" data-act="ws-join" data-v="${w.id}" data-paid="${w.paid?1:0}">Katıl</button>`}</div>`;
}
function portalHome(){
  const d=S.d,first=d.me.name.split(' ')[0];
  return `<div class="head"><div><h1>Merhaba ${esc(first)}.</h1><p>Pazara başvurmak ve workshoplara katılmak için aşağıdaki iki bölümü kullan. Başvurunun ve kayıtlarının durumunu da buradan takip edebilirsin.</p></div></div>
  <div class="paths"><button class="path apply" data-act="scrollto" data-v="apply"><span class="mono">01</span><b>Pazara başvur</b><small>Stant açmak için. Markanla başvurursun, ekip değerlendirir.</small><i>${d.openForms.filter(f=>!f.applied).length} açık başvuru ↓</i></button><button class="path ws" data-act="scrollto" data-v="ws"><span class="mono">02</span><b>Workshop'a katıl</b><small>Atölyelere katılımcı olarak yer ayırt. Ücretli ya da ücretsiz.</small><i>${d.workshops.filter(w=>!w.reg).length} workshop ↓</i></button></div>
  <section class="zone apply" id="apply"><div class="zone-head"><span class="mono">01 · STANT BAŞVURUSU</span><h2>Pazara başvur</h2><p>Pazarda stant açmak istiyorsan başvuru formunu doldur. Bilgilerin hesabından otomatik gelir.</p></div>
  ${d.openForms.length?d.openForms.map(formCard).join(''):'<div class="empty">Şu an açık bir başvuru dönemi yok. Yeni pazar duyurulunca burada görünecek.</div>'}</section>
  <section class="zone ws" id="ws"><div class="zone-head"><span class="mono">02 · WORKSHOP KATILIMI</span><h2>Workshop'a katıl</h2><p>Pazar boyunca yapılacak atölyeler. Yerini ayırt, ekip onaylayınca kesinleşir.${d.payment?.iban?' Ücretli workshoplarda ödemeyi havale/EFT ile yapabilirsin.':''}</p></div>
  ${d.workshops.length?d.workshops.map(wsCard).join(''):'<div class="empty">Yaklaşan workshop yok.</div>'}</section>`;
}
function portalApps(){
  const d=S.d;
  return `<div class="head"><div><h1>Başvurularım</h1><p>Pazar başvurularının durumu ve katıldığın pazarlar.</p></div><button class="btn primary" data-act="scrollto" data-v="apply">+ Yeni başvuru</button></div>
  <div class="grid g2"><div class="card"><h3>Başvurular</h3><div class="list">${d.applications.map(a=>`<div class="item"><span><b>${esc(a.form||a.market)}</b><br><small class="muted">${date(a.createdAt)} · ${appStatusText[a.status]||''}</small></span>${pill('app',a.status)}</div>`).join('')||'<div class="empty">Henüz başvurun yok.</div>'}</div></div>
  <div class="card"><h3>Katıldığın pazarlar</h3><div class="list">${d.markets.map(m=>`<div class="item"><span><b>${esc(m.name)}</b><br><small class="muted">${dRange(m.startDate,m.endDate)}</small></span><span>${m.fee.amount?`<small class="muted">${money(m.fee.paid)} / ${money(m.fee.amount)}</small> `:''}${pill('fee',m.fee.amount<=0?'ucretsiz':m.fee.paid>=m.fee.amount?'odendi':m.fee.paid>0?'kismi':'bekliyor')}</span></div>`).join('')||'<div class="empty">Henüz bir pazara katılmadın.</div>'}</div></div></div>`;
}
function portalWs(){
  const d=S.d;
  return `<div class="head"><div><h1>Workshoplarım</h1><p>Yer ayırttığın workshoplar ve durumları.</p></div></div>
  <section class="zone ws">${d.myWorkshops.length?d.myWorkshops.map(w=>`<div class="pcard-row"><div><span class="mono">${w.date?date(w.date).toLocaleUpperCase('tr'):''}${w.time?' · '+esc(w.time):''}</span><b>${esc(w.title)}</b><small>${w.paid?money(w.price):'Ücretsiz'}${w.status==='iptal'?' · workshop iptal edildi':''}</small></div><span class="state">${pill('reg',w.reg.status)}<small>${regText[w.reg.status]}</small></span></div>`).join(''):`<div class="empty big">Henüz bir workshopa kaydın yok.<a class="btn big blue" href="#/">Workshoplara göz at</a></div>`}</section>`;
}
function portalPay(){
  const pay=S.d.payment||{},due=S.d.markets.filter(m=>m.fee.amount>m.fee.paid);
  return `<div class="head"><div><h1>Ödeme bilgileri</h1><p>Katılım ve workshop ücretlerini havale ya da EFT ile ödeyebilirsin.</p></div></div>
  ${pay.iban?`<div class="bank"><div><span class="mono">BANKA</span><b>${esc(pay.bank||'—')}</b></div><div><span class="mono">ALICI</span><b>${esc(pay.holder||'—')}</b></div><div class="iban"><span class="mono">IBAN</span><b>${esc(pay.iban)}</b><button class="btn sm" data-act="copy" data-v="${esc(pay.iban.replace(/ /g,''))}">Kopyala</button></div>${pay.note?`<p>${esc(pay.note)}</p>`:''}</div>`:'<div class="empty">Ödeme bilgileri henüz eklenmedi. Ekip ekleyince burada görünür.</div>'}
  <div class="card" style="margin-top:40px"><h3>Bekleyen ödemelerin</h3><div class="list">${(due.map(m=>`<div class="item"><span><b>${esc(m.name)}</b><br><small class="muted">katılım ücreti ${money(m.fee.amount)} · ödenen ${money(m.fee.paid)}</small></span><b>${money(m.fee.amount-m.fee.paid)}</b></div>`).join('')+S.d.myWorkshops.filter(w=>w.paid&&w.reg.status!=='red').map(w=>`<div class="item"><span><b>${esc(w.title)}</b><br><small class="muted">workshop ücreti</small></span><b>${money(w.price)}</b></div>`).join(''))||'<div class="empty">Bekleyen ödemen yok.</div>'}</div><p class="muted" style="font-size:12px">Açıklamaya marka adını yazmayı unutma. Ödemen ekip tarafından işaretlenince burada güncellenir.</p></div>`;
}
function portalBrand(){
  const d=S.d,p=d.participant;
  if(!p)return '<div class="empty big">Marka bilgilerin, hesabın eşleştirilince burada açılır.</div>';
  const pend=p.pending?.changes||{},pf=L.pf,vv=k=>pend[k]??p[k]??'';
  const logo=d.media.find(m=>m.category==='Logo'),imgs=d.media.filter(m=>m.category!=='Logo');
  return `<div class="head"><div><h1>${esc(p.brandName)}</h1><p>Marka bilgilerin, logon ve ürün görsellerin. Değişiklikler organizatör onayıyla yayımlanır.</p></div></div>
  ${p.pending?`<div class="warnbox"><b>Değişikliklerin organizatör onayı bekliyor.</b><span>${Object.keys(pend).map(k=>esc(pf[k]||k)).join(', ')} · ${ago(p.pending.at)} gönderildi.</span><div><button class="btn sm" data-act="portal-cancel">Geri çek</button></div></div>`:''}
  <div class="drawer-grid" style="margin-top:20px"><form class="card" id="portal-form" style="display:grid;gap:14px"><h3 style="margin:0">Marka bilgilerim</h3>
  <div class="grid g2">${field(pf.brandName,`<input name="brandName" required value="${esc(vv('brandName'))}">`)}${field(pf.contactName,`<input name="contactName" value="${esc(vv('contactName'))}">`)}${field(pf.email,`<input name="email" type="email" value="${esc(vv('email'))}">`)}${field(pf.phone,`<input name="phone" value="${esc(vv('phone'))}">`)}
  ${field(pf.instagram,`<span class="ig-in"><span>@</span><input name="instagram" value="${esc(String(vv('instagram')).replace(/^@/,''))}" placeholder="kullaniciadi"></span>`)}${field(pf.website,`<input name="website" value="${esc(vv('website'))}">`)}</div>
  ${field(pf.category,`<select name="category">${opts(d.categories.map(c=>[c,c]),vv('category'),'— seç —')}</select>`)}
  ${field(pf.description,`<textarea name="description">${esc(vv('description'))}</textarea>`,'ürünlerini ve markanı birkaç cümleyle anlat')}
  <div class="row"><button class="btn primary">Onaya gönder</button></div></form>
  <div class="card"><h3>Logo <button class="btn sm" data-act="portal-upload" data-cat="Logo">${logo?'Değiştir':'+ Logo yükle'}</button></h3><div class="logo-box">${logo?`<img src="/media/${logo.id}" alt="${esc(p.brandName)} logosu">`:'<span>Logo yok</span>'}</div><p class="muted" style="font-size:12px">Kare alana sığdırılır. PNG ya da SVG önerilir.</p></div></div>
  <div class="card" style="margin-top:40px"><h3>Görsellerim <button class="btn sm primary" data-act="portal-upload" data-cat="Katılımcı ürünleri">+ Görsel ekle</button></h3>${imgs.length?`<div class="thumbs">${imgs.map(m=>`<figure class="thumb"><div class="img"><img src="/media/${m.id}" alt="" loading="lazy"></div><div class="cap"><b>${esc(m.title)}</b>${m.mine?`<button class="btn sm ghost" data-act="portal-media-del" data-v="${m.id}">Sil</button>`:''}</div></figure>`).join('')}</div>`:'<div class="empty">Henüz görsel yok. Ürün fotoğraflarını ekle.</div>'}</div>
  `;
}

// --- Genel arama ---
function searchAll(s){
  s=s.toLocaleLowerCase('tr');if(s.length<2)return [];
  const has=(...v)=>v.join(' ').toLocaleLowerCase('tr').includes(s),hits=[];
  for(const p of S.d.participants)if(has(p.brandName,p.contactName,p.email,p.instagram,p.category,...p.tags))hits.push(['Katılımcı',p.brandName,`#/katilimcilar/${p.id}`]);
  for(const a of S.d.applications)if(has(...Object.values(a.answers).flat()))hits.push(['Başvuru',appName(a),`#/basvurular/${a.id}`]);
  for(const f of S.d.forms)if(has(f.title))hits.push(['Form',f.title,`#/formlar/${f.id}`]);
  for(const m of S.d.markets)if(has(m.name,m.location))hits.push(['Pazar',m.name,`#/pazarlar/${m.id}`]);
  for(const w of S.d.workshops)if(has(w.title,w.organizer))hits.push(['Workshop',w.title,`#/workshoplar?ac=${w.id}`]);
  for(const e of S.d.ledger)if(has(e.title,e.paidBy,e.category))hits.push([e.type==='gelir'?'Gelir':'Masraf',e.title,'#/kasa?sekme='+(e.type==='gelir'?'gelirler':'masraflar')]);
  for(const m of S.d.media)if(has(m.title,m.filename,...m.tags))hits.push(['Görsel',m.title,`#/gorseller?m=${m.marketId||'genel'}&ara=${encodeURIComponent(m.title)}`]);
  return hits.slice(0,14);
}
function showResults(){
  const box=$('#results'),v=$('#q').value;S.q=v;S.searchHits=searchAll(v);
  box.className=S.searchHits.length||v.length>1?'results':'';
  box.innerHTML=v.length>1?(S.searchHits.map(([t,n,h],i)=>`<a href="${h}" class="${i?'':'hl'}"><span>${esc(n)}</span><span class="mono muted">${t}</span></a>`).join('')||'<p class="muted" style="padding:8px;margin:0">Sonuç yok.</p>'):'';
}

// --- Olaylar ---
const newId=()=>'fld_'+[...crypto.getRandomValues(new Uint8Array(6))].map(b=>b.toString(16).padStart(2,'0')).join('');
const actions={
  'pass-toggle':el=>{const i=el.previousElementSibling,show=i.type==='password';i.type=show?'text':'password';el.textContent=show?'Gizle':'Göster';el.setAttribute('aria-label',show?'Şifreyi gizle':'Şifreyi göster')},
  versions:()=>modal(`<span class="mono">SÜRÜM NOTLARI</span><h2>Neler değişti?</h2><div class="versions">${(S.versions||[]).map((x,i)=>`<section class="${i?'':'now'}"><div><b>${esc(x.v)}</b><small>${date(x.date).toLocaleLowerCase('tr')}${i?'':' · kullandığın sürüm'}</small></div><ul>${x.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></section>`).join('')||'<div class="empty">Sürüm bilgisi yok.</div>'}</div><div class="actions"><button type="button" class="btn primary" data-act="close">Tamam</button></div>`,()=>closeModal(),'wide'),
  logout:async()=>{await call('POST','/api/auth/logout');S.d=null;start()},
  menu:el=>{const o=$('#side').classList.toggle('open');el.textContent=o?'Kapat':'Menü'},
  close:()=>closeModal(),
  copy:async el=>{try{await navigator.clipboard.writeText(el.dataset.v);toast('Bağlantı kopyalandı')}catch{prompt('Bağlantıyı kopyala:',el.dataset.v)}},
  scope:el=>{S.market=el.dataset.v;store.set('fp-market',S.market);render();toast('Panel bu pazara odaklandı')},
  view:el=>{S.view=el.dataset.v;store.set('fp-view',S.view);render()},
  'market-new':()=>marketModal(),
  'market-edit':el=>marketModal(mk(el.dataset.v)),
  'market-del':el=>confirm('Bu pazar silinsin mi? Sıra numarası bir daha kullanılamaz.')&&act(async()=>{await call('DELETE',`/api/markets/${el.dataset.v}`);if(S.market===el.dataset.v){S.market='all';store.set('fp-market','all')}location.hash='#/pazarlar'},'Pazar silindi'),
  'form-new':el=>newFormModal(el.dataset.v),
  'form-copy-into':el=>copyFormModal(el.dataset.v,el.dataset.form),
  'form-del':el=>confirm('Bu form silinsin mi?')&&act(async()=>{await call('DELETE',`/api/forms/${el.dataset.v}`);S.draft=null;location.hash='#/formlar'},'Form silindi'),
  'form-pub':el=>act(async()=>{const f=await call('PUT',`/api/forms/${S.draft.id}`,{...S.draft,status:el.dataset.v});S.draft=structuredClone(f)},el.dataset.v==='acik'?'Form yayında; bağlantıyı paylaşabilirsin':'Form yayından kaldırıldı'),
  'form-save':()=>act(async()=>{const f=await call('PUT',`/api/forms/${S.draft.id}`,S.draft);S.draft=structuredClone(f)},'Form kaydedildi'),
  'field-open':el=>{S.openField=S.openField===el.dataset.v?null:el.dataset.v;render()},
  'field-add':el=>{const t=el.dataset.v,f={id:newId(),type:t,label:t==='heading'?'Yeni bölüm':t==='consent'?'Koşulları okudum ve kabul ediyorum.':L.type[t],required:false,help:'',options:['select','checkboxes'].includes(t)?['Seçenek 1','Seçenek 2']:[],mapTo:''};S.draft.fields.push(f);S.openField=f.id;render()},
  'field-move':el=>{const i=+el.dataset.v,j=i+ +el.dataset.dir,F=S.draft.fields;if(j<0||j>=F.length)return;[F[i],F[j]]=[F[j],F[i]];render()},
  'field-dup':el=>{const i=+el.dataset.v,c={...structuredClone(S.draft.fields[i]),id:newId()};c.label+=' (kopya)';S.draft.fields.splice(i+1,0,c);S.openField=c.id;render()},
  'field-del':el=>{S.draft.fields.splice(+el.dataset.v,1);render()},
  'app-status':el=>act(()=>call('PUT',`/api/applications/${route().id}`,{status:el.dataset.v}),'Durum güncellendi'),
  'app-rate':el=>act(()=>call('PUT',`/api/applications/${route().id}`,{rating:+el.dataset.v})),
  'app-accept':()=>act(async()=>{const r=await call('POST',`/api/applications/${route().id}/accept`);location.hash=`#/katilimcilar/${r.participant.id}`},'Kabul edildi, katılımcı kartı hazır'),
  'app-del':()=>confirm('Başvuru ve ona ait görseller silinsin mi?')&&act(async()=>{await call('DELETE',`/api/applications/${route().id}`);location.hash='#/basvurular'},'Başvuru silindi'),
  'demo-add':()=>act(()=>call('POST','/api/demo/applications',{marketId:S.market==='all'?'':S.market}),'4 örnek başvuru eklendi'),
  'demo-all':()=>act(()=>call('POST','/api/demo/all'),'Örnek veriler yüklendi'),
  'demo-all-del':()=>confirm('Tüm örnek veriler silinsin mi? Gerçek kayıtların kalır.')&&act(()=>call('DELETE','/api/demo/all'),'Örnek veriler silindi'),
  'demo-del':()=>confirm('Örnek başvurular silinsin mi?')&&act(()=>call('DELETE','/api/demo/applications'),'Örnek başvurular silindi'),
  'part-new':()=>newParticipantModal(),
  'part-del':el=>confirm('Katılımcı silinsin mi? Görselleri depoda kalır.')&&act(async()=>{await call('DELETE',`/api/participants/${el.dataset.v}`);location.hash='#/katilimcilar'},'Katılımcı silindi'),
  'part-save-stay':()=>act(()=>call('PUT',`/api/participants/${route().id}`,formData($('#part-form'))),'Katılımcı kaydedildi'),
  'sel-all':el=>{for(const id of S.listIds||[])el.checked?S.sel.add(id):S.sel.delete(id);render()},
  'bulk-clear':()=>{S.sel.clear();render()},
  bulk:el=>{
    const op=el.dataset.v,ids=[...S.sel],body={ids,op,marketId:$('#bulk-market')?.value,category:$('#bulk-cat')?.value};
    if(op==='category'&&!body.category)return toast('Önce kategori seç',true);
    if(op==='tag'){body.tag=prompt('Eklenecek etiket:');if(!body.tag)return}
    if(op==='delete'&&!confirm(`${ids.length} katılımcı silinsin mi?`))return;
    act(async()=>{const r=await call('POST','/api/participants/bulk',body);if(op==='delete')S.sel.clear();if(r.skipped)setTimeout(()=>toast(`${r.skipped} kayıt başka yöneticiye ait olduğu için atlandı`,true),3300);return r},`${ids.length} katılımcıya uygulandı`);
  },
  'ws-new':()=>workshopModal(),
  'ws-img-del':el=>confirm('Görsel silinsin mi?')&&(async()=>{try{await call('DELETE',`/api/workshops/${el.dataset.w}/images/${el.dataset.v}`);await refresh();toast('Görsel silindi');workshopModal(S.d.workshops.find(x=>x.id===el.dataset.w))}catch(e){toast(e.message,true)}})(),
  'ws-open':el=>workshopModal(S.d.workshops.find(w=>w.id===el.dataset.v)),
  'ws-del':el=>confirm('Workshop silinsin mi?')&&act(async()=>{await call('DELETE',`/api/workshops/${el.dataset.v}`);closeModal()},'Workshop silindi'),
  'ledger-new':el=>ledgerModal(null,el.dataset.v),
  'ledger-open':el=>ledgerModal(S.d.ledger.find(e=>e.id===el.dataset.v)),
  'ledger-del':el=>confirm('Kasa kaydı silinsin mi?')&&act(async()=>{await call('DELETE',`/api/ledger/${el.dataset.v}`);closeModal()},'Kayıt silindi'),
  upload:el=>uploadModal(el.dataset),
  import:el=>importModal(el.dataset.v),
  'fee-edit':el=>feeModal(el.dataset.p,el.dataset.m),
  'fee-fill':el=>{const f=el.form;f.paid.value=f.amount.value;if(!f.date.value)f.date.value=today()},
  'fee-paid':el=>paidModal(el.dataset.p,el.dataset.m),
  'fee-paid-go':el=>{const p=pt(el.dataset.p),m=mk(el.dataset.m),f=feeOf(p,m);act(async()=>{await call('PUT',`/api/participants/${p.id}/fees/${m.id}`,{...f,paid:f.amount,method:el.dataset.v,date:$('#paid-date')?.value||today()});closeModal()},`${p.brandName}: ${L.method[el.dataset.v]} ile ödendi`)},
  'media-open':el=>mediaModal(el.dataset.v),
  'media-del':el=>confirm('Dosya kalıcı olarak silinsin mi?')&&act(async()=>{await call('DELETE',`/api/media/${el.dataset.v}`);closeModal()},'Dosya silindi'),
  'admin-new':()=>{const rs=S.d.assignable||[];modal(`<span class="mono">YENİ KULLANICI</span><h2>Kullanıcı ekle</h2>${field('Ad soyad','<input name="name" required>')}${field('E-posta','<input name="email" type="email" required>')}${field('Rol',`<div class="seg col">${rs.map(k=>`<label><input type="radio" name="role" value="${k}" ${k===(rs.includes('editor')?'editor':rs[0])?'checked':''}><span><b>${S.d.roles[k]}</b> ${roleDesc[k]}</span></label>`).join('')}</div>`)}<div id="prt-pick" hidden>${field('Hangi marka?',`<select name="participantId"><option value="">— marka seç —</option>${[...S.d.participants].sort((a,b)=>a.brandName.localeCompare(b.brandName,'tr')).map(p=>`<option value="${p.id}">${esc(p.brandName)}</option>`).join('')}</select>`,'katılımcı yalnızca bu markanın sayfasını görür')}</div>${field('Geçici şifre','<input name="password" required minlength="8">','kişiye ilet, sonra kendisi değiştirsin')}${actions2('Ekle')}`,async d=>{await call('POST','/api/admins',d);await refresh();closeModal();toast('Kullanıcı eklendi');render()},'wide');
    const sync=()=>{const x=$('#prt-pick');if(x)x.hidden=$('#modal [name=role]:checked')?.value!=='katilimci'};$('#modal').addEventListener('change',sync);sync()},
  'change-ok':el=>act(()=>call('POST',`/api/participants/${el.dataset.v}/changes`,{approve:true}),'Değişiklik onaylandı'),
  'change-no':el=>confirm('Değişiklik reddedilsin mi?')&&act(()=>call('POST',`/api/participants/${el.dataset.v}/changes`,{approve:false}),'Değişiklik reddedildi'),
  'form-publish':el=>act(()=>call('PUT',`/api/forms/${el.dataset.v}`,{...fm(el.dataset.v),status:'acik'}),'Form yayında; bağlantıyı paylaşabilirsin'),
  back:()=>{if(S.navDepth>0){S.backing=true;history.back()}else{const r=route();location.hash=r.id?'#/'+r.view:'#/'}},
  scrollto:el=>{const go=()=>document.getElementById(el.dataset.v)?.scrollIntoView({behavior:'smooth'});if(route().view!=='genel'&&location.hash!=='#/'){location.hash='#/';setTimeout(go,60)}else go()},
  'reg-set':el=>act(async()=>{await call('PUT',`/api/workshops/${el.dataset.w}/registrations/${el.dataset.r}`,{status:el.dataset.v});closeModal();setTimeout(()=>workshopModal(S.d.workshops.find(w=>w.id===el.dataset.w)))},el.dataset.v==='onay'?'Kayıt onaylandı':'Kayıt reddedildi'),
  'pay-edit':()=>{const p=S.d.settings?.payment||{};modal(`<span class="mono">KASA</span><h2>Ödeme bilgileri</h2><p class="muted" style="margin:0">Havale / EFT için. Katılımcı panelinde “Ödeme bilgileri” sayfasında görünür.</p>${field('Banka',`<input name="bank" value="${esc(p.bank||'')}" placeholder="Örn. Ziraat Bankası">`)}${field('Alıcı adı',`<input name="holder" value="${esc(p.holder||'')}" placeholder="Hesap sahibi">`)}${field('IBAN',`<input name="iban" value="${esc(p.iban||'')}" placeholder="TR00 0000 0000 0000 0000 0000 00">`)}${field('Not',`<textarea name="note" placeholder="Örn. Açıklamaya marka adını yazın.">${esc(p.note||'')}</textarea>`)}${actions2('Kaydet')}`,async d=>{await call('PUT','/api/settings/payment',d);await refresh();closeModal();toast('Ödeme bilgileri kaydedildi');render()})},
  'claim-link':el=>act(()=>call('PUT',`/api/admins/${el.dataset.v}`,{link:el.dataset.ok==='1'}),el.dataset.ok==='1'?'Hesap markayla eşleştirildi':'Eşleştirme reddedildi'),
  'ws-join':el=>{const go=()=>act(()=>call('POST',`/api/portal/workshops/${el.dataset.v}`,{}),'Yerin ayrıldı; ekip onaylayınca kesinleşir');if(el.dataset.paid==='1'&&S.d.payment?.iban){if(confirm('Bu workshop ücretli. Kaydın onaylanınca ödemeyi “Ödeme bilgileri” sayfasındaki IBAN’a havale/EFT ile yapabilirsin. Devam edilsin mi?'))go()}else go()},
  'ws-leave':el=>confirm('Workshop kaydın iptal edilsin mi?')&&act(()=>call('DELETE',`/api/portal/workshops/${el.dataset.v}`),'Kaydın iptal edildi'),
  'auth-mode':el=>{S.authMode=el.dataset.v;start()},
  'portal-cancel':()=>act(()=>call('DELETE','/api/portal/profile'),'Değişiklik geri çekildi'),
  'portal-upload':el=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.multiple=el.dataset.cat!=='Logo';i.onchange=()=>act(async()=>call('POST','/api/portal/media',{category:el.dataset.cat,files:await readFiles(i.files)}),'Görsel yüklendi');i.click()},
  'portal-media-del':el=>confirm('Görsel silinsin mi?')&&act(()=>call('DELETE','/api/portal/media',{id:el.dataset.v}),'Görsel silindi'),
  'admin-pass':el=>modal(`<span class="mono">ŞİFRE</span><h2>Şifre belirle</h2>${field('Yeni şifre','<input name="password" required minlength="8">')}${actions2()}`,async d=>{await call('PUT',`/api/admins/${el.dataset.v}`,d);closeModal();toast('Şifre güncellendi')}),
  'admin-toggle':el=>act(()=>call('PUT',`/api/admins/${el.dataset.v}`,{active:ad(el.dataset.v).active===false}),'Güncellendi')
};

document.addEventListener('click',e=>{
  if(e.target.id==='modal'){closeModal();return}
  const sel=e.target.closest('[data-sel]');
  if(sel){e.stopPropagation();sel.checked?S.sel.add(sel.dataset.sel):S.sel.delete(sel.dataset.sel);syncBulk();return}
  const el=e.target.closest('[data-act]');
  if(el&&actions[el.dataset.act]){if(el.tagName!=='A'&&el.type!=='checkbox')e.preventDefault();if(el.tagName==='TR'&&e.target.closest('a,button,select,input'))return;actions[el.dataset.act](el,e);return}
  const row=e.target.closest('tr[data-href]');if(row&&!e.target.closest('a,button,select,input'))location.hash=row.dataset.href;
  if(!e.target.closest('.search')&&$('#results'))$('#results').className='';
});
document.addEventListener('submit',async e=>{
  const f=e.target;
  if(f.matches('[data-modal]')){e.preventDefault();try{await S.modalSubmit(formData(f),f)}catch(err){$('#modal-err').textContent=err.message;const b=f.querySelector('.btn.primary');if(b&&b.textContent==='Yükleniyor…')b.textContent='Yükle'}}
  if(f.id==='portal-form'){e.preventDefault();act(()=>call('PUT','/api/portal/profile',formData(f)),'Değişikliklerin onaya gönderildi');return}
  if(f.id==='part-form'){e.preventDefault();act(async()=>{await call('PUT',`/api/participants/${route().id}`,formData(f));location.hash='#/katilimcilar'},'Katılımcı kaydedildi')}
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
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.id==='market-pick'){S.market=el.value;store.set('fp-market',S.market);render();return}
  if(el.dataset.f!==undefined&&el.dataset.full!==undefined&&S.draft){const f=S.draft.fields[+el.dataset.f];f[el.dataset.k]=el.value;if(el.dataset.k==='type'){if(!['select','checkboxes'].includes(f.type))f.options=[];else if(!f.options.length)f.options=['Seçenek 1','Seçenek 2'];if(['file','consent','heading','checkboxes'].includes(f.type))f.mapTo=''}render();return}
  if(el.dataset.bind==='marketId'||el.dataset.bind==='status'){afterDraftEdit();return}
  if(el.dataset.adminRole)act(()=>call('PUT',`/api/admins/${el.dataset.adminRole}`,{role:el.value}),'Rol güncellendi');
  if(el.id==='app-notes')act(()=>call('PUT',`/api/applications/${route().id}`,{notes:el.value}),'Not kaydedildi');
  const navKey=el.dataset.nav||el.dataset.navP||el.dataset.navM||el.dataset.navO;
  if(navKey){const r=route(),q=new URLSearchParams(r.q);el.value&&el.value!=='all'||navKey!=='pazar'?(el.value?q.set(navKey,el.value):q.delete(navKey)):q.set(navKey,'all');const view=el.dataset.nav?'basvurular':el.dataset.navP?'katilimcilar':el.dataset.navO?r.view:'gorseller';location.hash=`#/${view}?${q}`}
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
  if(S.backing){S.backing=false;S.navDepth--}else S.navDepth=(S.navDepth||0)+1;
  if(S.draft&&route().id!==S.draft.id){const saved=fm(S.draft.id);if(saved&&JSON.stringify(saved)!==JSON.stringify(S.draft)&&!confirm('Formdaki kaydedilmemiş değişiklikler silinsin mi?')){history.back();return}S.draft=null}
  if(route().view!=='yoneticiler')S.trail=null;
  S.q='';$('#side')?.classList.remove('open');render();
  if(S.d)refresh().then(render).catch(()=>{});
});
// Yeni başvurular sayfayı yenilemeden görünsün: sekmeye dönünce ve dakikada bir veriyi tazele.
const live=()=>{if(S.d&&document.visibilityState==='visible'&&!$('#modal').open&&!document.activeElement?.closest('input,textarea,select'))refresh().then(render).catch(()=>{})};
addEventListener('focus',live);setInterval(live,60000);
addEventListener('beforeunload',e=>{if(S.draft&&JSON.stringify(fm(S.draft.id))!==JSON.stringify(S.draft))e.preventDefault()});
start();
