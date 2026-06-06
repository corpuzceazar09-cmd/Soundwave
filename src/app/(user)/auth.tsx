import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SPLIT = SCREEN_WIDTH >= 768;

type AuthMode = 'login' | 'signup';

export default function UserAuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogin = () => {
    // TODO: Wire up Firebase authentication
    router.replace('/(user)' as any);
  };

  const handleSignUp = () => {
    // TODO: Wire up Firebase authentication
    router.replace('/(user)' as any);
  };

  const renderLeftPanel = () => (
    <View style={styles.leftPanel}>
      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>NEW EPISODES DAILY</Text>
      </View>

      <Text style={styles.heroTitle}>
        Hear what{' '}
        <Text style={styles.heroAccent}>matters most.</Text>
      </Text>
      <Text style={styles.heroSub}>
        Discover, stream, and curate the podcasts that define your world.
      </Text>

      <View style={styles.previewCard}>
        <View style={styles.previewIcon}>
          <Ionicons name="mic" size={28} color="#38BDF8" />
        </View>
        <View style={styles.previewInfo}>
          <Text style={styles.previewLabel}>NOW TRENDING</Text>
          <Text style={styles.previewTitle}>The Pulse: Future of AI</Text>
          <View style={styles.previewPlayer}>
            <View style={styles.previewBar} />
            <View style={[styles.previewBar, { width: '60%' }]} />
            <View style={[styles.previewBar, { width: '40%' }]} />
          </View>
        </View>
        <TouchableOpacity style={styles.previewPlay}>
          <Ionicons name="play" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderToggle = () => (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        style={[styles.toggleTab, mode === 'login' && styles.toggleTabActive]}
        onPress={() => setMode('login')}
      >
        <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
          Sign In
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleTab, mode === 'signup' && styles.toggleTabActive]}
        onPress={() => setMode('signup')}
      >
        <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>
          Create Account
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoginForm = () => (
    <>
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="name@company.com"
            placeholderTextColor="#64748B"
            value={loginEmail}
            onChangeText={setLoginEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748B"
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry={!showLoginPassword}
          />
          <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)} style={styles.eyeToggle}>
            <Ionicons name={showLoginPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
        <Text style={styles.primaryButtonText}>Sign In</Text>
      </TouchableOpacity>
    </>
  );

  const renderSignUpForm = () => (
    <>
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#64748B"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="name@company.com"
            placeholderTextColor="#64748B"
            value={signupEmail}
            onChangeText={setSignupEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
      </View>

      <View style={styles.passwordRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={signupPassword}
              onChangeText={setSignupPassword}
              secureTextEntry={!showSignupPassword}
            />
            <TouchableOpacity onPress={() => setShowSignupPassword(!showSignupPassword)} style={styles.eyeToggle}>
              <Ionicons name={showSignupPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Confirm</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeToggle}>
              <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
        <Text style={styles.primaryButtonText}>Create Account</Text>
      </TouchableOpacity>
    </>
  );

  const renderSocialAuth = () => (
    <>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="logo-google" size={20} color="#FFFFFF" />
          <Text style={styles.socialButtonText}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
          <Text style={styles.socialButtonText}>Apple</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderFormPanel = () => (
    <View style={styles.rightPanel}>
      <View style={styles.formCard}>
        {renderToggle()}

        <View style={styles.formBody}>
          {mode === 'login' ? renderLoginForm() : renderSignUpForm()}
        </View>

        {renderSocialAuth()}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity><Text style={styles.footerLink}>Privacy</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.footerLink}>Terms</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.footerLink}>Help</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#0B1121', '#0F172A', '#1A1F35']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="radio" size={22} color="#38BDF8" />
          </View>
          <Text style={styles.logoText}>SoundWave</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {IS_SPLIT ? (
            <View style={styles.splitRow}>
              {renderLeftPanel()}
              {renderFormPanel()}
            </View>
          ) : (
            <>{renderFormPanel()}</>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  // Left Panel (split-screen)
  leftPanel: {
    flex: 1,
    maxWidth: 420,
    paddingRight: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 50,
    marginBottom: 12,
  },
  heroAccent: {
    color: '#10B981',
  },
  heroSub: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
    marginBottom: 32,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  previewInfo: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  previewPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewBar: {
    height: 3,
    width: '30%',
    backgroundColor: '#475569',
    borderRadius: 2,
  },
  previewPlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleTabActive: {
    backgroundColor: '#38BDF8',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleTextActive: {
    color: '#0F172A',
  },
  // Right Panel (form)
  rightPanel: {
    flex: 1,
    maxWidth: 440,
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  formBody: {
    marginBottom: 8,
  },
  formGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  eyeToggle: {
    padding: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 24,
  },
  footerLink: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});
