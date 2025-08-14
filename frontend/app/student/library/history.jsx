// import { DataTable } from '@/components/ui/data-table';
// import { columns } from './columns';

// export default async function HistoryTable() {
//   const data = await getBorrowHistory();
//   return <DataTable columns={columns} data={data} />
// }
import { fetchBorrowHistory } from '@/services/libraryService';

export default async function BorrowHistory({ studentId }) {
  const records = await fetchBorrowHistory(studentId);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Borrowed Books</h2>
      {records.map((record) => (
        <div key={record.id} className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title">{record.bookTitle}</h3>
            <p>Borrowed: {new Date(record.borrowDate).toLocaleDateString()}</p>
            <p>Due: {new Date(record.dueDate).toLocaleDateString()}</p>
            <div className="card-actions">
              <span className={`badge ${record.returned ? 'badge-success' : 'badge-error'}`}>
                {record.returned ? 'Returned' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}