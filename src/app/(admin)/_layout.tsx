import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuth, isMockMode } from '@/lib/auth';

export default function AdminLayout() {
  const router = useRouter();
  const { role, loading, signOut } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    // In mock mode, allow access if role was set (via login redirect)
    if (isMockMode()) {
      setChecking(false);
      return;
    }

    // Real mode: enforce Admin role
    if (role !== 'Admin') {
      router.replace('/');
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

        <TouchableOpacity style={styles.newJobButton}>
          <Text style={styles.newJobButtonText}>+ New Ingestion Job</Text>
        </TouchableOpacity>

        <View style={styles.navGroup}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <Text style={[styles.navItemText, styles.navItemTextActive]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>RSS Feeds</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>Ingestion Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>Raw Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <View style={styles.footerNavGroup}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>Support</Text>
          </TouchableOpacity>
        </View>

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
  footerNavGroup: {
    paddingHorizontal: 12,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
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
