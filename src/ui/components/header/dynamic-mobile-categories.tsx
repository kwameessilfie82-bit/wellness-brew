"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  productCount: number;
}

const categoryEmojis: Record<string, string> = {
  prescriptions: "💊",
  medicines: "💉",
  vitamins: "🧪",
  supplements: "💊",
  devices: "🩺",
  "mother & baby": "👶",
  toiletries: "🧴",
  health: "❤️",
  wellness: "🌡️",
  "personal care": "🛡️",
  "eye care": "👁️",
  "mental health": "🧠",
  fitness: "💪",
};

interface DynamicMobileCategoriesProps {
  onCategoryClick: () => void;
}

export function DynamicMobileCategories({ onCategoryClick }: DynamicMobileCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="border-t pt-3 mt-3">
        <div className="text-sm font-medium text-muted-foreground mb-2 px-3">
          Categories
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-2 rounded-md px-3 py-2">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  const visibleCategories = expanded ? categories : categories.slice(0, 12);

  return (
    <div className="border-t pt-3 mt-3">
      <div className="text-sm font-medium text-muted-foreground mb-2 px-3">
        Categories
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-[45vh] overflow-y-auto pr-1">
        {visibleCategories.map((category) => (
          <Link
            key={category.id}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 hover:text-primary"
            href={`/products?category=${category.slug}`}
            onClick={onCategoryClick}
          >
            <span className="text-lg">
              {categoryEmojis[category.slug] || "💊"}
            </span>
            {category.name}
          </Link>
        ))}
      </div>
      {categories.length > 12 && (
        <div className="mt-2 px-3">
          <button
            className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : `Show ${categories.length - 12} more`}
          </button>
        </div>
      )}
    </div>
  );
}
