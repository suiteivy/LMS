import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';

export default async function HistoryTable() {
  const data = await getBorrowHistory();
  return <DataTable columns={columns} data={data} />
}