import { StaffList, type Member } from "@/components/admin/staff-list";
import { adminGet } from "@/lib/admin-session";

export default async function AdminStaffPage() {
  return <StaffList members={await adminGet<Member[]>("/staff")} />;
}
