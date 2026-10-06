import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { markets } from '@/data/markets';

export default function MarketsPage() {
  return (
    <>
      <Head>
        <title>Pazarlar | Fevzipaşa Tasarım Pazarı</title>
        <meta
          name="description"
          content="Fevzipaşa\'nın 5 tasarım pazarını keşfet"
        />
      </Head>

      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Fevzipaşa Tasarım Pazarları</h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Yıl boyunca düzenlenen 5 ayrı tasarım pazarında tasarımcıları,
              sanatçıları ve yaratıcıları keşfet.
            </p>
          </div>
        </section>

        {/* Markets Grid */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {markets.map((market) => (
              <div key={market.id} className="group cursor-pointer">
                <Link href={`/pazarlar/${market.slug}`}>
                  <div className="overflow-hidden rounded-lg mb-4 h-64 relative">
                    <Image
                      src={market.thumbnail}
                      alt={market.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {market.name}
                    </h3>
                    <p className="text-neutral-600 mb-4">{market.description}</p>
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <span className="flex items-center gap-2">
                        📅 {market.dates.start} - {market.dates.end}
                      </span>
                      <span className="flex items-center gap-2">
                        📍 {market.location}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline Section */}
        <section className="bg-neutral-50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Yıllık Takvim</h2>
            <div className="space-y-8">
              {markets.map((market, index) => (
                <div key={market.id} className="flex gap-8 items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 group">
                    <Link href={`/pazarlar/${market.slug}`}>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {market.name}
                      </h3>
                      <p className="text-neutral-600 mb-2">
                        {market.dates.start} - {market.dates.end}
                      </p>
                      <p className="text-neutral-500">{market.description}</p>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Pazarlar Hakkında Bilgi Almak İster Misin?
            </h2>
            <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
              E-posta adresini gir ve pazarlar hakkında güncellemeleri ilk
              öğren.
            </p>
            <div className="flex gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="E-posta adresini gir"
                className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Abone Ol
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
