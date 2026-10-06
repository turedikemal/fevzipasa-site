// Market & Events
export interface Market {
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  dates: {
    start: string;
    end: string;
  };
  location: string;
  thumbnail: string;
  hero: string;
  story: {
    title: string;
    content: string;
    sections: StorySection[];
  };
  gallery: GalleryImage[];
  highlights: string[];
  nextEvent?: string;
  color: {
    primary: string;
    secondary: string;
  };
}

export interface StorySection {
  id: string;
  title: string;
  text: string;
  image?: string;
  position: 'left' | 'right';
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: string;
  title?: string;
  description?: string;
  width: number;
  height: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  image: string;
  category: string;
  tags: string[];
}

// Shop
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  marketId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
