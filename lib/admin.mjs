// Admin paneli, başvuru formları ve görsel deposu için HTTP uç noktaları.
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {scryptSync,randomBytes,timingSafeEqual} from 'node:crypto';
import {toCsv,toXlsx,readTable} from './sheet.mjs';
import {addDemo,removeDemo,hasDemo} from './demo.mjs';
import {load,save,id,now,slugify,log,uploadDir,defaultFields,participantFields,categories,normalizeCategory,igHandle} from './store.mjs';

const root=new URL('../',import.meta.url);
const sessions=new Map();
const SESSION_MS=1000*60*60*12;
export const mediaCategories=['Logo','Katılımcı ürünleri','Afiş & kimlik','Başvuru görselleri','Etkinlik fotoğrafları','Workshop','Sosyal medya','Basın','Fatura & fiş','Diğer'];
const imageTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg','application/pdf':'pdf'};
const staticFiles={'/katilim':'admin/index.html','/katilim/':'admin/index.html','/admin':'admin/index.html','/admin/':'admin/index.html','/admin/admin.css':'admin/admin.css','/admin/admin.js':'admin/admin.js','/basvuru/basvuru.js':'basvuru/basvuru.js','/admin/surumler.json':'admin/surumler.json'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};

// Roller: ana yönetici tektir ve her şeyin üzerindedir. Diğerleri yalnızca kendi girdikleri kayıtları değiştirebilir.
// Katılımcı panele girer ama yalnızca kendi marka sayfasını görür (portal).
const roleNames={ana:'Ana yönetici',yonetici:'Yönetici',organizator:'Organizatör',editor:'Editör',katilimci:'Katılımcı'};
const Y='yonetici',O='organizator',E='editor';
const perms={
  users:[Y],trail:[],demoAll:[],appDelete:[Y],participantDelete:[Y],
  marketWrite:[Y,O],formWrite:[Y,O],appAccept:[Y,O],appReview:[Y,O],bulk:[Y,O],import:[Y,O],demo:[Y,O],
  participantWrite:[Y,O],changeApprove:[Y,O],feeWrite:[Y,O],ledgerRead:[Y,O],ledgerWrite:[Y,O],
  workshopWrite:[Y,O,E],mediaWrite:[Y,O,E],appNote:[Y,O,E]
};
// Yönetici; organizatör, editör ve katılımcı ekler. Yönetici eklemek yalnızca ana yöneticinin işidir.
const assignableBy=admin=>admin.role==='ana'?[Y,O,E,'katilimci']:[O,E,'katilimci'];

const SENT=Symbol('sent');
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};

export async function handle(req,res,pathname){
  if(!(pathname in staticFiles)&&!pathname.startsWith('/api/')&&!pathname.startsWith('/media/')&&!pathname.startsWith('/basvuru/'))return false;
  try{
    if(staticFiles[pathname]){const file=staticFiles[pathname];send(res,200,await readFile(new URL(file,root)),mime[file.slice(file.lastIndexOf('.'))]);return true}
    if(pathname.startsWith('/basvuru/')){send(res,200,await readFile(new URL('basvuru/index.html',root)),mime['.html']);return true}
    const db=await load();
    if(pathname.startsWith('/media/')){await serveMedia(req,res,db,pathname.slice(7));return true}
    const body=['POST','PUT'].includes(req.method)?await readJson(req):{};
    const result=await api(req,res,db,pathname,body);
    if(result!==SENT)json(res,200,result);
  }catch(err){
    if(err instanceof HttpError)json(res,err.status,{error:err.message});
    else{console.error(err);json(res,500,{error:'Sunucu hatası'})}
  }
  return true;
}

function send(res,status,data,type,extra={}){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(data);return SENT}
function json(res,status,data,extra={}){return send(res,status,JSON.stringify(data),'application/json; charset=utf-8',extra)}

function readJson(req){
  return new Promise((resolve,reject)=>{
    let size=0;const chunks=[];
    req.on('data',c=>{size+=c.length;if(size>80*1024*1024){reject(new HttpError(413,'Dosyalar çok büyük'));req.destroy()}else chunks.push(c)});
    req.on('end',()=>{try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{})}catch{reject(new HttpError(400,'Geçersiz istek'))}});
    req.on('error',reject);
  });
}

// --- Oturum ve yetki ---
function hashPassword(password,salt=randomBytes(16).toString('hex')){return {salt,hash:scryptSync(password,salt,64).toString('hex')}}
function checkPassword(admin,password){const {hash}=hashPassword(password,admin.salt);return timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(admin.hash,'hex'))}
function cookieToken(req){return /(?:^|;\s*)fp_admin=([a-f0-9]{64})/.exec(req.headers.cookie||'')?.[1]}
function currentAdmin(req,db){
  const token=cookieToken(req),s=token&&sessions.get(token);
  if(!s||s.expires<Date.now()){if(token)sessions.delete(token);return null}
  return db.admins.find(a=>a.id===s.adminId&&a.active!==false)||null;
}
function startSession(res,admin){
  const token=randomBytes(32).toString('hex');
  sessions.set(token,{adminId:admin.id,expires:Date.now()+SESSION_MS});
  return `fp_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS/1000}`;
}
const publicAdmin=({hash,salt,...a})=>a;
const can=(admin,perm)=>!!admin&&(admin.role==='ana'||perms[perm].includes(admin.role));
function need(admin,perm){if(!admin)fail(401,'Giriş yapmalısın');if(perm&&!can(admin,perm))fail(403,'Bu işlem için yetkin yok')}
// Kayıt sahipliği: ana yönetici her kaydı, diğerleri yalnızca kendi girdiğini değiştirir. Sahipsiz (sistemin açtığı) kayıtları yönetici değiştirebilir.
function owns(admin,rec,key='createdBy'){
  if(admin.role==='ana')return true;
  const owner=rec?.[key];
  return owner?owner===admin.id:admin.role===Y;
}
function guard(db,admin,rec,key='createdBy'){
  if(owns(admin,rec,key))return;
  const who=db.admins.find(a=>a.id===rec[key])?.name||'başka bir yönetici';
  fail(403,`Bu kaydı ${who} girdi. Yalnızca o ya da ana yönetici değiştirebilir.`);
}

// --- Yardımcılar ---
const text=(v,max=2000)=>String(v??'').trim().slice(0,max);
const find=(list,key,label)=>list.find(x=>x.id===key)||fail(404,label+' bulunamadı');
const pick=(src,keys)=>Object.fromEntries(keys.filter(k=>k in src).map(k=>[k,src[k]]));
const money=v=>Math.max(0,Math.round((Number(v)||0)*100)/100);
const isDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v);
const tl=n=>(Number(n)||0).toFixed(2).replace('.',',');

const L={
  market:{planlama:'Planlama',basvuru:'Başvuru dönemi',aktif:'Aktif',tamamlandi:'Tamamlandı'},
  app:{yeni:'Yeni',inceleniyor:'İnceleniyor',kabul:'Kabul',yedek:'Yedek',red:'Red'},
  method:{nakit:'Nakit',havale:'Havale / EFT',kart:'Kredi kartı',diger:'Diğer'},
  workshop:{planlandi:'Planlandı',yapildi:'Yapıldı',iptal:'İptal'},
  ledger:{gider:'Gider',gelir:'Gelir'},
  invoice:{geldi:'Geldi',bekleniyor:'Bekleniyor',yok:'Yok'},
  type:{text:'Kısa yazı',textarea:'Uzun yazı',email:'E-posta',phone:'Telefon',url:'Bağlantı',number:'Sayı',date:'Tarih',select:'Tek seçim',checkboxes:'Çoklu seçim',file:'Görsel yükleme',consent:'Onay kutusu',heading:'Bölüm başlığı'},
  pf:{brandName:'Marka adı',contactName:'İletişim kişisi',email:'E-posta',phone:'Telefon',instagram:'Instagram',website:'Web sitesi',category:'Kategori',description:'Açıklama'}
};
const expenseCategories=['Stant & kira','Malzeme','Baskı & tabela','Reklam & tanıtım','Ulaşım','Yeme içme','Personel','Workshop','Ses & ışık','Diğer'];
const incomeCategories=['Sponsorluk','Workshop geliri','Bağış','Satış','Diğer'];
const labelOf=(map,v)=>map[v]||v||'';
const keyOf=(map,v)=>{const n=norm(v);if(!n)return '';return Object.keys(map).find(k=>norm(k)===n||norm(map[k])===n)||''};

function bootstrap(db,admin){
  const ledger=can(admin,'ledgerRead');
  const participants=ledger?db.participants:db.participants.map(({fees,...p})=>p);
  const activity=(admin.role==='ana'?db.activity:db.activity.filter(a=>a.adminId===admin.id)).slice(0,80);
  return {me:publicAdmin(admin),markets:sortMarkets(db.markets),nextEdition:nextEdition(db),forms:db.forms,applications:db.applications,participants,media:db.media,
    workshops:db.workshops,ledger:ledger?db.ledger:[],admins:db.admins.map(publicAdmin),activity,mediaCategories,participantFields,categories,expenseCategories,incomeCategories,
    demo:hasDemo(db),settings:db.settings,roles:roleNames,assignable:can(admin,'users')?assignableBy(admin):[],perms:Object.fromEntries(Object.keys(perms).map(k=>[k,can(admin,k)]))};
}

