// Admin paneli, başvuru formları ve görsel deposu için HTTP uç noktaları.
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {scryptSync,randomBytes,timingSafeEqual} from 'node:crypto';
import {load,save,id,now,slugify,log,uploadDir,defaultFields,participantFields} from './store.mjs';

const root=new URL('../',import.meta.url);
const sessions=new Map();
const SESSION_MS=1000*60*60*12;
export const mediaCategories=['Afiş & kimlik','Katılımcı ürünleri','Başvuru görselleri','Etkinlik fotoğrafları','Sosyal medya','Basın','Diğer'];
const imageTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','application/pdf':'pdf'};
const roles={sahip:3,editor:2,izleyici:1};
const staticFiles={'/admin':'admin/index.html','/admin/':'admin/index.html','/admin/admin.css':'admin/admin.css','/admin/admin.js':'admin/admin.js','/basvuru/basvuru.js':'basvuru/basvuru.js'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};

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

// --- Oturum ---
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
function need(admin,level){if(!admin)fail(401,'Giriş yapmalısın');if(roles[admin.role]<roles[level])fail(403,'Bu işlem için yetkin yok')}

// --- Yardımcılar ---
const text=(v,max=2000)=>String(v??'').trim().slice(0,max);
const find=(list,key,label)=>list.find(x=>x.id===key)||fail(404,label+' bulunamadı');
const pick=(src,keys)=>Object.fromEntries(keys.filter(k=>k in src).map(k=>[k,src[k]]));

function bootstrap(db,admin){
  return {me:publicAdmin(admin),markets:db.markets,forms:db.forms,applications:db.applications,participants:db.participants,media:db.media,admins:db.admins.map(publicAdmin),activity:db.activity.slice(0,60),mediaCategories,participantFields};
}

function cleanMarket(b){
  const m={name:text(b.name,120),edition:Number(b.edition)||null,startDate:text(b.startDate,10),endDate:text(b.endDate,10),hours:text(b.hours,60),location:text(b.location,160),capacity:Number(b.capacity)||0,status:['planlama','basvuru','aktif','tamamlandi'].includes(b.status)?b.status:'planlama',notes:text(b.notes,5000)};
  if(!m.name)fail(400,'Pazar adı gerekli');
  return m;
}

const fieldTypes=['text','textarea','email','phone','url','number','date','select','checkboxes','file','consent','heading'];
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
function cleanParticipant(b){
  const p={...Object.fromEntries(participantFields.map(k=>[k,text(b[k],k==='description'?5000:300)])),tags:(Array.isArray(b.tags)?b.tags:String(b.tags||'').split(',')).map(t=>text(t,40)).filter(Boolean).slice(0,20),markets:Array.isArray(b.markets)?b.markets.filter(x=>typeof x==='string'):[],notes:text(b.notes,5000)};
  if(!p.brandName)fail(400,'Marka adı gerekli');
  return p;
}

// Başvurudaki "katılımcı alanına bağlı" sorulardan katılımcı bilgisini çıkarır.
function profileFromApplication(app,form){
  const out={};
  for(const f of form?.fields||[])if(f.mapTo&&app.answers[f.id]!=null){const v=app.answers[f.id];out[f.mapTo]=Array.isArray(v)?v.join(', '):String(v)}
  return out;
}
function matchParticipant(db,profile){
  const email=profile.email?.toLowerCase(),brand=slugify(profile.brandName);
  return db.participants.find(p=>(email&&p.email?.toLowerCase()===email)||(profile.brandName&&slugify(p.brandName)===brand));
}

