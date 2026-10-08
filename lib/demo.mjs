// Örnek veriler: paneli tanımak ve anlatmak için geçmiş ve gelecek pazarlar, katılımcılar, ödemeler,
// workshoplar, kasa hareketleri, yöneticiler ve iz kayıtları. Hepsi "demo" işaretlidir, tek tıkla silinir.
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {id,slugify,uploadDir,defaultFields,now} from './store.mjs';

const today=()=>new Date().toISOString().slice(0,10);
const addDays=(d,n)=>new Date(new Date(d+'T12:00:00Z').getTime()+n*864e5).toISOString().slice(0,10);
const at=(d,h=12,m=0)=>`${d}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00.000Z`;

const pastMarkets=[
  {edition:1,startDate:'2025-05-16',endDate:'2025-05-18',capacity:24,fee:500,notes:'İlk pazar. Kalabalık beklenenden fazlaydı, su ve gölgelik eksik kaldı.'},
  {edition:2,startDate:'2025-09-12',endDate:'2025-09-14',capacity:30,fee:750,notes:'Yağmur nedeniyle cumartesi 2 saat erken kapandı.'},
  {edition:3,startDate:'2025-12-19',endDate:'2025-12-21',capacity:32,fee:750,notes:'Yılbaşı temalı. Çocuk atölyesi çok ilgi gördü.'},
  {edition:4,startDate:'2026-05-15',endDate:'2026-05-17',capacity:40,fee:1000,notes:'Sponsorlu ilk pazar. Stant brandaları yenilendi.'}
];

const admins=[
  {key:'selin',name:'Selin Aydın',role:'yonetici'},
  {key:'burak',name:'Burak Çelik',role:'organizator'},
  {key:'ece',name:'Ece Yıldız',role:'editor'}
];

