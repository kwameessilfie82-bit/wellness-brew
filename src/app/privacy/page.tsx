import { ContentPage, contentPageMetadata } from "@/ui/components/content-page";

export const revalidate = 3600;
export const generateMetadata = () => contentPageMetadata("privacy", "/privacy");

export default function PrivacyPage() {
  return <ContentPage pageKey="privacy" />;
}
