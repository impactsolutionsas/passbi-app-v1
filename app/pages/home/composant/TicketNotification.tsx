import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '@/tailwind';

interface NotificationProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  onHide?: () => void;
}

const TicketNotification: React.FC<NotificationProps> = ({
  visible,
  message,
  type = 'info',
  duration = 5000,
  onHide
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(false);

  const hideNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isVisibleRef.current = false;
      onHide?.();
    });
  }, [fadeAnim, slideAnim, onHide]);

  const showNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    isVisibleRef.current = true;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Set auto-hide timer
    timeoutRef.current = setTimeout(() => {
      if (isVisibleRef.current) {
        hideNotification();
      }
    }, duration);
  }, [fadeAnim, slideAnim, duration, hideNotification]);

  useEffect(() => {
    if (visible && !isVisibleRef.current) {
      showNotification();
    } else if (!visible && isVisibleRef.current) {
      hideNotification();
    }
  }, [visible, showNotification, hideNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const getNotificationStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          iconName: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
          iconColor: '#ffffff',
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          iconName: 'warning' as keyof typeof Ionicons.glyphMap,
          iconColor: '#ffffff',
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          iconName: 'alert-circle' as keyof typeof Ionicons.glyphMap,
          iconColor: '#ffffff',
        };
      default:
        return {
          backgroundColor: '#0D9488',
          iconName: 'information-circle' as keyof typeof Ionicons.glyphMap,
          iconColor: '#ffffff',
        };
    }
  };

  const notificationStyle = getNotificationStyle();

  return (
    <Animated.View
      style={[
        tw`absolute top-0 left-0 right-0 z-50 mx-4 mt-12 rounded-lg shadow-lg`,
        {
          backgroundColor: notificationStyle.backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={tw`flex-row items-center p-4`}>
        <Ionicons
          name={notificationStyle.iconName}
          size={24}
          color={notificationStyle.iconColor}
          style={tw`mr-3`}
        />
        <Text style={tw`flex-1 text-white font-medium text-sm`}>
          {message}
        </Text>
        <View style={tw`w-2 h-2 bg-white rounded-full ml-3 opacity-75`} />
      </View>
    </Animated.View>
  );
};

export default TicketNotification;