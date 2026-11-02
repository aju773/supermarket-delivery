import type { ReactNode } from "react";

import { ImportTabs } from "@/components/admin/import-tabs";
import { PageHeader } from "@/components/admin/page-header";

export default function AdminImportLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Import products" />
      <ImportTabs />
      {children}
    </>
  );
}
