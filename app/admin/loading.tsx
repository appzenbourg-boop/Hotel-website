'use client'

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-32 bg-surface/40 rounded-2xl animate-pulse border border-border" />
        ))}
      </div>
      
      {/* Main Grid Skeletons */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr,1.1fr] gap-6">
        <div className="space-y-6">
          <div className="h-[400px] bg-surface/40 rounded-xl animate-pulse border border-border" />
          <div className="h-[300px] bg-surface/40 rounded-xl animate-pulse border border-border" />
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-surface/40 rounded-xl animate-pulse border border-border" />
          <div className="h-64 bg-surface/40 rounded-xl animate-pulse border border-border" />
        </div>
      </div>
    </div>
  )
}
