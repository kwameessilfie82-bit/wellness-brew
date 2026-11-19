import { ContentPage, contentPageMetadata } from "@/ui/components/content-page";

export const revalidate = 3600;
export const generateMetadata = () => contentPageMetadata("delivery", "/delivery");

export default function DeliveryPage() {
  return <ContentPage pageKey="delivery" />;
}