// m: katıldığı pazarlar [1,2,3,4,'yeni'] — 'yeni' en yakın gelecek pazar. Desen: sadık, devam eden, yeni, geri dönen, ayrılan.
const brands=[
  {brandName:'Kil & Ateş Seramik',contactName:'Zeynep Arslan',instagram:'kilveates',category:'Ev ve Dekorasyon',description:'Çanakkale toprağıyla el şekillendirme kupa, tabak ve vazolar.',m:[1,2,3,4,'yeni'],color:'#df4309',tags:['sadık','workshop']},
  {brandName:'Mavi Dikiş',contactName:'Elif Kaya',instagram:'mavidikis',category:'Giyim ve Moda',description:'Doğal kumaşlardan gömlek ve elbiseler, kalıplar kendi tasarımımız.',m:[2,3,4,'yeni'],color:'#287aea',tags:['sadık']},
  {brandName:'Zeytin Dalı Sabunları',contactName:'Hasan Demir',instagram:'zeytindalisabun',category:'Kozmetik ve Kişisel Bakım',description:'Ayvacık zeytinyağıyla soğuk yöntem sabunlar.',m:[1,2,3,4],color:'#1f8a4c',tags:['sadık']},
  {brandName:'Pul Pul Atölye',contactName:'Deniz Şahin',instagram:'pulpulatolye',category:'Takı ve Aksesuar',description:'Geri dönüştürülmüş cam ve pirinçten küpe ve kolyeler.',m:[3,4,'yeni'],color:'#ff29f1',tags:[]},
  {brandName:'Deri Hikâye',contactName:'Murat Öztürk',instagram:'derihikaye',category:'Ayakkabı ve Çanta',description:'Bitkisel tabaklanmış deriden el dikimi çanta ve cüzdanlar.',m:[1,2,'yeni'],color:'#8a4b1f',tags:['geri döndü']},
  {brandName:'Lavanta Evi',contactName:'Ayşe Koç',instagram:'lavantaevi',category:'Kozmetik ve Kişisel Bakım',description:'Kazdağları lavantasıyla kese, yağ ve kolonyalar.',m:['yeni'],color:'#7b5ea7',tags:['yeni']},
  {brandName:'Kaşık Kahve',contactName:'Can Yılmaz',instagram:'kasikkahve',category:'Gıda ve İçecek',description:'Mobil kahve barı, filtre ve soğuk demleme.',m:[2,3,4,'yeni'],color:'#5a3a22',tags:['yiyecek alanı']},
  {brandName:'Bostan Reçelleri',contactName:'Fatma Aksoy',instagram:'bostanrecel',category:'Gıda ve İçecek',description:'Şekeri az, mevsiminde kaynatılmış reçel ve marmelatlar.',m:[1,3],color:'#c62828',tags:[]},
  {brandName:'Minik Adımlar',contactName:'Gizem Er',instagram:'minikadimlar',category:'Anne, Bebek ve Çocuk',description:'Organik pamuktan bebek tulumları ve ahşap oyuncaklar.',m:[4,'yeni'],color:'#f2a33a',tags:[]},
  {brandName:'Rota Outdoor',contactName:'Emre Kılıç',instagram:'rotaoutdoor',category:'Spor ve Outdoor',description:'Kamp için el yapımı ahşap ekipman ve keten çantalar.',m:[3],color:'#2f5d50',tags:[]},
  {brandName:'Kâğıt Kuşu',contactName:'Seda Polat',instagram:'kagitkusu',category:'Kitap, Kırtasiye ve Hobi',description:'Risograf baskı defterler, kartpostallar ve posterler.',m:[1,2,3,4,'yeni'],color:'#151515',tags:['sadık']},
  {brandName:'Lehim Lab',contactName:'Kaan Uçar',instagram:'lehimlab',category:'Elektronik ve Teknoloji',description:'Eski radyolardan bluetooth hoparlör ve lamba dönüşümü.',m:['yeni'],color:'#3a3a8c',tags:['yeni']},
  {brandName:'Yün Yumak',contactName:'Hülya Tan',instagram:'yunyumak',category:'Giyim ve Moda',description:'El örgüsü bere, atkı ve hırkalar.',m:[2,3],color:'#b5476b',tags:[]},
  {brandName:'Taş Baskı',contactName:'Onur Güneş',instagram:'tasbaski',category:'Ev ve Dekorasyon',description:'Linol baskı yastık kılıfları ve duvar örtüleri.',m:[4],color:'#0f6b8a',tags:[]},
  {brandName:'Ada Mumları',contactName:'Nil Ersoy',instagram:'adamumlari',category:'Ev ve Dekorasyon',description:'Soya mumundan kokulu mumlar, beton kaplarda.',m:[1,'yeni'],color:'#d9a441',tags:['geri döndü','workshop']},
  {brandName:'Gümüş Damla',contactName:'Berk Aslan',instagram:'gumusdamla',category:'Takı ve Aksesuar',description:'925 ayar gümüş yüzük ve küpeler, minimal tasarım.',m:[2,4,'yeni'],color:'#7d8a96',tags:[]}
];
const methods=['nakit','havale','havale','kart','nakit'];

const initials=n=>n.replace(/[&]/g,' ').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toLocaleUpperCase('tr');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function logoSvg(b,i){
  const shape=[`<circle cx="200" cy="170" r="110" fill="${b.color}"/>`,`<rect x="90" y="60" width="220" height="220" rx="28" fill="${b.color}"/>`,`<path d="M200 50 L320 270 H80 Z" fill="${b.color}"/>`][i%3];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#fff"/>${shape}<text x="200" y="${i%3===2?232:196}" font-family="Arial,Helvetica,sans-serif" font-size="78" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="-3">${esc(initials(b.brandName))}</text><text x="200" y="345" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="700" fill="#151515" text-anchor="middle" letter-spacing="-1">${esc(b.brandName.toLocaleUpperCase('tr'))}</text></svg>`;
}

export const hasDemo=db=>[db.markets,db.participants,db.workshops,db.ledger,db.admins].some(l=>l.some(x=>x.demo));

