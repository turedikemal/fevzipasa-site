# FEVZİPAŞA TASARIM PAZARI

Modern tasarım ve sanat ürünleri pazarı web platformu.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm/yarn
- Git
- Railway Account
- GitHub Account

### Setup

```bash
# 1. Clone & Install
git clone <repo-url>
cd fevzipasa-sitesi
npm install

# 2. Environment Setup
cp .env.example .env.local
# .env.local'i doldur (Railway secrets'ı kopyala)

# 3. Development
npm run dev
# http://localhost:3000

# 4. Build
npm run build
npm run start
```

## 📁 Project Structure

```
fevzipasa-sitesi/
├── src/
│   ├── components/      
│   │   ├── ui/         # Base UI components (Button, Card)
│   │   ├── layout/     # Layout (Header, Footer)
│   │   └── features/   # Complex components (Gallery, MarketStory, BlogCard)
│   ├── pages/          
│   │   ├── index.tsx               # Home page
│   │   ├── pazarlar/               # Market pages
│   │   │   ├── index.tsx           # Markets listing
│   │   │   └── [slug].tsx          # Market detail page
│   │   ├── shop/                   # Shop pages
│   │   ├── blog/                   # Blog pages
│   │   └── api/                    # API routes
│   ├── data/           # Mock/static data
│   │   └── markets.ts  # 5 markets data
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Helper functions
│   ├── hooks/          # React hooks
│   └── lib/            # Configurations
├── public/             # Static assets
├── scripts/            # Helper scripts (Refero tokens)
├── .github/workflows/  # CI/CD
├── .claude/            # Claude Code config
├── .railway.json       # Railway config
├── tailwind.config.js  # Tailwind + Refero tokens
├── tsconfig.json       # TypeScript (strict mode)
└── next.config.js      # Next.js config
```

## 📅 5 Tasarım Pazarı

1. **Yıl Başı Pazarı** - 27-28 Aralık
2. **Kış Pazarı** - 7-8 Şubat
3. **Bahar Pazarı** - 9-10-11 Mart
4. **Akşam Pazarı** - 7-8-9 Ağustos
5. **Tasarım Pazarı** - 9-10-11 Ekim

## 🎨 Design System (Refero)

Design tokens Refero'dan çekiliyor:
- Colors
- Typography
- Spacing
- Border radius
- Shadows

Tailwind config otomatik güncelleniyor.

## 🔗 Deployment

### Railway (Otomatik)
- `main` branch → Production
- `develop` branch → Staging
- GitHub Actions → Automatic deployment

### Environment Variables
Railway dashboard'dan secrets'ı yönet:
- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- Diğer env vars

## 📝 Development

### Scripts
```bash
npm run dev       # Dev server
npm run build     # Production build
npm start         # Start server
npm run lint      # ESLint check
npm run type-check # TypeScript check
npm run refero:tokens # Refero tokens'ları güncelle
```

### Git Workflow
1. Feature branch oluştur: `git checkout -b feature/xyz`
2. Commit: `git commit -m "feat: description"`
3. Push: `git push origin feature/xyz`
4. PR açıp review bekle
5. Merge → Railway otomatik deploy

## 🆘 Troubleshooting

### Railway Deploy Hatası
1. Railway dashboard'ı kontrol et
2. Logs'ı incele: `railway logs`
3. Environment variables'ı kontrol et

### Refero Tokens Hatası
1. Refero MCP connection'ı kontrol et
2. Token'ları yeniden çek: `npm run refero:tokens`

## 📧 Contact
Proje lead: [Your Name]
Email: turedikemal@gmail.com

---

🤖 Generated with Claude Code
