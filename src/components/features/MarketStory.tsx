import React from 'react';
import Image from 'next/image';
import { Market } from '@/types';

interface MarketStoryProps {
  market: Market;
}

export const MarketStory: React.FC<MarketStoryProps> = ({ market }) => {
  return (
    <section className="py-16">
      {/* Story Header */}
      <div className="mb-16">
        <h2 className="text-4xl font-bold mb-4">{market.story.title}</h2>
        <p className="text-lg text-ink leading-relaxed">
          {market.story.content}
        </p>
      </div>

      {/* Story Sections */}
      <div className="space-y-16">
        {market.story.sections.map((section, index) => (
          <div
            key={section.id}
            className={`flex flex-col ${
              section.position === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'
            } gap-8 items-center`}
          >
            {/* Text */}
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-4">{section.title}</h3>
              <p className="text-ink leading-relaxed text-base">
                {section.text}
              </p>
            </div>

            {/* Image */}
            {section.image && (
              <div className="flex-1 relative h-80 overflow-hidden">
                <Image
                  src={section.image}
                  alt={section.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Highlights */}
      {market.highlights.length > 0 && (
        <div className="mt-16 pt-16 border-t border-ink">
          <h3 className="text-2xl font-bold mb-8">Pazarın Öne Çıkan Özellikleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {market.highlights.map((highlight, index) => (
              <div
                key={index}
                className="p-6 bg-linen border border-ink"
              >
                <div className="text-ink font-bold text-2xl mb-2">✨</div>
                <p className="text-ink font-medium">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Info */}
      <div className="mt-16 p-8 bg-sage border border-ink">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-sm font-semibold text-ink uppercase mb-2">
              Tarih
            </p>
            <p className="text-lg font-bold">
              {market.dates.start} - {market.dates.end}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink uppercase mb-2">
              Konum
            </p>
            <p className="text-lg font-bold">{market.location}</p>
          </div>
          {market.nextEvent && (
            <div>
              <p className="text-sm font-semibold text-ink uppercase mb-2">
                Sonraki Etkinlik
              </p>
              <p className="text-lg font-bold">{market.nextEvent}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
