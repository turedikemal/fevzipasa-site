import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-garden text-canvas py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Fevzipaşa</h3>
            <p className="text-canvas">
              Tasarım ve sanat ürünlerinin buluşma noktası.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Ürünler</h4>
            <ul className="space-y-2 text-canvas">
              <li>
                <Link href="/products" className="hover:text-canvas">
                  Tüm Ürünler
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-canvas">
                  Kategoriler
                </Link>
              </li>
              <li>
                <Link href="/trending" className="hover:text-canvas">
                  Trend Ürünler
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Şirket</h4>
            <ul className="space-y-2 text-canvas">
              <li>
                <Link href="/about" className="hover:text-canvas">
                  Hakkında
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-canvas">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-canvas">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Yasal</h4>
            <ul className="space-y-2 text-canvas">
              <li>
                <Link href="/privacy" className="hover:text-canvas">
                  Gizlilik
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-canvas">
                  Şartlar
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-canvas">
                  Çerezler
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-canvas pt-8 text-center text-canvas">
          <p>&copy; 2024 Fevzipaşa Tasarım Pazarı. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
};
