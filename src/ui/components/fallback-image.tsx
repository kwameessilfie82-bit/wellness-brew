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
  priority?: boolean;
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
  priority,
  unoptimized,
}: FallbackImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isValidSrc = (() => {
    if (!src) return false;
    try {
      if (src.startsWith("http") || src.startsWith("https")) {
        new URL(src);
        return true;
      }
      if (src.startsWith("data:") || src.startsWith("blob:")) {
        return true;
      }
      if (src.startsWith("/") || src.startsWith("./") || src.startsWith("../")) {
        return true;
      }
      return false;
    } catch {
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
          className,
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
    <div
      className={cn(
        "relative overflow-hidden",
        fill ? "absolute inset-0 h-full w-full" : "inline-block",
        className,
      )}
      style={!fill ? { width, height } : undefined}
    >
      {imageLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}
      <Image
        alt={alt}
        className={cn(
          "object-cover transition-opacity duration-300",
          imageLoading ? "opacity-0" : "opacity-100",
        )}
        fill={fill}
        height={height}
        loading={priority ? undefined : loading}
        priority={priority}
        onError={handleError}
        onLoad={handleLoad}
        sizes={sizes}
        src={src}
        width={width}
        unoptimized={Boolean(
          unoptimized ||
            (src &&
              (src.startsWith("data:") ||
                src.startsWith("blob:") ||
                // Private-blob images are served pre-sized + CDN-cached via the
                // /api/media proxy; Next's optimizer 400s on the query-string
                // URL, so skip it and load the proxy image directly.
                src.startsWith("/api/"))),
        )}
      />
    </div>
  );
}
