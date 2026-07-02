import "@/css/globals.css";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { OAuthLocalhostRecovery } from "@/ui/components/oauth-localhost-recovery";
import { ThemeProvider } from "@/ui/components/theme-provider";
import { Toaster } from "@/ui/primitives/sonner";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import type React from "react";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
	title: "Wellness Brew - Premium Tea & Wellness",
	description:
		"Discover premium teas, wellness blends, and teaware. Your journey to a healthier lifestyle starts with the perfect cup.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geist.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased`}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					<CartProvider>
						<WishlistProvider>
							<OAuthLocalhostRecovery />
							{children}
							<Toaster richColors closeButton position="top-center" />
							<Analytics />
						</WishlistProvider>
					</CartProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
