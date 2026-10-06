import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types';

interface BlogCardProps {
  post: BlogPost;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  return (
    <div className="group cursor-pointer">
      <Link href={`/blog/${post.slug}`}>
        <div className="overflow-hidden mb-4 h-64 relative">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink uppercase">
              {post.category}
            </span>
            <span className="text-xs text-ink">{post.date}</span>
          </div>
          <h3 className="text-xl font-bold group-hover:underline transition-colors">
            {post.title}
          </h3>
          <p className="text-ink text-sm line-clamp-2">
            {post.excerpt}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-linen text-ink px-2 py-1"
              >
                #{tag}
              </span>
            ))}
          </div>
          <p className="text-sm font-semibold text-ink pt-2">
            Yazıyı Oku →
          </p>
        </div>
      </Link>
    </div>
  );
};