// Pazarlar edisyon numarasına göre sıralanır; bir numara (silinen pazarınki dahil) bir daha kullanılmaz.
const sortMarkets=list=>[...list].sort((a,b)=>(b.edition||0)-(a.edition||0)||(b.startDate||'').localeCompare(a.startDate||''));
const nextEdition=db=>Math.max(0,...db.markets.map(m=>m.edition||0),...(db.usedEditions||[]))+1;
function checkEdition(db,m,selfId){
  if(!m.edition)m.edition=nextEdition(db);
  if(!Number.isInteger(m.edition)||m.edition<1)fail(400,'Sıra no pozitif bir tam sayı olmalı');
  const holder=db.markets.find(x=>x.id!==selfId&&x.edition===m.edition);
  if(holder)fail(409,holder.demo?`${m.edition}. sıra no örnek bir pazarda kullanılıyor. Genel bakıştan “Örnek verileri sil” ile kaldırabilirsin.`:`${m.edition}. sıra no zaten başka bir pazarda kullanılıyor`);
  if(!selfId||db.markets.find(x=>x.id===selfId)?.edition!==m.edition)if((db.usedEditions||[]).includes(m.edition))fail(409,`${m.edition}. sıra no daha önce silinen bir pazarda kullanıldı, tekrar kullanılamaz`);
}
function cleanMarket(b){
  const m={name:text(b.name,120),edition:Number(b.edition)||null,startDate:text(b.startDate,10),endDate:text(b.endDate,10),hours:text(b.hours,60),location:text(b.location,160),capacity:Number(b.capacity)||0,fee:money(b.fee),status:L.market[b.status]?b.status:'planlama',notes:text(b.notes,5000)};
  if(!m.name)fail(400,'Pazar adı gerekli');
  if(m.startDate&&m.endDate&&m.endDate<m.startDate)fail(400,'Bitiş tarihi başlangıçtan önce olamaz');
  return m;
}

const fieldTypes=Object.keys(L.type);
function cleanFields(fields){
  if(!Array.isArray(fields))return [];
  return fields.slice(0,60).map(f=>({id:/^fld_[a-f0-9]{12}$/.test(f.id)?f.id:id('fld'),type:fieldTypes.includes(f.type)?f.type:'text',label:text(f.label,300)||'Soru',required:!!f.required,help:text(f.help,500),options:(Array.isArray(f.options)?f.options:[]).map(o=>text(o,120)).filter(Boolean).slice(0,40),mapTo:participantFields.includes(f.mapTo)?f.mapTo:''}));
}
function cleanForm(b,db){
  const f={marketId:b.marketId,title:text(b.title,200),intro:text(b.intro,3000),status:['taslak','acik','kapali'].includes(b.status)?b.status:'taslak',deadline:text(b.deadline,10),fields:cleanFields(b.fields)};
  find(db.markets,f.marketId,'Pazar');
  if(!f.title)fail(400,'Form başlığı gerekli');
  return f;
}
function cleanFee(b,by){
  return {amount:money(b.amount),paid:money(b.paid),method:L.method[b.method]?b.method:'',date:isDate(b.date)?b.date:'',note:text(b.note,500),by:by||b.by||null,updatedAt:now()};
}
// Ücret kaydı yoksa pazarın varsayılan katılım ücreti beklenir.
const feeOf=(p,m)=>({amount:m.fee||0,paid:0,method:'',date:'',note:'',...(p.fees?.[m.id]||{})});
const feeLabel=f=>f.amount<=0&&f.paid<=0?'Ücret girilmedi / ücretsiz':f.paid>=f.amount?'Ödendi':f.paid>0?'Kısmi ödendi':'Bekliyor';
function cleanParticipant(b){
  const p={...Object.fromEntries(participantFields.map(k=>[k,text(b[k],k==='description'?5000:300)])),tags:(Array.isArray(b.tags)?b.tags:String(b.tags||'').split(',')).map(t=>text(t,40)).filter(Boolean).slice(0,20),markets:Array.isArray(b.markets)?b.markets.filter(x=>typeof x==='string'):[],notes:text(b.notes,5000)};
  p.instagram=igHandle(p.instagram);p.category=normalizeCategory(p.category);
  if(!p.brandName)fail(400,'Marka adı gerekli');
  return p;
}
function cleanWorkshop(b,db){
  const w={title:text(b.title,200),marketId:db.markets.some(m=>m.id===b.marketId)?b.marketId:null,date:isDate(b.date)?b.date:'',time:text(b.time,20),duration:Math.max(0,parseInt(b.duration)||0),
    organizer:text(b.organizer,200),participantId:db.participants.some(p=>p.id===b.participantId)?b.participantId:null,paid:b.paid===true||b.paid==='true'||b.paid==='on'||b.paid==='ucretli',
    price:money(b.price),capacity:Math.max(0,parseInt(b.capacity)||0),registered:Math.max(0,parseInt(b.registered)||0),location:text(b.location,200),
    status:L.workshop[b.status]?b.status:'planlandi',description:text(b.description,3000),notes:text(b.notes,3000)};
  if(!w.paid)w.price=0;
  if(!w.title)fail(400,'Workshop adı gerekli');
  return w;
}
function cleanLedger(b,db){
  const type=b.type==='gelir'?'gelir':'gider',cats=type==='gelir'?incomeCategories:expenseCategories;
  const e={type,date:isDate(b.date)?b.date:now().slice(0,10),title:text(b.title,200),category:cats.includes(b.category)?b.category:'Diğer',amount:money(b.amount),
    marketId:db.markets.some(m=>m.id===b.marketId)?b.marketId:null,method:L.method[b.method]?b.method:'',paidBy:text(b.paidBy,120),
    invoice:L.invoice[b.invoice]?b.invoice:'yok',receipt:b.receipt===true||b.receipt==='true'||b.receipt==='on',mediaId:db.media.some(m=>m.id===b.mediaId)?b.mediaId:null,note:text(b.note,2000)};
  if(!e.title)fail(400,'Açıklama gerekli');
  if(!e.amount)fail(400,'Tutar gerekli');
  return e;
}

// Başvurudaki "katılımcı alanına bağlı" sorulardan katılımcı bilgisini çıkarır.
function profileFromApplication(app,form){
  const out={};
  for(const f of form?.fields||[])if(f.mapTo&&app.answers[f.id]!=null){const v=app.answers[f.id];out[f.mapTo]=Array.isArray(v)?v.join(', '):String(v)}
  if(out.instagram)out.instagram=igHandle(out.instagram);
  if(out.category)out.category=normalizeCategory(out.category);
  return out;
}
function matchParticipant(db,profile){
  const email=profile.email?.toLowerCase(),brand=slugify(profile.brandName),ig=igHandle(profile.instagram).toLowerCase();
  return db.participants.find(p=>(email&&p.email?.toLowerCase()===email)||(ig&&p.instagram?.toLowerCase()===ig)||(profile.brandName&&slugify(p.brandName)===brand));
}
const blankParticipant=by=>({id:id('prt'),brandName:'',contactName:'',email:'',phone:'',instagram:'',website:'',category:'',description:'',tags:[],markets:[],notes:'',createdBy:by||null,createdAt:now()});

async function storeFile(db,{name,type,data},meta){
  const ext=imageTypes[type];if(!ext)fail(400,'Sadece JPG, PNG, WEBP, GIF, SVG veya PDF yüklenebilir');
  const buf=Buffer.from(String(data||''),'base64');
  if(!buf.length)fail(400,'Boş dosya');if(buf.length>15*1024*1024)fail(413,'Bir dosya en fazla 15 MB olabilir');
  const market=db.markets.find(m=>m.id===meta.marketId);
  const mid=id('med'),folder=`${market?market.slug:'genel'}/${slugify(meta.category)}`;
  const base=slugify(String(name||'gorsel').replace(/\.[^.]+$/,''));
  const path=`${folder}/${mid.slice(4)}-${base}.${ext}`;
  await mkdir(new URL(folder+'/',uploadDir),{recursive:true});
  await writeFile(new URL(path,uploadDir),buf);
  const item={id:mid,marketId:market?.id||null,category:mediaCategories.includes(meta.category)?meta.category:'Diğer',participantId:meta.participantId||null,applicationId:meta.applicationId||null,workshopId:meta.workshopId||null,title:text(meta.title||name,200),tags:meta.tags||[],filename:text(name,200),path,mime:type,size:buf.length,uploadedBy:meta.uploadedBy||null,createdAt:now()};
  db.media.unshift(item);
  return item;
}

