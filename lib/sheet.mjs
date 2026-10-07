// Excel (.xlsx) ve CSV okuma/yazma. Bağımlılık yok: xlsx bir zip içindeki birkaç XML dosyasıdır.
import {deflateRawSync,inflateRawSync} from 'node:zlib';

// --- CSV ---
export function toCsv(rows){
  return '﻿'+rows.map(r=>r.map(v=>{const s=typeof v==='number'?String(v).replace('.',','):Array.isArray(v)?v.join(', '):String(v??'');return /[",;\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}).join(';')).join('\r\n');
}
export function fromCsv(text){
  text=String(text).replace(/^﻿/,'');
  const first=text.split(/\r?\n/,1)[0],sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':first.includes('\t')&&!first.includes(',')?'\t':',';
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c;continue}
    if(c==='"')q=true;
    else if(c===sep){row.push(cell);cell=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row)}
  return rows.filter(r=>r.some(v=>String(v).trim()));
}

// --- Zip ---
const crcTable=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
const crc32=buf=>{let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&0xff]^(c>>>8);return (c^0xffffffff)>>>0};
function zip(files){
  const locals=[],centrals=[];let offset=0;
  for(const [name,content] of Object.entries(files)){
    const data=Buffer.from(content),packed=deflateRawSync(data),nameBuf=Buffer.from(name),crc=crc32(data);
    const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x0800,6);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(nameBuf.length,26);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x0800,8);central.writeUInt16LE(8,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(nameBuf.length,28);central.writeUInt32LE(offset,42);
    locals.push(local,nameBuf,packed);centrals.push(central,nameBuf);offset+=30+nameBuf.length+packed.length;
  }
  const dir=Buffer.concat(centrals),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(centrals.length/2,8);end.writeUInt16LE(centrals.length/2,10);end.writeUInt32LE(dir.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,dir,end]);
}
function unzip(buf){
  let e=buf.length-22;while(e>=0&&buf.readUInt32LE(e)!==0x06054b50)e--;
  if(e<0)throw new Error('Dosya okunamadı: geçerli bir Excel (.xlsx) değil');
  const count=buf.readUInt16LE(e+10),out={};let p=buf.readUInt32LE(e+16);
  for(let i=0;i<count;i++){
    const method=buf.readUInt16LE(p+10),size=buf.readUInt32LE(p+20),nameLen=buf.readUInt16LE(p+28),extra=buf.readUInt16LE(p+30),comment=buf.readUInt16LE(p+32),local=buf.readUInt32LE(p+42);
    const name=buf.toString('utf8',p+46,p+46+nameLen);
    const start=local+30+buf.readUInt16LE(local+26)+buf.readUInt16LE(local+28),raw=buf.subarray(start,start+size);
    out[name]=method===8?inflateRawSync(raw):raw;
    p+=46+nameLen+extra+comment;
  }
  return out;
}

// --- XLSX ---
const xml=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
export function toXlsx(rows,sheetName='Sayfa1'){
  const width=Math.max(1,...rows.map(r=>r.length));
  const widths=Array.from({length:width},(_,c)=>Math.min(60,Math.max(8,...rows.map(r=>String(r[c]??'').length+2))));
  const body=rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>{
    if(v==null||v==='')return '';
    const ref=col(ci)+(ri+1),style=ri===0?' s="1"':'';
    if(typeof v==='number'&&Number.isFinite(v))return `<c r="${ref}"${ri===0?style:' s="2"'}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(Array.isArray(v)?v.join(', '):v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return zip({
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName.replace(/[\\/?*[\]:]/g,'').slice(0,31)||'Sayfa1')}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData></worksheet>`
  });
}
const unxml=s=>s.replace(/&(lt|gt|quot|apos|amp|#(\d+)|#x([0-9a-f]+));/gi,(m,n,d,h)=>d?String.fromCodePoint(+d):h?String.fromCodePoint(parseInt(h,16)):{lt:'<',gt:'>',quot:'"',apos:"'",amp:'&'}[n.toLowerCase()]);
const texts=s=>[...s.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m=>unxml(m[1])).join('');
export function fromXlsx(buf){
  const files=unzip(buf),read=n=>files[n]?.toString('utf8');
  const shared=[...(read('xl/sharedStrings.xml')||'').matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(m=>texts(m[1]));
  // İlk sayfanın dosyasını çalışma kitabından bul
  let sheet='xl/worksheets/sheet1.xml';
  const rid=(read('xl/workbook.xml')||'').match(/<(?:\w+:)?sheet\b[^>]*r:id="([^"]+)"/)?.[1];
  const target=rid&&(read('xl/_rels/workbook.xml.rels')||'').match(new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`))?.[1]
    ||rid&&(read('xl/_rels/workbook.xml.rels')||'').match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`))?.[1];
  if(target)sheet=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
  const data=read(sheet)||read(Object.keys(files).find(n=>/^xl\/worksheets\/[^/]+\.xml$/.test(n)));
  if(!data)throw new Error('Excel dosyasında sayfa bulunamadı');
  const rows=[];
  for(const rm of data.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)){
    const row=[];
    for(const cm of rm[1].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)){
      const attrs=cm[1],inner=cm[2]||'',ref=attrs.match(/\br="([A-Z]+)\d+"/)?.[1],type=attrs.match(/\bt="(\w+)"/)?.[1];
      let i=row.length;if(ref){i=0;for(const ch of ref)i=i*26+ch.charCodeAt(0)-64;i--}
      const v=unxml(inner.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1]||'');
      row[i]=type==='s'?shared[+v]??'':type==='inlineStr'?texts(inner):type==='b'?(v==='1'?'Evet':'Hayır'):v;
    }
    rows.push(Array.from(row,x=>x??''));
  }
  return rows.filter(r=>r.some(v=>String(v).trim()));
}

// Yüklenen dosyayı uzantısına göre satırlara çevirir.
export function readTable(filename,base64){
  const buf=Buffer.from(String(base64||''),'base64');
  if(!buf.length)throw new Error('Dosya boş');
  if(buf.length>10*1024*1024)throw new Error('Dosya 10 MB’tan büyük');
  if(/\.xlsx$/i.test(filename)||buf.readUInt32LE(0)===0x04034b50)return fromXlsx(buf);
  if(/\.xls$/i.test(filename))throw new Error('Eski .xls biçimi desteklenmiyor. Excel’de “Farklı kaydet → .xlsx” ile kaydedip yükle.');
  return fromCsv(buf.toString('utf8'));
}
