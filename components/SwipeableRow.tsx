import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  enabled?: boolean;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ 
  children, 
  onDelete,
  enabled = true 
}) => {
  const swipeableRow = useRef<Swipeable>(null);

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });

    return (
      <Animated.View 
        style={[
          styles.rightAction, 
          { transform: [{ translateX: trans }] }
        ]}
      >
        <RectButton
          style={[styles.rightAction, styles.deleteAction]}
          onPress={() => {
            swipeableRow.current?.close();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
        </RectButton>
      </Animated.View>
    );
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Swipeable
      ref={swipeableRow}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
    >
      {children}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  rightAction: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
  },
});
