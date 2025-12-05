# DataTable Component Usage Guide

The `DataTable` component is a fully reusable, feature-rich table component that can handle any data structure with customizable columns, headers, and actions.

## Features

✅ **Fully Customizable Columns** - Define columns with custom renderers  
✅ **Actions Column** - Add custom action buttons per row  
✅ **Row Selection** - Built-in checkbox selection with select all  
✅ **Loading State** - Skeleton loading with customizable row count  
✅ **Empty State** - Customizable empty message or component  
✅ **Hover & Striping** - Optional row hover effects and striped styling  
✅ **Custom Styling** - Per-column and per-row className support  
✅ **Test IDs** - Automatic test ID generation for all cells  
✅ **Responsive** - Works with any data type (TypeScript generics)

## Basic Usage

```tsx
import { DataTable, DataTableColumn } from '@/components/common/DataTable';

const columns: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name', cellClassName: 'font-medium' },
  { key: 'class', label: 'Class' },
];

<DataTable data={students} columns={columns} />
```

## Column Definitions

### Simple Column
```tsx
{
  key: 'studentName',  // Property name in data
  label: 'Student',    // Header text
}
```

### Column with Custom Rendering
```tsx
{
  key: 'amount',
  label: 'Amount',
  headerClassName: 'text-right',
  cellClassName: 'text-right font-mono',
  render: (value) => `₹${value.toLocaleString('en-IN')}`
}
```

### Column with Complex Rendering
```tsx
{
  key: 'status',
  label: 'Status',
  render: (value, row, rowIndex) => (
    <Badge variant={value === 'Paid' ? 'success' : 'destructive'}>
      {value}
    </Badge>
  )
}
```

### Column with Conditional Rendering
```tsx
{
  key: 'dueAmount',
  label: 'Due',
  headerClassName: 'text-right',
  cellClassName: 'text-right',
  render: (value) => (
    value > 0 ? (
      <span className="text-red-600 font-semibold">
        ₹{value.toLocaleString('en-IN')}
      </span>
    ) : (
      <span className="text-green-600">Paid</span>
    )
  )
}
```

## Actions Column

```tsx
<DataTable
  data={fees}
  columns={columns}
  actionsColumn={{
    label: 'Actions',
    headerClassName: 'text-right',
    cellClassName: 'text-right',
    render: (row) => (
      <div className="flex gap-2 justify-end">
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => handleEdit(row)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="destructive"
          onClick={() => handleDelete(row)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    )
  }}
/>
```

## Row Selection

```tsx
const [selectedRows, setSelectedRows] = useState(new Set());

<DataTable
  data={registrations}
  columns={columns}
  selectable
  selectedKeys={selectedRows}
  onSelectionChange={setSelectedRows}
/>

// Access selected rows
console.log('Selected:', Array.from(selectedRows));
```

## Loading State

```tsx
const [loading, setLoading] = useState(true);

<DataTable
  data={data}
  columns={columns}
  loading={loading}
  loadingRows={10}  // Number of skeleton rows
/>
```

## Empty State

### Simple Message
```tsx
<DataTable
  data={[]}
  columns={columns}
  emptyMessage="No students found"
/>
```

### Custom Empty State
```tsx
<DataTable
  data={[]}
  columns={columns}
  emptyState={
    <div className="flex flex-col items-center py-8">
      <Users className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">No data available</p>
      <Button onClick={handleAdd} className="mt-4">
        Add New Record
      </Button>
    </div>
  }
/>
```

## Custom Row Styling

```tsx
<DataTable
  data={fees}
  columns={columns}
  hoverable={true}
  striped={true}
  getRowClassName={(row, index) => {
    if (row.status === 'Overdue') return 'bg-red-50';
    if (row.status === 'Paid') return 'bg-green-50';
    return '';
  }}
/>
```

## Custom Row Keys

```tsx
<DataTable
  data={students}
  columns={columns}
  getRowKey={(row, index) => row.admissionNo || index}
/>
```

## Complete Example: Fee Structure Table

```tsx
import { useState } from 'react';
import { DataTable, DataTableColumn } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Check, X } from 'lucide-react';

type FeeStructure = {
  class: string;
  tuitionFee: number;
  transportFee: number;
  libraryFee: number;
  sportsFee: number;
};

export function FeeStructureTable() {
  const [data, setData] = useState<FeeStructure[]>([...]);
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [edits, setEdits] = useState({});

  const feeHeads = [
    { key: 'tuitionFee', label: 'Tuition Fee' },
    { key: 'transportFee', label: 'Transport Fee' },
    { key: 'libraryFee', label: 'Library Fee' },
    { key: 'sportsFee', label: 'Sports Fee' },
  ];

  const columns: DataTableColumn<FeeStructure>[] = [
    {
      key: 'class',
      label: 'Class',
      cellClassName: 'font-medium',
    },
    ...feeHeads.map(head => ({
      key: head.key,
      label: head.label,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (value: number, row: FeeStructure) => {
        const isEditing = editingClass === row.class;
        
        if (isEditing) {
          return (
            <Input
              type="number"
              value={edits[head.key] || value}
              onChange={(e) => handleEdit(head.key, e.target.value)}
              className="h-8 text-right"
            />
          );
        }
        
        return value > 0 
          ? `₹${value.toLocaleString('en-IN')}`
          : '-';
      },
    })),
    {
      key: 'total',
      label: 'Total',
      headerClassName: 'text-right font-semibold',
      cellClassName: 'text-right font-semibold',
      render: (_value, row) => {
        const total = feeHeads.reduce((sum, head) => 
          sum + (row[head.key] || 0), 0
        );
        return `₹${total.toLocaleString('en-IN')}`;
      },
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      getRowKey={(row) => row.class}
      actionsColumn={{
        label: 'Action',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (row) => {
          const isEditing = editingClass === row.class;
          
          return isEditing ? (
            <div className="flex gap-1 justify-center">
              <Button size="icon" variant="ghost" onClick={handleSave}>
                <Check className="w-4 h-4 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancel}>
                <X className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setEditingClass(row.class)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          );
        },
      }}
    />
  );
}
```

