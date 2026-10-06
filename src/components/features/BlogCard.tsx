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
        <div className="overflow-hidden rounded-lg mb-4 h-64 relative">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary uppercase">
              {post.category}
            </span>
            <span className="text-xs text-neutral-500">{post.date}</span>
          </div>
          <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-neutral-600 text-sm line-clamp-2">
            {post.excerpt}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
          <p className="text-sm font-semibold text-primary pt-2">
            Yazıyı Oku →
          </p>
        </div>
      </Link>
    </div>
  );
};
