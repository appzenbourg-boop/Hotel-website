import { redirect } from 'next/navigation'

export default function AuditRootPage() {
  redirect('/admin/audit/night-audit')
}
