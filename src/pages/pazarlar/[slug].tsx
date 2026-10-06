import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Gallery } from '@/components/features/Gallery';
import { MarketStory } from '@/components/features/MarketStory';
import { markets } from '@/data/markets';

export default function MarketDetail() {
  const router = useRouter();
  const { slug } = router.query;

  const market = markets.find((m) => m.slug === slug);

  if (!market) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold">Pazarı bulunamadı</h1>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{market.title} | Fevzipaşa Tasarım Pazarı</title>
        <meta name="description" content={market.description} />
        <meta name="og:title" content={market.title} />
        <meta name="og:description" content={market.description} />
        <meta name="og:image" content={market.hero} />
      </Head>

      <Header />

      <main>
        {/* Hero Section */}
        <div className="relative h-96 mb-16 overflow-hidden">
          <Image
            src={market.hero}
            alt={market.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-5xl font-bold mb-4">{market.title}</h1>
              <p className="text-xl">{market.description}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          {/* Story Section */}
          <MarketStory market={market} />

          {/* Gallery Section */}
          <Gallery images={market.gallery} title="Pazardan Görüntüler" />

          {/* CTA Section */}
          <div className="mt-16 py-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20 text-center">
            <h2 className="text-3xl font-bold mb-4">
              {market.name}\'a Katılmak İster Misin?
            </h2>
            <p className="text-neutral-600 mb-8">
              Tasarım pazarında yer almak ve ürünlerini sergilemek için bize
              ulaş.
            </p>
            <Link href="/contact">
              <button className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                İletişime Geç
              </button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
