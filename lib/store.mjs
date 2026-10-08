// Basit JSON veri deposu: data/db.json içinde tüm kayıtlar, data/uploads/ içinde dosyalar.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

export const dataDir=new URL('../data/',import.meta.url);
export const uploadDir=new URL('uploads/',dataDir);
const dbFile=new URL('db.json',dataDir);

const empty=()=>({markets:[],forms:[],applications:[],participants:[],admins:[],media:[],activity:[],workshops:[],ledger:[],usedEditions:[]});

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
}

let db=null,writing=Promise.resolve();

export async function load(){
  if(db)return db;
  await mkdir(uploadDir,{recursive:true});
  try{db={...empty(),...JSON.parse(await readFile(dbFile,'utf8'))};migrate(db)}
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
  db.activity.length=Math.min(db.activity.length,5000);
}

// İlk açılışta örnek veriler ve temel pazarı oluşturur.
async function seed(d){
  const {scryptSync}=await import(‘node:crypto’);
  const t=now(),addDays=(n)=>new Date(new Date(t.slice(0,10)+’T12:00:00Z’).getTime()+n*864e5).toISOString().slice(0,10);
  const hashPw=(p)=>{const salt=randomBytes(16).toString(‘hex’);return {salt,hash:scryptSync(p,salt,64).toString(‘hex’)}};
  const uniqueSlug=(m)=>{const base=m.edition?`${m.edition}-pazar`:slugify(m.name);let s=base,i=2;while(d.markets.some(x=>x.slug===s))s=`${base}-${i++}`;return s};

  // Admin: Kemal (ana yönetici)
  const kemal={id:id(‘adm’),name:’Kemal Türedi’,email:’kemal@fevzipasa.com’,role:’ana’,active:true,createdAt:t,...hashPw(‘demo123’)};
  d.admins.push(kemal);
  const organizer={id:id(‘adm’),name:’Selin Aydın’,email:’selin@fevzipasa.com’,role:’organizator’,active:true,createdAt:t,...hashPw(‘demo123’)};
  d.admins.push(organizer);
  const editor={id:id(‘adm’),name:’Ece Yıldız’,email:’ece@fevzipasa.com’,role:’editor’,active:true,createdAt:t,...hashPw(‘demo123’)};
  d.admins.push(editor);

  // Pazarlar: geçmiş + şimdiki + gelecek
  const markets=[
    {edition:3,name:’3. Fevzipaşa Tasarım Pazarı’,startDate:’2025-12-19’,endDate:’2025-12-21’,status:’tamamlandi’},
    {edition:4,name:’4. Fevzipaşa Tasarım Pazarı’,startDate:’2026-05-15’,endDate:’2026-05-17’,status:’tamamlandi’},
    {edition:5,name:’5. Fevzipaşa Tasarım Pazarı’,startDate:’2026-10-09’,endDate:’2026-10-11’,status:’aktif’},
    {edition:6,name:’6. Fevzipaşa Tasarım Pazarı’,startDate:addDays(30),endDate:addDays(32),status:’basvuru’}
  ];
  for(const m of markets){
    const market={id:id(‘mkt’),...m,slug:’’,hours:’11.00–21.00’,location:’Fevzipaşa / Çanakkale’,capacity:40,fee:1000,notes:’Örnek pazar.’,createdBy:kemal.id,createdAt:t,demo:true};
    market.slug=uniqueSlug(market);
    d.markets.push(market);
  }

  // Katılımcılar: brands.json’dan
  let brands=[];
  try{brands=JSON.parse(await readFile(new URL(‘../brands.json’,import.meta.url),’utf8’))}catch{}
  for(const b of brands.slice(0,8)){
    d.participants.push({id:id(‘prt’),brandName:b.name,contactName:’’,email:’’,phone:’’,instagram:’’,website:b.url||’’,category:normalizeCategory(b.category),description:b.description||’’,tags:[],markets:[d.markets[2].id],createdBy:kemal.id,createdAt:t,demo:true});
  }

  // Formlar
  d.forms.push({id:id(‘frm’),marketId:d.markets[2].id,title:’5. Pazar Katılımcı Başvurusu’,intro:’Fevzipaşa Tasarım Pazarı’na katılmak için formu doldur.’,status:’acik’,deadline:’2026-10-08’,fields:defaultFields(),createdBy:kemal.id,createdAt:t,demo:true});
  d.forms.push({id:id(‘frm’),marketId:d.markets[3].id,title:’6. Pazar Katılımcı Başvurusu’,intro:’Gelecek pazara başvur.’,status:’taslak’,deadline:’’,fields:defaultFields(),createdBy:kemal.id,createdAt:t,demo:true});

  // Workshoplar
  if(d.markets[2]){
    d.workshops.push({id:id(‘wrk’),title:’Kendi kokulu mumunu yap’,marketId:d.markets[2].id,date:addDays(1),time:’15.00’,duration:75,organizer:’Ada Mumları’,participantId:null,paid:true,price:350,capacity:15,registered:9,location:’Atölye köşesi’,status:’planlandi’,description:’Soya mumu, esans seçimi ve beton kap.’,notes:’’,createdBy:kemal.id,createdAt:t,demo:true});
    d.workshops.push({id:id(‘wrk’),title:’Çömlek tornasıyla tanışma’,marketId:d.markets[2].id,date:addDays(2),time:’13.00’,duration:120,organizer:’Kil & Ateş Seramik’,participantId:null,paid:true,price:450,capacity:12,registered:12,location:’Atölye köşesi’,status:’yapildi’,description:’Tornada ilk kupanı şekillendir.’,notes:’’,createdBy:kemal.id,createdAt:t,demo:true});
  }

  // Kasa giderleri ve gelirleri
  if(d.markets[2]){
    d.ledger.push({id:id(‘led’),type:’gider’,date:addDays(-10),title:’Stant brandaları baskısı’,category:’Baskı & tabela’,amount:4800,marketId:d.markets[2].id,method:’havale’,paidBy:’Selin’,invoice:’geldi’,receipt:true,mediaId:null,note:’’,createdBy:kemal.id,demo:true});
    d.ledger.push({id:id(‘led’),type:’gelir’,date:addDays(-5),title:’Workshop ücretleri’,category:’Workshop geliri’,amount:7150,marketId:d.markets[2].id,method:’nakit’,paidBy:’’,invoice:’yok’,receipt:false,mediaId:null,note:’’,createdBy:kemal.id,demo:true});
  }

  // İz kayıtları
  d.activity.push({id:id(‘act’),at:t,adminId:kemal.id,text:’Örnek veriler oluşturuldu’,ref:{type:’demo’}});
}

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
    f('consent','Katılım koşullarını okudum ve kabul ediyorum.',{required:true})
  ];
}

export const participantFields=['brandName','contactName','email','phone','instagram','website','category','description'];
