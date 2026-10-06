import Head from 'next/head';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Carousel } from '@/components/features/Carousel';
import { formatPrice } from '@/utils/helpers';

const mockProducts = [
  {
    id: '1',
    title: 'Minimalist Poster Seti',
    price: 150,
    image: 'https://images.unsplash.com/photo-1523540451912-7d5850a5c6d5?w=400',
    category: 'Poster',
  },
  {
    id: '2',
    title: 'Tasarım Kitabı',
    price: 120,
    image: 'https://images.unsplash.com/photo-1507842217343-583f7270bfed?w=400',
    category: 'Kitap',
  },
  {
    id: '3',
    title: 'Typography Mug',
    price: 45,
    image: 'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=400',
    category: 'Fincan',
  },
  {
    id: '4',
    title: 'Sanat Baskısı',
    price: 200,
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    category: 'Sanat',
  },
];

export default function ShopPage() {
  return (
    <>
      <Head>
        <title>Shop | Fevzipaşa Tasarım Pazarı</title>
        <meta
          name="description"
          content="Fevzipaşa tasarımcılarının eşsiz ürünlerini satın al"
        />
      </Head>

      <Header />

      <main>
        {/* Hero */}
        <section className="bg-linen py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Shop</h1>
            <p className="text-lg text-ink">
              Fevzipaşa tasarımcılarının eşsiz ve özel ürünlerini keşfet
            </p>
          </div>
        </section>

        {/* Featured Products Carousel */}
        <Carousel
          title="Öne Çıkan Ürünler"
          items={mockProducts.map((p) => ({
            id: p.id,
            image: p.image,
            title: p.title,
            price: formatPrice(p.price),
            tag: p.id === '1' ? 'YENİ' : p.id === '3' ? 'ÖZEL' : undefined,
          }))}
          showPrice={true}
        />

        {/* Products Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {mockProducts.map((product) => (
                <div
                  key={product.id}
                  className="group cursor-pointer overflow-hidden"
                >
                  <div className="relative h-64 overflow-hidden bg-linen">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-ink uppercase mb-2">
                      {product.category}
                    </p>
                    <h3 className="text-lg font-bold mb-2 group-hover:underline transition-colors">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold">
                        {formatPrice(product.price)}
                      </p>
                      <Button size="sm">Sepete Ekle</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="bg-ink text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Yeni Ürünler Hakkında Bilgi Al</h2>
            <p className="mb-8">Pazarlardan yeni ürünler eklendiğinde haberdar ol</p>
            <div className="flex gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="E-posta adresini gir"
                className="flex-1 px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-canvas"
              />
              <button className="bg-ink text-white px-6 py-3 font-semibold hover:bg-ink/80 transition-colors">
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
