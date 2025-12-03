import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4" data-testid="breadcrumb">
      <Link 
        href="/dashboard" 
        className="flex items-center hover:text-foreground transition-colors" 
        data-testid="breadcrumb-home" 
        aria-label="Dashboard"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center space-x-1">
            <ChevronRight className="h-4 w-4" />
            {isLast || !item.href ? (
              <span className="font-medium text-muted-foreground" data-testid={`breadcrumb-current`}>
                {item.label}
              </span>
            ) : (
              <Link 
                href={item.href} 
                className="hover:text-foreground transition-colors" 
                data-testid={`breadcrumb-link-${index}`}
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
