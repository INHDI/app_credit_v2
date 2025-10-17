import type { ReactNode } from "react"
import Breadcrumb from "@/components/ui/Breadcrumb"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="space-y-3 md:space-y-4">
      {breadcrumbs && <Breadcrumb items={breadcrumbs} />}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 truncate">{title}</h1>
          {description && (
            <p className="text-slate-600 mt-1 truncate text-sm md:text-base">{description}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 md:gap-4">{actions}</div>}
      </div>
    </div>
  )
}

// Default export for backward compatibility
export default function PageHeaderDefault(props: PageHeaderProps) {
  return <PageHeader {...props} />
}
