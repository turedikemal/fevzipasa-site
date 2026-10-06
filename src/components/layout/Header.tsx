import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const Header: React.FC = () => {
  return (
    <header className="bg-white sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-bold text-lg">Fevzipaşa</span>
        </Link>

        <div className="flex items-center gap-8">
          <Link href="/" className="text-ink hover:underline transition-colors">
            Anasayfa
          </Link>
          <Link href="/pazarlar" className="text-ink hover:underline transition-colors">
            Pazarlar
          </Link>
          <Link href="/shop" className="text-ink hover:underline transition-colors">
            Shop
          </Link>
          <Link href="/blog" className="text-ink hover:underline transition-colors">
            Blog
          </Link>
          <Link href="/contact" className="text-ink hover:underline transition-colors">
            İletişim
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            Giriş Yap
          </Button>
          <Button size="sm">
            Üye Ol
          </Button>
        </div>
      </nav>
    </header>
  );
};
