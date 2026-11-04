import { Badge } from '@/components/ui/badge';
import type { ApprovalStatus, TestStatus, VerificationStatus } from '@/lib/types';

export function TestStatusBadge({ status }: { status: TestStatus }) {
  if (status === 'PUBLISHED') return <Badge variant="success">Nashr qilingan</Badge>;
  if (status === 'READY') return <Badge variant="warning">Tekshiruvda</Badge>;
  if (status === 'PROCESSING') return <Badge variant="default">Ishlanmoqda</Badge>;
  return <Badge variant="neutral">Qoralama</Badge>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return status === 'VERIFIED' ? (
    <Badge variant="success">Tekshirilgan</Badge>
  ) : (
    <Badge variant="warning">Tekshirish talab qilinadi</Badge>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return status === 'APPROVED' ? (
    <Badge variant="success">Tasdiqlangan</Badge>
  ) : (
    <Badge variant="outline">Tasdiqlanmagan</Badge>
  );
}