async function storeFile(db,{name,type,data},meta){
  const ext=imageTypes[type];if(!ext)fail(400,'Sadece JPG, PNG, WEBP, GIF veya PDF yüklenebilir');
  const buf=Buffer.from(String(data||''),'base64');
  if(!buf.length)fail(400,'Boş dosya');if(buf.length>15*1024*1024)fail(413,'Bir dosya en fazla 15 MB olabilir');
  const market=db.markets.find(m=>m.id===meta.marketId);
  const mid=id('med'),folder=`${market?market.slug:'genel'}/${slugify(meta.category)}`;
  const base=slugify(String(name||'gorsel').replace(/\.[^.]+$/,''));
  const path=`${folder}/${mid.slice(4)}-${base}.${ext}`;
  await mkdir(new URL(folder+'/',uploadDir),{recursive:true});
  await writeFile(new URL(path,uploadDir),buf);
  const item={id:mid,marketId:market?.id||null,category:mediaCategories.includes(meta.category)?meta.category:'Diğer',participantId:meta.participantId||null,applicationId:meta.applicationId||null,title:text(meta.title||name,200),tags:meta.tags||[],filename:text(name,200),path,mime:type,size:buf.length,uploadedBy:meta.uploadedBy||null,createdAt:now()};
  db.media.unshift(item);
  return item;
}

async function serveMedia(req,res,db,mediaId){
  const admin=currentAdmin(req,db);if(!admin)fail(401,'Giriş yapmalısın');
  const item=find(db.media,mediaId,'Dosya');
  const disposition=new URL(req.url,'http://x').searchParams.has('indir')?`attachment; filename="${slugify(item.title)}.${item.path.split('.').pop()}"`:'inline';
  return send(res,200,await readFile(new URL(item.path,uploadDir)),item.mime,{'Content-Disposition':disposition,'Content-Security-Policy':"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"});
}

