"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import type { Product } from "../lib/types"

interface AddProductDialogProps {
  onAddProduct: (product: Product) => void
}

export function AddProductDialog({ onAddProduct }: AddProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    customerPrice: "",
    retailPrice: "",
    wholesalePrice: "",
    distributorPrice: "",
    image: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.customerPrice || !formData.retailPrice || !formData.wholesalePrice || !formData.distributorPrice) {
      return
    }

    const newProduct: Product = {
      id: `custom-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      customerPrice: Number.parseFloat(formData.customerPrice),
      retailPrice: Number.parseFloat(formData.retailPrice),
      wholesalePrice: Number.parseFloat(formData.wholesalePrice),
      distributorPrice: Number.parseFloat(formData.distributorPrice),
      image: formData.image || "/diverse-products-still-life.png",
    }

    onAddProduct(newProduct)
    setFormData({ 
      name: "", 
      description: "", 
      customerPrice: "", 
      retailPrice: "", 
      wholesalePrice: "", 
      distributorPrice: "",
      image: "" 
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hibiscus Ginger"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the product"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerPrice">Customer Price (GHS) *</Label>
              <Input
                id="customerPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.customerPrice}
                onChange={(e) => setFormData({ ...formData, customerPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retailPrice">Retail Price (GHS) *</Label>
              <Input
                id="retailPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.retailPrice}
                onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wholesalePrice">Wholesale Price (GHS) *</Label>
              <Input
                id="wholesalePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.wholesalePrice}
                onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distributorPrice">Distributor Price (GHS) *</Label>
              <Input
                id="distributorPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.distributorPrice}
                onChange={(e) => setFormData({ ...formData, distributorPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL (optional)</Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-muted-foreground">Leave empty to use a placeholder image</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Product</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
