import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useAuth, isMockMode } from '@/lib/auth';
import { EditorThemeProvider, useEditorTheme } from '@/contexts/EditorThemeContext';

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/(editor)', icon: 'D' },
  { label: 'Podcasts', route: '/(editor)/podcasts', icon: 'P' },
  { label: 'Episodes', route: '/(editor)/episodes', icon: 'E' },
  { label: 'Drafts', route: '/(editor)/drafts', icon: '!' },
];

function EditorLayoutInner() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, loading, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useEditorTheme();
  const [checking, setChecking] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const loadingRef = useRef(loading);
  const checkingRef = useRef(checking);

  loadingRef.current = loading;
  checkingRef.current = checking;

  useEffect(() => {
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

    if (role !== 'Editor' && role !== 'Admin') {
      router.replace('/');
    } else {
      setChecking(false);
    }
  }, [loading, role]);

  const navigate = (route: string) => {
    router.push(route as any);
  };

  const isActive = (route: string) => {
    if (route === '/(editor)') return pathname === '/(editor)';
    return pathname.startsWith(route);
  };

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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 16, textAlign: 'center', paddingHorizontal: 32 }}>
          Unable to connect to authentication service. Check your internet connection and try again.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6 }}
          onPress={() => { setTimedOut(false); setChecking(true); window.location.reload(); }}
        >
          <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 15 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || checking) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { backgroundColor: colors.sidebarBg, borderRightColor: colors.sidebarBorder }]}>
        <View style={styles.sidebarHeader}>
          <Text style={[styles.brandTitle, { color: colors.primaryDark }]}>PodcastEditor</Text>
          <Text style={[styles.brandVersion, { color: colors.primaryLight }]}>v2.4.0</Text>
        </View>

        <View style={styles.navGroup}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.route);
            return (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.navItem,
                  { borderLeftColor: 'transparent' },
                  active && { backgroundColor: colors.sidebarActive, borderLeftColor: colors.sidebarActiveBorder },
                ]}
                onPress={() => navigate(item.route)}
              >
                <View style={[styles.navIcon, { backgroundColor: active ? colors.sidebarIconActiveBg : colors.sidebarIconBg }]}>
                  <Text style={[styles.navIconText, { color: active ? colors.primaryDark : colors.primaryLight }]}>
                    {item.icon}
                  </Text>
                </View>
                <Text style={[styles.navItemText, { color: active ? colors.primaryDark : colors.textSecondary }, active && { fontWeight: '600' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <View style={styles.profileSection}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryMuted }]} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>Editor User</Text>
            <Text style={[styles.profileRole, { color: colors.primaryLight }]}>CONTENT EDITOR</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={{ color: colors.danger }}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={[styles.mainContent, { backgroundColor: colors.surface }]}>
        <View style={[styles.topbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Content Management</Text>
          <View style={styles.topbarRight}>
            <View style={[styles.searchBar, { backgroundColor: colors.searchBg, borderColor: colors.border }]}>
              <Text style={{ color: colors.primaryMuted, fontSize: 14 }}>Search podcasts or episodes...</Text>
            </View>
            {/* Theme Toggle */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.themeToggle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <View style={[styles.avatarPlaceholderSmall, { backgroundColor: colors.primaryMuted }]} />
          </View>
        </View>
        <View style={[styles.contentArea, { backgroundColor: colors.background }]}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

export default function EditorLayout() {
  return (
    <EditorThemeProvider>
      <EditorLayoutInner />
    </EditorThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
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
  },
  brandVersion: {
    fontSize: 12,
    marginTop: 4,
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
    borderLeftWidth: 3,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  navIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconText: {
    fontSize: 11,
    fontWeight: '700',
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
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
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  profileRole: {
    fontSize: 10,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  topbar: {
    height: 72,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 300,
  },
  avatarPlaceholderSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  contentArea: {
    flex: 1,
    padding: 32,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
