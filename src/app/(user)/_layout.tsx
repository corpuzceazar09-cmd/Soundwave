import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuth, isMockMode } from '@/lib/auth';

export default function UserLayout() {
  const router = useRouter();
  const { role, loading, signOut } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (isMockMode()) {
      setChecking(false);
      return;
    }

    // Any authenticated user can access the User view
    if (!role) {
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
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.brandTitle}>PodcastHub</Text>
          <Text style={styles.brandVersion}>v2.4.0</Text>
        </View>

        <View style={styles.navGroup}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <Text style={[styles.navItemText, styles.navItemTextActive]}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>My Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>Playlists</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <View style={styles.footerNavGroup}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Public User</Text>
            <Text style={styles.profileRole}>LISTENER</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <View style={styles.topbar}>
          <Text style={styles.pageTitle}>Discover Podcasts</Text>
          <View style={styles.topbarRight}>
            <View style={styles.searchBar}>
              <Text style={styles.searchText}>Search podcasts...</Text>
            </View>
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
    backgroundColor: '#F0FDF4',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#F0FDF4',
    borderRightWidth: 1,
    borderRightColor: '#BBF7D0',
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
    color: '#047857',
  },
  brandVersion: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
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
    backgroundColor: '#DCFCE7',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    borderRadius: 0,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  navItemText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  navItemTextActive: {
    color: '#047857',
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  footerNavGroup: {
    paddingHorizontal: 12,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
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
    backgroundColor: '#A7F3D0',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  profileRole: {
    fontSize: 10,
    color: '#059669',
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
    borderBottomColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 300,
    backgroundColor: '#FFFFFF',
  },
  searchText: {
    color: '#6EE7B7',
    fontSize: 14,
  },
  avatarPlaceholderSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A7F3D0',
  },
  contentArea: {
    flex: 1,
    padding: 32,
    backgroundColor: '#FAFAF9',
  },
});
