import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation'; 



type SplashScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'Welcome to LMS';

  useEffect(() => {
    let currentIndex = 0;

    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + fullText[currentIndex]);
      currentIndex++;

      if (currentIndex >= fullText.length) {
        clearInterval(interval);
      }
    }, 200); // delay between letters

    // Navigate for 4 seconds
    const timeout = setTimeout(() => {
      navigation.replace('Login');
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{displayedText}</Text>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  text: {
    fontSize: 28, fontWeight: 'bold', color: '#2B2B2B',
    letterSpacing: 1.2,
  },
});
