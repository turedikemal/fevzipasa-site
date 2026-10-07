// Herkese açık başvuru formu: formu sunucudan alır, çizer ve yanıtları görselleriyle birlikte gönderir.
const root=document.getElementById('root');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formId=location.pathname.split('/').filter(Boolean)[1];
const picked={};
const fmt=d=>d?new Date(d+'T12:00').toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'';
const inputType={text:'text',email:'email',phone:'tel',url:'url',number:'number',date:'date'};

function question(f){
  const req=f.required?' *':'',help=f.help?`<small>${esc(f.help)}</small>`:'',name=`name="${f.id}"`;
  if(f.type==='heading')return `<h2>${esc(f.label)}</h2>`;
  if(f.type==='consent')return `<label class="consent"><input type="checkbox" ${name} ${f.required?'required':''}> <span>${esc(f.label)}${req}</span></label>`;
  let input;
  if(f.type==='textarea')input=`<textarea ${name} ${f.required?'required':''}></textarea>`;
  else if(f.type==='select')input=`<select ${name} ${f.required?'required':''}><option value="">Seç</option>${f.options.map(o=>`<option>${esc(o)}</option>`).join('')}</select>`;
  else if(f.type==='checkboxes')input=`<div class="opts">${f.options.map(o=>`<label><input type="checkbox" name="${f.id}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</div>`;
  else if(f.type==='file'){picked[f.id]=[];input=`<div class="drop" data-file="${f.id}" tabindex="0">Görselleri sürükle ya da <u>seç</u><br><small>JPG, PNG, WEBP · en fazla 5 görsel</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></div><div class="files" id="files-${f.id}"></div>`}
  else if(f.mapTo==='instagram')input=`<span class="ig"><span>@</span><input type="text" ${name} ${f.required?'required':''} autocomplete="off" autocapitalize="off" placeholder="kullaniciadi"></span>`;
  else input=`<input type="${inputType[f.type]||'text'}" ${name} ${f.required?'required':''} autocomplete="${{email:'email',phone:'tel'}[f.type]||'off'}">`;
  return `<div class="q"><b>${esc(f.label)}${req}</b>${help}${input}</div>`;
}

// Telefonda çekilmiş büyük fotoğrafları gönderim öncesi küçültür.
async function shrink(file){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Sadece JPG, PNG veya WEBP yükleyebilirsin');
  const bitmap=await createImageBitmap(file).catch(()=>null);
  if(!bitmap||Math.max(bitmap.width,bitmap.height)<=2000&&file.size<3e6)return {name:file.name,type:file.type,blob:file};
  const scale=2000/Math.max(bitmap.width,bitmap.height),c=document.createElement('canvas');
  c.width=Math.round(bitmap.width*Math.min(1,scale));c.height=Math.round(bitmap.height*Math.min(1,scale));
  c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.86));
  return {name:file.name.replace(/\.\w+$/,'.jpg'),type:'image/jpeg',blob};
}
const b64=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(blob)});

async function addFiles(id,files){
  const err=document.getElementById('err');
  try{for(const f of files){if(picked[id].length>=5)throw new Error('En fazla 5 görsel ekleyebilirsin');picked[id].push(await shrink(f))}err.textContent=''}
  catch(e){err.textContent=e.message}
  document.getElementById('files-'+id).innerHTML=picked[id].map((f,i)=>`<figure><img src="${URL.createObjectURL(f.blob)}" alt=""><button type="button" data-remove="${id}:${i}" aria-label="Kaldır">×</button></figure>`).join('');
}

