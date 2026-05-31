import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { AuthInput } from '@/components/ui/AuthInput';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+84');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name || !phone || !phoneCountryCode) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
          phone_country_code: phoneCountryCode,
          phone_number: phone,
        }
      }
    });
    
    setLoading(false);
    
    if (error) {
      Alert.alert('Đăng ký thất bại', error.message);
    } else {
      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet-outline" size={32} color="#0544B3" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Digital Wallet to manage your finances securely.</Text>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Full Name"
              icon="person-outline"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
            />

            <AuthInput
              label="Email Address"
              icon="mail-outline"
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.phoneLabel}>Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCodeContainer}>
                <Ionicons name="call-outline" size={18} color="#A0A0A0" style={styles.countryIcon} />
                <TextInput
                  style={styles.countryCodeInput}
                  placeholder="+84"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="phone-pad"
                  value={phoneCountryCode}
                  onChangeText={setPhoneCountryCode}
                  maxLength={5}
                />
              </View>
              <View style={styles.phoneNumberContainer}>
                <TextInput
                  style={styles.phoneNumberInput}
                  placeholder="987654321"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <AuthInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
            />
            <Text style={styles.hint}>Must be at least 8 characters.</Text>

            <Button
              title="Sign Up →"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerBtn}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F5F8FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0544B3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  phoneLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 50,
    width: 90,
    backgroundColor: '#fff',
  },
  phoneNumberContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#fff',
  },
  countryIcon: {
    marginRight: 4,
  },
  countryCodeInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    height: '100%',
    textAlign: 'center',
  },
  phoneNumberInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  hint: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: -8,
    marginBottom: 24,
    marginLeft: 4,
  },
  registerBtn: {
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: '#666666',
    fontSize: 14,
  },
  loginLink: {
    color: '#0544B3',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
