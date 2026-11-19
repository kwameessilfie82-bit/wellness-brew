import { ContentPage, contentPageMetadata } from "@/ui/components/content-page";

export const revalidate = 3600;
export const generateMetadata = () => contentPageMetadata("returns", "/returns");

export default function ReturnsPage() {
  return <ContentPage pageKey="returns" />;
}
