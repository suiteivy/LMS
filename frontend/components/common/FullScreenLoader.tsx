import React from 'react';
import { Modal, Text, View, Platform } from 'react-native';
import { QuantumReactorLoader } from '@/components/AppLoading';

interface FullScreenLoaderProps {
  visible: boolean;
  message?: string;
}

const isWeb = Platform.OS === 'web';

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({
  visible,
  message = 'Processing...',
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={() => {}}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(5, 3, 16, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: 24,
          ...(isWeb ? ({ backdropFilter: 'blur(24px)' } as any) : {}),
        }}
      >
        {/* Completely Unboxed & Floating Loader */}
        <View style={{ alignItems: 'center' }}>
          <QuantumReactorLoader size={140} showProgress={true} />

          {message && (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: 14,
                  letterSpacing: 1.2,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              >
                {message}
              </Text>
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.45)',
                  fontSize: 11,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  marginTop: 6,
                  letterSpacing: 0.8,
                }}
              >
                [ SYS.OP // PROCESSING ]
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
