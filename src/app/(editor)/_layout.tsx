import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuth, isMockMode } from '@/lib/auth';

export default function EditorLayout() {
  const router = useRouter();
  const { role, loading, signOut } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (isMockMode()) {
      setChecking(false);
      return;
    }

    if (role !== 'Editor' && role !== 'Admin') {
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
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.brandTitle}>PodcastEditor</Text>
          <Text style={styles.brandVersion}>v2.4.0</Text>
        </View>

        <View style={styles.navGroup}>
          <TouchableOpacity
            style={[styles.navItem, styles.navItemActive]}
            onPress={() => router.push('/(editor)' as any)}
          >
            <Text style={[styles.navItemText, styles.navItemTextActive]}>My Content</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/(editor)' as any)}
          >
            <Text style={styles.navItemText}>Podcasts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/(editor)' as any)}
          >
            <Text style={styles.navItemText}>Episodes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/(editor)' as any)}
          >
            <Text style={styles.navItemText}>Drafts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/(editor)' as any)}
          >
            <Text style={styles.navItemText}>Media Library</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <View style={styles.footerNavGroup}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navItemText}>Help</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Editor User</Text>
            <Text style={styles.profileRole}>CONTENT EDITOR</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <View style={styles.topbar}>
          <Text style={styles.pageTitle}>Content Management</Text>
          <View style={styles.topbarRight}>
            <View style={styles.searchBar}>
              <Text style={styles.searchText}>Search podcasts or episodes...</Text>
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
    backgroundColor: '#FAF5FF',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FAF5FF',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#FAF5FF',
    borderRightWidth: 1,
    borderRightColor: '#E9D5FF',
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
    color: '#6D28D9',
  },
  brandVersion: {
    fontSize: 12,
    color: '#8B5CF6',
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
    backgroundColor: '#F3E8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
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
    color: '#6D28D9',
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  footerNavGroup: {
    paddingHorizontal: 12,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
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
    backgroundColor: '#DDD6FE',
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
    color: '#8B5CF6',
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
    borderBottomColor: '#E9D5FF',
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
    borderColor: '#E9D5FF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 300,
    backgroundColor: '#FFFFFF',
  },
  searchText: {
    color: '#A78BFA',
    fontSize: 14,
  },
  avatarPlaceholderSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DDD6FE',
  },
  contentArea: {
    flex: 1,
    padding: 32,
    backgroundColor: '#FAFAF9',
  },
});
