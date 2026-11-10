import "@/css/globals.css";
import { CartProvider } from "@/lib/cart-context";
import { getPublicSettings } from "@/lib/settings/get";
import { SiteSettingsProvider } from "@/lib/settings/site-settings-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { NavigationProgress } from "@/ui/components/navigation-progress";
import { OAuthLocalhostRecovery } from "@/ui/components/oauth-localhost-recovery";
import { ThemeProvider } from "@/ui/components/theme-provider";
import { Toaster } from "@/ui/primitives/sonner";
import { Analytics } from "@vercel/analytics/next";
import { JsonLd, organizationLd, websiteLd } from "@/lib/seo/json-ld";
import { IS_INDEXABLE, SITE_URL } from "@/lib/seo/site";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import type React from "react";
import { Suspense } from "react";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0f1a14" },
	],
};

export async function generateMetadata(): Promise<Metadata> {
	const { brand, compliance } = await getPublicSettings();
	const defaultTitle = brand.tagline ? `${brand.name} - ${brand.tagline}` : brand.name;
	const commonNames = compliance.commonNames
		.split(",")
		.map((n) => n.trim())
		.filter(Boolean);
	const verification: Metadata["verification"] = {
		...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
		...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
	};
	return {
		metadataBase: new URL(SITE_URL),
		title: { default: defaultTitle, template: `%s | ${brand.name}` },
		description: brand.description,
		applicationName: brand.name,
		keywords: [
			"hibiscus tea Ghana",
			"sobolo",
			"bissap",
			"herbal tea Accra",
			"wellness tea",
			...commonNames,
			...(compliance.botanicalName ? [compliance.botanicalName] : []),
		],
		openGraph: {
			type: "website",
			siteName: brand.name,
			locale: "en_GH",
			title: defaultTitle,
			description: brand.description,
		},
		twitter: { card: "summary_large_image", title: defaultTitle, description: brand.description },
		robots: IS_INDEXABLE
			? {
					index: true,
					follow: true,
					googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
				}
			: { index: false, follow: false },
		formatDetection: { telephone: false, email: false, address: false },
		category: "food",
		...(Object.keys(verification).length ? { verification } : {}),
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
				<JsonLd data={[organizationLd(settings), websiteLd(settings.brand.name)]} />
				<SiteSettingsProvider value={settings}>
					<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
						<CartProvider>
							<WishlistProvider>
								<Suspense fallback={null}>
									<NavigationProgress />
								</Suspense>
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
