"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Button } from "@/ui/primitives/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/primitives/table";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";

interface Column<TItem extends { [key: string]: unknown }> {
  key: keyof TItem & string;
  label: string;
  render?: (value: TItem[keyof TItem], item: TItem) => ReactNode;
  mobileRender?: (item: TItem) => ReactNode;
  sortable?: boolean;
}

interface ResponsiveTableProps<TItem extends { [key: string]: unknown }> {
  data: TItem[];
  columns: Column<TItem>[];
  onEdit?: (item: TItem) => void;
  onDelete?: (item: TItem) => void;
  onView?: (item: TItem) => void;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable<TItem extends { [key: string]: unknown }>({
  data,
  columns,
  onEdit,
  onDelete,
  onView,
  emptyMessage = "No data available",
  className = "",
}: ResponsiveTableProps<TItem>) {
  const renderCellValue = (raw: unknown): ReactNode => {
    if (raw == null) return null;
    // Pass through valid ReactNodes
    if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      return String(raw);
    }
    // If it's a React element or iterable, let React handle it
    // Otherwise, stringify objects/arrays for a safe fallback
    return typeof raw === "object" ? JSON.stringify(raw) : String(raw);
  };
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className="font-medium">
                    {column.label}
                  </TableHead>
                ))}
                {(onEdit || onDelete || onView) && (
                  <TableHead className="w-12"></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={(item as { id?: string | number }).id ?? index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render
                        ? column.render(item[column.key], item)
                        : renderCellValue((item as Record<string, unknown>)[column.key])}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete || onView) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(item)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={() => onDelete(item)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {data.map((item, index) => (
          <Card key={(item as { id?: string | number }).id ?? index} className="p-4">
            <CardHeader className="p-0 pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">
                  {((item as Record<string, unknown>).name as string) ||
                    ((item as Record<string, unknown>).title as string) ||
                    `Item ${index + 1}`}
                </CardTitle>
                {(onEdit || onDelete || onView) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onView && (
                        <DropdownMenuItem onClick={() => onView(item)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                      )}
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem 
                          onClick={() => onDelete(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              {columns
                .filter(
                  (column) =>
                    column.mobileRender ||
                    (column.key !== "name" && column.key !== "title"),
                )
                .map((column) => (
                  <div key={column.key} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">
                      {column.label}:
                    </span>
                    <div className="text-sm">
                      {column.mobileRender
                        ? column.mobileRender(item)
                        : column.render
                        ? column.render(item[column.key], item)
                        : renderCellValue((item as Record<string, unknown>)[column.key])}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
