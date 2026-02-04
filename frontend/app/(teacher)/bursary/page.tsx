import { PaymentHistory } from '../../../components/PaymentHistory';
import { EarningsSummary } from '../../../components/EarningsSummary';

export default function BursaryPage() {
  return (
    <div className="space-y-6">
      <EarningsSummary />
      <PaymentHistory />
    </div>
  )
}