function csv(rows){return '﻿'+rows.map(r=>r.map(v=>{const s=Array.isArray(v)?v.join(', '):String(v??'');return /[",;\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}).join(';')).join('\n')}

// --- API ---
async function api(req,res,db,pathname,b){
  const parts=pathname.split('/').filter(Boolean).slice(1),[resource,key,action]=parts,method=req.method;
  const admin=resource==='public'?null:currentAdmin(req,db);

  // Herkese açık başvuru formu
  if(resource==='public'&&key==='forms'){
    const form=find(db.forms,action,'Form'),market=db.markets.find(m=>m.id===form.marketId);
    const open=form.status==='acik'&&(!form.deadline||form.deadline>=now().slice(0,10));
    if(method==='GET')return {open,form:{id:form.id,title:form.title,intro:form.intro,deadline:form.deadline,fields:form.fields},market:market&&pick(market,['name','startDate','endDate','hours','location'])};
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
        if(f.required&&(Array.isArray(v)?!v.length:!v))fail(400,`"${f.label}" alanı zorunlu`);
        answers[f.id]=v;
      }
      app.matchedParticipantId=matchParticipant(db,profileFromApplication(app,form))?.id||null;
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
      const a={id:id('adm'),name,email,role:'sahip',active:true,createdAt:now(),...hashPassword(String(b.password))};
      db.admins.push(a);log(a.id,`${name} paneli kurdu`);await save();
      return json(res,200,{ok:true},{'Set-Cookie':startSession(res,a)});
    }
    if(key==='login'&&method==='POST'){
      const a=db.admins.find(x=>x.email===text(b.email,200).toLowerCase()&&x.active!==false);
      if(!a||!checkPassword(a,String(b.password||'')))fail(401,'E-posta veya şifre hatalı');
      a.lastLoginAt=now();await save();
      return json(res,200,{ok:true},{'Set-Cookie':startSession(res,a)});
    }
    if(key==='logout'&&method==='POST'){sessions.delete(cookieToken(req));return json(res,200,{ok:true},{'Set-Cookie':'fp_admin=; Path=/; Max-Age=0'})}
  }

  need(admin,'izleyici');
  if(resource==='bootstrap')return bootstrap(db,admin);

  if(resource==='markets'){
    need(admin,'editor');
    if(method==='POST'){const m={id:id('mkt'),...cleanMarket(b),slug:'',createdAt:now()};m.slug=uniqueSlug(db,m);db.markets.push(m);log(admin.id,`Yeni pazar: ${m.name}`,{type:'market',id:m.id});await save();return m}
    const m=find(db.markets,key,'Pazar');
    if(method==='PUT'){Object.assign(m,cleanMarket(b));log(admin.id,`Pazar güncellendi: ${m.name}`,{type:'market',id:m.id});await save();return m}
    if(method==='DELETE'){
      need(admin,'sahip');
      if(db.forms.some(f=>f.marketId===m.id)||db.media.some(x=>x.marketId===m.id))fail(409,'Bu pazara bağlı form veya dosya var. Önce onları taşı ya da sil.');
      db.markets=db.markets.filter(x=>x!==m);for(const p of db.participants)p.markets=p.markets.filter(x=>x!==m.id);
      log(admin.id,`Pazar silindi: ${m.name}`);await save();return {ok:true}
    }
  }

  if(resource==='forms'){
    if(method==='GET'&&action==='export.csv'){
      const form=find(db.forms,key,'Form'),fields=form.fields.filter(f=>f.type!=='heading');
      const rows=[['Tarih','Durum','Puan',...fields.map(f=>f.label)],...db.applications.filter(a=>a.formId===form.id).map(a=>[a.createdAt.slice(0,16).replace('T',' '),a.status,a.rating||'',...fields.map(f=>f.type==='file'?(a.answers[f.id]||[]).length+' dosya':f.type==='consent'?(a.answers[f.id]?'Evet':'Hayır'):a.answers[f.id])])];
      return send(res,200,csv(rows),'text/csv; charset=utf-8',{'Content-Disposition':`attachment; filename="${slugify(form.title)}.csv"`});
    }
    need(admin,'editor');
    if(method==='POST'&&!key){const f={id:id('frm'),...cleanForm({fields:defaultFields(),...b},db),createdAt:now()};db.forms.push(f);log(admin.id,`Yeni form: ${f.title}`,{type:'form',id:f.id});await save();return f}
    const form=find(db.forms,key,'Form');
    if(method==='POST'&&action==='duplicate'){
      const target=find(db.markets,b.marketId||form.marketId,'Pazar');
      const copy={...structuredClone(form),id:id('frm'),marketId:target.id,title:target.id===form.marketId?form.title+' (kopya)':form.title.replace(/^\d+\.\s*Pazar/,`${target.edition||''}. Pazar`),status:'taslak',createdAt:now()};
      copy.fields=copy.fields.map(f=>({...f,id:id('fld')}));
      db.forms.push(copy);log(admin.id,`Form kopyalandı: ${copy.title} → ${target.name}`,{type:'form',id:copy.id});await save();return copy;
    }
    if(method==='PUT'){Object.assign(form,cleanForm(b,db));log(admin.id,`Form güncellendi: ${form.title}`,{type:'form',id:form.id});await save();return form}
    if(method==='DELETE'){
      if(db.applications.some(a=>a.formId===form.id))fail(409,'Bu forma gelmiş başvurular var. Formu silmek yerine kapat.');
      db.forms=db.forms.filter(x=>x!==form);log(admin.id,`Form silindi: ${form.title}`);await save();return {ok:true}
    }
  }

  if(resource==='applications'){
    need(admin,'editor');
    const app=find(db.applications,key,'Başvuru'),form=db.forms.find(f=>f.id===app.formId);
    if(method==='PUT'){
      if(b.status&&['yeni','inceleniyor','kabul','yedek','red'].includes(b.status))app.status=b.status;
      if('notes' in b)app.notes=text(b.notes,5000);
      if('rating' in b)app.rating=Math.max(0,Math.min(5,Number(b.rating)||0));
      app.updatedAt=now();await save();return app;
    }
    // Kabul: başvurudan katılımcı kaydı oluşturur ya da mevcut kaydı günceller, pazarı ve görselleri bağlar.
    if(method==='POST'&&action==='accept'){
      const profile=profileFromApplication(app,form);
      let p=db.participants.find(x=>x.id===(b.participantId||app.participantId||app.matchedParticipantId));
      if(!p){p={id:id('prt'),brandName:'',contactName:'',email:'',phone:'',instagram:'',website:'',category:'',description:'',tags:[],markets:[],notes:'',createdAt:now()};db.participants.push(p)}
      for(const k of participantFields)if(profile[k])p[k]=text(profile[k],k==='description'?5000:300);
      if(!p.brandName)p.brandName='İsimsiz katılımcı';
      if(!p.markets.includes(app.marketId))p.markets.push(app.marketId);
      for(const m of db.media)if(app.mediaIds.includes(m.id)){m.participantId=p.id;m.category='Katılımcı ürünleri'}
      app.status='kabul';app.participantId=p.id;app.updatedAt=now();
      log(admin.id,`Başvuru kabul edildi: ${p.brandName}`,{type:'participant',id:p.id});await save();
      return {application:app,participant:p};
    }
    if(method==='DELETE'){
      need(admin,'sahip');
      db.applications=db.applications.filter(x=>x!==app);
      for(const m of db.media)if(m.applicationId===app.id&&!m.participantId)await removeMedia(db,m);
      log(admin.id,'Başvuru silindi');await save();return {ok:true};
    }
  }

  if(resource==='participants'){
    need(admin,'editor');
    if(method==='POST'){const p={id:id('prt'),...cleanParticipant(b),createdAt:now()};db.participants.push(p);log(admin.id,`Yeni katılımcı: ${p.brandName}`,{type:'participant',id:p.id});await save();return p}
    const p=find(db.participants,key,'Katılımcı');
    if(method==='PUT'){Object.assign(p,cleanParticipant(b));p.updatedAt=now();await save();return p}
    if(method==='DELETE'){
      need(admin,'sahip');
      db.participants=db.participants.filter(x=>x!==p);
      for(const m of db.media)if(m.participantId===p.id)m.participantId=null;
      for(const a of db.applications)if(a.participantId===p.id)a.participantId=null;
      log(admin.id,`Katılımcı silindi: ${p.brandName}`);await save();return {ok:true};
    }
  }

  if(resource==='media'){
    need(admin,'editor');
    if(method==='POST'){
      const out=[];
      for(const file of (b.files||[]).slice(0,30))out.push(await storeFile(db,file,{marketId:b.marketId,category:b.category,participantId:b.participantId||null,tags:(b.tags||[]).map(t=>text(t,40)),uploadedBy:admin.id}));
      log(admin.id,`${out.length} dosya yüklendi`,{type:'media'});await save();return out;
    }
    const m=find(db.media,key,'Dosya');
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
    need(admin,'sahip');
    if(method==='POST'){
      const email=text(b.email,200).toLowerCase();
      if(!email||db.admins.some(a=>a.email===email))fail(400,'Bu e-posta zaten kayıtlı ya da boş');
      if(String(b.password||'').length<8)fail(400,'Şifre en az 8 karakter olmalı');
      const a={id:id('adm'),name:text(b.name,100)||email,email,role:roles[b.role]?b.role:'editor',active:true,createdAt:now(),...hashPassword(String(b.password))};
      db.admins.push(a);log(admin.id,`Yeni yönetici: ${a.name}`);await save();return publicAdmin(a);
    }
    const a=find(db.admins,key,'Yönetici');
    if(method==='PUT'){
      if(a.id===admin.id&&b.role&&b.role!=='sahip')fail(400,'Kendi sahip yetkini kaldıramazsın');
      if(roles[b.role])a.role=b.role;
      if('active' in b&&a.id!==admin.id)a.active=!!b.active;
      if(b.password){if(String(b.password).length<8)fail(400,'Şifre en az 8 karakter olmalı');Object.assign(a,hashPassword(String(b.password)))}
      await save();return publicAdmin(a);
    }
    if(method==='DELETE'){if(a.id===admin.id)fail(400,'Kendini silemezsin');db.admins=db.admins.filter(x=>x!==a);await save();return {ok:true}}
  }

  fail(404,'Bulunamadı');
}

async function removeMedia(db,m){
  try{await unlink(new URL(m.path,uploadDir))}catch{}
  db.media=db.media.filter(x=>x!==m);
  for(const a of db.applications)a.mediaIds=a.mediaIds.filter(x=>x!==m.id);
}

function uniqueSlug(db,m){
  const base=m.edition?`${m.edition}-pazar`:slugify(m.name);let slug=base,i=2;
  while(db.markets.some(x=>x.slug===slug))slug=`${base}-${i++}`;
  return slug;
}
