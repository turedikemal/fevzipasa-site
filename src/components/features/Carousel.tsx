import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export interface CarouselItem {
  id: string;
  image: string;
  title: string;
  price?: string;
  tag?: string;
  link?: string;
}

interface CarouselProps {
  items: CarouselItem[];
  title?: string;
  showPrice?: boolean;
  itemsPerView?: number;
  autoScroll?: boolean;
}

export const Carousel: React.FC<CarouselProps> = ({
  items,
  title,
  showPrice = true,
  itemsPerView = 4,
  autoScroll = false,
}) => {
  const [scrollPos, setScrollPos] = useState(0);
  const scrollContainer = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainer.current) return;

    const itemWidth = scrollContainer.current.scrollWidth / items.length;
    const newPos =
      direction === 'left' ? scrollPos - itemWidth * 2 : scrollPos + itemWidth * 2;

    scrollContainer.current.scrollTo({
      left: newPos,
      behavior: 'smooth',
    });
    setScrollPos(newPos);
  };

  useEffect(() => {
    if (!autoScroll) return;

    const interval = setInterval(() => {
      scroll('right');
    }, 5000);

    return () => clearInterval(interval);
  }, [autoScroll, scrollPos]);

  return (
    <section className="py-16">
      {title && (
        <div className="container mx-auto px-4 mb-8">
          <h2 className="text-3xl font-bold text-center">{title}</h2>
        </div>
      )}

      <div className="relative px-4">
        {/* Carousel Container */}
        <div
          ref={scrollContainer}
          className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory"
          style={{ scrollBehavior: 'smooth' }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-80 snap-center group cursor-pointer"
            >
              {/* Card */}
              <div className="bg-white overflow-hidden duration-300">
                {/* Image Container */}
                <div className="relative h-96 overflow-hidden bg-linen">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Tag */}
                  {item.tag && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-ink text-white px-3 py-1 text-xs font-bold uppercase">
                        {item.tag}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2 group-hover:underline transition-colors">
                    {item.title}
                  </h3>
                  {showPrice && item.price && (
                    <p className="text-ink font-bold text-lg">{item.price}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-ink hover:text-white text-ink p-3 transition-all duration-300"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-ink hover:text-white text-ink p-3 transition-all duration-300"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </section>
  );
};
