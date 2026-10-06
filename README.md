# Fevzipaşa Tasarım Pazarı

Çalışan dört sayfa: ana sayfa, katılımcılar, pazarın hikâyesi ve ziyaret bilgileri.
Ana sayfa MA Quilts yönündeki sarı–pembe taslak; katılımcılar The Pop Manifesto yönündeki pembe–mavi taslak temelinde uygulandı. Fotoğraflar temsilidir.

## Yerelde aç

Node.js 18 veya üzeri gerekir. Paket kurulumu gerekmiyor.

```bash
npm run dev
```

Mac'te tarayıcı otomatik açılır. Başlangıç portu 3001; doluysa sonraki port kullanılır. Terminaldeki adresi esas alın.

Bu geliştirme komutu GitHub değişikliklerini 5 saniyede bir `git pull --ff-only` ile alır. Yerel dosyalarda değişiklik varsa eşitleme durur ve dosyalar korunur. Tarayıcı dosya değişikliklerini algılayıp aynı kaydırma konumunda yenilenir. Sunucu kodu değişirse sunucuyu Control + C ile durdurup yeniden başlatın.

Sadece yerel sunucu için `npm start`. Durdurmak için Control + C.

## Sayfalar

- `/` — Katmanlı açılış, üreticiler, kaydırmayla değişen fotoğraf yığını, aşağı taşınan eski etkinlik bölümü ve yatay galeri.
- `/katilimcilar` — Pembe–mavi sayfa, kategori filtreleri ve marka detay pencereleri.
- `/hikaye` — Pazarın hikâyesi ve kaydırmayla hareket eden fotoğraflar.
- `/ziyaret` — Tarih, saat, mahalle haritası ve takvim dosyası.

Sayfa geçişleri, menü, fotoğraf büyütme, diyaloglar ve azaltılmış hareket desteği bulunur. Mobilde yatay galeri doğal dokunarak kaydırılır.

Google Fonts çevrimiçi yüklenir; internet yoksa sistem fontu kullanılır. Tam katılımcı listesi, marka ürün fotoğrafları ve kesin etkinlik noktası güncellenecektir.
