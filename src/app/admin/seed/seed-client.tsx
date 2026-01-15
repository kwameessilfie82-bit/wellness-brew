"use client"

import { useState } from "react"
import { Button } from "@/ui/primitives/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card"
import { Loader2, Database, CheckCircle, XCircle, FolderTree, RefreshCw } from "lucide-react"

export function SeedPageClient() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [isSeedingCategories, setIsSeedingCategories] = useState(false)
  const [isUpdatingCategories, setIsUpdatingCategories] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; inserted?: number; updated?: number } | null>(null)

  const handleSeedCategories = async () => {
    if (!confirm('This will seed the tea categories: Tin (25), Tin (20), Paper Tubes, Paper Packs, Gift Boxes. Continue?')) return;
    
    try {
      setIsSeedingCategories(true)
      setResult(null)
      
      const response = await fetch('/api/admin/categories/seed', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Successfully seeded ${data.inserted} categories!`,
          inserted: data.inserted
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to seed categories'
        })
      }
    } catch (error) {
      console.error('Error seeding categories:', error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to seed categories'
      })
    } finally {
      setIsSeedingCategories(false)
    }
  }

  const handleUpdateProductCategories = async () => {
    if (!confirm('This will update all product categories based on their names. Continue?')) return;
    
    try {
      setIsUpdatingCategories(true)
      setResult(null)
      
      const response = await fetch('/api/admin/products/update-categories', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Successfully updated ${data.updated} products! ${data.skipped} were already in the correct category.`,
          updated: data.updated
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to update product categories'
        })
      }
    } catch (error) {
      console.error('Error updating product categories:', error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update product categories'
      })
    } finally {
      setIsUpdatingCategories(false)
    }
  }

  const handleSeed = async () => {
    if (!confirm('This will seed the inventory with all 41 products from the invoice generator. Continue?')) return;
    
    try {
      setIsSeeding(true)
      setResult(null)
      
      const response = await fetch('/api/admin/inventory/seed', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Successfully seeded ${data.inserted} products with random stock values!`,
          inserted: data.inserted
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to seed inventory'
        })
      }
    } catch (error) {
      console.error('Error seeding inventory:', error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to seed inventory'
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Seed Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Seed Categories
          </CardTitle>
          <CardDescription>
            Create the tea product categories: Tin (25), Tin (20), Paper Tubes, Paper Packs, Gift Boxes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSeedCategories}
            disabled={isSeedingCategories}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {isSeedingCategories ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Categories...
              </>
            ) : (
              <>
                <FolderTree className="mr-2 h-4 w-4" />
                Seed Categories
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Update Product Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Update Product Categories
          </CardTitle>
          <CardDescription>
            Update existing products to match the correct category based on their names
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Categories are determined by product name:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
              <li>Contains &quot;Gift Box&quot; → Gift Boxes</li>
              <li>Contains &quot;Paper Tube&quot; → Paper Tubes</li>
              <li>Contains &quot;Tin (25)&quot; → Tin (25)</li>
              <li>Contains &quot;Tin (20)&quot; → Tin (20)</li>
              <li>Otherwise → Paper Packs</li>
            </ul>
          </div>
          <Button
            onClick={handleUpdateProductCategories}
            disabled={isUpdatingCategories}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {isUpdatingCategories ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Categories...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Product Categories
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Seed Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Seed Inventory
          </CardTitle>
          <CardDescription>
            Seed the database with all products from the invoice generator and assign random stock values
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
              <li>Create all 41 products from the invoice generator</li>
              <li>Assign random stock values (20-220 units) to each product</li>
              <li>Set the first 4 products as featured</li>
              <li>Assign correct categories based on product names</li>
            </ul>
          </div>

          <Button
            onClick={handleSeed}
            disabled={isSeeding}
            className="w-full"
            size="lg"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Inventory...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Seed Inventory
              </>
            )}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success 
                      ? 'text-green-900 dark:text-green-100' 
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {result.message}
                  </p>
                  {result.success && (result.inserted !== undefined || result.updated !== undefined) && (
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {result.inserted !== undefined && "You can now view all products in the shop section and they will appear on the homepage as featured products."}
                      {result.updated !== undefined && "Product categories have been updated based on their names."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Note: Products that already exist (by name) will be skipped to avoid duplicates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
