// /components/MasterTableForm.tsx
'use client';

import { getTableColumns } from '@/config/masterConfig';
import { sql } from 'drizzle-orm';

// Helper to infer column type from Drizzle schema
const getFieldType = (column: any) => {
  const columnType = column.columnType;
  if (columnType === 'serial' || columnType === 'integer') return 'number';
  if (columnType === 'boolean') return 'boolean';
  if (columnType === 'timestamp' || columnType === 'text' || columnType === 'varchar') return 'text';
  if (columnType === 'numeric') return 'text';
  if (columnType === 'jsonb') return 'json';
  return 'text';
};

// Helper to find foreign key relationships
const getForeignKey = (column: any, tableSchema: any) => {
  const tableConfig = (tableSchema as any)._;
  const fks = tableConfig.foreignKeys;
  if (!fks) return null;

  const fk = fks.find((fk: any) => fk.columns.includes(column.name));
  if (!fk) return null;

  const refTable = fk.referenceTable;
  const refColumn = fk.referenceColumns[0];
  return { refTable, refColumn };
};

interface MasterTableFormProps {
  title: string;
  tableSchema: any;
  data: any[];
  onChange: (newData: any[]) => void;
  masterData: Record<string, any[]>;
}

const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500";
const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-white";

export function MasterTableForm({ title, tableSchema, data, onChange, masterData }: MasterTableFormProps) {
  const columns = getTableColumns(tableSchema);

  const editableColumns = columns.filter(col =>
    !col.primary &&
    col.name !== 'createdAt' &&
    col.name !== 'updatedAt' &&
    col.default !== sql`CURRENT_TIMESTAMP`
  );

  const handleRowChange = (rowIndex: number, fieldName: string, value: any) => {
    const newData = data.map((row, index) =>
      index === rowIndex ? { ...row, [fieldName]: value } : row
    );
    onChange(newData);
  };

  const addRow = () => {
    const newRow: any = {};
    editableColumns.forEach(col => {
      newRow[col.name] = col.default !== undefined ? (typeof col.default === 'function' ? col.default() : col.default) : (col.columnType === 'boolean' ? false : '');
    });
    onChange([...data, newRow]);
  };

  const deleteRow = (rowIndex: number) => {
    onChange(data.filter((_, index) => index !== rowIndex));
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Configure {title}</h3>
      {data.map((row, rowIndex) => (
        <div key={rowIndex} className="mb-4 p-4 border border-gray-300 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-center">
            {editableColumns.map((column) => {
              const fieldType = getFieldType(column);
              const fk = getForeignKey(column, tableSchema);
              const isRequired = column.notNull;

              if (fk) {
                const options = masterData[fk.refTable] || [];
                return (
                  <div key={column.name} className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      {column.name}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <select
                      value={row[column.name] || ''}
                      onChange={(e) => handleRowChange(rowIndex, column.name, e.target.value)}
                      className={selectClass}
                      required={isRequired}
                    >
                      <option value="">None</option>
                      {options.map((option: any) => (
                        <option key={option.id} value={option.id}>
                          {option.name || option.code || option.id}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={column.name} className="space-y-1">
                  {fieldType === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                      <div className="relative inline-flex items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!row[column.name]}
                          onChange={(e) => handleRowChange(rowIndex, column.name, e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-red-600 transition"></div>
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition"></div>
                      </div>
                      <span className="text-sm text-gray-700">{column.name}</span>
                    </label>
                  ) : (
                    <>
                      <label className="text-xs font-medium text-gray-600">
                        {column.name}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {fieldType === 'json' ? (
                        <textarea
                          value={row[column.name] || ''}
                          onChange={(e) => handleRowChange(rowIndex, column.name, e.target.value)}
                          className={`${inputClass} resize-y`}
                          rows={3}
                          required={isRequired}
                        />
                      ) : (
                        <input
                          type={fieldType === 'number' ? 'number' : 'text'}
                          value={row[column.name] || ''}
                          onChange={(e) => handleRowChange(rowIndex, column.name, fieldType === 'number' ? Number(e.target.value) : e.target.value)}
                          className={inputClass}
                          required={isRequired}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <div className="flex items-end">
              <button onClick={() => deleteRow(rowIndex)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete row">
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={addRow} className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition text-sm">
        <i className="fas fa-plus"></i> Add {title.slice(0, -1)}
      </button>
    </div>
  );
}
