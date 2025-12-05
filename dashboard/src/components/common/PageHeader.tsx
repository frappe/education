import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  /**
   * The main title of the page
   */
  title: string;
  
  /**
   * Optional subtitle/description
   */
  description?: string;
  
  /**
   * Optional icon to display before the title
   */
  icon?: LucideIcon;
  
  /**
   * Optional action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
    testId?: string;
  };
  
  /**
   * Custom actions (for multiple buttons or complex actions)
   */
  customActions?: ReactNode;
  
  /**
   * Custom class name for the container
   */
  className?: string;
}

/**
 * Reusable PageHeader component for consistent page titles across the application
 * 
 * @example
 * // Simple usage with title and description
 * <PageHeader 
 *   title="Fee Schemes" 
 *   description="Manage all fee schemes and their configurations"
 * />
 * 
 * @example
 * // With icon and action button
 * <PageHeader 
 *   title="Class Master"
 *   description="Manage class levels, streams, and intake capacity"
 *   icon={BookOpen}
 *   action={{
 *     label: "Add Class",
 *     onClick: handleAdd,
 *     icon: Plus,
 *     testId: "button-add-class"
 *   }}
 * />
 * 
 * @example
 * // With custom actions
 * <PageHeader 
 *   title="Students"
 *   description="View and manage student records"
 *   customActions={
 *     <div className="flex gap-2">
 *       <Button onClick={handleExport}>Export</Button>
 *       <Button onClick={handleImport}>Import</Button>
 *     </div>
 *   }
 * />
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  customActions,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <h1 
          className="text-3xl font-bold flex items-center gap-2" 
          data-testid="text-page-title"
        >
          {Icon && <Icon className="w-6 h-6" />}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      
      {(action || customActions) && (
        <div>
          {customActions || (action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              data-testid={action.testId || "button-page-action"}
            >
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
