import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Fevzipaşa</h3>
            <p className="text-neutral-400">
              Tasarım ve sanat ürünlerinin buluşma noktası.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Ürünler</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/products" className="hover:text-white">
                  Tüm Ürünler
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white">
                  Kategoriler
                </Link>
              </li>
              <li>
                <Link href="/trending" className="hover:text-white">
                  Trend Ürünler
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Şirket</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/about" className="hover:text-white">
                  Hakkında
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Yasal</h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Gizlilik
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Şartlar
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white">
                  Çerezler
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-8 text-center text-neutral-400">
          <p>&copy; 2024 Fevzipaşa Tasarım Pazarı. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
};
