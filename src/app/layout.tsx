import "@/css/globals.css";
import { CartProvider } from "@/lib/cart-context";
import { getPublicSettings } from "@/lib/settings/get";
import { SiteSettingsProvider } from "@/lib/settings/site-settings-context";
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

export async function generateMetadata(): Promise<Metadata> {
	const { brand } = await getPublicSettings();
	return {
		title: { default: brand.tagline ? `${brand.name} - ${brand.tagline}` : brand.name, template: `%s | ${brand.name}` },
		description: brand.description,
		...(brand.faviconUrl ? { icons: { icon: brand.faviconUrl } } : {}),
	};
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const settings = await getPublicSettings();
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geist.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased`}>
				<SiteSettingsProvider value={settings}>
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
				</SiteSettingsProvider>
			</body>
		</html>
	);
}
