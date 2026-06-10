import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { getUserProfile } from '@/lib/firestoreApi';

const PROFILE_SECTIONS = [
  { icon: 'person-outline', label: 'Account Details', color: '#38BDF8' },
  { icon: 'notifications-outline', label: 'Notifications', color: '#F59E0B' },
  { icon: 'lock-closed-outline', label: 'Privacy & Security', color: '#22C55E' },
];

const PLAYBACK_SECTIONS = [
  { icon: 'speedometer-outline', label: 'Playback Speed', value: '1.0x', color: '#8B5CF6' },
  { icon: 'timer-outline', label: 'Sleep Timer', value: 'Off', color: '#EC4899' },
  { icon: 'text-outline', label: 'Audio Quality', value: 'High', color: '#14B8A6' },
  { icon: 'download-outline', label: 'Downloads', value: 'Wi-Fi Only', color: '#F97316' },
];

const OTHER_SECTIONS = [
  { icon: 'help-circle-outline', label: 'Help & Support', color: '#64748B' },
  { icon: 'information-circle-outline', label: 'About SoundWave', value: 'v1.0.0', color: '#64748B' },
];

function SettingsRow({
  icon,
  label,
  value,
  color,
  isLast,
}: {
  icon: string;
  label: string;
  value?: string;
  color: string;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.settingsRow, isLast && styles.settingsRowLast]}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [autoplayEnabled, setAutoplayEnabled] = React.useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
  const [profile, setProfile] = React.useState<any>(null);
  const router = useRouter();

  React.useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      getUserProfile(user.uid).then(setProfile);
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={32} color="#FFFFFF" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.display_name || auth.currentUser?.email?.split('@')[0] || 'User'}</Text>
          <Text style={styles.profileEmail}>{auth.currentUser?.email || ''}</Text>
          <TouchableOpacity style={styles.upgradeBtn}>
            <Ionicons name="crown" size={14} color="#F59E0B" />
            <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.sectionCard}>
          {PROFILE_SECTIONS.map((item, i) => (
            <SettingsRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              color={item.color}
              isLast={i === PROFILE_SECTIONS.length - 1}
            />
          ))}
        </View>
      </View>

      {/* Toggles */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.sectionCard}>
          <View style={[styles.settingsRow, styles.settingsRowLast]}>
            <View style={[styles.rowIcon, { backgroundColor: '#38BDF815' }]}>
              <Ionicons name="notifications" size={20} color="#38BDF8" />
            </View>
            <Text style={styles.rowLabel}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
              thumbColor={notificationsEnabled ? '#38BDF8' : '#CBD5E1'}
            />
          </View>
          <View style={[styles.settingsRow, styles.settingsRowLast]}>
            <View style={[styles.rowIcon, { backgroundColor: '#8B5CF615' }]}>
              <Ionicons name="infinite" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.rowLabel}>Autoplay Episodes</Text>
            <Switch
              value={autoplayEnabled}
              onValueChange={setAutoplayEnabled}
              trackColor={{ false: '#E2E8F0', true: '#C4B5FD' }}
              thumbColor={autoplayEnabled ? '#8B5CF6' : '#CBD5E1'}
            />
          </View>
          <View style={[styles.settingsRow, styles.settingsRowLast]}>
            <View style={[styles.rowIcon, { backgroundColor: '#0F172A15' }]}>
              <Ionicons name="moon" size={20} color="#0F172A" />
            </View>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#E2E8F0', true: '#94A3B8' }}
              thumbColor={darkModeEnabled ? '#0F172A' : '#CBD5E1' }
            />
          </View>
        </View>
      </View>

      {/* Playback Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Playback</Text>
        <View style={styles.sectionCard}>
          {PLAYBACK_SECTIONS.map((item, i) => (
            <SettingsRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              color={item.color}
              isLast={i === PLAYBACK_SECTIONS.length - 1}
            />
          ))}
        </View>
      </View>

      {/* Other Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.sectionCard}>
          {OTHER_SECTIONS.map((item, i) => (
            <SettingsRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              color={item.color}
              isLast={i === OTHER_SECTIONS.length - 1}
            />
          ))}
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={async () => {
        await signOut(auth);
        router.replace('/(user)/auth');
      }}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={styles.signOutBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    gap: 28,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  upgradeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  section: {},
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  rowValue: {
    fontSize: 13,
    color: '#94A3B8',
    marginRight: 4,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
});
