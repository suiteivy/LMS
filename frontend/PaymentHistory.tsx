import { Badge } from './Badge';
import React from "react";

// Define the Payment type
type Payment = {
  id: string | number;
  date: string | Date;
  reference: string;
  amount: number;
  status: string;
};

export function PaymentHistory({ payments }: { payments: Payment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td>{new Date(payment.date).toLocaleDateString()}</td>
              <td>{payment.reference}</td>
              <td>${payment.amount.toLocaleString()}</td>
              <td>
                <Badge status={payment.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
