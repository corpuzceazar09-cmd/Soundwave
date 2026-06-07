import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useAuth, isMockMode } from '@/lib/auth';

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/(admin)', icon: 'D' },
  { label: 'RSS Feeds', route: '/(admin)/feeds', icon: 'F' },
  { label: 'Ingestion Logs', route: '/(admin)/ingestion-logs', icon: 'L' },
  { label: 'Raw Data', route: '/(admin)/raw-data', icon: 'R' },
  { label: 'Failed Jobs', route: '/(admin)/failed-jobs', icon: '!' },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, loading, signOut } = useAuth();
  const [checking, setChecking] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const redirectedRef = useRef(false);
  const loadingRef = useRef(loading);
  const checkingRef = useRef(checking);

  // Keep refs in sync so the 8s timeout closure reads current values
  loadingRef.current = loading;
  checkingRef.current = checking;

  useEffect(() => {
    // If loading takes more than 8s, show retry button instead of infinite spinner
    const timer = setTimeout(() => {
      if (loadingRef.current || checkingRef.current) {
        setTimedOut(true);
        setChecking(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (isMockMode()) {
      setChecking(false);
      return;
    }

    if (role !== 'Admin') {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace('/');
      }
    } else {
      setChecking(false);
    }
  }, [loading, role]);

  const handleLogout = async () => {
    await signOut();
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    } else {
      router.replace('/');
    }
  };

  const navigate = (route: string) => {
    router.push(route as any);
  };

  const isActive = (route: string) => {
    if (route === '/(admin)') return pathname === '/(admin)' || pathname === '/';
    return pathname.startsWith(route);
  };

  if (timedOut) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#64748B', fontSize: 16, marginBottom: 16, textAlign: 'center', paddingHorizontal: 32 }}>
          Unable to connect to authentication service. Check your internet connection and try again.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6 }}
          onPress={() => { setTimedOut(false); setChecking(true); window.location.reload(); }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.brandTitle}>PodcastAdmin</Text>
          <Text style={styles.brandVersion}>v2.4.0</Text>
        </View>

        <TouchableOpacity
          style={styles.newJobButton}
          onPress={() => navigate('/(admin)/feeds')}
        >
          <Text style={styles.newJobButtonText}>+ New Ingestion Job</Text>
        </TouchableOpacity>

        <View style={styles.navGroup}>
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.navItem, isActive(item.route) && styles.navItemActive]}
              onPress={() => navigate(item.route)}
            >
              <View style={[styles.navIcon, isActive(item.route) && styles.navIconActive]}>
                <Text style={[styles.navIconText, isActive(item.route) && styles.navIconTextActive]}>
                  {item.icon}
                </Text>
              </View>
              <Text style={[styles.navItemText, isActive(item.route) && styles.navItemTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.spacer} />

        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Admin User</Text>
            <Text style={styles.profileRole}>SUPER ADMINISTRATOR</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <View style={styles.topbar}>
          <Text style={styles.pageTitle}>Podcast Analytics Engine</Text>
          <View style={styles.topbarRight}>
            <View style={styles.searchBar}>
              <Text style={styles.searchText}>Search analytics or jobs...</Text>
            </View>
            <View style={styles.topbarIcon} />
            <View style={styles.topbarIcon} />
            <View style={styles.avatarPlaceholderSmall} />
          </View>
        </View>
        <View style={styles.contentArea}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E40AF',
  },
  brandVersion: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  newJobButton: {
    backgroundColor: '#1D4ED8',
    marginHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 24,
  },
  newJobButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  navGroup: {
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
    borderRadius: 0,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  navIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconActive: {
    backgroundColor: '#DBEAFE',
  },
  navIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  navIconTextActive: {
    color: '#2563EB',
  },
  navItemText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  navItemTextActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginHorizontal: 12,
    paddingBottom: 8,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CBD5E1',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  profileRole: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    padding: 4,
  },
  logoutText: {
    fontSize: 12,
    color: '#EF4444',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },
  topbar: {
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 300,
    backgroundColor: '#FFFFFF',
  },
  searchText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  topbarIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholderSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CBD5E1',
  },
  contentArea: {
    flex: 1,
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
});
