import React from 'react';
import { SafeAreaView, View } from 'react-native';
import { DashboardStatCardSkeleton, ListItemSkeleton, TableRowSkeleton } from '@/components/ui/skeletons';

export default function MasterAdminRouteLoading() {
  return (
    <SafeAreaView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={{ gap: 14 }}>
        <DashboardStatCardSkeleton loading count={4} label="Loading dashboard..." showAfter={0} minVisible={250} />
        <ListItemSkeleton loading count={2} label="Loading sections..." showAfter={0} minVisible={250} />
        <TableRowSkeleton loading count={5} columns={4} label="Loading records..." showAfter={0} minVisible={250} />
      </View>
    </SafeAreaView>
  );
}
