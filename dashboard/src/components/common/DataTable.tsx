import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DataTableColumn<T = any> {
  key: string;
  label: string;
  headerClassName?: string;
  cellClassName?: string;
  render?: (value: any, row: T, rowIndex: number) => ReactNode;
  width?: string;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey?: (row: T, index: number) => string | number;
  className?: string;
  testId?: string;
  emptyMessage?: string;
  emptyState?: ReactNode;
  getRowClassName?: (row: T, index: number) => string;
  hoverable?: boolean;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (selectedKeys: Set<string | number>) => void;
  actionsColumn?: {
    label?: string;
    headerClassName?: string;
    cellClassName?: string;
    render: (row: T, rowIndex: number) => ReactNode;
  };
  loading?: boolean;
  loadingRows?: number;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
    showInfo?: boolean;
  };
}
export function DataTable<T = any>({
  data,
  columns,
  getRowKey,
  className = "",
  testId,
  emptyMessage = "No data available",
  emptyState,
  getRowClassName,
  hoverable = true,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  actionsColumn,
  loading = false,
  loadingRows = 5,
  pagination,
}: DataTableProps<T>) {
  
  const extractRowKey = (row: T, index: number): string | number => {
    if (getRowKey) return getRowKey(row, index);
    return (row as any).id ?? index;
  };
  
  const handleRowSelect = (rowKey: string | number, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedKeys);
    checked ? newSelected.add(rowKey) : newSelected.delete(rowKey);
    onSelectionChange(newSelected);
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? new Set(data.map((row, index) => extractRowKey(row, index))) : new Set());
  };
  
  const allSelected = selectable && data.length > 0 && selectedKeys.size === data.length;
  const someSelected = selectable && selectedKeys.size > 0 && selectedKeys.size < data.length;

  const totalPages = pagination ? Math.ceil(pagination.totalItems / pagination.pageSize) : 0;
  const startItem = pagination ? (pagination.currentPage - 1) * pagination.pageSize + 1 : 0;
  const endItem = pagination ? Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems) : 0;
  
  if (loading) {
    return (
      <div className={className}>
        <Table data-testid={testId}>
          <TableHeader>
            <TableRow>
              {selectable && <TableHead className="w-12" />}
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={column.headerClassName}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </TableHead>
              ))}
              {actionsColumn && (
                <TableHead className={actionsColumn.headerClassName}>
                  {actionsColumn.label || 'Actions'}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRows }).map((_, index) => (
              <TableRow key={index}>
                {selectable && (
                  <TableCell>
                    <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
                {actionsColumn && (
                  <TableCell>
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className={className}>
        <Table data-testid={testId}>
          <TableHeader>
            <TableRow>
              {selectable && <TableHead className="w-12" />}
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={column.headerClassName}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </TableHead>
              ))}
              {actionsColumn && (
                <TableHead className={actionsColumn.headerClassName}>
                  {actionsColumn.label || 'Actions'}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell 
                colSpan={columns.length + (selectable ? 1 : 0) + (actionsColumn ? 1 : 0)} 
                className="text-center text-muted-foreground py-8"
              >
                {emptyState || emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }
  
  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <Table data-testid={testId}>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="cursor-pointer"
                    aria-label="Select all rows"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={column.headerClassName}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </TableHead>
              ))}
              {actionsColumn && (
                <TableHead className={actionsColumn.headerClassName}>
                  {actionsColumn.label || 'Actions'}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => {
              const rowKey = extractRowKey(row, rowIndex);
              const isSelected = selectedKeys.has(rowKey);
              const customRowClassName = getRowClassName ? getRowClassName(row, rowIndex) : "";
              const rowClassName = [
                hoverable && "hover:bg-muted/50",
                isSelected && "bg-primary/10",
                customRowClassName,
              ].filter(Boolean).join(" ");
              
              return (
                <TableRow 
                  key={rowKey} 
                  className={rowClassName}
                  data-testid={`row-${rowKey}`}
                >
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleRowSelect(rowKey, e.target.checked)}
                        className="cursor-pointer"
                        aria-label={`Select row ${rowKey}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const value = (row as any)[column.key];
                    const content = column.render 
                      ? column.render(value, row, rowIndex)
                      : value;
                    
                    return (
                      <TableCell 
                        key={column.key} 
                        className={column.cellClassName}
                        data-testid={`cell-${column.key}-${rowKey}`}
                      >
                        {content}
                      </TableCell>
                    );
                  })}
                  {actionsColumn && (
                    <TableCell 
                      className={actionsColumn.cellClassName}
                      data-testid={`actions-${rowKey}`}
                    >
                      {actionsColumn.render(row, rowIndex)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-4">
            {pagination.showInfo !== false && (
              <div className="text-sm text-muted-foreground">
                Showing {startItem} to {endItem} of {pagination.totalItems}
                {selectable && selectedKeys.size > 0 && ` • ${selectedKeys.size} selected`}
              </div>
            )}
            {pagination.onPageSizeChange && pagination.pageSizeOptions && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={(value) => pagination.onPageSizeChange?.(Number(value))}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pagination.pageSizeOptions.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage === 1}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => pagination.onPageChange(page)}
                  className="w-8 h-8 p-0"
                  data-testid={`button-page-${page}`}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(Math.min(totalPages, pagination.currentPage + 1))}
              disabled={pagination.currentPage === totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
