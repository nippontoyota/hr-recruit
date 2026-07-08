import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  className?: string;
}

export function DataTable<T>({ columns, data, keyExtractor, className }: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-auto border border-gray-200 rounded-lg bg-white', className)}>
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={cn('px-6 py-3', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                No data available
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr
                key={keyExtractor(item)}
                className={cn('bg-white hover:bg-gray-50', rowIndex !== data.length - 1 && 'border-b border-gray-100')}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={cn('px-6 py-4 whitespace-nowrap', col.className)}>
                    {col.cell ? col.cell(item) : (col.accessorKey ? String(item[col.accessorKey]) : null)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
