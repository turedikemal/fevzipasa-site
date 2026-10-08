import http from 'node:http';
import {readFile,stat,readdir} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {handle as handleAdmin} from './lib/admin.mjs';
const root=new URL('./',import.meta.url),cwd=fileURLToPath(root),exec=promisify(execFile);
const routes={'/':'index.html','/katilimcilar':'katilimcilar.html','/hikaye':'hikaye.html','/ziyaret':'ziyaret.html','/workshoplar':'workshoplar.html','/kosullar':'kosullar.html'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const files=new Set(['index.html','katilimcilar.html','hikaye.html','ziyaret.html','workshoplar.html','kosullar.html','workshop.html','workshops.js','katilimcilar.js','style.css','app.js','brands.json','favicon.svg']);
const portIndex=process.argv.indexOf('--port'),port=Number(portIndex>=0?process.argv[portIndex+1]:process.env.PORT||3001);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Geçersiz port');
async function version(){const hash=createHash('sha1');for(const file of [...files,...(await readdir(new URL('assets/',root))).map(f=>'assets/'+f)].sort()){const s=await stat(new URL(file,root));hash.update(file+':'+s.mtimeMs+':'+s.size)}return hash.digest('hex')}
function listen(p){const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(await handleAdmin(req,res,pathname))return;if(pathname==='/__version'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({version:await version()}));return}const file=routes[pathname]||(/^\/workshop\/[\w-]+\/?$/.test(pathname)?'workshop.html':pathname.slice(1));if(!files.has(file)&&!/^assets\/[a-z-]+\.webp$/.test(file)){res.writeHead(404);res.end('Sayfa bulunamadı');return}const data=await readFile(new URL(file,root));const ext=file.slice(file.lastIndexOf('.'));res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)}catch(err){res.writeHead(err.code==='ENOENT'?404:500);res.end('Dosya yüklenemedi')}});server.on('error',err=>{if(err.code==='EADDRINUSE'&&!process.env.PORT&&p<port+20&&p<65535){console.log(`${p} dolu. Sonraki port deneniyor.`);listen(p+1)}else{console.error(err.message);process.exitCode=1}});server.listen(p,process.env.PORT?'0.0.0.0':'127.0.0.1',()=>{const url=`http://127.0.0.1:${p}`;console.log(`\nFevzipaşa hazır: ${url}\nAna sayfa: / · Katılımcılar: /katilimcilar\nDurdurmak için Control + C.\n`);if(process.platform==='darwin'&&!process.env.PORT){const child=spawn('open',[url]);child.on('error',()=>{})}})}
listen(port);
let busy=false,paused=false;
async function sync(){if(busy)return;busy=true;try{const {stdout:dirty}=await exec('git',['status','--porcelain'],{cwd,timeout:10000});if(dirty.trim()){if(!paused)console.log('Yerel değişiklikler var. GitHub eşitlemesi duraklatıldı; dosyalarınıza dokunulmaz.');paused=true;return}paused=false;const {stdout}=await exec('git',['pull','--ff-only'],{cwd,timeout:20000});if(!/Already up to date|Already up-to-date/.test(stdout))console.log('GitHub değişiklikleri alındı. Tarayıcı yenilenecek.')}catch(err){if(!paused)console.log('GitHub eşitlemesi şu an yapılamıyor. Site yerelde çalışmaya devam ediyor.');paused=true}finally{busy=false}}
if(process.argv.includes('--sync')&&!process.env.PORT){console.log('GitHub eşitlemesi açık. Yeni değişiklikler otomatik alınacak.');sync();setInterval(sync,5000)}
