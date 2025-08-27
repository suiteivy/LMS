import { EarningsSummary, PaymentHistory } from '../../../components';

export default function BursaryPage() {
  return (
    <div className="space-y-6">
      <EarningsSummary />
      <PaymentHistory />
    </div>
  )
}