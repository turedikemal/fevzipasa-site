import Head from 'next/head';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BlogCard } from '@/components/features/BlogCard';
import { BlogPost } from '@/types';

const blogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'tasarim-pazarlarinin-hikayesi',
    title: 'Tasarım Pazarlarının Hikayesi',
    excerpt:
      'Fevzipaşa tasarım pazarlarının nasıl başladığını ve bugüne kadar olan yolculuğunu keşfet.',
    content: '...',
    author: 'Fevzipaşa Ekibi',
    date: '10 Ekim 2024',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
    category: 'Pazarlar',
    tags: ['tasarım', 'pazarlar', 'hikaye'],
  },
  {
    id: '2',
    slug: 'tasarimci-olmak-icin-tuyolar',
    title: 'Tasarımcı Olmak İçin İpuçları',
    excerpt:
      'Başarılı bir tasarımcı olmak için izlemeniz gereken adımları ve önemli noktaları öğrenin.',
    content: '...',
    author: 'Ustaları Ekibi',
    date: '8 Ekim 2024',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600',
    category: 'Tasarım',
    tags: ['tasarım', 'kariyer', 'ipuçları'],
  },
  {
    id: '3',
    slug: 'renk-teorisinin-temelleri',
    title: 'Renk Teorisinin Temelleri',
    excerpt:
      'Tasarımda renkleri etkili bir şekilde kullanmanın temel ilkelerini öğrenin.',
    content: '...',
    author: 'Renk Uzmanı',
    date: '5 Ekim 2024',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600',
    category: 'Tasarım',
    tags: ['renk', 'tasarım', 'teori'],
  },
];

export default function BlogPage() {
  return (
    <>
      <Head>
        <title>Blog | Fevzipaşa Tasarım Pazarı</title>
        <meta
          name="description"
          content="Tasarım, sanat ve Fevzipaşa pazarları hakkında makaleler"
        />
      </Head>

      <Header />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Blog</h1>
            <p className="text-lg text-neutral-600">
              Tasarım, sanat ve Fevzipaşa pazarları hakkında yazılar
            </p>
          </div>
        </section>

        {/* Featured Post */}
        {blogPosts.length > 0 && (
          <section className="py-16 border-b border-neutral-200">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-8">Son Yazı</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="relative h-96 rounded-lg overflow-hidden">
                  <img
                    src={blogPosts[0].image}
                    alt={blogPosts[0].title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary uppercase mb-2">
                    {blogPosts[0].category}
                  </p>
                  <h3 className="text-3xl font-bold mb-4">
                    {blogPosts[0].title}
                  </h3>
                  <p className="text-neutral-600 mb-4">{blogPosts[0].excerpt}</p>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-sm text-neutral-500">
                      {blogPosts[0].date}
                    </span>
                    <span className="text-sm text-neutral-500">
                      {blogPosts[0].author}
                    </span>
                  </div>
                  <Link href={`/blog/${blogPosts[0].slug}`}>
                    <button className="text-primary font-semibold hover:text-primary/80 transition-colors">
                      Yazıyı Oku →
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* All Posts */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8">Tüm Yazılar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogPosts.slice(1).map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="bg-primary text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Yeni Yazılara Abone Ol</h2>
            <p className="mb-8">Tasarım ve Fevzipaşa pazarları hakkında yazıları doğrudan e-posta ile al</p>
            <div className="flex gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="E-posta adresini gir"
                className="flex-1 px-4 py-3 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <button className="bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-secondary/90 transition-colors">
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
