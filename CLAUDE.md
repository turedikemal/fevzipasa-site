# FEVZİPAŞA TASARIM PAZARI - Development Guide

## 🎯 Proje Amaç
Fevzipaşa bölgesinin 5 tasarım pazarını tanıtan, hikayelerini paylaşan, ileri gallery deneyimi sunan ve destek olarak shop özellikleri olan modern web platformu.

## 📅 5 Tasarım Pazarı
1. **Yıl Başı Pazarı** - 27-28 Aralık
2. **Kış Pazarı** - 7-8 Şubat
3. **Bahar Pazarı** - 9-10-11 Mart
4. **Akşam Pazarı** - 7-8-9 Ağustos
5. **Tasarım Pazarı** - 9-10-11 Ekim

## 🛠️ Tech Stack
- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Gallery:** React-based, Masonry, Modal, Filter, Zoom
- **Content:** Markdown + JSON structure
- **Backend:** Next.js API Routes
- **Deployment:** Railway
- **Repository:** GitHub
- **Design System:** Refero Design Tokens + UI UX Pro Max Skill

## 📋 Development Rules

### Code Style
- TypeScript strict mode zorunlu
- Functional components + React Hooks
- Component naming: PascalCase (MyComponent.tsx)
- File/folder naming: kebab-case (my-component/)
- No prop drilling - Context API / Zustand kullan

### File Structure
```
src/
├── components/        # Reusable components
│   ├── ui/           # Base UI (Button, Card, etc)
│   ├── layout/       # Layout components
│   └── features/     # Feature-specific components
├── pages/            # Next.js pages
├── api/              # API routes
├── styles/           # Global styles
├── types/            # TypeScript definitions
├── utils/            # Helper functions
├── hooks/            # Custom React hooks
└── lib/              # Library configurations
```

### Refero Integration
- **Design Tokens:** Refero'dan otomatik import
- **Color System:** tailwind.config.js'de tanımlı
- **Typography:** Refero typography scale kullan
- **Spacing:** Refero spacing tokens'ını inherit et
- **Components:** Refero guidelines'a uygun

### Git Workflow
- **Branch naming:** feature/*, bugfix/*, hotfix/*
- **Commit message:** "feat:", "fix:", "docs:", "style:", "refactor:"
- **PR:** Açıklamalı description, checklist
- **main branch:** Protected, PR review zorunlu

### GitHub + Railway
- GitHub Actions CI/CD automatic
- Production: Railway main branch'den deploy
- Staging: Development branch'den deploy
- Environment variables: Railway secrets üzerinden

## 🚀 Quick Start

```bash
# Install
npm install

# Dev
npm run dev

# Build & Test
npm run build
npm run lint

# Deploy (Railway otomatik)
git push origin main
```

## 📦 Refero Kullanım

1. **Design Tokens'ları Çek:**
   ```bash
   npm run refero:tokens
   ```

2. **Colors, Typography, Spacing:** Refero'dan otomatik
3. **Components:** Refero-uyumlu template'leri kullan

## ⚠️ Important
- `.env.local` ve secrets GitHub'a push etme
- Railway secrets'ı .env.example'da dokümante et
- Breaking changes'ı CHANGELOG.md'de yaz
