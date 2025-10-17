import { Button } from "@/components/ui/button";
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <div key={`breadcrumb-${index}`} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
          {item.href || item.onClick ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-slate-600 hover:text-slate-800"
              onClick={item.onClick}
            >
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {item.label}
            </Button>
          ) : (
            <span className={`${item.isActive ? 'text-green-600 font-medium' : 'text-slate-600'}`}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
