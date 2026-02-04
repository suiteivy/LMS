// import { DataTable } from '@/components/ui/data-table';
// import { columns } from './columns';

// export default async function HistoryTable() {
//   const data = await getBorrowHistory();
//   return <DataTable columns={columns} data={data} />
// }
// import { fetchBorrowHistory } from '@/services/libraryService';

// export default async function BorrowHistory({ studentId }) {
//   const records = await fetchBorrowHistory(studentId);
//   return (
//     <div className="space-y-4">
//       <h2 className="text-xl font-bold">Your Borrowed Books</h2>
//       {records.map((record) => (
//         <div key={record.id} className="card bg-base-100 shadow">
//           <div className="card-body">
//             <h3 className="card-title">{record.bookTitle}</h3>
//             <p>Borrowed: {new Date(record.borrowDate).toLocaleDateString()}</p>
//             <p>Due: {new Date(record.dueDate).toLocaleDateString()}</p>
//             <div className="card-actions">
//               <span className={`badge ${record.returned ? 'badge-success' : 'badge-error'}`}>
//                 {record.returned ? 'Returned' : 'Active'}
//               </span>
//             </div>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native"; // Use RN components
import { fetchBorrowHistory } from "@/services/LibraryService";

export default function BorrowHistory({ studentId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchBorrowHistory(studentId);
        setRecords(data || []);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId]);

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <ScrollView className="space-y-4">
      <Text className="text-xl font-bold">Your Borrowed Books</Text>
      {records.map((record) => (
        <View key={record.id} className="p-4 mb-4 bg-white rounded-lg shadow">
          <Text className="text-lg font-bold">{record.bookTitle}</Text>
          <Text>
            Borrowed: {new Date(record.borrowDate).toLocaleDateString()}
          </Text>
          <Text>Due: {new Date(record.dueDate).toLocaleDateString()}</Text>
          <View
            className={`mt-2 p-1 rounded ${record.returned ? "bg-green-200" : "bg-red-200"}`}
          >
            <Text className="text-center">
              {record.returned ? "Returned" : "Active"}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
