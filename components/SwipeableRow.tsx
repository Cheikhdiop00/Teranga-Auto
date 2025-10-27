<<<<<<< Updated upstream
import { ReactNode, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

interface SwipeableRowProps {
  children: ReactNode;
  onDelete?: () => void;
  enabled?: boolean;
  deleteLabel?: string;
}

export function SwipeableRow({
  children,
  onDelete,
  enabled = true,
  deleteLabel = 'Supprimer',
}: SwipeableRowProps) {
  const swipeableRef = useRef<Swipeable | null>(null);

  if (!enabled || !onDelete) {
    return <>{children}</>;
  }

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.actionContainer, { transform: [{ scale }] }]}>
        <Text style={styles.actionText}>{deleteLabel}</Text>
      </Animated.View>
    );
  };

  const handleOpen = () => {
    swipeableRef.current?.close();
    onDelete?.();
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleOpen}
      overshootRight={false}
    >
      <View>{children}</View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    width: 96,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 12,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
});
=======
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export type SwipeableRowProps = {
  children: React.ReactNode;
  onDelete?: () => void;
  enabled?: boolean;
};

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ children, onDelete, enabled = true }) => {
  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteAction} onPress={onDelete} disabled={!onDelete}>
      <Ionicons name="trash" size={20} color="#fff" />
      <Text style={styles.deleteText}>Supprimer</Text>
    </TouchableOpacity>
  );

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <Swipeable renderRightActions={renderRightActions} enabled={enabled}>
      <View>{children}</View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  deleteAction: {
    width: 90,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  deleteText: {
    color: '#fff',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SwipeableRow;
>>>>>>> Stashed changes