## Complete Example: Student List with Actions

```tsx
const columns: DataTableColumn[] = [
  {
    key: 'id',
    label: 'ID',
    cellClassName: 'font-mono text-sm',
  },
  {
    key: 'name',
    label: 'Student Name',
    cellClassName: 'font-medium',
  },
  {
    key: 'class',
    label: 'Class',
    render: (value) => (
      <Badge variant="outline">{value}</Badge>
    ),
  },
  {
    key: 'totalFees',
    label: 'Total Fees',
    headerClassName: 'text-right',
    cellClassName: 'text-right',
    render: (value) => `₹${value.toLocaleString('en-IN')}`,
  },
  {
    key: 'paidAmount',
    label: 'Paid',
    headerClassName: 'text-right',
    cellClassName: 'text-right text-green-600',
    render: (value) => `₹${value.toLocaleString('en-IN')}`,
  },
  {
    key: 'dueAmount',
    label: 'Due',
    headerClassName: 'text-right',
    cellClassName: 'text-right',
    render: (value) => (
      <span className={value > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
        ₹{value.toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (value) => {
      const variant = value === 'Paid' ? 'success' : 
                     value === 'Partial' ? 'warning' : 'destructive';
      return <Badge variant={variant}>{value}</Badge>;
    },
  },
];

<DataTable
  data={studentFees}
  columns={columns}
  testId="table-student-fees"
  hoverable
  actionsColumn={{
    label: 'Actions',
    headerClassName: 'text-right',
    cellClassName: 'text-right',
    render: (row) => (
      <div className="flex gap-2 justify-end">
        <Button size="sm" onClick={() => navigate(`/fees/collection?student=${row.id}`)}>
          Collect Fee
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleViewReceipt(row)}>
          View Receipt
        </Button>
      </div>
    ),
  }}
/>
```

## API Reference

### DataTableProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | Required | Array of data rows |
| `columns` | `DataTableColumn<T>[]` | Required | Column definitions |
| `getRowKey` | `(row: T, index: number) => string \| number` | Uses `id` or index | Custom row key extractor |
| `className` | `string` | `""` | Container className |
| `testId` | `string` | - | Test ID for table |
| `emptyMessage` | `string` | `"No data available"` | Message when empty |
| `emptyState` | `ReactNode` | - | Custom empty state component |
| `getRowClassName` | `(row: T, index: number) => string` | - | Conditional row styling |
| `hoverable` | `boolean` | `true` | Enable hover effect |
| `striped` | `boolean` | `false` | Striped rows |
| `selectable` | `boolean` | `false` | Enable row selection |
| `selectedKeys` | `Set<string \| number>` | `new Set()` | Selected row keys |
| `onSelectionChange` | `(keys: Set) => void` | - | Selection callback |
| `actionsColumn` | `ActionColumnConfig` | - | Actions column config |
| `loading` | `boolean` | `false` | Loading state |
| `loadingRows` | `number` | `5` | Skeleton row count |

### DataTableColumn

| Property | Type | Description |
|----------|------|-------------|
| `key` | `string` | Property key in data |
| `label` | `string` | Column header text |
| `headerClassName` | `string` | Header cell className |
| `cellClassName` | `string` | Data cell className |
| `render` | `(value, row, index) => ReactNode` | Custom render function |
| `width` | `string` | Column width |
| `sortable` | `boolean` | Enable sorting (future) |

## Migration Guide

### From old Table to DataTable

**Before:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Class</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(row => (
      <TableRow key={row.id}>
        <TableCell>{row.name}</TableCell>
        <TableCell>{row.class}</TableCell>
        <TableCell className="text-right">₹{row.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**After:**
```tsx
<DataTable
  data={data}
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'class', label: 'Class' },
    {
      key: 'amount',
      label: 'Amount',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (value) => `₹${value}`
    },
  ]}
/>
```

## Best Practices

1. **Use TypeScript Generics** for type safety:
   ```tsx
   const columns: DataTableColumn<StudentFee>[] = [...]
   ```

2. **Memoize Columns** if they don't change:
   ```tsx
   const columns = useMemo(() => [...], [dependencies]);
   ```

3. **Keep Render Functions Simple** - Extract complex logic to separate functions

4. **Use Test IDs** for reliable testing - they're auto-generated but can be customized

5. **Consistent Styling** - Use headerClassName and cellClassName for alignment
