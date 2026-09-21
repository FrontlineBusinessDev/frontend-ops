import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useTenant } from '@/hooks/useTenant'
import { formatBaseRateShort } from '@/lib/payroll/payRate'
import type { Employee } from '@/types/domain'

export function EmployeeTable({ employees }: { employees: Employee[] }) {
  const navigate = useNavigate()
  const { branches } = useTenant()

  const columns: ColumnDef<Employee, unknown>[] = [
    {
      id: 'name',
      header: 'Employee',
      cell: ({ row }) => {
        const e = row.original
        const fullName = `${e.personal.firstName} ${e.personal.lastName}`
        return (
          <div className="flex items-center gap-3">
            <Avatar name={fullName} size="sm" />
            <div>
              <p className="text-sm font-medium leading-tight">{fullName}</p>
              <p className="text-xs leading-tight text-muted-foreground">{e.employeeNumber}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'department',
      header: 'Department',
      accessorFn: (e) => e.employment.department,
    },
    {
      id: 'position',
      header: 'Position',
      accessorFn: (e) => e.employment.position,
    },
    {
      id: 'branch',
      header: 'Branch',
      cell: ({ row }) => branches.find((b) => b.id === row.original.branchId)?.name ?? '—',
    },
    {
      id: 'baseRate',
      header: 'Base Rate',
      cell: ({ row }) => {
        const { basicPay, payType, outputUnit } = row.original.compensation
        return <span className="tabular-nums">{formatBaseRateShort(payType, basicPay, outputUnit)}</span>
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.employment.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: () => <ChevronRight className="size-4 text-muted-foreground" />,
    },
  ]

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (employees.length === 0) {
    return <EmptyState title="No employees match these filters" description="Try clearing a filter or add a new employee." />
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer"
            onClick={() => navigate(`/employees/${row.original.id}`)}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
