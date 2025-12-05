import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DataTableProps } from "./DataTable";
import { LucideIcon } from "lucide-react";

export interface TableCardProps<T = any> {
  title?: string | ReactNode;
  description?: string;
  icon?: LucideIcon;
  headerActions?: ReactNode;
  table: Omit<DataTableProps<T>, 'className'>;
  footerContent?: ReactNode;
  className?: string;
  cardClassName?: string;
  contentClassName?: string;
}

export function TableCard<T = any>({
  title,
  description,
  icon: Icon,
  headerActions,
  table,
  footerContent,
  className = "",
  cardClassName = "",
  contentClassName = "",
}: TableCardProps<T>) {
  return (
    <Card className={cardClassName}>
      {(title || description || headerActions) && (
        <CardHeader>
          {title && (
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {Icon && <Icon className="w-5 h-5" />}
                {title}
              </CardTitle>
              {headerActions && <div>{headerActions}</div>}
            </div>
          )}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>
        <DataTable {...table} className={className} />
        {footerContent && <div className="mt-6">{footerContent}</div>}
      </CardContent>
    </Card>
  );
}
