import { useState, useEffect } from 'react';
import { LibraryAPI } from '@/services/LibraryService';

export default function BorrowHistory({ studentId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await LibraryAPI.getBorrowingHistory(studentId);
        const transformedRecords = data.map(LibraryAPI.transformBorrowedBookData);
        setRecords(transformedRecords);
      } catch (error) {
        console.error('Failed to fetch borrowing history:', error);
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      fetchHistory();
    }
  }, [studentId]);

  if (loading) {
    return <div className="flex justify-center p-4"><span className="loading loading-spinner"></span></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Borrowed Books</h2>
      {records.map((record) => (
        <div key={record.id} className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title">{record.bookTitle}</h3>
            <p>Borrowed: {record.borrowDate.toLocaleDateString()}</p>
            <p>Due: {record.dueDate.toLocaleDateString()}</p>
            <div className="card-actions">
              <span className={`badge ${record.returnDate ? 'badge-success' : 'badge-error'}`}>
                {record.returnDate ? 'Returned' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}