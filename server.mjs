import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root = new URL('./', import.meta.url);
const files = {'/':['index.html','text/html; charset=utf-8'], '/index.html':['index.html','text/html; charset=utf-8'], '/hero.webp':['hero.webp','image/webp']};
const portIndex = process.argv.indexOf('--port');
const initialPort = Number(portIndex >= 0 ? process.argv[portIndex+1] : process.env.PORT || 3001);
if (!Number.isInteger(initialPort) || initialPort < 1 || initialPort > 65535) throw new Error('Geçersiz port');
function listen(port) {
  const server = http.createServer(async (req,res) => {
    const item = files[new URL(req.url,'http://localhost').pathname];
    if (!item) {res.writeHead(404); res.end('Bulunamadı'); return;}
    try {const data = await readFile(new URL(item[0],root)); res.writeHead(200,{'Content-Type':item[1],'Cache-Control':'no-store'}); res.end(data);}
    catch {res.writeHead(500);res.end('Site dosyası okunamadı');}
  });
  server.on('error',err => {
    if (err.code === 'EADDRINUSE' && !process.env.PORT && port < initialPort+20 && port < 65535) {console.log(`${port} dolu, sonraki port deneniyor.`);listen(port+1);}
    else {console.error(err.message);process.exitCode=1;}
  });
  server.listen(port,process.env.PORT ? '0.0.0.0' : '127.0.0.1',() => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`\nFevzipaşa hazır: ${url}\nDurdurmak için Control + C.\n`);
    if (process.platform === 'darwin' && !process.env.PORT) {const child=spawn('open',[url]);child.on('error',()=>{});}
  });
}
listen(initialPort);
