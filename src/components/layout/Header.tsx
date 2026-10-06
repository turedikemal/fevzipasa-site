import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg" />
          <span className="font-bold text-lg">Fevzipaşa</span>
        </Link>

        <div className="flex items-center gap-8">
          <Link href="/" className="text-neutral-600 hover:text-primary transition-colors">
            Anasayfa
          </Link>
          <Link href="/pazarlar" className="text-neutral-600 hover:text-primary transition-colors">
            Pazarlar
          </Link>
          <Link href="/shop" className="text-neutral-600 hover:text-primary transition-colors">
            Shop
          </Link>
          <Link href="/blog" className="text-neutral-600 hover:text-primary transition-colors">
            Blog
          </Link>
          <Link href="/contact" className="text-neutral-600 hover:text-primary transition-colors">
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
