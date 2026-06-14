import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { Slot, useRouter, useSegments, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_WIDE = SCREEN_WIDTH >= 1024;

const NAV_ITEMS = [
  { icon: 'home', label: 'Home', route: '/(user)' },
  { icon: 'compass-outline', label: 'Discover', route: '/(user)' },
  { icon: 'library-outline', label: 'Library', route: '/(user)/library' },
  { icon: 'layers-outline', label: 'Subscriptions', route: '/(user)/subscriptions' },
  { icon: 'time-outline', label: 'History', route: '/(user)/history' },
  { icon: 'settings-outline', label: 'Settings', route: '/(user)/settings' },
];

export default function UserLayout() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const { role, loading, signOut } = useAuth();
  const [checking, setChecking] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const loadingRef = useRef(loading);
  const checkingRef = useRef(checking);
  const insets = useSafeAreaInsets();

  loadingRef.current = loading;
  checkingRef.current = checking;

  // Determine if we're on an auth screen (full-screen, no chrome)
  const segs = segments as string[];
  const isAuthScreen = segs.includes('auth');

  useEffect(() => {
    if (loading) return;

    if (!role || role !== 'User') {
      router.replace('/');
    } else {
      setChecking(false);
    }
  }, [loading, role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loadingRef.current || checkingRef.current) {
        setTimedOut(true);
        setChecking(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    await signOut();
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    } else {
      router.replace('/');
    }
  };

  if (timedOut) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#94A3B8', fontSize: 16, marginBottom: 16, textAlign: 'center', paddingHorizontal: 32 }}>
          Unable to connect to authentication service. Check your internet connection and try again.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#38BDF8', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6 }}
          onPress={() => { setTimedOut(false); setChecking(true); window.location.reload(); }}
        >
          <Text style={{ color: '#0F172A', fontWeight: '600', fontSize: 15 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isAuthScreen && styles.containerFull]}>
      {/* Sidebar */}
      {!isAuthScreen && IS_WIDE && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <View style={styles.logoIcon}>
              <Ionicons name="radio" size={20} color="#38BDF8" />
            </View>
            <Text style={styles.logoText}>SoundWave</Text>
            <Text style={styles.logoSubtext}>Discovery</Text>
          </View>

          <View style={styles.navSection}>
            {NAV_ITEMS.map((item) => {
              const isActive = item.route ? pathname === item.route : false;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => item.route && router.push(item.route as any)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={isActive ? '#38BDF8' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      isActive && styles.navLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sidebarBottom}>
            <TouchableOpacity style={styles.createButton}>
              <Ionicons name="add" size={20} color="#0F172A" />
              <Text style={styles.createButtonText}>Create Playlist</Text>
            </TouchableOpacity>

            <View style={styles.profileRow}>
              <View style={styles.avatarSmall}>
                <Ionicons name="person" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Public User</Text>
                <Text style={styles.profileRole}>LISTENER</Text>
              </View>
              <TouchableOpacity onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Main Area */}
      <View style={styles.mainArea}>
        {!isAuthScreen && (
          <View style={styles.topbar}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search podcasts, episodes, hosts..."
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={styles.topbarActions}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="notifications-outline" size={22} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={22} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatar}>
                <Ionicons name="person" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content */}
        <View style={styles.contentArea}>
          <Slot />
        </View>

        {!isAuthScreen && (
          <View
            style={[
              styles.playerBar,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <View style={styles.playerContent}>
              <View style={styles.playerTrack}>
                <View style={styles.playerArt}>
                  <Ionicons name="musical-note" size={20} color="#38BDF8" />
                </View>
                <View>
                  <Text style={styles.playerTitle} numberOfLines={1}>
                    The Daily: Understanding the Crisis
                  </Text>
                  <Text style={styles.playerAuthor}>The Daily</Text>
                </View>
              </View>

              <View style={styles.playerControls}>
                <TouchableOpacity>
                  <Ionicons name="shuffle" size={18} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="play-skip-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.playButton}>
                  <Ionicons name="play" size={22} color="#0F172A" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="play-skip-forward" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="infinite" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.playerUtilities}>
                <TouchableOpacity>
                  <Ionicons name="list-outline" size={20} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="tv-outline" size={20} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="volume-high-outline" size={20} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="expand-outline" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  containerFull: {
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  // Sidebar
  sidebar: {
    width: 240,
    backgroundColor: '#0F172A',
    paddingVertical: 24,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  logoSubtext: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  navLabelActive: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  sidebarBottom: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileRole: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  // Main Area
  mainArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    flexDirection: 'column',
  },
  // Topbar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchWrapper: {
    flex: 1,
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  topbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 16,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Content area
  contentArea: {
    flex: 1,
  },
  // Player Bar
  playerBar: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  playerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  playerArt: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 200,
  },
  playerAuthor: {
    fontSize: 11,
    color: '#64748B',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerUtilities: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 16,
  },
});
