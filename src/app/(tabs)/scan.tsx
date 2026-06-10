import { View, Text, StyleSheet } from 'react-native';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text>Màn hình quét mã QR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
