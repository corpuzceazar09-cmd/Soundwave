import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth, mockLogin, isMockMode, type AppRole } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Route map for each role
const roleRoutes: Record<AppRole, string> = {
  Admin: '/(admin)',
  Editor: '/(editor)',
  User: '/(user)',
};

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const navigateByRole = (role: AppRole) => {
    const route = roleRoutes[role];
    router.replace(route as any);
  };

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setAuthError(null);
    try {
      if (isMockMode()) {
        // Mock mode: determine role from email and navigate
        const role = mockLogin(data.email);
        navigateByRole(role);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setAuthError(error.message);
      } else {
        // Fetch role from DB and navigate
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          const role = (roleData?.role as AppRole) || 'User';
          navigateByRole(role);
        }
      }
    } catch (e) {
      setAuthError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {Platform.OS === 'ios' ? (
          <Text style={{ fontSize: 32 }}>🎙️</Text>
        ) : (
          <Text style={{ fontSize: 32 }}>🎙️</Text>
        )}
        <Text style={styles.brandTitle}>PodcastAdmin</Text>
        <Text style={styles.brandSubtitle}>Editorial Control Suite v2.4.0</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Secure Access</Text>
        <Text style={styles.cardSubtitle}>
          Please enter your credentials to access the analytics engine.
        </Text>

        {authError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        )}



        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="sample@podcastengine.com"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}
          />
          {errors.email && <Text style={styles.errorHint}>{errors.email.message}</Text>}
        </View>

        <View style={styles.formGroup}>
          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity>
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="••••••••••••"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && <Text style={styles.errorHint}>{errors.password.message}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Access Admin Console</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>SYSTEM STATUS</Text>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>All Nodes Operational</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLinks}>
          <Text style={styles.footerLink}>Help Center</Text>
          <Text style={styles.footerLink}>Security Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
        </View>
        <Text style={styles.footerCopy}>
          © 2024 PodcastAdmin Editorial Control Suite. v2.4.0-stable
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E40AF',
    marginTop: 8,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 440,
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
  },
  hintBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  hintText: {
    color: '#1E40AF',
    fontSize: 13,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassword: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorHint: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#64748B',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  footerCopy: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
