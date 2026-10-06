import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { markets } from '@/data/markets';

export default function Home() {
  const upcomingMarket = markets[4]; // Tasarım Pazarı
  const featuredMarkets = markets.slice(0, 3);

  return (
    <>
      <Head>
        <title>Fevzipaşa Tasarım Pazarları | Tasarım ve Sanat Buluşma Noktası</title>
        <meta
          name="description"
          content="Fevzipaşa tasarım pazarlarıyla tasarımcıları, sanatçıları ve yaratıcıları keşfet. Yıl boyunca düzenlenen 5 pazarda tasarım ve sanat ürünleri."
        />
      </Head>

      <Header />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative h-screen bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <h1 className="text-6xl font-bold mb-6">
                Fevzipaşa Tasarım Pazarları
              </h1>
              <p className="text-2xl text-neutral-600 mb-8">
                Tasarım ve sanatın yıl boyunca kutlandığı, tasarımcıların ve sanatçıların buluştuğu platform.
              </p>
              <div className="flex gap-4">
                <Link href="/pazarlar">
                <Button size="lg">Pazarları Keşfet</Button>
              </Link>
              <Link href="#featured">
                <Button variant="outline" size="lg">
                  Daha Fazla Bilgi
                </Button>
              </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Markets */}
        <section id="featured" className="py-20 bg-neutral-50">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold mb-12 text-center">
              Öne Çıkan Pazarlar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredMarkets.map((market) => (
                <div key={market.id} className="group cursor-pointer">
                  <Link href={`/pazarlar/${market.slug}`}>
                    <div className="overflow-hidden rounded-lg mb-4 h-64 relative">
                      <Image
                        src={market.thumbnail}
                        alt={market.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {market.name}
                    </h3>
                    <p className="text-neutral-600 mb-4">{market.description}</p>
                    <p className="text-sm text-primary font-semibold">
                      {market.dates.start} - {market.dates.end}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Event */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="relative h-96 rounded-lg overflow-hidden">
                <Image
                  src={upcomingMarket.hero}
                  alt={upcomingMarket.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-primary font-semibold uppercase mb-2">
                  Yakında
                </p>
                <h2 className="text-4xl font-bold mb-4">
                  {upcomingMarket.name}
                </h2>
                <p className="text-lg text-neutral-600 mb-8">
                  {upcomingMarket.description}
                </p>
                <div className="space-y-4 mb-8">
                  <div>
                    <p className="text-sm font-semibold text-neutral-500 uppercase">
                      Tarih
                    </p>
                    <p className="text-lg font-bold">
                      {upcomingMarket.dates.start} - {upcomingMarket.dates.end}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-500 uppercase">
                      Konum
                    </p>
                    <p className="text-lg font-bold">
                      {upcomingMarket.location}
                    </p>
                  </div>
                </div>
                <Link href={`/pazarlar/${upcomingMarket.slug}`}>
                  <Button size="lg">Detaylara Bak</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-primary text-white py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold mb-2">5</p>
                <p className="text-primary-100">Yıllık Pazarlar</p>
              </div>
              <div>
                <p className="text-4xl font-bold mb-2">500+</p>
                <p className="text-primary-100">Tasarımcı & Sanatçı</p>
              </div>
              <div>
                <p className="text-4xl font-bold mb-2">50K+</p>
                <p className="text-primary-100">Yıllık Ziyaretçi</p>
              </div>
              <div>
                <p className="text-4xl font-bold mb-2">1000+</p>
                <p className="text-primary-100">Tasarım Ürünü</p>
              </div>
            </div>
          </div>
        </section>

        {/* All Markets CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Tüm Pazarları Görmek İster Misin?</h2>
            <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
              5 pazarı, onların hikayelerini, galerilerini ve özel etkinliklerini keşfet.
            </p>
            <Link href="/pazarlar">
              <Button size="lg">Tüm Pazarlara Git</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
