import { ContentPage, contentPageMetadata } from "@/ui/components/content-page";

export const revalidate = 3600;
export const generateMetadata = () => contentPageMetadata("terms", "/terms");

export default function TermsPage() {
  return <ContentPage pageKey="terms" />;
}
