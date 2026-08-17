import { redirect } from 'next/navigation'

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-transparent min-h-screen">
      {children}
    </div>
  )
}
