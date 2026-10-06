import { Market } from '@/types';

export const markets: Market[] = [
  {
    id: '1',
    slug: 'yilbasi-pazari',
    name: 'Yıl Başı Pazarı',
    title: 'Yıl Başı Pazarı',
    description: 'Yeni yılın başında tasarım ve sanat ürünlerinin buluşma noktası',
    dates: {
      start: '27 Aralık',
      end: '28 Aralık',
    },
    location: 'Fevzipaşa, İstanbul',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
    hero: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
    story: {
      title: 'Yıl Başı Pazarı Hikayesi',
      content:
        'Her yılın başında Fevzipaşa\'da tasarımcılar, sanatçılar ve yaratıcılar bir araya geliyor. Yıl başı pazarı, yeni yılın ruhunu taşıyan, tasarım ve sanat ürünlerinin sergilendiği, satıldığı ve paylaşıldığı özel bir etkinlik.',
      sections: [
        {
          id: '1',
          title: 'Başlangıç',
          text: 'Fevzipaşa bölgesinde tasarım pazarlarının tarihi, yerel sanatçıların ve tasarımcıların çalışmalarını gösteren ilk girişimler ile başladı. Yıl başı pazarı, bu geleneği devam ettirerek her yılın başında binlerce tasarım severin buluşma noktası haline geldi.',
          image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=500',
          position: 'left',
        },
        {
          id: '2',
          title: 'Büyüme',
          text: 'Her geçen yıl daha fazla tasarımcı ve sanatçı katılmaya başladı. Lokal markaların yanında uluslararası tasarımcılar da yıl başı pazarında yer almaya istedi. Pazarın büyümesi, kalitesinin de artmasını sağladı.',
          image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
          position: 'right',
        },
        {
          id: '3',
          title: 'Günümüz',
          text: 'Bugün yıl başı pazarı, Fevzipaşa\'nın en büyük tasarım etkinliklerinden biri haline geldi. Her yıl binlerce ziyaretçi, yüzlerce tasarımcı ve sanatçıyı görmek için Fevzipaşa\'ya geliyor. Yıl başı pazarı, tasarım ve sanatın kutlandığı, yeni başlangıçların sembolü olan özel bir etkinlik.',
          image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500',
          position: 'left',
        },
      ],
    },
    gallery: [
      {
        id: '1',
        src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500',
        alt: 'Yıl Başı Pazarı',
        category: 'genel',
        title: 'Pazar Genel Görünümü',
        width: 500,
        height: 400,
      },
      {
        id: '2',
        src: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=500',
        alt: 'Tasarımcılar',
        category: 'tasarımcılar',
        title: 'Tasarımcılar Çalışırken',
        width: 500,
        height: 400,
      },
      {
        id: '3',
        src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500',
        alt: 'Ürünler',
        category: 'ürünler',
        title: 'Tasarım Ürünleri',
        width: 500,
        height: 400,
      },
      {
        id: '4',
        src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500',
        alt: 'Ziyaretçiler',
        category: 'genel',
        title: 'Ziyaretçiler',
        width: 500,
        height: 400,
      },
      {
        id: '5',
        src: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500',
        alt: 'Yakın Çekim',
        category: 'ürünler',
        title: 'El Sanatları',
        width: 500,
        height: 400,
      },
    ],
    highlights: [
      '500+ tasarımcı ve sanatçı',
      'Türkiye\'nin en büyük tasarım pazarı',
      'Her yıl 50.000+ ziyaretçi',
      'Uluslararası katılım',
      'Workshop ve seminerler',
    ],
    color: {
      primary: '#FF6B6B',
      secondary: '#FFD93D',
    },
  },
  {
    id: '2',
    slug: 'kis-pazari',
    name: 'Kış Pazarı',
    title: 'Kış Pazarı',
    description: 'Kış mevsiminin soğuğunda tasarım ve sanatın sıcaklığı',
    dates: {
      start: '7 Şubat',
      end: '8 Şubat',
    },
    location: 'Fevzipaşa, İstanbul',
    thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    hero: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200',
    story: {
      title: 'Kış Pazarı - Soğuğun İçinde Sıcak Tasarımlar',
      content:
        'Şubat ayının soğuk günlerinde Fevzipaşa\'da kış pazarı açılıyor. Bu pazarda, kışın ruhunu yansıtan tasarım ürünleri, sanat eserleri ve el sanatları sergileniyor. Kış pazarı, tasarım severler için sıcak bir buluşma noktası.',
      sections: [
        {
          id: '1',
          title: 'Kış Teması',
          text: 'Kış pazarı, soğuk mevsimin renglerini, dokularını ve hissiyatını tasarım ürünlerine yansıtıyor. Kar beyazından buz mavilerine, kış sıcaklığından tasarım yeniliklerine kadar her şey burada bulunabilir.',
          image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500',
          position: 'left',
        },
        {
          id: '2',
          title: 'Özel Ürünler',
          text: 'Kış pazarında sadece kışa özgü tasarımlar sunulmaz. Aynı zamanda, yeni sezon ürünleri, sınırlı baskılar ve tasarımcıların özel koleksiyonları da görülmektedir. Her ziyaretçi, kendine özel bir şey bulabilir.',
          image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500',
          position: 'right',
        },
      ],
    },
    gallery: [
      {
        id: '1',
        src: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500',
        alt: 'Kış Pazarı',
        category: 'genel',
        title: 'Kış Pazarı Görünümü',
        width: 500,
        height: 400,
      },
      {
        id: '2',
        src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500',
        alt: 'Kış Ürünleri',
        category: 'ürünler',
        title: 'Kış Koleksiyonu',
        width: 500,
        height: 400,
      },
    ],
    highlights: [
      'Kışa özel tasarımlar',
      'Sınırlı baskı ürünler',
      'Soğuk havada sıcak çay',
      'Workshop etkinlikleri',
    ],
    color: {
      primary: '#4ECDC4',
      secondary: '#44A08D',
    },
  },
  {
    id: '3',
    slug: 'bahar-pazari',
    name: 'Bahar Pazarı',
    title: 'Bahar Pazarı',
    description: 'Baharın gelişini kutlayan renkli tasarımlar ve sanat eserleri',
    dates: {
      start: '9 Mart',
      end: '11 Mart',
    },
    location: 'Fevzipaşa, İstanbul',
    thumbnail: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400',
    hero: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200',
    story: {
      title: 'Bahar Pazarı - Yeniden Doğuş',
      content:
        'Mart ayında baharın gelişiyle birlikte Fevzipaşa\'da bahar pazarı açılıyor. Bu pazarda, yenilenen, revize edilen ve yeni yaratılan tasarım ürünleri sergileniyor. Bahar pazarı, tasarım ve sanatın yenilenmesinin sembolü.',
      sections: [
        {
          id: '1',
          title: 'Renkli Tasarımlar',
          text: 'Bahar pazarı, baharın canlı renkleriyle dolu. Yeşilden sarıya, pembeden maviye, bahar tasarımlarının tüm renk paletini görmek mümkün.',
          image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500',
          position: 'left',
        },
      ],
    },
    gallery: [
      {
        id: '1',
        src: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500',
        alt: 'Bahar Pazarı',
        category: 'genel',
        width: 500,
        height: 400,
      },
    ],
    highlights: [
      'Bahar koleksiyonları',
      'Yeni tasarımcılar',
      '3 günlük etkinlik',
      'Açık hava aktiviteleri',
    ],
    color: {
      primary: '#F5A623',
      secondary: '#7ED321',
    },
  },
  {
    id: '4',
    slug: 'aksam-pazari',
    name: 'Akşam Pazarı',
    title: 'Akşam Pazarı',
    description: 'Yaz gecelerinin sıcaklığında tasarım ve müzik festivali',
    dates: {
      start: '7 Ağustos',
      end: '9 Ağustos',
    },
    location: 'Fevzipaşa, İstanbul',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    hero: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
    story: {
      title: 'Akşam Pazarı - Yaz Gecelerinin Şöleni',
      content:
        'Ağustos ayı yaz gecelerinde Fevzipaşa\'da akşam pazarı açılıyor. Bu pazarda tasarım ve sanat, müzik ve sosyal etkinliklerle bir araya geliyor. Akşam pazarı, yaz yaşamının en renkli parçası.',
      sections: [
        {
          id: '1',
          title: 'Yaz Keyfi',
          text: 'Akşam pazarı, yaz mevsiminin sıcaklığında, açık havada tasarım ürünleri, sanat eserleri ve müzikle geçen anlar sunar.',
          image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500',
          position: 'left',
        },
      ],
    },
    gallery: [
      {
        id: '1',
        src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500',
        alt: 'Akşam Pazarı',
        category: 'genel',
        width: 500,
        height: 400,
      },
    ],
    highlights: [
      'Müzik ve tasarım',
      'Açık hava pazarı',
      'Yaz koleksiyonları',
      'Sosyal etkinlikler',
    ],
    color: {
      primary: '#FF6B9D',
      secondary: '#FFA502',
    },
  },
  {
    id: '5',
    slug: 'tasarim-pazari',
    name: 'Tasarım Pazarı',
    title: 'Tasarım Pazarı',
    description: 'Tasarım endüstrisinin en büyük buluşma noktası',
    dates: {
      start: '9 Ekim',
      end: '11 Ekim',
    },
    location: 'Fevzipaşa, İstanbul',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400',
    hero: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200',
    story: {
      title: 'Tasarım Pazarı - Endüstrinin Nabzı',
      content:
        'Ekim ayında Fevzipaşa\'da tasarım pazarı açılıyor. Bu, tasarım endüstrisinin en büyük buluşma noktası. Tasarımcılar, sanatçılar, iş insanları ve tasarım severler bir araya geliyor.',
      sections: [
        {
          id: '1',
          title: 'Profesyonel Ortam',
          text: 'Tasarım pazarı, sadece tasarım ürünlerinin satıldığı bir yer değil. Aynı zamanda, tasarım konferansları, workshop\'lar, networking etkinlikleri ve seminerler düzenleniyor.',
          image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500',
          position: 'left',
        },
      ],
    },
    gallery: [
      {
        id: '1',
        src: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500',
        alt: 'Tasarım Pazarı',
        category: 'genel',
        width: 500,
        height: 400,
      },
    ],
    highlights: [
      'Profesyonel tasarımcılar',
      'Konferanslar ve workshop\'lar',
      'Networking etkinlikleri',
      'Gözde tasarım şirketleri',
    ],
    color: {
      primary: '#6C5CE7',
      secondary: '#A29BFE',
    },
  },
];
