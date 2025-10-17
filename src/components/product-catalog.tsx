"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import Image from "next/image"
import { AddProductDialog } from "./add-product-dialog"
import type { Product } from "../lib/types"

interface ProductCatalogProps {
  products: Product[]
  selectedItems: Map<string, { quantity: number; priceType: 'customer' | 'retail' | 'wholesale' }>
  onAddItem: (product: Product, priceType: 'customer' | 'retail' | 'wholesale') => void
  onRemoveItem: (productId: string) => void
  onPriceTypeChange: (productId: string, priceType: 'customer' | 'retail' | 'wholesale') => void
  onAddProduct: (product: Product) => void
}

export function ProductCatalog({ 
  products, 
  selectedItems, 
  onAddItem, 
  onRemoveItem, 
  onPriceTypeChange,
  onAddProduct 
}: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPriceType, setFilterPriceType] = useState<'all' | 'customer' | 'retail' | 'wholesale'>('all')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  // Filter products based on search term and price type
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterPriceType === 'all') {
      return matchesSearch
    }
    
    // Filter by price type (show products where the selected price type is available)
    const hasPriceType = filterPriceType === 'customer' ? product.customerPrice > 0 :
                        filterPriceType === 'retail' ? product.retailPrice > 0 :
                        product.wholesalePrice > 0
    
    return matchesSearch && hasPriceType
  })

  const clearSearch = () => {
    setSearchTerm("")
    setFilterPriceType('all')
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Price Type Filter */}
          <Select value={filterPriceType} onValueChange={(value: 'all' | 'customer' | 'retail' | 'wholesale') => setFilterPriceType(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by price type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Price Types</SelectItem>
              <SelectItem value="customer">Customer Pricing</SelectItem>
              <SelectItem value="retail">Retail Pricing</SelectItem>
              <SelectItem value="wholesale">Wholesale Pricing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredProducts.length} of {products.length} products
            {searchTerm && ` matching "${searchTerm}"`}
            {filterPriceType !== 'all' && ` with ${filterPriceType} pricing`}
          </span>
          {(searchTerm || filterPriceType !== 'all') && (
            <Button variant="ghost" size="sm" onClick={clearSearch}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => {
          const itemData = selectedItems.get(product.id)
          const quantity = itemData?.quantity || 0
          const priceType = itemData?.priceType || 'retail'
          
          const currentPrice = priceType === 'customer' ? product.customerPrice :
                              priceType === 'retail' ? product.retailPrice :
                              product.wholesalePrice

          const hasValidImage = product.image && 
                               product.image !== "/placeholder.svg" && 
                               !imageErrors.has(product.id)

          return (
            <Card key={product.id} className="overflow-hidden">
              <div className="relative aspect-square bg-gradient-to-br from-primary/10 to-primary/5">
                {hasValidImage ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    onError={() => {
                      setImageErrors(prev => new Set(prev).add(product.id))
                    }}
                  />
                ) : (
                  /* Placeholder content - only show when no valid image */
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl font-bold text-primary">T</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Tea Product</p>
                    <p className="text-xs text-muted-foreground mt-1">Image coming soon</p>
                  </div>
                )}
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                </div>

                {/* Pricing Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pricing:</span>
                    <Select 
                      value={priceType} 
                      onValueChange={(value: 'customer' | 'retail' | 'wholesale') => 
                        onPriceTypeChange(product.id, value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Price:</span>
                    <span className="font-semibold">GHS {currentPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemoveItem(product.id)}
                      disabled={quantity === 0}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAddItem(product, priceType)}
                    >
                      +
                    </Button>
                  </div>
                  
                  {quantity > 0 && (
                    <Badge variant="secondary">
                      GHS {(currentPrice * quantity).toFixed(2)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* No Results Message */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No products found matching your search criteria.</p>
          <Button variant="outline" onClick={clearSearch} className="mt-2">
            Clear filters
          </Button>
        </div>
      )}

      <AddProductDialog onAddProduct={onAddProduct} />
    </div>
  )
}
