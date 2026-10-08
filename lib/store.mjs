// Basit JSON veri deposu: data/db.json içinde tüm kayıtlar, data/uploads/ içinde dosyalar.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

export const dataDir=new URL('../data/',import.meta.url);
export const uploadDir=new URL('uploads/',dataDir);
const dbFile=new URL('db.json',dataDir);

const empty=()=>({markets:[],forms:[],applications:[],participants:[],admins:[],media:[],activity:[],workshops:[],ledger:[],usedEditions:[],tasks:[],ratings:[],blacklist:[],messages:[]});

// Katılımcı kategorileri: genel ve alt kategorisiz.
export const categories=['Giyim ve Moda','Ayakkabı ve Çanta','Takı ve Aksesuar','Ev ve Dekorasyon','Elektronik ve Teknoloji','Kozmetik ve Kişisel Bakım','Gıda ve İçecek','Anne, Bebek ve Çocuk','Spor ve Outdoor','Kitap, Kırtasiye ve Hobi'];
// Eski, dar kategorileri yeni genel kategorilere çevirir; tanınmayan değer olduğu gibi kalır.
const oldCategory=[[/seramik|mum|dekor|ev\b|illüstrasyon|illustrasyon|tasarım objesi/i,'Ev ve Dekorasyon'],[/tekstil|giyim|moda/i,'Giyim ve Moda'],[/takı|aksesuar/i,'Takı ve Aksesuar'],[/gurme|lezzet|gıda|yiyecek|içecek|kahve/i,'Gıda ve İçecek'],[/kozmetik|sabun|bakım/i,'Kozmetik ve Kişisel Bakım'],[/ayakkabı|çanta/i,'Ayakkabı ve Çanta'],[/kitap|kırtasiye|hobi|baskı/i,'Kitap, Kırtasiye ve Hobi'],[/çocuk|bebek/i,'Anne, Bebek ve Çocuk'],[/spor|outdoor/i,'Spor ve Outdoor'],[/elektronik|teknoloji/i,'Elektronik ve Teknoloji']];
export function normalizeCategory(v){
  const s=String(v||'').trim();if(!s)return '';
  const exact=categories.find(c=>c.toLocaleLowerCase('tr')===s.toLocaleLowerCase('tr'));if(exact)return exact;
  return oldCategory.find(([re])=>re.test(s))?.[1]||s;
}
// Instagram her zaman @kullaniciadi biçiminde saklanır: bağlantı, boşluk ya da @ olmadan yazılsa da.
export function igHandle(v){
  let s=String(v||'').trim();if(!s)return '';
  s=s.replace(/^https?:\/\//i,'').replace(/^(www\.)?instagram\.com\//i,'').split(/[/?#\s]/)[0].replace(/^@+/,'');
  return s?'@'+s:'';
}
// Eski kayıtları yeni yapıya taşır (roller, kategoriler, instagram, yeni tablolar).
function migrate(d){
  for(const k of Object.keys(empty()))d[k]??=[];
  if(!d.settings||Array.isArray(d.settings))d.settings={payment:{}};d.settings.payment??={};
  const roleMap={sahip:'ana',yardimci:'organizator',stajyer:'editor',izleyici:'editor'};
  for(const a of d.admins)if(roleMap[a.role])a.role=roleMap[a.role];
  const owner=d.admins.find(a=>a.role==='ana')?.id||null;
  for(const p of d.participants){p.category=normalizeCategory(p.category);p.instagram=igHandle(p.instagram);p.createdBy??=owner}
  for(const k of ['markets','forms'])for(const x of d[k])x.createdBy??=owner;
  for(const f of d.forms)for(const q of f.fields||[])if(q.mapTo==='category'&&q.type==='select')q.options=[...categories];
  for(const m of d.markets)if(m.posterId){const x=d.media.find(y=>y.id===m.posterId);if(x)x.category='Pazar afişleri'}
  for(const f of d.forms)if(f.fields&&!f.fields.some(q=>q.key==='photoConsent'))f.fields.push({id:id('fld'),type:'consent',label:photoConsent,required:true,help:'',options:[],mapTo:'',key:'photoConsent'});
}

let db=null,writing=Promise.resolve();

export async function load(){
  if(db)return db;
  await mkdir(uploadDir,{recursive:true});
  try{db={...empty(),...JSON.parse(await readFile(dbFile,'utf8'))};migrate(db)}
  catch(err){if(err.code!=='ENOENT')throw err;db=empty();migrate(db);await seed(db);await save()}
  return db;
}

// Yazmalar sıraya alınır; önce geçici dosyaya yazılıp sonra taşınır, böylece dosya yarım kalmaz.
export function save(){
  writing=writing.catch(()=>{}).then(async()=>{const tmp=new URL('db.json.tmp',dataDir);const data=JSON.stringify(db,null,1);await writeFile(tmp,data);try{await rename(tmp,dbFile)}catch(err){if(!['EPERM','EACCES','EBUSY'].includes(err.code))throw err;await writeFile(dbFile,data)}});
  return writing;
}

export const id=prefix=>prefix+'_'+randomBytes(6).toString('hex');
export const now=()=>new Date().toISOString();

export function slugify(text){
  const map={ç:'c',ğ:'g',ı:'i',İ:'i',ö:'o',ş:'s',ü:'u',Ç:'c',Ğ:'g',Ö:'o',Ş:'s',Ü:'u'};
  return String(text||'').replace(/[çğıİöşüÇĞÖŞÜ]/g,c=>map[c]).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'dosya';
}

export function log(adminId,text,ref){
  db.activity.unshift({id:id('act'),at:now(),adminId,text,ref:ref||null});
  db.activity.length=Math.min(db.activity.length,5000);
}

// İlk açılışta mevcut 5. pazarı, sitedeki katılımcıları ve hazır bir başvuru formunu oluşturur.
async function seed(d){
  const t=now();
  const market={id:id('mkt'),name:'5. Fevzipaşa Tasarım Pazarı',edition:5,slug:'5-pazar',startDate:'2026-10-09',endDate:'2026-10-11',hours:'11.00–21.00',location:'Fevzipaşa / Çanakkale',capacity:40,status:'aktif',notes:'',createdAt:t};
  d.markets.push(market);
  let brands=[];
  try{brands=JSON.parse(await readFile(new URL('../brands.json',import.meta.url),'utf8'))}catch{}
  for(const b of brands)d.participants.push({id:id('prt'),brandName:b.name,contactName:'',email:'',phone:'',instagram:'',website:b.url||'',category:normalizeCategory(b.category),description:b.description||'',tags:[],markets:[market.id],notes:'Siteden aktarıldı.',createdAt:t});
  d.forms.push({id:id('frm'),marketId:market.id,title:'5. Pazar Katılımcı Başvurusu',intro:'Fevzipaşa Tasarım Pazarı’na katılmak için formu doldur. Başvurular ekip tarafından değerlendirilir.',status:'taslak',deadline:'',fields:defaultFields(),createdAt:t});
}

export const photoConsent='Pazar sırasında stantımın, ürünlerimin ve benim fotoğraf ve videolarımın çekilip Fevzipaşa Tasarım Pazarı’nın sitesinde ve sosyal medya hesaplarında paylaşılmasına izin veriyorum.';
export function defaultFields(){
  const f=(type,label,extra={})=>({id:id('fld'),type,label,required:false,help:'',options:[],mapTo:'',...extra});
  return [
    f('text','Marka adı',{required:true,mapTo:'brandName'}),
    f('text','Ad soyad',{required:true,mapTo:'contactName'}),
    f('email','E-posta',{required:true,mapTo:'email'}),
    f('phone','Telefon',{required:true,mapTo:'phone'}),
    f('text','Instagram hesabı',{mapTo:'instagram',help:'@kullaniciadi — @ olmadan yazsan da olur'}),
    f('url','Web sitesi',{mapTo:'website'}),
    f('select','Kategori',{required:true,mapTo:'category',options:[...categories]}),
    f('textarea','Markanı ve ürünlerini anlat',{required:true,mapTo:'description'}),
    f('file','Ürün görselleri',{required:true,help:'En fazla 5 görsel'}),
    f('checkboxes','Hangi günler katılabilirsin?',{options:['9 Ekim','10 Ekim','11 Ekim']}),
    f('consent','Katılım koşullarını okudum ve kabul ediyorum.',{required:true}),
    f('consent',photoConsent,{required:true,key:'photoConsent'})
  ];
}

export const participantFields=['brandName','contactName','email','phone','instagram','website','category','description'];
