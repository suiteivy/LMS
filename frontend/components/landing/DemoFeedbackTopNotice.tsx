import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { MessageSquare, MoveDown, X, Check } from 'lucide-react-native';
import {
  isNoticeDismissed,
  dismissDemoNotice,
  isFeedbackSubmitted,
} from '@/utils/demoEngagement';

interface DemoFeedbackTopNoticeProps {
  onJumpToFeedback: () => void;
}

export const DemoFeedbackTopNotice: React.FC<DemoFeedbackTopNoticeProps> = ({
  onJumpToFeedback,
}) => {
  const isWeb = Platform.OS === 'web';
  const [dismissed, setDismissed] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setDismissed(isNoticeDismissed());
    setSubmitted(isFeedbackSubmitted());
  }, []);

  if (dismissed) return null;

  if (submitted) {
    return (
      <View
        style={{
          width: '100%',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderWidth: 1,
          borderColor: 'rgba(16, 185, 129, 0.35)',
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 16,
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Check size={16} color="#10B981" />
          <Text style={{ color: '#A7F3D0', fontSize: 13, fontWeight: '600' }}>
            Thank you! Your demo feedback has been recorded.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            dismissDemoNotice();
            setDismissed(true);
          }}
          style={{ padding: 4 }}
        >
          <X size={15} color="#A7F3D0" />
        </TouchableOpacity>
      </View>
    );
  }

  const handleDismiss = () => {
    dismissDemoNotice();
    setDismissed(true);
  };

  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: 'rgba(255, 107, 0, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 107, 0, 0.3)',
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginBottom: 22,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        isWeb
          ? ({
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } as any)
          : {},
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: 'rgba(255, 107, 0, 0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MessageSquare size={16} color="#FF8C40" />
        </View>
        <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, flex: 1 }}>
          After exploring the demo modules, you can share feedback at the bottom of this page.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={onJumpToFeedback}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Jump to feedback section"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
            backgroundColor: 'rgba(255, 107, 0, 0.2)',
            borderWidth: 1,
            borderColor: 'rgba(255, 107, 0, 0.4)',
          }}
        >
          <Text style={{ color: '#FFA35C', fontSize: 12, fontWeight: '700' }}>
            Jump to feedback
          </Text>
          <MoveDown size={13} color="#FFA35C" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDismiss}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notice"
          style={{
            padding: 4,
            borderRadius: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <X size={15} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DemoFeedbackTopNotice;
