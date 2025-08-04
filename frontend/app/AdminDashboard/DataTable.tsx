import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TableColumn, TableData, BaseComponentProps } from './types';

interface DataTableProps extends BaseComponentProps {
  data: TableData[];
  columns: TableColumn[];
  loading?: boolean;
  sortable?: boolean;
  onRowPress?: (row: TableData) => void;
  emptyMessage?: string;
  emptyIcon?: string;
  maxHeight?: number;
  striped?: boolean;
}

type SortOrder = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  order: SortOrder;
}

export const DataTable: React.FC<DataTableProps> = ({
  data = [],
  columns = [],
  loading = false,
  sortable = false,
  onRowPress,
  emptyMessage = "No data available",
  emptyIcon = "document-outline",
  maxHeight,
  striped = true,
  className = "",
  testID
}) => {
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    order: null
  });

  // Sort data based on current sort state
  const sortedData = useMemo(() => {
    if (!sortState.column || !sortState.order) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortState.column!];
      const bValue = b[sortState.column!];
      
      // Handling different data types
      let comparison = 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        // Convert to string and compare
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortState.order === 'asc' ? comparison : -comparison;
    });
  }, [data, sortState]);

  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    setSortState(prev => {
      if (prev.column === columnKey) {
        // Cycle through: asc -> desc -> none
        if (prev.order === 'asc') {
          return { column: columnKey, order: 'desc' };
        } else if (prev.order === 'desc') {
          return { column: null, order: null };
        }
      }
      return { column: columnKey, order: 'asc' };
    });
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortable) return null;
    
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return null;

    if (sortState.column === columnKey) {
      if (sortState.order === 'asc') {
        return <Ionicons name="chevron-up" size={16} color="#6B7280" />;
      } else if (sortState.order === 'desc') {
        return <Ionicons name="chevron-down" size={16} color="#6B7280" />;
      }
    }
    
    return <Ionicons name="chevron-expand" size={16} color="#D1D5DB" />;
  };

  const renderTableHeader = () => (
    <View className="flex-row bg-gray-50 border-b border-gray-200">
      {columns.map((column, index) => (
        <TouchableOpacity
          key={column.key}
          className={`p-3 flex-row items-center justify-between ${
            column.width || 'flex-1'
          } ${index === 0 ? 'pl-4' : ''} ${
            index === columns.length - 1 ? 'pr-4' : ''
          }`}
          onPress={() => handleSort(column.key)}
          disabled={!sortable || !column.sortable}
          activeOpacity={sortable && column.sortable ? 0.7 : 1}
        >
          <Text 
            className={`font-semibold text-gray-700 text-sm ${
              column.align === 'center' ? 'text-center' : 
              column.align === 'right' ? 'text-right' : 'text-left'
            }`}
          >
            {column.title}
          </Text>
          {getSortIcon(column.key)}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTableRow = (row: TableData, index: number) => (
    <TouchableOpacity
      key={row.id || index}
      className={`flex-row border-b border-gray-100 ${
        striped && index % 2 === 1 ? 'bg-gray-25' : 'bg-white'
      } ${onRowPress ? 'active:bg-gray-100' : ''}`}
      onPress={() => onRowPress?.(row)}
      disabled={!onRowPress}
      activeOpacity={onRowPress ? 0.7 : 1}
    >
      {columns.map((column, colIndex) => (
        <View
          key={column.key}
          className={`p-3 ${column.width || 'flex-1'} ${
            colIndex === 0 ? 'pl-4' : ''
          } ${colIndex === columns.length - 1 ? 'pr-4' : ''} ${
            column.align === 'center' ? 'items-center' : 
            column.align === 'right' ? 'items-end' : 'items-start'
          }`}
        >
          {column.render ? (
            column.render(row[column.key], row)
          ) : (
            <Text 
              className={`text-gray-900 text-sm ${
                column.align === 'center' ? 'text-center' : 
                column.align === 'right' ? 'text-right' : 'text-left'
              }`}
              numberOfLines={2}
            >
              {row[column.key] || '-'}
            </Text>
          )}
        </View>
      ))}
    </TouchableOpacity>
  );

  const renderLoadingState = () => (
    <View className="bg-white">
      {[...Array(5)].map((_, index) => (
        <View key={index} className="flex-row border-b border-gray-100 p-3">
          {columns.map((column, colIndex) => (
            <View
              key={column.key}
              className={`${column.width || 'flex-1'} ${
                colIndex === 0 ? 'pl-4' : ''
              } ${colIndex === columns.length - 1 ? 'pr-4' : ''}`}
            >
              <View className="animate-pulse">
                <View className="h-4 bg-gray-200 rounded w-3/4"></View>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View className="bg-white p-8">
      <View className="items-center">
        <Ionicons name={emptyIcon as any} size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-2 text-center">{emptyMessage}</Text>
      </View>
    </View>
  );

  const tableContent = (
    <View className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {renderTableHeader()}
      
      {loading ? (
        renderLoadingState()
      ) : sortedData.length > 0 ? (
        <View>
          {sortedData.map((row, index) => renderTableRow(row, index))}
        </View>
      ) : (
        renderEmptyState()
      )}
    </View>
  );

  if (maxHeight) {
    return (
      <View testID={testID} style={{ maxHeight }}>
        <ScrollView 
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {tableContent}
        </ScrollView>
      </View>
    );
  }

  return (
    <View testID={testID}>
      {tableContent}
    </View>
  );
};