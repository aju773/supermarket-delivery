import { DeliveryAreas, type DeliveryArea } from "@/components/admin/delivery-areas";
import { ShopSettingsForm, type ShopSettings } from "@/components/admin/shop-settings-form";
import { adminGet } from "@/lib/admin-session";

export default async function AdminSettingsPage() {
  const [settings, areas] = await Promise.all([
    adminGet<ShopSettings>("/settings"),
    adminGet<DeliveryArea[]>("/delivery-areas"),
  ]);
  return (
    <div className="flex max-w-settings flex-col gap-6">
      <ShopSettingsForm settings={settings} />
      <DeliveryAreas areas={areas} />
    </div>
  );
}
