import React from 'react';
import { SafeAreaView, View } from 'react-native';
import { CardGridSkeleton, ListItemSkeleton, TableRowSkeleton } from '@/components/ui/skeletons';

export default function AdminRouteLoading() {
  return (
    <SafeAreaView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      <View style={{ gap: 14 }}>
        <CardGridSkeleton loading count={3} label="Loading dashboard cards..." showAfter={0} minVisible={250} />
        <TableRowSkeleton loading count={4} columns={4} label="Loading table data..." showAfter={0} minVisible={250} />
        <ListItemSkeleton loading count={2} label="Loading details..." showAfter={0} minVisible={250} />
      </View>
    </SafeAreaView>
  );
}
