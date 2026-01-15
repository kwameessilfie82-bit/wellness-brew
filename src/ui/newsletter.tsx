"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Mail } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Newsletter signup:", email)
    setEmail("")
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8 bg-primary/5 rounded-3xl p-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Join Our Tea Club</h2>
            <p className="text-lg text-muted-foreground text-pretty">
              Subscribe to receive exclusive offers, tea tips, and wellness insights. Get 10% off your first order!
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" size="lg">
              Subscribe
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            By subscribing, you agree to our Privacy Policy and consent to receive updates.
          </p>
        </div>
      </div>
    </section>
  )
}
