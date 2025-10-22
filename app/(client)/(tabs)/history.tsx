import { View, Text, StyleSheet } from 'react-native';

export default function ClientHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