async function serveMedia(req,res,db,mediaId){
  const item=find(db.media,mediaId,'Dosya');
  const pub=item.workshopId&&db.workshops.some(w=>w.id===item.workshopId&&w.status!=='iptal');
  const admin=currentAdmin(req,db);if(!admin&&!pub)fail(401,'Giriş yapmalısın');
  if(pub)return send(res,200,await readFile(new URL(item.path,uploadDir)),item.mime,{'Cache-Control':'public, max-age=300','Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"});
  if(admin.role==='katilimci'&&item.participantId!==admin.participantId)fail(403,'Bu dosyayı göremezsin');
  const disposition=new URL(req.url,'http://x').searchParams.has('indir')?`attachment; filename="${slugify(item.title)}.${item.path.split('.').pop()}"`:'inline';
  return send(res,200,await readFile(new URL(item.path,uploadDir)),item.mime,{'Content-Disposition':disposition,'Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"});
}

// --- Katılımcı paneli: marka sahibi yalnızca kendi kartını görür; değişiklikleri organizatör onayıyla yayımlanır ---
const portalFields=['brandName','contactName','email','phone','instagram','website','category','description'];
function portalParticipant(db,admin){return db.participants.find(p=>p.id===admin.participantId)||fail(400,'Hesabın henüz markanla eşleştirilmedi. Ekip onaylayınca bu bölüm açılır.')}
const wsTaken=w=>(w.registered||0)+(w.registrations||[]).filter(r=>r.status!=='red').length;
function portalBootstrap(db,admin){
  const p=db.participants.find(x=>x.id===admin.participantId)||null,t=now().slice(0,10);
  const mineApp=a=>p&&(a.participantId===p.id||a.matchedParticipantId===p.id)||a.byAdmin===admin.id;
  const apps=db.applications.filter(mineApp).map(a=>({id:a.id,formId:a.formId,status:a.status,createdAt:a.createdAt,market:db.markets.find(m=>m.id===a.marketId)?.name||'',form:db.forms.find(f=>f.id===a.formId)?.title||''}));
  const markets=p?sortMarkets(db.markets.filter(m=>p.markets.includes(m.id))).map(m=>{const f=feeOf(p,m);return {id:m.id,name:m.name,edition:m.edition,startDate:m.startDate,endDate:m.endDate,status:m.status,fee:{amount:f.amount,paid:f.paid}}}):[];
  const openForms=db.forms.filter(f=>f.status==='acik'&&(!f.deadline||f.deadline>=t)).map(f=>{const m=db.markets.find(x=>x.id===f.marketId);return {id:f.id,title:f.title,intro:f.intro,deadline:f.deadline,market:m?.name||'',startDate:m?.startDate||'',endDate:m?.endDate||'',location:m?.location||'',fee:m?.fee||0,applied:apps.find(a=>a.formId===f.id)||null}});
  const workshops=db.workshops.filter(w=>w.status==='planlandi'&&(!w.date||w.date>=t)).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(w=>{const reg=(w.registrations||[]).find(r=>r.adminId===admin.id);return {id:w.id,title:w.title,description:w.description,date:w.date,time:w.time,duration:w.duration,organizer:w.organizer,paid:w.paid,price:w.price,capacity:w.capacity,left:w.capacity?Math.max(0,w.capacity-wsTaken(w)):null,location:w.location,market:db.markets.find(m=>m.id===w.marketId)?.name||'',reg:reg?{status:reg.status,at:reg.at}:null}});
  const myWorkshops=db.workshops.filter(w=>(w.registrations||[]).some(r=>r.adminId===admin.id)).map(w=>{const r=w.registrations.find(r=>r.adminId===admin.id);return {id:w.id,title:w.title,date:w.date,time:w.time,status:w.status,paid:w.paid,price:w.price,reg:{status:r.status,at:r.at}}});
  let pub=null;if(p){const {fees,notes,tags,createdBy,...rest}=p;pub=rest}
  return {portal:true,me:publicAdmin(admin),claimPending:!p,participant:pub,applications:apps,markets,openForms,workshops,myWorkshops,payment:db.settings.payment,media:p?db.media.filter(m=>m.participantId===p.id).map(m=>({...m,mine:m.uploadedBy===admin.id})):[],categories,roles:roleNames,participantFields:portalFields};
}
async function portal(req,db,admin,key,method,b,action){
  if(key==='workshops'){
    const w=find(db.workshops,action,'Workshop');
    if(method==='POST'){
      if(w.status!=='planlandi')fail(400,'Bu workshop kayıt almıyor');
      if((w.registrations||[]).some(r=>r.adminId===admin.id&&r.status!=='red'))fail(400,'Bu workshopa zaten kaydın var');
      if(w.capacity&&wsTaken(w)>=w.capacity)fail(409,'Kontenjan doldu');
      const p=db.participants.find(x=>x.id===admin.participantId);
      (w.registrations??=[]).push({id:id('reg'),adminId:admin.id,participantId:p?.id||null,name:admin.name,brand:p?.brandName||'',email:admin.email,phone:p?.phone||'',note:text(b.note,300),status:'bekliyor',at:now()});
      log(admin.id,`Workshop kaydı: ${w.title}`,{type:'workshop',id:w.id});await save();return {ok:true};
    }
    if(method==='DELETE'){w.registrations=(w.registrations||[]).filter(r=>r.adminId!==admin.id);log(admin.id,`Workshop kaydını iptal etti: ${w.title}`,{type:'workshop',id:w.id});await save();return {ok:true}}
  }
  const p=portalParticipant(db,admin);
  if(key==='profile'&&method==='PUT'){
    const c=cleanParticipant({...p,...pick(b,portalFields)}),changes={};
    for(const k of portalFields)if((c[k]||'')!==(p[k]||''))changes[k]=c[k];
    if(!Object.keys(changes).length)fail(400,'Değişiklik yok');
    p.pending={changes,at:now(),by:admin.id};
    log(admin.id,`Marka bilgisi değişikliği onaya gönderildi: ${p.brandName}`,{type:'participant',id:p.id});await save();return {ok:true};
  }
  if(key==='profile'&&method==='DELETE'){delete p.pending;await save();return {ok:true}}
  if(key==='media'&&method==='POST'){
    const cat=b.category==='Logo'?'Logo':'Katılımcı ürünleri',out=[];
    for(const file of (b.files||[]).slice(0,10)){if(!/^image\//.test(file.type))fail(400,'Yalnızca görsel yükleyebilirsin');out.push(await storeFile(db,file,{marketId:null,category:cat,participantId:p.id,tags:[],uploadedBy:admin.id}))}
    log(admin.id,`${out.length} görsel yüklendi · ${cat} · ${p.brandName}`,{type:'media',id:p.id});await save();return out;
  }
  if(key==='media'&&method==='DELETE'){
    const m=find(db.media,b.id,'Dosya');if(m.participantId!==p.id||m.uploadedBy!==admin.id)fail(403,'Yalnızca kendi yüklediğin görseli silebilirsin');
    await removeMedia(db,m);await save();return {ok:true};
  }
  fail(404,'Bulunamadı');
}

// --- Tablolar: her bölüm için aynı sütunlarla dışa aktarma, şablon ve içe aktarma ---
const norm=v=>slugify(String(v||'')).replace(/-/g,'');
function parseNumber(v){
  if(typeof v==='number')return Math.max(0,v);
  let s=String(v??'').replace(/[₺\s]|TL/gi,'');if(!s)return 0;
  if(/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)||/^-?\d+,\d+$/.test(s))s=s.replace(/\./g,'').replace(',','.');
  else s=s.replace(/,/g,'');
  const n=Number(s);return Number.isFinite(n)?Math.max(0,n):0;
}
function parseDate(v){
  const s=String(v??'').trim();if(!s)return '';
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  const m=s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if(/^\d{5}(\.\d+)?$/.test(s))return new Date(Date.UTC(1899,11,30)+Math.floor(+s)*864e5).toISOString().slice(0,10);
  return '';
}
const trDate=v=>isDate(v)?`${v.slice(8,10)}.${v.slice(5,7)}.${v.slice(0,4)}`:'';
const yes=v=>/^(x|✓|✔|1|evet|var|e|yes|true|katıldı|ucretli|ücretli)$/i.test(String(v??'').trim());
const findMarketByName=(db,v)=>{const s=String(v??'').trim(),n=norm(s);if(!n)return null;const num=s.match(/^(\d+)\.?(\s*pazar)?$/i)?.[1];return db.markets.find(m=>(num&&m.edition===+num)||norm(m.name)===n||m.slug===slugify(s))};
const findParticipantByName=(db,v)=>{const n=slugify(v),ig=igHandle(v).toLowerCase();return n?db.participants.find(p=>slugify(p.brandName)===n||(p.instagram&&p.instagram.toLowerCase()===ig&&String(v).trim().startsWith('@'))):null};
const marketCol=m=>`${m.edition?m.edition+'. pazar':m.name}`;

// Her bölüm: sütunlar (başlık, açıklama, örnek), dışa aktarılacak satırlar ve içe aktarma.
const sheets={
  pazarlar:{title:'Pazarlar',
    cols:[['Sıra no','Benzersiz numara. Boş bırakılırsa otomatik verilir. Var olan numara o pazarı günceller.','6'],['Pazar adı','Zorunlu','6. Fevzipaşa Tasarım Pazarı'],['Başlangıç','GG.AA.YYYY','14.05.2027'],['Bitiş','GG.AA.YYYY','16.05.2027'],['Saatler','','11.00–21.00'],['Konum','','Fevzipaşa / Çanakkale'],['Kapasite','Stant sayısı','45'],['Katılım ücreti (TL)','Katılımcı başına varsayılan ücret','1500'],['Durum',Object.values(L.market).join(' / '),'Planlama'],['Notlar','','']],
    rows:db=>sortMarkets(db.markets).map(m=>[m.edition||'',m.name,trDate(m.startDate),trDate(m.endDate),m.hours,m.location,m.capacity||'',m.fee||'',labelOf(L.market,m.status),m.notes]),
    import(db,get,row,out,ctx){
      const name=get('Pazar adı');if(!name)return out.skip(row,'pazar adı boş');
      const edition=parseInt(get('Sıra no'))||null,existing=edition&&db.markets.find(m=>m.edition===edition);
      const data=cleanMarket({name,edition,startDate:parseDate(get('Başlangıç')),endDate:parseDate(get('Bitiş')),hours:get('Saatler'),location:get('Konum'),capacity:get('Kapasite'),fee:parseNumber(get('Katılım ücreti (TL)')),status:keyOf(L.market,get('Durum'))||'planlama',notes:get('Notlar')});
      if(existing){guard(db,ctx.admin,existing);Object.assign(existing,data);return out.updated++}
      try{checkEdition(db,data)}catch(e){return out.skip(row,e.message)}
      const m={id:id('mkt'),...data,slug:'',createdBy:ctx.admin.id,createdAt:now()};m.slug=uniqueSlug(db,m);db.markets.push(m);out.created++;
    }},
  katilimcilar:{title:'Katılımcılar',
    cols:db=>[['Marka adı','Zorunlu. Aynı ad, e-posta ya da Instagram varsa kart güncellenir.','Örnek Atölye'],['İletişim kişisi','','Ayşe Yılmaz'],['E-posta','','ayse@ornek.com'],['Telefon','','0532 000 00 00'],['Instagram','@ ile ya da @ olmadan yazılabilir','@ornekatolye'],['Web sitesi','','ornekatolye.com'],['Kategori',categories.join(' / '),categories[3]],['Açıklama','','El yapımı seramik objeler.'],['Etiketler','Virgülle ayır','seramik, el yapımı'],
      ...sortMarkets(db.markets).slice().reverse().map((m,i,a)=>[marketCol(m),`Bu pazara katıldıysa X yaz. ${m.name}`,i>=a.length-2?'X':''])],
    rows:(db,q)=>{const ms=sortMarkets(db.markets).slice().reverse();return db.participants.filter(p=>q.scope==='all'||p.markets.includes(q.scope)).sort((a,b)=>a.brandName.localeCompare(b.brandName,'tr')).map(p=>{const mine=ms.filter(m=>p.markets.includes(m.id));return [p.brandName,p.contactName,p.email,p.phone,p.instagram,p.website,p.category,p.description,(p.tags||[]).join(', '),...ms.map(m=>p.markets.includes(m.id)?'X':''),mine.length,mine[0]?.name||'',mine.at(-1)?.name||'']})},
    exportHeader:['Toplam pazar','İlk pazar','Son pazar'],
    import(db,get,row,out,ctx,header){
      const brandName=get('Marka adı')||get('Marka');if(!brandName)return out.skip(row,'marka adı boş');
      const email=get('E-posta').toLowerCase(),ig=igHandle(get('Instagram')).toLowerCase();
      let p=db.participants.find(x=>(email&&x.email?.toLowerCase()===email)||(ig&&x.instagram?.toLowerCase()===ig)||slugify(x.brandName)===slugify(brandName));
      if(p){if(!owns(ctx.admin,p))return out.skip(row,`“${p.brandName}” başka bir yöneticinin kaydı`);out.updated++}
      else{p={...blankParticipant(ctx.admin.id),brandName};db.participants.push(p);out.created++}
      const map={brandName:'Marka adı',contactName:'İletişim kişisi',email:'E-posta',phone:'Telefon',instagram:'Instagram',website:'Web sitesi',category:'Kategori',description:'Açıklama'};
      for(const [k,h] of Object.entries(map)){const v=get(h);if(v)p[k]=k==='instagram'?igHandle(v):k==='category'?normalizeCategory(v):text(v,k==='description'?5000:300)}
      if(get('Etiketler'))p.tags=[...new Set([...(p.tags||[]),...get('Etiketler').split(',').map(t=>text(t,40)).filter(Boolean)])].slice(0,20);
      // Pazar sütunları: X = katıldı. "Boşları katılmadı say" seçiliyse boş hücre o pazardan çıkarır.
      for(const h of header){
        if(!/^\d+\.?\s*pazar$/i.test(h)&&!db.markets.some(m=>norm(m.name)===norm(h)))continue;
        const m=findMarketByName(db,h);if(!m)continue;
        const v=get(h);if(yes(v)){if(!p.markets.includes(m.id))p.markets.push(m.id)}else if(ctx.strict&&!v)p.markets=p.markets.filter(x=>x!==m.id);
      }
      for(const name of get('Pazarlar').split(',')){const m=findMarketByName(db,name);if(m&&!p.markets.includes(m.id))p.markets.push(m.id)}
      if(ctx.market&&!p.markets.includes(ctx.market.id))p.markets.push(ctx.market.id);
      p.updatedAt=now();
    }},
  odemeler:{title:'Ödemeler',
    cols:[['Pazar','Sıra no ya da pazar adı. Boşsa içe aktarırken seçilen pazar.','5'],['Marka','Zorunlu. Katılımcılardaki adla eşleşir.','Örnek Atölye'],['Ücret (TL)','','1500'],['Ödenen (TL)','','1500'],['Ödeme yöntemi',Object.values(L.method).join(' / '),'Havale / EFT'],['Ödeme tarihi','GG.AA.YYYY','01.10.2026'],['Not','','']],
    rows:(db,q)=>{const r=[];let due=0,paid=0;for(const m of sortMarkets(db.markets).filter(m=>q.scope==='all'||m.id===q.scope))for(const p of db.participants.filter(x=>x.markets.includes(m.id)).sort((a,b)=>a.brandName.localeCompare(b.brandName,'tr'))){const f=feeOf(p,m);due+=f.amount;paid+=f.paid;r.push([m.edition||m.name,p.brandName,f.amount,f.paid,labelOf(L.method,f.method),trDate(f.date),f.note,Math.max(0,f.amount-f.paid),feeLabel(f),p.contactName,p.phone])}
      r.push([],['TOPLAM','',due,paid,'','','',Math.max(0,due-paid)]);return r},
    exportHeader:['Kalan (TL)','Durum','İletişim kişisi','Telefon'],
    import(db,get,row,out,ctx){
      const brand=get('Marka');if(!brand||norm(brand)==='toplam')return;
      const m=findMarketByName(db,get('Pazar'))||ctx.market;if(!m)return out.skip(row,`(${brand}) pazar bulunamadı`);
      const p=findParticipantByName(db,brand);if(!p)return out.skip(row,`“${brand}” katılımcılarda yok`);
      const old=p.fees?.[m.id];if(old?.by&&!owns(ctx.admin,old,'by'))return out.skip(row,`“${brand}” ödemesini başka bir yönetici girdi`);
      if(!p.markets.includes(m.id))p.markets.push(m.id);
      const has=h=>ctx.header.includes(h);
      (p.fees??={})[m.id]=cleanFee({amount:has('Ücret (TL)')?parseNumber(get('Ücret (TL)')):old?.amount??m.fee,paid:has('Ödenen (TL)')?parseNumber(get('Ödenen (TL)')):old?.paid,method:has('Ödeme yöntemi')?keyOf(L.method,get('Ödeme yöntemi'))||(/havale|eft/i.test(get('Ödeme yöntemi'))?'havale':''):old?.method,date:has('Ödeme tarihi')?parseDate(get('Ödeme tarihi')):old?.date,note:has('Not')?get('Not'):old?.note},ctx.admin.id);
      old?out.updated++:out.created++;
    }},
  workshoplar:{title:'Workshoplar',
    cols:[['Workshop adı','Zorunlu','Seramik boyama'],['Pazar','Sıra no ya da pazar adı','5'],['Tarih','GG.AA.YYYY','10.10.2026'],['Saat','','14.00'],['Süre (dk)','','90'],['Düzenleyen','Kişi ya da ekip','Ayşe Yılmaz'],['Düzenleyen marka','Katılımcılardaki marka adı (varsa)','Örnek Atölye'],['Ücret durumu','Ücretli / Ücretsiz','Ücretli'],['Ücret (TL)','Kişi başı','350'],['Kontenjan','','12'],['Kayıtlı kişi','','8'],['Yer','','Ana sahne'],['Durum',Object.values(L.workshop).join(' / '),'Planlandı'],['Açıklama','',''],['Not','','']],
    rows:(db,q)=>db.workshops.filter(w=>q.scope==='all'||w.marketId===q.scope).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(w=>[w.title,db.markets.find(m=>m.id===w.marketId)?.edition||'',trDate(w.date),w.time,w.duration||'',w.organizer,db.participants.find(p=>p.id===w.participantId)?.brandName||'',w.paid?'Ücretli':'Ücretsiz',w.paid?w.price:'',w.capacity||'',w.registered||'',w.location,labelOf(L.workshop,w.status),w.description,w.notes]),
    import(db,get,row,out,ctx){
      const title=get('Workshop adı');if(!title)return out.skip(row,'workshop adı boş');
      const m=findMarketByName(db,get('Pazar'))||ctx.market,brand=get('Düzenleyen marka');
      const data=cleanWorkshop({title,marketId:m?.id,date:parseDate(get('Tarih')),time:get('Saat'),duration:get('Süre (dk)'),organizer:get('Düzenleyen'),participantId:brand?findParticipantByName(db,brand)?.id:null,paid:/^ücretli$/i.test(get('Ücret durumu'))||parseNumber(get('Ücret (TL)'))>0,price:parseNumber(get('Ücret (TL)')),capacity:get('Kontenjan'),registered:get('Kayıtlı kişi'),location:get('Yer'),status:keyOf(L.workshop,get('Durum'))||'planlandi',description:get('Açıklama'),notes:get('Not')},db);
      const existing=db.workshops.find(w=>norm(w.title)===norm(title)&&w.date===data.date&&w.marketId===data.marketId);
      if(existing){if(!owns(ctx.admin,existing))return out.skip(row,`“${title}” başka bir yöneticinin kaydı`);Object.assign(existing,data);return out.updated++}
      db.workshops.push({id:id('wrk'),...data,createdBy:ctx.admin.id,createdAt:now()});out.created++;
    }},
  kasa:{title:'Kasa',
    cols:[['Tarih','GG.AA.YYYY','05.10.2026'],['Tür','Gider / Gelir','Gider'],['Açıklama','Zorunlu','Stant brandaları'],['Kategori',`Gider: ${expenseCategories.join(', ')} · Gelir: ${incomeCategories.join(', ')}`,'Baskı & tabela'],['Tutar (TL)','Zorunlu','2400'],['Pazar','Sıra no ya da pazar adı','5'],['Ödeme yöntemi',Object.values(L.method).join(' / '),'Havale / EFT'],['Ödemeyi yapan','Kim ödedi / kim aldı','Kemal'],['Fatura',Object.values(L.invoice).join(' / '),'Bekleniyor'],['Fiş','Var / Yok','Var'],['Not','','']],
    rows:(db,q)=>db.ledger.filter(e=>q.scope==='all'||e.marketId===q.scope).sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[trDate(e.date),labelOf(L.ledger,e.type),e.title,e.category,e.amount,db.markets.find(m=>m.id===e.marketId)?.edition||'',labelOf(L.method,e.method),e.paidBy,labelOf(L.invoice,e.invoice),e.receipt?'Var':'Yok',e.note,db.admins.find(a=>a.id===e.createdBy)?.name||'']),
    exportHeader:['Giren'],
    import(db,get,row,out,ctx){
      const title=get('Açıklama');if(!title)return out.skip(row,'açıklama boş');
      const amount=parseNumber(get('Tutar (TL)'));if(!amount)return out.skip(row,`(${title}) tutar boş`);
      const type=/gelir/i.test(get('Tür'))?'gelir':'gider',m=findMarketByName(db,get('Pazar'))||ctx.market;
      const cats=type==='gelir'?incomeCategories:expenseCategories,cat=cats.find(c=>norm(c)===norm(get('Kategori')))||'Diğer';
      db.ledger.push({id:id('kas'),...cleanLedger({type,date:parseDate(get('Tarih')),title,category:cat,amount,marketId:m?.id,method:keyOf(L.method,get('Ödeme yöntemi'))||(/havale|eft/i.test(get('Ödeme yöntemi'))?'havale':''),paidBy:get('Ödemeyi yapan'),invoice:keyOf(L.invoice,get('Fatura'))||'yok',receipt:yes(get('Fiş')),note:get('Not')},db),createdBy:ctx.admin.id,createdAt:now()});
      out.created++;
    }},
  formlar:{title:'Form soruları',
    cols:[['Sıra','','1'],['Soru','Zorunlu','Marka adı'],['Tip',Object.values(L.type).join(' / '),'Kısa yazı'],['Zorunlu','Evet / Hayır','Evet'],['Seçenekler','Tek/çoklu seçim için; | ile ayır','Seçenek 1 | Seçenek 2'],['Yardım metni','Sorunun altında görünür',''],['Katılımcı alanı',`Kabulde karta aktarılır: ${Object.values(L.pf).join(' / ')}`,'Marka adı']],
    rows:(db,q)=>{const f=find(db.forms,q.form,'Form');return f.fields.map((x,i)=>[i+1,x.label,L.type[x.type],x.required?'Evet':'Hayır',x.options.join(' | '),x.help,L.pf[x.mapTo]||''])},
    template:()=>defaultFields().map((x,i)=>[i+1,x.label,L.type[x.type],x.required?'Evet':'Hayır',x.options.join(' | '),x.help,L.pf[x.mapTo]||''])
  }
};
const colsOf=(db,kind)=>{const c=sheets[kind].cols;return typeof c==='function'?c(db):c};
function exportRows(db,kind,q){
  const s=sheets[kind],header=[...colsOf(db,kind).map(c=>c[0]),...(s.exportHeader||[])];
  return [header,...s.rows(db,q)];
}
function templateBook(db,kind){
  const cols=colsOf(db,kind),s=sheets[kind];
  const sample=s.template?s.template():[cols.map(c=>c[2]??'')];
  return {rows:[cols.map(c=>c[0]),...sample],guide:[['Sütun','Nasıl doldurulur'],...cols.map(c=>[c[0],c[1]||'']),[],['ÖNEMLİ','Başlık satırını değiştirme ya da silme. Örnek satırları silip kendi verini yaz. Dosyayı .xlsx ya da .csv olarak kaydet.']]};
}
function runImport(db,kind,rows,ctx){
  const s=sheets[kind];if(!s?.import)fail(404,'Bu bölüm içe aktarılamaz');
  const [rawHeader,...data]=rows,header=rawHeader.map(h=>String(h??'').trim());
  const cols=colsOf(db,kind).map(c=>c[0]);
  if(!cols.slice(0,3).some(c=>header.some(h=>norm(h)===norm(c))))fail(400,`Başlıklar şablonla uyuşmuyor. Beklenen sütunlar: ${cols.slice(0,4).join(', ')}… Şablonu indirip onunla doldur.`);
  const idx=Object.fromEntries(header.map((h,i)=>[norm(h),i]));
  const out={created:0,updated:0,skipped:0,errors:[],skip(row,msg){this.skipped++;this.errors.push(`${row}. satır: ${msg}`)}};
  ctx.header=header;
  data.forEach((r,n)=>{
    const get=h=>{const i=idx[norm(h)];return i==null?'':String(r[i]??'').trim()};
    try{s.import(db,get,n+2,out,ctx,header)}catch(e){if(e instanceof HttpError)out.skip(n+2,e.message);else throw e}
  });
  const {skip,...result}=out;return result;
}
function sendBook(res,book,name,ext){
  const file=`${slugify(name)}.${ext}`;
  if(ext==='xlsx')return send(res,200,toXlsx(book),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',{'Content-Disposition':`attachment; filename="${file}"`});
  return send(res,200,toCsv(Array.isArray(book[0]?.rows)?book[0].rows:book),'text/csv; charset=utf-8',{'Content-Disposition':`attachment; filename="${file}"`});
}
function applicationTable(db,form){
  const fields=form.fields.filter(f=>f.type!=='heading');
  return [['Tarih','Durum','Puan',...fields.map(f=>f.label)],...db.applications.filter(a=>a.formId===form.id).map(a=>[a.createdAt.slice(0,16).replace('T',' '),L.app[a.status],a.rating||'',...fields.map(f=>f.type==='file'?(a.answers[f.id]||[]).length+' dosya':f.type==='consent'?(a.answers[f.id]?'Evet':'Hayır'):a.answers[f.id])])];
}
function formFromSheet(rows,title,marketId){
  const [header,...data]=rows,ix=Object.fromEntries(header.map((h,i)=>[norm(h),i])),get=(r,h)=>String(r[ix[norm(h)]]??'').trim();
  if(ix[norm('Soru')]==null)fail(400,'“Soru” sütunu bulunamadı. Şablonu indirip onunla doldur.');
  const typeKey=v=>keyOf(L.type,v)||'text',pfKey=v=>Object.keys(L.pf).find(k=>norm(L.pf[k])===norm(v))||'';
  const fields=data.filter(r=>get(r,'Soru')).sort((a,b)=>(+get(a,'Sıra')||0)-(+get(b,'Sıra')||0)).map(r=>({type:typeKey(get(r,'Tip')),label:get(r,'Soru'),required:yes(get(r,'Zorunlu')),options:get(r,'Seçenekler').split('|').map(s=>s.trim()).filter(Boolean),help:get(r,'Yardım metni'),mapTo:pfKey(get(r,'Katılımcı alanı'))}));
  if(!fields.length)fail(400,'Dosyada soru yok');
  return {marketId,title,intro:'',status:'taslak',deadline:'',fields};
}

// Örnek başvurular: paneli tanımak için. "demo" işaretlidir, tek tıkla silinir.
const demoPeople=[
  {brandName:'Kil & Ateş',contactName:'Zeynep Arslan',email:'zeynep@kilates.com',phone:'0532 410 22 18',instagram:'kilveates',website:'kilveates.com',category:'Ev ve Dekorasyon',description:'Çanakkale toprağıyla el şekillendirme kupa, tabak ve vazolar. Her parça tek.',rating:5,status:'kabul'},
  {brandName:'Mavi Dikiş',contactName:'Elif Kaya',email:'elif@mavidikis.com',phone:'0541 228 90 03',instagram:'@mavidikis',website:'',category:'Giyim ve Moda',description:'Doğal kumaşlardan dikilmiş gömlek ve elbiseler, kalıplar kendi tasarımımız.',rating:4,status:'inceleniyor'},
  {brandName:'Zeytin Dalı Sabunları',contactName:'Hasan Demir',email:'hasan@zeytindali.com',phone:'0505 671 44 90',instagram:'https://instagram.com/zeytindalisabun',website:'zeytindali.com',category:'Kozmetik ve Kişisel Bakım',description:'Ayvacık zeytinyağıyla soğuk yöntem sabunlar ve katı şampuanlar.',rating:3,status:'yeni'},
  {brandName:'Pul Pul Atölye',contactName:'Deniz Şahin',email:'deniz@pulpul.com',phone:'0533 902 11 75',instagram:'pulpulatolye',website:'',category:'Takı ve Aksesuar',description:'Geri dönüştürülmüş cam ve pirinçten küpe, kolye ve broşlar.',rating:0,status:'yeni'}
];
function addDemoApplications(db,form){
  const out=[];
  demoPeople.forEach((d,i)=>{
    const answers={};
    for(const f of form.fields){
      if(f.mapTo&&d[f.mapTo]!=null)answers[f.id]=f.type==='select'&&!f.options.includes(d[f.mapTo])?f.options[0]||'':d[f.mapTo];
      else if(f.type==='checkboxes')answers[f.id]=f.options.slice(0,2+i%2);
      else if(f.type==='consent')answers[f.id]=true;
      else if(f.type==='file')answers[f.id]=[];
      else if(f.type==='select')answers[f.id]=f.options[i%Math.max(1,f.options.length)]||'';
      else if(f.type!=='heading')answers[f.id]=f.type==='textarea'?'Örnek yanıt: '+d.description:'';
    }
    const app={id:id('app'),formId:form.id,marketId:form.marketId,answers,mediaIds:[],status:d.status==='kabul'?'yeni':d.status,rating:d.rating,notes:i===0?'Örnek not: ürünleri çok özgün, kesin alalım.':'',participantId:null,matchedParticipantId:null,demo:true,createdAt:new Date(Date.now()-(i+1)*36e5*(i+2)).toISOString()};
    app.matchedParticipantId=matchParticipant(db,profileFromApplication(app,form))?.id||null;
    db.applications.unshift(app);out.push(app);
  });
  return out;
}

// --- API ---
async function api(req,res,db,pathname,b){
  const parts=pathname.split('/').filter(Boolean).slice(1),[resource,key,action]=parts,method=req.method;
  const admin=resource==='public'?null:currentAdmin(req,db);
  const q=new URL(req.url,'http://x').searchParams;

  // Herkese açık workshop listesi ve detayı (sitedeki Workshoplar sayfası)
  if(resource==='public'&&key==='workshops'){
    if(method!=='GET')fail(405,'Desteklenmiyor');
    const pubWs=w=>{const m=db.markets.find(x=>x.id===w.marketId),p=db.participants.find(x=>x.id===w.participantId);
      return {id:w.id,title:w.title,description:w.description,date:w.date,time:w.time,duration:w.duration,location:w.location,organizer:w.organizer,brand:p?.brandName||'',paid:w.paid,price:w.price,capacity:w.capacity,left:w.capacity?Math.max(0,w.capacity-wsTaken(w)):null,status:w.status,
        market:m?{id:m.id,name:m.name,edition:m.edition||null,startDate:m.startDate,endDate:m.endDate,hours:m.hours||'',location:m.location}:null,images:db.media.filter(x=>x.workshopId===w.id).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')).map(x=>x.id)}};
    const list=db.workshops.filter(w=>w.status!=='iptal');
    if(action){const w=list.find(x=>x.id===action)||fail(404,'Workshop bulunamadı');return pubWs(w)}
    return list.sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')).map(pubWs);
  }

  // Herkese açık başvuru formu
  if(resource==='public'&&key==='forms'){
    const form=find(db.forms,action,'Form'),market=db.markets.find(m=>m.id===form.marketId);
    const open=form.status==='acik'&&(!form.deadline||form.deadline>=now().slice(0,10));
    const staff=currentAdmin(req,db),preview=!open&&!!staff&&staff.role!=='katilimci';
    const me=staff?.role==='katilimci'?staff:null,mp=me&&db.participants.find(p=>p.id===me.participantId);
    const prefill=me?Object.fromEntries(form.fields.filter(f=>f.mapTo).map(f=>[f.id,f.mapTo==='contactName'?(mp?.contactName||me.name):f.mapTo==='email'?(mp?.email||me.email):(mp?.[f.mapTo]||'')]).filter(([,v])=>v)):null;
    const already=me&&db.applications.some(a=>a.formId===form.id&&(a.byAdmin===me.id||(mp&&(a.participantId===mp.id||a.matchedParticipantId===mp.id))));
    const reason=form.status==='taslak'?'taslak':form.status==='kapali'?'kapali':!open?'suresi':'';
    if(method==='GET')return {open,preview,reason,prefill,already,portal:!!me,form:{id:form.id,title:form.title,intro:form.intro,deadline:form.deadline,fields:form.fields},market:market&&pick(market,['name','startDate','endDate','hours','location'])};
    if(method==='POST'){
      if(!open)fail(403,'Bu form şu an başvuru kabul etmiyor');
      const answers={},app={id:id('app'),formId:form.id,marketId:form.marketId,answers,mediaIds:[],status:'yeni',rating:0,notes:'',participantId:null,matchedParticipantId:null,createdAt:now()};
      for(const f of form.fields){
        if(f.type==='heading')continue;
        if(f.type==='file'){
          const files=(b.files?.[f.id]||[]).slice(0,5);
          if(f.required&&!files.length)fail(400,`"${f.label}" için dosya yükle`);
          answers[f.id]=[];
          for(const file of files){const m=await storeFile(db,file,{marketId:form.marketId,category:'Başvuru görselleri',applicationId:app.id,title:file.name});app.mediaIds.push(m.id);answers[f.id].push(m.id)}
          continue;
        }
        let v=b.answers?.[f.id];
        if(f.type==='checkboxes')v=(Array.isArray(v)?v:[]).filter(o=>f.options.includes(o));
        else if(f.type==='consent')v=!!v;
        else v=text(v,f.type==='textarea'?5000:500);
        if(f.type==='select'&&v&&!f.options.includes(v))v='';
        if(f.type==='email'&&v&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))fail(400,'E-posta adresi geçersiz');
        if(f.mapTo==='instagram'&&v)v=igHandle(v);
        if(f.required&&(Array.isArray(v)?!v.length:!v))fail(400,`"${f.label}" alanı zorunlu`);
        answers[f.id]=v;
      }
      if(already)fail(409,'Bu forma zaten başvurdun. Durumunu panelinden takip edebilirsin.');
      app.matchedParticipantId=mp?.id||matchParticipant(db,profileFromApplication(app,form))?.id||null;
      if(me)app.byAdmin=me.id;
      db.applications.unshift(app);
      log(null,`Yeni başvuru: ${profileFromApplication(app,form).brandName||'İsimsiz'} → ${form.title}`,{type:'application',id:app.id});
      await save();
      return {ok:true};
    }
  }

  // Oturum
  if(resource==='auth'){
    if(key==='state')return {needsSetup:!db.admins.length,me:admin&&publicAdmin(admin)};
    if(key==='setup'&&method==='POST'){
      if(db.admins.length)fail(403,'Kurulum zaten yapılmış');
      const name=text(b.name,100),email=text(b.email,200).toLowerCase();
      if(!name||!email||String(b.password||'').length<8)fail(400,'Ad, e-posta ve en az 8 karakterli şifre gerekli');
      const a={id:id('adm'),name,email,role:'ana',active:true,createdAt:now(),...hashPassword(String(b.password))};
      db.admins.push(a);
      for(const k of ['markets','forms','participants'])for(const x of db[k])x.createdBy??=a.id;
      log(a.id,`${name} paneli kurdu`);await save();
      return json(res,200,{ok:true},{'Set-Cookie':startSession(res,a)});
    }
    // Katılımcı kendi hesabını açar. E-postası kayıtlı bir markaya aitse hesap, ekip eşleştirene kadar o markaya bağlanmaz.
    if(key==='signup'&&method==='POST'){
      const name=text(b.name,100),email=text(b.email,200).toLowerCase(),brandName=text(b.brandName,200);
      if(!name||!brandName||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))fail(400,'Marka adı, ad soyad ve geçerli bir e-posta gerekli');
      if(String(b.password||'').length<8)fail(400,'Şifre en az 8 karakter olmalı');
      if(db.admins.some(a=>a.email===email))fail(400,'Bu e-posta ile zaten bir hesap var. Giriş yap.');
      const profile={brandName,contactName:name,email,phone:text(b.phone,40),instagram:igHandle(b.instagram)};
      const found=matchParticipant(db,{email,instagram:profile.instagram});
      if(found&&db.admins.some(a=>a.participantId===found.id))fail(400,'Bu markanın zaten bir hesabı var. Giriş yap ya da bize yaz.');
      const a={id:id('adm'),name,email,role:'katilimci',active:true,selfSignup:true,createdAt:now(),...hashPassword(String(b.password))};
      if(found)a.claim=found.id;
      else{const p={...blankParticipant(null),...profile,tags:['kendi kaydı']};db.participants.push(p);a.participantId=p.id}
      db.admins.push(a);a.lastLoginAt=now();
      log(a.id,`Katılımcı olarak kayıt oldu: ${brandName}${found?' (marka eşleştirmesi bekliyor)':''}`,{type:'user'});await save();
      return json(res,200,{ok:true},{'Set-Cookie':startSession(res,a)});
    }
    if(key==='login'&&method==='POST'){
      const a=db.admins.find(x=>x.email===text(b.email,200).toLowerCase()&&x.active!==false);
      if(!a||!checkPassword(a,String(b.password||'')))fail(401,'E-posta veya şifre hatalı');
      a.lastLoginAt=now();log(a.id,'Giriş yaptı',{type:'login'});await save();
      return json(res,200,{ok:true},{'Set-Cookie':startSession(res,a)});
    }
    if(key==='logout'&&method==='POST'){if(admin){log(admin.id,'Çıkış yaptı',{type:'login'});await save()}sessions.delete(cookieToken(req));return json(res,200,{ok:true},{'Set-Cookie':'fp_admin=; Path=/; Max-Age=0'})}
  }

  need(admin);
  if(admin.role==='katilimci'){
    if(resource==='bootstrap')return portalBootstrap(db,admin);
    if(resource==='portal')return portal(req,db,admin,key,method,b,action);
    if(resource==='admins'&&key==='me'&&method==='PUT'){if(b.password){if(String(b.password).length<8)fail(400,'Şifre en az 8 karakter olmalı');Object.assign(admin,hashPassword(String(b.password)))}if(b.name)admin.name=text(b.name,100);await save();return publicAdmin(admin)}
    fail(403,'Bu alan katılımcılara kapalı');
  }
  if(resource==='bootstrap')return bootstrap(db,admin);

  // İz haritası: yalnızca ana yönetici görür
  if(resource==='activity'&&method==='GET'){
    need(admin,'trail');
    const who=q.get('admin');
    return db.activity.filter(a=>!who||a.adminId===who).slice(0,3000);
  }

  // Dışa aktarma, şablon, içe aktarma
  if((resource==='export'||resource==='template')&&method==='GET'){
    const [kind,ext]=String(key||'').split('.'),scope=q.get('pazar')||'all',m=db.markets.find(x=>x.id===scope);
    if(!['xlsx','csv'].includes(ext))fail(400,'Biçim xlsx ya da csv olmalı');
    if(['odemeler','kasa'].includes(kind))need(admin,'ledgerRead');
    const suffix=m?m.slug:'tum-pazarlar';
    if(resource==='template'){
      if(!sheets[kind])fail(404,'Şablon yok');
      const t=templateBook(db,kind);
      return sendBook(res,[{name:'Şablon',rows:t.rows},{name:'Nasıl doldurulur',rows:t.guide}],`sablon-${kind}`,ext);
    }
    if(kind==='basvurular'){const form=find(db.forms,q.get('form'),'Form');return sendBook(res,[{name:'Başvurular',rows:applicationTable(db,form)}],form.title,ext)}
    if(kind==='formlar'){const form=find(db.forms,q.get('form'),'Form');return sendBook(res,[{name:'Sorular',rows:exportRows(db,'formlar',{form:form.id})}],`form-${form.title}`,ext)}
    if(!sheets[kind])fail(404,'Bilinmeyen dışa aktarma');
    const book=[{name:sheets[kind].title,rows:exportRows(db,kind,{scope})}];
    if(kind==='kasa'){book.push({name:'Katılımcı ödemeleri',rows:exportRows(db,'odemeler',{scope})});book.push({name:'Özet',rows:kasaSummaryRows(db,scope)})}
    return sendBook(res,book,`${kind}-${suffix}`,ext);
  }
  if(resource==='import'&&method==='POST'){
    need(admin,key==='kasa'?'ledgerWrite':'import');
    const rows=(()=>{try{return readTable(text(b.filename,200),b.data)}catch(e){fail(400,e.message)}})();
    if(rows.length<2)fail(400,'Dosyada başlık satırı ve en az bir kayıt olmalı');
    if(key==='formlar'){
      need(admin,'formWrite');
      const market=find(db.markets,b.marketId,'Pazar');
      const f={id:id('frm'),...cleanForm(formFromSheet(rows,text(b.title,200)||'İçe aktarılan form',market.id),db),createdBy:admin.id,createdAt:now()};
      db.forms.push(f);log(admin.id,`Form içe aktarıldı: ${f.title}`,{type:'form',id:f.id});await save();
      return {created:1,updated:0,skipped:0,errors:[],formId:f.id};
    }
    const market=b.marketId&&b.marketId!=='all'?db.markets.find(m=>m.id===b.marketId):null;
    const out=runImport(db,key,rows,{admin,market,strict:!!b.strict});
    log(admin.id,`${sheets[key].title} içe aktarıldı: ${out.created} yeni, ${out.updated} güncellendi${out.skipped?`, ${out.skipped} atlandı`:''}`,{type:'import'});
    await save();return out;
  }

  // Örnek veriler: tüm panel için (yalnızca ana yönetici)
  if(resource==='demo'&&key==='all'){
    need(admin,'demoAll');
    if(method==='POST'){
      if(hasDemo(db))fail(409,'Örnek veriler zaten yüklü');
      const out=await addDemo(db,admin,{hashPassword,uniqueSlug,addDemoApplications});
      log(admin.id,`Örnek veriler eklendi: ${out.markets} pazar, ${out.participants} katılımcı, ${out.admins} yönetici`,{type:'demo'});await save();return out;
    }
    if(method==='DELETE'){await removeDemo(db);log(admin.id,'Örnek veriler silindi',{type:'demo'});await save();return {ok:true}}
  }

  // Örnek başvurular
  if(resource==='demo'&&key==='applications'){
    need(admin,'demo');
    if(method==='POST'){
      const form=db.forms.find(f=>f.id===b.formId)||db.forms.find(f=>!b.marketId||f.marketId===b.marketId)||fail(400,'Önce bir başvuru formu oluştur');
      const list=addDemoApplications(db,form);log(admin.id,`${list.length} örnek başvuru eklendi`,{type:'demo'});await save();return {count:list.length};
    }
    if(method==='DELETE'){
      const demo=db.applications.filter(a=>a.demo);
      db.applications=db.applications.filter(a=>!a.demo);
      const ids=new Set(demo.map(a=>a.participantId).filter(Boolean));
      db.participants=db.participants.filter(p=>!(p.demo&&ids.has(p.id)));
      log(admin.id,'Örnek başvurular silindi',{type:'demo'});await save();return {count:demo.length};
    }
  }

  if(resource==='markets'){
    need(admin,'marketWrite');
    if(method==='POST'){const m={id:id('mkt'),...cleanMarket(b),slug:'',createdBy:admin.id,createdAt:now()};checkEdition(db,m);m.slug=uniqueSlug(db,m);db.markets.push(m);log(admin.id,`Yeni pazar: ${m.name}`,{type:'market',id:m.id});await save();return m}
    const m=find(db.markets,key,'Pazar');guard(db,admin,m);
    if(method==='PUT'){const c=cleanMarket(b);checkEdition(db,c,m.id);Object.assign(m,c);log(admin.id,`Pazar güncellendi: ${m.name}`,{type:'market',id:m.id});await save();return m}
    if(method==='DELETE'){
      if(db.forms.some(f=>f.marketId===m.id)||db.media.some(x=>x.marketId===m.id))fail(409,'Bu pazara bağlı form veya dosya var. Önce onları taşı ya da sil.');
      if(m.edition)(db.usedEditions??=[]).push(m.edition);db.markets=db.markets.filter(x=>x!==m);for(const p of db.participants)p.markets=p.markets.filter(x=>x!==m.id);
      log(admin.id,`Pazar silindi: ${m.name}`);await save();return {ok:true}
    }
  }

  if(resource==='forms'){
    need(admin,'formWrite');
    if(method==='POST'&&!key){const f={id:id('frm'),...cleanForm({fields:defaultFields(),...b},db),createdBy:admin.id,createdAt:now()};db.forms.push(f);log(admin.id,`Yeni form: ${f.title}`,{type:'form',id:f.id});await save();return f}
    const form=find(db.forms,key,'Form');
    if(method==='POST'&&action==='duplicate'){
      const target=find(db.markets,b.marketId||form.marketId,'Pazar');
      const copy={...structuredClone(form),id:id('frm'),marketId:target.id,title:target.id===form.marketId?form.title+' (kopya)':form.title.replace(/^\d+\.\s*Pazar/,`${target.edition||''}. Pazar`),status:'taslak',createdBy:admin.id,createdAt:now()};
      copy.fields=copy.fields.map(f=>({...f,id:id('fld')}));
      db.forms.push(copy);log(admin.id,`Form kopyalandı: ${copy.title} → ${target.name}`,{type:'form',id:copy.id});await save();return copy;
    }
    guard(db,admin,form);
    if(method==='PUT'){Object.assign(form,cleanForm(b,db));log(admin.id,`Form güncellendi: ${form.title}`,{type:'form',id:form.id});await save();return form}
    if(method==='DELETE'){
      if(db.applications.some(a=>a.formId===form.id&&!a.demo))fail(409,'Bu forma gelmiş başvurular var. Formu silmek yerine kapat.');
      db.applications=db.applications.filter(a=>a.formId!==form.id);
      db.forms=db.forms.filter(x=>x!==form);log(admin.id,`Form silindi: ${form.title}`);await save();return {ok:true}
    }
  }

  if(resource==='applications'){
    need(admin,'appNote');
    const app=find(db.applications,key,'Başvuru'),form=db.forms.find(f=>f.id===app.formId);
    if(method==='PUT'){
      if(('status' in b||'rating' in b)&&!can(admin,'appReview'))fail(403,'Başvuruyu değerlendirmek için yetkin yok');
      if(b.status&&L.app[b.status]&&b.status!=='kabul')app.status=b.status;
      if('notes' in b)app.notes=text(b.notes,5000);
      if('rating' in b)app.rating=Math.max(0,Math.min(5,Number(b.rating)||0));
      app.updatedAt=now();app.reviewedBy=admin.id;
      log(admin.id,`Başvuru güncellendi: ${profileFromApplication(app,form).brandName||'İsimsiz'}${b.status?' → '+L.app[b.status]:''}`,{type:'application',id:app.id});
      await save();return app;
    }
    // Kabul: başvurudan katılımcı kaydı oluşturur ya da mevcut kaydı günceller, pazarı ve görselleri bağlar.
    if(method==='POST'&&action==='accept'){
      need(admin,'appAccept');
      const profile=profileFromApplication(app,form);
      let p=db.participants.find(x=>x.id===(b.participantId||app.participantId||app.matchedParticipantId));
      if(!p){p={...blankParticipant(admin.id),demo:!!app.demo};db.participants.push(p)}
      for(const k of participantFields)if(profile[k])p[k]=text(profile[k],k==='description'?5000:300);
      if(!p.brandName)p.brandName='İsimsiz katılımcı';
      if(!p.markets.includes(app.marketId))p.markets.push(app.marketId);
      const market=db.markets.find(m=>m.id===app.marketId);
      if(market&&!p.fees?.[market.id])(p.fees??={})[market.id]=cleanFee({amount:market.fee||0},admin.id);
      for(const m of db.media)if(app.mediaIds.includes(m.id)){m.participantId=p.id;m.category='Katılımcı ürünleri'}
      app.status='kabul';app.participantId=p.id;app.updatedAt=now();app.reviewedBy=admin.id;
      log(admin.id,`Başvuru kabul edildi: ${p.brandName}`,{type:'participant',id:p.id});await save();
      return {application:app,participant:p};
    }
    if(method==='DELETE'){
      need(admin,'appDelete');
      db.applications=db.applications.filter(x=>x!==app);
      for(const m of db.media)if(m.applicationId===app.id&&!m.participantId)await removeMedia(db,m);
      log(admin.id,'Başvuru silindi');await save();return {ok:true};
    }
  }

  if(resource==='participants'){
    need(admin,'participantWrite');
    if(method==='POST'&&key==='bulk'){
      need(admin,'bulk');
      const ids=new Set(Array.isArray(b.ids)?b.ids:[]),list=db.participants.filter(p=>ids.has(p.id)),market=b.marketId&&db.markets.find(m=>m.id===b.marketId);
      let done=0,skipped=0;
      for(const p of list){
        if(b.op==='addMarket'&&market){if(!p.markets.includes(market.id)){p.markets.push(market.id);done++}}
        else if(b.op==='removeMarket'&&market){if(p.markets.includes(market.id)){p.markets=p.markets.filter(x=>x!==market.id);done++}}
        else if(b.op==='category'){if(!owns(admin,p)){skipped++;continue}p.category=normalizeCategory(b.category);done++}
        else if(b.op==='tag'){if(!owns(admin,p)){skipped++;continue}const t=text(b.tag,40);if(t&&!p.tags.includes(t)){p.tags.push(t);done++}}
        else if(b.op==='delete'){if(!can(admin,'participantDelete')||!owns(admin,p)){skipped++;continue}db.participants=db.participants.filter(x=>x!==p);for(const m of db.media)if(m.participantId===p.id)m.participantId=null;for(const a of db.applications)if(a.participantId===p.id)a.participantId=null;done++}
      }
      const opName={addMarket:`pazara eklendi (${market?.name||''})`,removeMarket:`pazardan çıkarıldı (${market?.name||''})`,category:`kategorisi “${b.category}” yapıldı`,tag:`“${b.tag}” etiketi eklendi`,delete:'silindi'}[b.op]||b.op;
      log(admin.id,`Toplu işlem: ${done} katılımcı ${opName}`,{type:'bulk'});await save();return {done,skipped};
    }
    if(method==='POST'){const p={id:id('prt'),...cleanParticipant(b),createdBy:admin.id,createdAt:now()};db.participants.push(p);log(admin.id,`Yeni katılımcı: ${p.brandName}`,{type:'participant',id:p.id});await save();return p}
    const p=find(db.participants,key,'Katılımcı');
    if(method==='PUT'&&action==='fees'){
      need(admin,'feeWrite');
      const m=find(db.markets,parts[3],'Pazar');
      if(!p.markets.includes(m.id))fail(400,'Katılımcı bu pazarda değil');
      const old=p.fees?.[m.id];if(old?.by)guard(db,admin,old,'by');
      const f=cleanFee(b,old?.by||admin.id);(p.fees??={})[m.id]=f;
      log(admin.id,`Ödeme: ${p.brandName} · ${m.name} · ${tl(f.paid)}/${tl(f.amount)} TL${f.method?' · '+L.method[f.method]:''}`,{type:'fee',id:p.id});await save();return p;
    }
    if(method==='POST'&&action==='changes'){
      need(admin,'changeApprove');
      if(!p.pending)fail(400,'Onay bekleyen değişiklik yok');
      const ok=!!b.approve,changes=p.pending.changes;
      if(ok){Object.assign(p,cleanParticipant({...p,...changes}));p.updatedAt=now()}
      delete p.pending;
      log(admin.id,`Katılımcı değişikliği ${ok?'onaylandı':'reddedildi'}: ${p.brandName} (${Object.keys(changes).map(k=>L.pf[k]||k).join(', ')})`,{type:'participant',id:p.id});
      await save();return p;
    }
    guard(db,admin,p);
    if(method==='PUT'){const c=cleanParticipant(b);Object.assign(p,c);p.updatedAt=now();log(admin.id,`Katılımcı güncellendi: ${p.brandName}`,{type:'participant',id:p.id});await save();return p}
    if(method==='DELETE'){
      need(admin,'participantDelete');
      db.participants=db.participants.filter(x=>x!==p);
      for(const m of db.media)if(m.participantId===p.id)m.participantId=null;
      for(const a of db.applications)if(a.participantId===p.id)a.participantId=null;
      log(admin.id,`Katılımcı silindi: ${p.brandName}`);await save();return {ok:true};
    }
  }

  if(resource==='workshops'){
    need(admin,'workshopWrite');
    if(method==='POST'&&!key){const w={id:id('wrk'),...cleanWorkshop(b,db),createdBy:admin.id,createdAt:now()};db.workshops.push(w);log(admin.id,`Yeni workshop: ${w.title}`,{type:'workshop',id:w.id});await save();return w}
    const w=find(db.workshops,key,'Workshop');
    if(method==='PUT'&&action==='registrations'){
      const r=(w.registrations||[]).find(x=>x.id===parts[3])||fail(404,'Kayıt bulunamadı');
      if(!['bekliyor','onay','red'].includes(b.status))fail(400,'Geçersiz durum');
      r.status=b.status;r.by=admin.id;log(admin.id,`Workshop kaydı ${({onay:'onaylandı',red:'reddedildi',bekliyor:'beklemeye alındı'})[b.status]}: ${r.name} · ${w.title}`,{type:'workshop',id:w.id});await save();return w;
    }
    guard(db,admin,w);
    if(action==='images'){
      if(method==='POST'){const out=[];for(const file of (b.files||[]).slice(0,12))out.push(await storeFile(db,file,{marketId:w.marketId,category:'Workshop',workshopId:w.id,title:w.title,tags:['workshop'],uploadedBy:admin.id}));log(admin.id,`${out.length} workshop görseli yüklendi · ${w.title}`,{type:'workshop',id:w.id});await save();return out}
      if(method==='DELETE'){const m=db.media.find(x=>x.id===parts[3]&&x.workshopId===w.id)||fail(404,'Görsel bulunamadı');await removeMedia(db,m);await save();return {ok:true}}
    }
    if(method==='PUT'){Object.assign(w,cleanWorkshop(b,db));w.updatedAt=now();log(admin.id,`Workshop güncellendi: ${w.title}`,{type:'workshop',id:w.id});await save();return w}
    if(method==='DELETE'){for(const m of db.media.filter(x=>x.workshopId===w.id))await removeMedia(db,m);db.workshops=db.workshops.filter(x=>x!==w);log(admin.id,`Workshop silindi: ${w.title}`);await save();return {ok:true}}
  }

  if(resource==='settings'&&key==='payment'&&method==='PUT'){
    need(admin,'ledgerWrite');
    db.settings.payment={bank:text(b.bank,120),holder:text(b.holder,160),iban:text(b.iban,40).toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/(.{4})/g,'$1 ').trim(),note:text(b.note,600),updatedBy:admin.id,updatedAt:now()};
    log(admin.id,'Ödeme (havale/EFT) bilgileri güncellendi',{type:'ledger'});await save();return db.settings.payment;
  }

  if(resource==='ledger'){
    need(admin,'ledgerWrite');
    if(method==='POST'){const e={id:id('kas'),...cleanLedger(b,db),createdBy:admin.id,createdAt:now()};db.ledger.push(e);log(admin.id,`Kasa: ${L.ledger[e.type]} ${tl(e.amount)} TL · ${e.title}`,{type:'ledger',id:e.id});await save();return e}
    const e=find(db.ledger,key,'Kayıt');guard(db,admin,e);
    if(method==='PUT'){Object.assign(e,cleanLedger(b,db));e.updatedAt=now();log(admin.id,`Kasa kaydı güncellendi: ${e.title}`,{type:'ledger',id:e.id});await save();return e}
    if(method==='DELETE'){db.ledger=db.ledger.filter(x=>x!==e);log(admin.id,`Kasa kaydı silindi: ${e.title} · ${tl(e.amount)} TL`);await save();return {ok:true}}
  }

  if(resource==='media'){
    need(admin,'mediaWrite');
    if(method==='POST'){
      const out=[];
      for(const file of (b.files||[]).slice(0,30))out.push(await storeFile(db,file,{marketId:b.marketId,category:b.category,participantId:b.participantId||null,tags:(b.tags||[]).map(t=>text(t,40)),uploadedBy:admin.id}));
      log(admin.id,`${out.length} dosya yüklendi${b.category?' · '+b.category:''}`,{type:'media'});await save();return out;
    }
    const m=find(db.media,key,'Dosya');guard(db,admin,m,'uploadedBy');
    if(method==='PUT'){
      m.title=text(b.title,200)||m.title;
      if(mediaCategories.includes(b.category))m.category=b.category;
      if('participantId' in b)m.participantId=db.participants.some(p=>p.id===b.participantId)?b.participantId:null;
      if('marketId' in b)m.marketId=db.markets.some(x=>x.id===b.marketId)?b.marketId:null;
      if(Array.isArray(b.tags))m.tags=b.tags.map(t=>text(t,40)).filter(Boolean);
      await save();return m;
    }
    if(method==='DELETE'){await removeMedia(db,m);log(admin.id,`Dosya silindi: ${m.title}`);await save();return {ok:true}}
  }

  if(resource==='admins'){
    if(key==='me'&&method==='PUT'){
      if(b.password){if(String(b.password).length<8)fail(400,'Şifre en az 8 karakter olmalı');Object.assign(admin,hashPassword(String(b.password)))}
      if(b.name)admin.name=text(b.name,100);
      await save();return publicAdmin(admin);
    }
    need(admin,'users');
    const assignable=assignableBy(admin);
    const linkParticipant=(a,pid)=>{if(a.role!=='katilimci'){delete a.participantId;return}const p=db.participants.find(x=>x.id===pid)||fail(400,'Katılımcı hesabı için bir marka seç');if(db.admins.some(x=>x!==a&&x.role==='katilimci'&&x.participantId===p.id))fail(400,'Bu markanın zaten bir hesabı var');a.participantId=p.id};
    if(method==='POST'){
      const email=text(b.email,200).toLowerCase();
      if(!email||db.admins.some(a=>a.email===email))fail(400,'Bu e-posta zaten kayıtlı ya da boş');
      if(String(b.password||'').length<8)fail(400,'Şifre en az 8 karakter olmalı');
      const a={id:id('adm'),name:text(b.name,100)||email,email,role:assignable.includes(b.role)?b.role:'katilimci',active:true,createdBy:admin.id,createdAt:now(),...hashPassword(String(b.password))};
      linkParticipant(a,b.participantId);
      db.admins.push(a);log(admin.id,`Yeni kullanıcı: ${a.name} (${roleNames[a.role]})`,{type:'user'});await save();return publicAdmin(a);
    }
    const a=find(db.admins,key,'Kullanıcı');
    if(a.role==='ana'&&a.id!==admin.id)fail(403,'Ana yönetici değiştirilemez');
    if(admin.role!=='ana'&&a.id!==admin.id&&!assignable.includes(a.role))fail(403,'Bu kullanıcıyı yalnızca ana yönetici değiştirebilir');
    if(method==='PUT'&&'link' in b){
      if(!a.claim)fail(400,'Eşleştirme bekleyen marka yok');
      const p=find(db.participants,a.claim,'Katılımcı');
      if(b.link){if(db.admins.some(x=>x.participantId===p.id))fail(400,'Bu markanın zaten bir hesabı var');a.participantId=p.id}
      log(admin.id,`${a.name} hesabı ${b.link?'eşleştirildi':'eşleştirmesi reddedildi'}: ${p.brandName}`,{type:'user'});delete a.claim;await save();return publicAdmin(a);
    }
    if(method==='PUT'){
      if(b.role&&a.id===admin.id&&b.role!=='ana')fail(400,'Ana yönetici rolünü kendinden kaldıramazsın');
      if(b.role&&assignable.includes(b.role)&&a.id!==admin.id){a.role=b.role;linkParticipant(a,b.participantId||a.participantId);log(admin.id,`${a.name} rolü: ${roleNames[b.role]}`,{type:'user'})}
      if('active' in b&&a.id!==admin.id){a.active=!!b.active;log(admin.id,`${a.name} ${a.active?'etkinleştirildi':'pasifleştirildi'}`,{type:'user'})}
      if(b.password){if(String(b.password).length<8)fail(400,'Şifre en az 8 karakter olmalı');Object.assign(a,hashPassword(String(b.password)))}
      await save();return publicAdmin(a);
    }
    if(method==='DELETE'){if(a.id===admin.id)fail(400,'Kendini silemezsin');db.admins=db.admins.filter(x=>x!==a);log(admin.id,`Kullanıcı silindi: ${a.name}`,{type:'user'});await save();return {ok:true}}
  }

  fail(404,'Bulunamadı');
}

function kasaSummaryRows(db,scope){
  const ms=db.markets.filter(m=>scope==='all'||m.id===scope);
  let fees=0;for(const m of ms)for(const p of db.participants.filter(x=>x.markets.includes(m.id)))fees+=feeOf(p,m).paid;
  const led=db.ledger.filter(e=>scope==='all'||e.marketId===scope);
  const inc=led.filter(e=>e.type==='gelir').reduce((s,e)=>s+e.amount,0),exp=led.filter(e=>e.type==='gider').reduce((s,e)=>s+e.amount,0);
  return [['Kalem','Tutar (TL)'],['Tahsil edilen katılım ücretleri',fees],['Diğer gelirler',inc],['Giderler',exp],['Kasada',fees+inc-exp],[],['Faturası bekleniyor',led.filter(e=>e.type==='gider'&&e.invoice==='bekleniyor').length],['Fişi olmayan gider',led.filter(e=>e.type==='gider'&&!e.receipt).length]];
}

async function removeMedia(db,m){
  try{await unlink(new URL(m.path,uploadDir))}catch{}
  db.media=db.media.filter(x=>x!==m);
  for(const a of db.applications)a.mediaIds=a.mediaIds.filter(x=>x!==m.id);
  for(const e of db.ledger)if(e.mediaId===m.id)e.mediaId=null;
}

function uniqueSlug(db,m){
  const base=m.edition?`${m.edition}-pazar`:slugify(m.name);let slug=base,i=2;
  while(db.markets.some(x=>x.slug===slug))slug=`${base}-${i++}`;
  return slug;
}
