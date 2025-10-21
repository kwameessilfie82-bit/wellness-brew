"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/cn";

interface FallbackImageProps {
  alt: string;
  className?: string;
  fill?: boolean;
  loading?: "lazy" | "eager";
  sizes?: string;
  src?: string | null;
  width?: number;
  height?: number;
  unoptimized?: boolean;
}

export function FallbackImage({
  alt,
  className,
  fill,
  loading = "lazy",
  sizes,
  src,
  width,
  height,
}: FallbackImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Validate src URL to prevent URL construction errors
  const isValidSrc = (() => {
    if (!src) return false;
    try {
      // Check if it's a valid URL or a valid relative path
      if (src.startsWith('http') || src.startsWith('https')) {
        new URL(src);
        return true;
      } else if (src.startsWith('data:') || src.startsWith('blob:')) {
        // Allow Data URLs and Blob URLs for local previews/uploads
        return true;
      } else if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Invalid image src URL:', src, error);
      return false;
    }
  })();

  const handleError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleLoad = () => {
    setImageLoading(false);
  };

  if (!src || !isValidSrc || imageError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/50",
          fill ? "absolute inset-0" : "",
          className
        )}
        style={!fill ? { width, height } : undefined}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Package className="h-8 w-8" />
          <span className="text-xs font-medium">{alt}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {imageLoading && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-muted/30",
            fill ? "absolute inset-0" : "",
            className
          )}
          style={!fill ? { width, height } : undefined}
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      <Image
        alt={alt}
        className={cn(
          "object-cover transition-opacity duration-300",
          imageLoading ? "opacity-0" : "opacity-100",
          className
        )}
        fill={fill}
        height={height}
        loading={loading}
        onError={handleError}
        onLoad={handleLoad}
        sizes={sizes}
        src={src}
        width={width}
        // Data/blob URLs must be unoptimized for Next/Image
        unoptimized={Boolean((src && (src.startsWith('data:') || src.startsWith('blob:'))))}
      />
    </>
  );
}