// h: admin.mjs yardımcıları {hashPassword, uniqueSlug, addDemoApplications}
export async function addDemo(db,me,h){
  const t=today(),upcoming=db.markets.filter(m=>!m.demo&&(m.endDate||m.startDate)>=t).sort((a,b)=>(a.startDate||'').localeCompare(b.startDate||''))[0];
  const ad={};
  for(const a of admins){
    const x={id:id('adm'),name:a.name,email:`${a.key}@ornek.fevzipasa.com`,role:a.role,active:true,demo:true,createdBy:me.id,createdAt:at(addDays(t,-120)),lastLoginAt:at(addDays(t,-(admins.indexOf(a)+1)),9+admins.indexOf(a)*3),...h.hashPassword(id('pw'))};
    db.admins.push(x);ad[a.key]=x;
  }
  // Geçmiş pazarlar (yalnızca boş sıra numaralarına)
  const mk={};
  for(const p of pastMarkets){
    if(db.markets.some(m=>m.edition===p.edition)||(db.usedEditions||[]).includes(p.edition))continue;
    const m={id:id('mkt'),name:`${p.edition}. Fevzipaşa Tasarım Pazarı`,edition:p.edition,slug:'',startDate:p.startDate,endDate:p.endDate,hours:'11.00–21.00',location:'Fevzipaşa / Çanakkale',capacity:p.capacity,fee:p.fee,status:'tamamlandi',notes:p.notes,demo:true,createdBy:ad.selin.id,createdAt:at(addDays(p.startDate,-60))};
    m.slug=h.uniqueSlug(db,m);db.markets.push(m);mk[p.edition]=m;
  }
  // Yaklaşan pazar yoksa örnek bir tane aç
  let next=upcoming;
  if(!next){
    const e=Math.max(0,...db.markets.map(m=>m.edition||0),...(db.usedEditions||[]))+1;
    next={id:id('mkt'),name:`${e}. Fevzipaşa Tasarım Pazarı`,edition:e,slug:'',startDate:addDays(t,30),endDate:addDays(t,32),hours:'11.00–21.00',location:'Fevzipaşa / Çanakkale',capacity:40,fee:1250,status:'basvuru',notes:'Örnek yaklaşan pazar.',demo:true,createdBy:ad.selin.id,createdAt:at(addDays(t,-20))};
    next.slug=h.uniqueSlug(db,next);db.markets.push(next);
  }
  const marketOf=k=>k==='yeni'?next:mk[k];
  const nextFee=next.fee||1250;

  // Katılımcılar, ücretler, logolar
  const parts={},feeBy=[ad.burak.id,ad.selin.id,me.id];
  let logoN=0;
  for(const [i,b] of brands.entries()){
    const ms=b.m.map(marketOf).filter(Boolean);
    if(!ms.length)continue;
    const p={id:id('prt'),brandName:b.brandName,contactName:b.contactName,email:`${b.instagram}@ornek.com`,phone:`05${30+i%9} ${100+i*37%900} ${10+i*7%90} ${10+i*13%90}`,instagram:'@'+b.instagram,website:i%3?'':`${b.instagram}.com`,category:b.category,description:b.description,tags:b.tags,markets:ms.map(m=>m.id),notes:'',fees:{},demo:true,createdBy:[ad.selin.id,ad.burak.id,me.id][i%3],createdAt:at(addDays(ms[0].startDate||t,-30))};
    for(const [j,m] of ms.entries()){
      const amount=m.fee||0,past=m!==next;
      if(past)p.fees[m.id]={amount,paid:amount,method:methods[(i+j)%methods.length],date:addDays(m.startDate,-7+(i%5)),note:'',by:feeBy[(i+j)%3],updatedAt:at(addDays(m.startDate,-7+(i%5)))};
      else{const k=i%4;p.fees[m.id]=k===0?{amount,paid:amount,method:'havale',date:addDays(t,-3-(i%4)),note:'',by:ad.burak.id,updatedAt:at(addDays(t,-3))}:k===1?{amount,paid:Math.round(amount/2),method:'nakit',date:addDays(t,-2),note:'Kalanı pazar günü',by:ad.burak.id,updatedAt:at(addDays(t,-2))}:k===2?{amount,paid:0,method:'',date:'',note:'',by:ad.selin.id,updatedAt:at(addDays(t,-1))}:{amount:Math.round(amount*0.8),paid:Math.round(amount*0.8),method:'kart',date:addDays(t,-5),note:'%20 sadakat indirimi',by:me.id,updatedAt:at(addDays(t,-5))};}
    }
    if(b.tags.includes('sadık'))p.notes='Her pazara geliyor, köşe stant istiyor.';
    db.participants.push(p);parts[b.brandName]=p;
    if(i%4!==3){ // her dört markadan biri logosuz kalır: "Logosu olmayanlar" filtresi boş kalmasın
      const svg=logoSvg(b,logoN++),mid=id('med'),folder='genel/logo',path=`${folder}/${mid.slice(4)}-${slugify(b.brandName)}-logo.svg`;
      await mkdir(new URL(folder+'/',uploadDir),{recursive:true});await writeFile(new URL(path,uploadDir),svg);
      db.media.push({id:mid,marketId:null,category:'Logo',participantId:p.id,applicationId:null,title:`${b.brandName} logo`,tags:['örnek'],filename:`${slugify(b.brandName)}-logo.svg`,path,mime:'image/svg+xml',size:Buffer.byteLength(svg),uploadedBy:[ad.ece.id,ad.burak.id][i%2],demo:true,createdAt:at(addDays(t,-10+i%7))});
    }
  }
  // Örnek katılımcı hesabı: marka sahibi kendi panelinden bilgi güncelledi, organizatör onayı bekliyor
  const kil=parts['Kil & Ateş Seramik'];
  if(kil){
    const z={id:id('adm'),name:'Zeynep Arslan',email:'zeynep@ornek.fevzipasa.com',role:'katilimci',participantId:kil.id,active:true,demo:true,createdBy:ad.selin.id,createdAt:at(addDays(t,-40)),lastLoginAt:at(addDays(t,-1),20),...h.hashPassword(id('pw'))};
    db.admins.push(z);ad.zeynep=z;
    kil.pending={changes:{description:'Çanakkale toprağıyla el şekillendirme kupa, tabak ve vazolar. Bu pazarda yeni sırlı koleksiyonumuz ve çocuklar için boyanabilir kupalar da olacak.',website:'kilveates.com'},at:at(addDays(t,-1),20),by:z.id};
  }
  // Ürün ve etkinlik fotoğrafları (sitedeki görsellerden)
  const photos=[['ceramics.webp','Kil & Ateş Seramik','Katılımcı ürünleri',4],['textile.webp','Mavi Dikiş','Katılımcı ürünleri',4],['candles.webp','Ada Mumları','Katılımcı ürünleri','yeni'],['food.webp','Bostan Reçelleri','Katılımcı ürünleri',3],['hero.webp',null,'Etkinlik fotoğrafları',4]];
  for(const [file,brand,cat,mkey] of photos){
    const m=marketOf(mkey);if(!m)continue;
    let buf;try{buf=await readFile(new URL(`../assets/${file}`,import.meta.url))}catch{continue}
    const mid=id('med'),folder=`${m.slug}/${slugify(cat)}`,path=`${folder}/${mid.slice(4)}-${file}`;
    await mkdir(new URL(folder+'/',uploadDir),{recursive:true});await writeFile(new URL(path,uploadDir),buf);
    db.media.push({id:mid,marketId:m.id,category:cat,participantId:brand?parts[brand]?.id||null:null,applicationId:null,title:brand?`${brand} ürünleri`:`${m.name} genel görünüm`,tags:['örnek'],filename:file,path,mime:'image/webp',size:buf.length,uploadedBy:ad.ece.id,demo:true,createdAt:at(addDays(m.startDate||t,1))});
  }

  // Workshoplar: yapılmış, iptal, yaklaşan; ücretli ve ücretsiz
  const ws=[
    [mk[3],'Doğal boyayla tote çanta','Mavi Dikiş',false,0,20,16,'yapildi','14.00',90,'Pazar alanı, büyük çadır','Bitkisel boyalarla bez çanta boyama. Malzeme dahil.'],
    [mk[4],'Çömlek tornasıyla tanışma','Kil & Ateş Seramik',true,450,12,12,'yapildi','13.00',120,'Atölye köşesi','Tornada ilk kupanı şekillendir. Pişirilip bir hafta sonra teslim edilir.'],
    [mk[4],'Risograf poster baskı','Kâğıt Kuşu',true,250,10,7,'yapildi','16.00',60,'Atölye köşesi','İki renkli kendi posterini bas.'],
    [next,'Kendi kokulu mumunu yap','Ada Mumları',true,350,15,9,'planlandi','15.00',75,'Atölye köşesi','Soya mumu, esans seçimi ve beton kap. Herkes kendi mumunu götürür.'],
    [next,'Çocuklar için kolaj atölyesi','Fevzipaşa ekibi',false,0,20,14,'planlandi','11.30',60,'Çocuk alanı','5–10 yaş. Dergi ve kumaş parçalarıyla kolaj.'],
    [next,'Zeytinyağlı sabun kesme','Zeytin Dalı Sabunları',true,300,12,0,'iptal','17.00',60,'Atölye köşesi','Marka bu pazara katılamadığı için iptal edildi.']
  ];
  for(const [m,title,org,paid,price,capacity,registered,status,time,duration,location,description] of ws){
    if(!m)continue;
    db.workshops.push({id:id('wrk'),title,marketId:m.id,date:addDays(m.startDate,1),time,duration,organizer:org,participantId:parts[org]?.id||null,paid,price,capacity,registered,location,status,description,notes:status==='planlandi'&&paid?'Kayıtlar Instagram DM ile alınıyor.':'',demo:true,createdBy:ad.selin.id,createdAt:at(addDays(m.startDate,-20))});
  }
  // Mum workshopunun görselleri
  const mum=db.workshops.find(w=>w.demo&&w.title==='Kendi kokulu mumunu yap');
  if(mum){const m=db.markets.find(x=>x.id===mum.marketId);
    for(const n of ['a','b','c']){
      const file=`mum-atolyesi-${n}.webp`;let buf;try{buf=await readFile(new URL(`../assets/${file}`,import.meta.url))}catch{continue}
      const mid=id('med'),folder=`${m.slug}/workshop`,path=`${folder}/${mid.slice(4)}-${file}`;
      await mkdir(new URL(folder+'/',uploadDir),{recursive:true});await writeFile(new URL(path,uploadDir),buf);
      db.media.push({id:mid,marketId:m.id,category:'Workshop',participantId:mum.participantId,applicationId:null,workshopId:mum.id,title:mum.title,tags:['örnek','workshop'],filename:file,path,mime:'image/webp',size:buf.length,uploadedBy:ad.selin.id,demo:true,createdAt:at(addDays(m.startDate,-19))});
    }
  }

  // Kasa: giderler ve gelirler
  const L=[
    ['gider',mk[4],-12,'Stant brandaları baskısı','Baskı & tabela',4800,'havale','Burak Çelik','geldi',true,'burak'],
    ['gider',mk[4],-2,'Ses sistemi kiralama','Ses & ışık',3000,'nakit','Selin Aydın','yok',false,'selin'],
    ['gider',mk[4],0,'Ekip öğle yemeği','Yeme içme',850,'nakit','Ece Yıldız','yok',true,'burak'],
    ['gelir',mk[4],-25,'Yerel kahveci sponsor katkısı','Sponsorluk',7500,'havale','','geldi',false,'selin'],
    ['gelir',mk[4],1,'Workshop kayıt ücretleri','Workshop geliri',7150,'nakit','','yok',false,'burak'],
    ['gelir',mk[3],2,'Bağış kutusu','Bağış',740,'nakit','','yok',false,'burak'],
    ['gider',mk[3],-5,'Işık zinciri ve uzatma kablosu','Malzeme',1350,'kart','Kemal Türedi','geldi',true,'me'],
    ['gider',next,-15,'Masa ve sandalye kirası','Stant & kira',6500,'havale','Selin Aydın','bekleniyor',false,'selin'],
    ['gider',next,-9,'Instagram reklamı','Reklam & tanıtım',1500,'kart','Kemal Türedi','geldi',true,'me'],
    ['gider',next,-4,'Afiş ve broşür baskısı','Baskı & tabela',2200,'havale','Burak Çelik','bekleniyor',true,'burak'],
    ['gider',next,-1,'Mum atölyesi malzemesi','Workshop',1200,'nakit','Ece Yıldız','yok',true,'burak'],
    ['gelir',next,-7,'Sponsor: Kahve dükkânı','Sponsorluk',5000,'havale','','geldi',false,'selin']
  ];
  for(const [type,m,d,title,category,amount,method,paidBy,invoice,receipt,who] of L){
    if(!m)continue;
    const base=m===next?t:m.startDate;
    db.ledger.push({id:id('led'),type,date:addDays(base,d),title,category,amount,marketId:m.id,method,paidBy,invoice,receipt,mediaId:null,note:invoice==='bekleniyor'?'Fatura e-postayla gelecek.':'',demo:true,createdBy:who==='me'?me.id:ad[who].id,createdAt:at(addDays(base,d),15)});
  }

  // Örnek başvurular (yaklaşan pazarın formuna)
  const form=db.forms.find(f=>f.marketId===next.id);
  if(form)h.addDemoApplications(db,form);
  // Katılımcı panelinde "Pazara başvur" bölümü boş görünmesin: yayında bir örnek form
  if(!db.forms.some(f=>f.status==='acik'))db.forms.push({id:id('frm'),marketId:next.id,title:'Örnek: Stant başvurusu',intro:'Pazarda stant açmak için bu formu doldur. Ekibimiz başvurunu değerlendirip seninle iletişime geçecek.',status:'acik',deadline:addDays(t,14),fields:defaultFields(),demo:true,createdBy:me.id,createdAt:now()});

  // İz kayıtları: son 10 haftaya yayılmış örnek işlemler
  const acts=[
    ['selin','Yeni pazar: {next}','market'],['selin','Form yayınlandı: başvurular açıldı','form'],['burak','Başvuru incelendi: Lavanta Evi','application'],['burak','Ödeme: Kaşık Kahve · havale','fee'],
    ['selin','Başvuru kabul edildi: Lehim Lab','application'],['ece','3 dosya yüklendi · Logo','media'],['burak','Kasa: Gider 6500 TL · Masa ve sandalye kirası','ledger'],['selin','Yeni workshop: Kendi kokulu mumunu yap','workshop'],
    ['ece','Başvuruya not eklendi: Gümüş Damla','application'],['burak','Ödeme: Pul Pul Atölye · nakit (kısmi)','fee'],['selin','Toplu işlem: 6 katılımcı pazara eklendi','bulk'],['ece','2 dosya yüklendi · Katılımcı ürünleri','media'],
    ['burak','Kasa: Gelir 5000 TL · Sponsor','ledger'],['zeynep','Marka bilgisi değişikliği onaya gönderildi: Kil & Ateş Seramik','participant'],['selin','Katılımcı güncellendi: Deri Hikâye','participant'],['burak','Katılımcılar içe aktarıldı: 4 yeni, 9 güncellendi','import'],['ece','Giriş yaptı','login']
  ];
  const key={selin:ad.selin,burak:ad.burak,ece:ad.ece,zeynep:ad.zeynep||ad.ece};
  for(let i=0;i<70;i++){
    const [who,text,type]=acts[i%acts.length],day=addDays(t,-Math.floor((i*i)%70/1.0)%70);
    db.activity.push({id:id('act'),at:at(day,9+(i*5)%10,(i*17)%60),adminId:key[who].id,text:text.replace('{next}',next.name),ref:{type},demo:true});
  }
  db.activity.sort((a,b)=>b.at.localeCompare(a.at));
  return {markets:Object.keys(mk).length+(next.demo?1:0),participants:Object.keys(parts).length,admins:admins.length+(ad.zeynep?1:0)};
}