async function init(){
  const r=await fetch('/api/public/forms/'+formId);
  if(!r.ok){root.innerHTML='<div class="closed"><h1>Form bulunamadı.</h1><p>Bağlantıyı kontrol et ya da <a href="/">ana sayfaya</a> dön.</p></div>';return}
  const {open,preview,reason,form,market}=await r.json();
  document.title=form.title+' | Fevzipaşa Tasarım Pazarı';
  const meta=market?`<div class="meta"><span>${esc(market.name)}</span>${market.startDate?`<span>${fmt(market.startDate)}${market.endDate&&market.endDate!==market.startDate?' – '+fmt(market.endDate):''}</span>`:''}${market.hours?`<span>${esc(market.hours)}</span>`:''}${form.deadline?`<span>Son başvuru: ${fmt(form.deadline)}</span>`:''}</div>`:'';
  root.innerHTML=`<span class="mono">KATILIMCI BAŞVURUSU</span><h1>${esc(form.title)}</h1><p class="intro">${esc(form.intro)}</p>${meta}
  ${preview?`<div class="preview"><b>Önizleme · bu formu yalnızca sen görüyorsun.</b><p>${{taslak:'Form taslakta.',kapali:'Form kapalı.',suresi:'Son başvuru tarihi geçti.'}[reason]||''} Herkesin doldurabilmesi için panelde Formlar sayfasından durumunu <b>Yayında</b> yap${reason==='suresi'?' ve son başvuru tarihini ileri al':''}.</p></div>`:''}
  ${open||preview?`<form id="f" novalidate>${form.fields.map(question).join('')}<p class="err" id="err" role="alert"></p><button class="send" ${preview?'disabled title="Önizlemede gönderilemez"':''}>Başvuruyu gönder →</button></form>`:'<div class="closed"><b>Bu form şu an başvuru kabul etmiyor.</b><p>Başvuru dönemi henüz açılmamış ya da sona ermiş olabilir. Duyurular için bizi takip et.</p></div>'}`;
  if(!open&&!preview)return;
  const f=document.getElementById('f');
  f.addEventListener('click',e=>{const d=e.target.closest('.drop');if(d)d.querySelector('input').click();const rm=e.target.closest('[data-remove]');if(rm){const [id,i]=rm.dataset.remove.split(':');picked[id].splice(+i,1);addFiles(id,[])}});
  f.addEventListener('keydown',e=>{const d=e.target.closest('.drop');if(d&&(e.key==='Enter'||e.key===' ')){e.preventDefault();d.querySelector('input').click()}});
  f.addEventListener('change',e=>{const d=e.target.closest('.drop');if(d&&e.target.files.length){addFiles(d.dataset.file,[...e.target.files]);e.target.value=''}});
  f.addEventListener('dragover',e=>{const d=e.target.closest('.drop');if(d){e.preventDefault();d.classList.add('over')}});
  f.addEventListener('dragleave',e=>e.target.closest('.drop')?.classList.remove('over'));
  f.addEventListener('drop',e=>{const d=e.target.closest('.drop');if(d){e.preventDefault();d.classList.remove('over');addFiles(d.dataset.file,[...e.dataTransfer.files])}});
  f.addEventListener('submit',async e=>{
    e.preventDefault();
    const err=document.getElementById('err'),btn=f.querySelector('.send');err.textContent='';
    const answers={};
    for(const q of form.fields){
      if(q.type==='heading'||q.type==='file')continue;
      if(q.type==='checkboxes')answers[q.id]=[...f.querySelectorAll(`[name="${q.id}"]:checked`)].map(x=>x.value);
      else if(q.type==='consent')answers[q.id]=f.querySelector(`[name="${q.id}"]`).checked;
      else answers[q.id]=f.querySelector(`[name="${q.id}"]`).value.trim();
      const v=answers[q.id];
      if(q.required&&(Array.isArray(v)?!v.length:!v)){err.textContent=`“${q.label}” alanını doldurmalısın.`;f.querySelector(`[name="${q.id}"]`)?.focus();return}
    }
    for(const q of form.fields)if(q.type==='file'&&q.required&&!picked[q.id].length){err.textContent=`“${q.label}” için en az bir görsel ekle.`;return}
    btn.disabled=true;btn.textContent='Gönderiliyor…';
    try{
      const files={};for(const [id,list] of Object.entries(picked))files[id]=await Promise.all(list.map(async x=>({name:x.name,type:x.type,data:await b64(x.blob)})));
      const res=await fetch('/api/public/forms/'+formId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers,files})});
      const j=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(j.error||'Başvuru gönderilemedi');
      root.innerHTML=`<div class="done"><span class="mono">TEŞEKKÜRLER</span><h1>Başvurun bize ulaştı.</h1><p>Ekibimiz başvurunu değerlendirip seninle iletişime geçecek.</p><p><a href="/">Ana sayfaya dön ↗</a></p></div>`;
      scrollTo(0,0);
    }catch(e2){err.textContent=e2.message;btn.disabled=false;btn.textContent='Başvuruyu gönder →'}
  });
}
init().catch(()=>{root.innerHTML='<div class="closed">Form yüklenemedi. Sayfayı yenile.</div>'});
