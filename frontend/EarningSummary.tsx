import React from "react";

// Simple StatCard component definition
function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

export function EarningsSummary({ current, total }: { current: number; total: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <StatCard title="This Month" value={`$${current.toLocaleString()}`} />
      <StatCard title="Total Balance" value={`$${total.toLocaleString()}`} />
    </div>
  );
}
