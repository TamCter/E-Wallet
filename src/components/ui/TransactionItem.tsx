import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TransactionItemProps {
  title: string;
  subtitle: string;
  amount: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  displayAmount?: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  title,
  subtitle,
  amount,
  icon,
  iconBgColor,
  iconColor,
  displayAmount,
}) => {
  const formattedAmount = displayAmount || (
    amount === 0
      ? '0 VND'
      : amount > 0
        ? `+${new Intl.NumberFormat('vi-VN').format(amount)} VND`
        : `-${new Intl.NumberFormat('vi-VN').format(Math.abs(amount))} VND`
  );
  const amountColor = amount > 0 ? '#00A86B' : '#1a1a1a';

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]} numberOfLines={1}>{formattedAmount}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    justifyContent: 'center',
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#A0A0A0',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
});
