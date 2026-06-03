import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthInputProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  isPassword?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({ icon, label, isPassword, style, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, isFocused && styles.focused]}>
        <Ionicons name={icon} size={20} color={isFocused ? '#0544B3' : '#A0A0A0'} style={styles.icon} />
        <TextInput
          style={[styles.input, style]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor="#A0A0A0"
          {...props}
          value={props.value ?? ''}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#A0A0A0" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#fff',
  },
  focused: {
    borderColor: '#0544B3',
    backgroundColor: '#F5F8FF',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
});
