// Basit JSON veri deposu: data/db.json içinde tüm kayıtlar, data/uploads/ içinde dosyalar.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

export const dataDir=new URL('../data/',import.meta.url);
export const uploadDir=new URL('uploads/',dataDir);
const dbFile=new URL('db.json',dataDir);

const empty=()=>({markets:[],forms:[],applications:[],participants:[],admins:[],media:[],activity:[]});

let db=null,writing=Promise.resolve();

export async function load(){
  if(db)return db;
  await mkdir(uploadDir,{recursive:true});
  try{db={...empty(),...JSON.parse(await readFile(dbFile,'utf8'))}}
  catch(err){if(err.code!=='ENOENT')throw err;db=empty();await seed(db);await save()}
  return db;
}

// Yazmalar sıraya alınır; önce geçici dosyaya yazılıp sonra taşınır, böylece dosya yarım kalmaz.
export function save(){
  writing=writing.then(async()=>{const tmp=new URL('db.json.tmp',dataDir);await writeFile(tmp,JSON.stringify(db,null,1));await rename(tmp,dbFile)});
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
  db.activity.length=Math.min(db.activity.length,300);
}

// İlk açılışta mevcut 5. pazarı, sitedeki katılımcıları ve hazır bir başvuru formunu oluşturur.
async function seed(d){
  const t=now();
  const market={id:id('mkt'),name:'5. Fevzipaşa Tasarım Pazarı',edition:5,slug:'5-pazar',startDate:'2026-10-09',endDate:'2026-10-11',hours:'11.00–21.00',location:'Fevzipaşa / Çanakkale',capacity:40,status:'aktif',notes:'',createdAt:t};
  d.markets.push(market);
  let brands=[];
  try{brands=JSON.parse(await readFile(new URL('../brands.json',import.meta.url),'utf8'))}catch{}
  for(const b of brands)d.participants.push({id:id('prt'),brandName:b.name,contactName:'',email:'',phone:'',instagram:'',website:b.url||'',category:b.category||'',description:b.description||'',tags:[],markets:[market.id],notes:'Siteden aktarıldı.',createdAt:t});
  d.forms.push({id:id('frm'),marketId:market.id,title:'5. Pazar Katılımcı Başvurusu',intro:'Fevzipaşa Tasarım Pazarı’na katılmak için formu doldur. Başvurular ekip tarafından değerlendirilir.',status:'taslak',deadline:'',fields:defaultFields(),createdAt:t});
}

export function defaultFields(){
  const f=(type,label,extra={})=>({id:id('fld'),type,label,required:false,help:'',options:[],mapTo:'',...extra});
  return [
    f('text','Marka adı',{required:true,mapTo:'brandName'}),
    f('text','Ad soyad',{required:true,mapTo:'contactName'}),
    f('email','E-posta',{required:true,mapTo:'email'}),
    f('phone','Telefon',{required:true,mapTo:'phone'}),
    f('text','Instagram hesabı',{mapTo:'instagram',help:'@kullaniciadi'}),
    f('url','Web sitesi',{mapTo:'website'}),
    f('select','Kategori',{required:true,mapTo:'category',options:['Seramik','Tekstil','Mum','Takı','İllüstrasyon','Gurme lezzetler','Diğer']}),
    f('textarea','Markanı ve ürünlerini anlat',{required:true,mapTo:'description'}),
    f('file','Ürün görselleri',{required:true,help:'En fazla 5 görsel'}),
    f('checkboxes','Hangi günler katılabilirsin?',{options:['9 Ekim','10 Ekim','11 Ekim']}),
    f('consent','Katılım koşullarını okudum ve kabul ediyorum.',{required:true})
  ];
}

export const participantFields=['brandName','contactName','email','phone','instagram','website','category','description'];
