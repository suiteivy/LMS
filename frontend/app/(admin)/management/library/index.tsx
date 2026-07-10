import React from 'react';
import LibraryAction from '@/components/admin/library/LibraryAction';
import { SubscriptionGate } from '@/components/shared/SubscriptionComponents';

export default function LibraryIndex() {
    return (
        <SubscriptionGate feature="library">
            <LibraryAction />
        </SubscriptionGate>
    );
}
