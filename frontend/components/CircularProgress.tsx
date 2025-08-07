import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

type CircularProgressProps = {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 100
  progressColor?: string;
  trackColor?: string;
  showText?: boolean;
};

export default function CircularProgress({
  size = 100,
  strokeWidth = 10,
  progress,
  progressColor = '#128C7E',
  trackColor = '#3498DB',
  showText = true,
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    const gap_angle = 16;
    const totalArcAngle = 360 - gap_angle;
    const progressAngle = totalArcAngle * (progress / 100) - (gap_angle/2);
    const trackAngle = totalArcAngle - progressAngle - (gap_angle/2);
    
    const progressLength = (circumference * progressAngle) / 360;
    const trackLength = (circumference * trackAngle) / 360;
    const gapLength = (circumference * gap_angle) / 360;

    

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            {/* Track Circle */}
            <Circle
                stroke={trackColor}
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${trackLength} ${circumference}`}
                strokeDashoffset={-(progressLength + gapLength/2)}
                strokeLinecap="round"
            />
            {/* Progress Circle */}
            <Circle
                stroke={progressColor}
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${progressLength} ${circumference}`}
                strokeDashoffset={gapLength / 2}
                strokeLinecap="round"
                
            />
        </G>
      </Svg>
      {showText && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{progress}%</Text>
        </View>
      )}
    </View>
  );
}