export async function removeDemo(db){
  const demoAdmins=new Set(db.admins.filter(a=>a.demo).map(a=>a.id));
  const demoMarkets=new Set(db.markets.filter(m=>m.demo).map(m=>m.id));
  for(const m of db.media.filter(x=>x.demo))try{await unlink(new URL(m.path,uploadDir))}catch{}
  db.media=db.media.filter(x=>!x.demo);
  db.applications=db.applications.filter(a=>!a.demo);
  db.participants=db.participants.filter(p=>!p.demo); // örnek başvurudan kabul edilen kartlar da demo işaretlidir
  for(const p of db.participants){p.markets=p.markets.filter(x=>!demoMarkets.has(x));if(p.fees)for(const k of Object.keys(p.fees))if(demoMarkets.has(k))delete p.fees[k]}
  db.workshops=db.workshops.filter(w=>!w.demo&&!demoMarkets.has(w.marketId));
  db.ledger=db.ledger.filter(e=>!e.demo);
  db.forms=db.forms.filter(f=>!f.demo&&!demoMarkets.has(f.marketId));
  db.markets=db.markets.filter(m=>!m.demo); // örnek pazarların sıra numaraları serbest kalır
  db.admins=db.admins.filter(a=>!a.demo);
  db.activity=db.activity.filter(a=>!a.demo&&!demoAdmins.has(a.adminId));
}
