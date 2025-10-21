"use client";

import { AlertCircle, Link as LinkIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Simplified uploads page without external dependencies
import { Alert, AlertDescription, AlertTitle } from "@/ui/primitives/alert";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Skeleton } from "@/ui/primitives/skeleton";

// Simple media item type
interface MediaItem {
  id: string;
  title: string;
  url: string;
  type: "image" | "video";
  createdAt: string;
}

export default function UploadsPageClient() {
  const [mediaGalleryItems, setMediaGalleryItems] = useState<MediaItem[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [isUploadingFromUrl, setIsUploadingFromUrl] = useState(false);

  const loadMediaGallery = useCallback(async () => {
    setIsMediaLoading(true);
    setError(null);
    try {
      // For now, just show a placeholder since we don't have the media API
      setMediaGalleryItems([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load media");
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMediaGallery();
  }, [loadMediaGallery]);

  const uploadMediaFromUrl = async () => {
    if (!mediaUrlInput) return;

    setIsUploadingFromUrl(true);
    setError(null);

    try {
      // For now, just show a placeholder message
      toast.success("URL upload feature coming soon!");
      setMediaUrlInput("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload from URL");
      setError(
        err instanceof Error ? err.message : "Failed to upload from URL",
      );
    } finally {
      setIsUploadingFromUrl(false);
    }
  };

  const deleteMediaItem = async (id: number | string) => {
    if (!confirm("Are you sure you want to delete this media?")) {
      return;
    }

    try {
      // For now, just remove from local state
      setMediaGalleryItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Media deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete media");
      setError(err instanceof Error ? err.message : "Failed to delete media");
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button disabled>
            Upload Images (Coming Soon)
          </Button>
          <Button disabled>
            Upload Videos (Coming Soon)
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon
              className={`
                absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 transform
                text-muted-foreground
              `}
            />
            <Input
              className="pl-8"
              onChange={(e) => setMediaUrlInput(e.target.value)}
              placeholder="Enter media URL (image or video)..."
              type="url"
              value={mediaUrlInput}
            />
          </div>
          <Button
            disabled={!mediaUrlInput || isUploadingFromUrl}
            onClick={uploadMediaFromUrl}
          >
            {isUploadingFromUrl ? "Uploading..." : "Upload URL"}
          </Button>
        </div>
      </div>
      <div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {isMediaLoading ? (
          <div
            className={`
              grid grid-cols-1 gap-4
              sm:grid-cols-2
              md:grid-cols-3
              lg:grid-cols-4
            `}
          >
            {[...Array(4)].map((_, i) => (
              <Skeleton
                className="aspect-square w-full rounded-md"
                key={`skeleton-${i}`}
              />
            ))}
          </div>
        ) : mediaGalleryItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {mediaGalleryItems.map((item) => (
              <div key={item.id} className="relative group">
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground">{item.type}</span>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteMediaItem(item.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        ) : (
          !error && (
            <p className="text-muted-foreground">No media uploaded yet.</p>
          )
        )}
      </div>
    </div>
  );
}
