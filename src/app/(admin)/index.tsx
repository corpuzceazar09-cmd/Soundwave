import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type DashboardStats = {
  totalPodcasts: number;
  totalEpisodes: number;
  failedJobs: number;
  activeFeeds: number;
  pendingFeeds: number;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalPodcasts: 0, totalEpisodes: 0, failedJobs: 0, activeFeeds: 0, pendingFeeds: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [podcastsRes, episodesRes, feedsRes, jobsRes] = await Promise.all([
        supabase.from('podcasts').select('id', { count: 'exact', head: true }),
        supabase.from('episodes').select('id', { count: 'exact', head: true }),
        supabase.from('feeds').select('status'),
        supabase.from('ingestion_jobs').select('*').order('started_at', { ascending: false }).limit(10),
      ]);

      const totalPodcasts = podcastsRes.count || 0;
      const totalEpisodes = episodesRes.count || 0;
      const allFeeds = feedsRes.data || [];
      const failedJobsFeed = allFeeds.filter(f => f.status === 'failed').length;
      
      setStats({
        totalPodcasts,
        totalEpisodes,
        failedJobs: failedJobsFeed,
        activeFeeds: allFeeds.filter(f => f.status === 'active').length,
        pendingFeeds: allFeeds.filter(f => f.status === 'pending').length,
      });
      setRecentJobs(jobsRes.data || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return { bg: '#D1FAE5', text: '#059669', label: 'SUCCESS' };
      case 'error': return { bg: '#FEE2E2', text: '#DC2626', label: 'ERROR' };
      case 'running': return { bg: '#DBEAFE', text: '#2563EB', label: 'RUNNING' };
      default: return { bg: '#F3F4F6', text: '#6B7280', label: status.toUpperCase() };
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>TOTAL PODCASTS</Text>
          <Text style={styles.statValue}>{stats.totalPodcasts}</Text>
          <Text style={[styles.statSubtext, { color: '#64748B' }]}>Across all feeds</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>TOTAL EPISODES</Text>
          <Text style={styles.statValue}>{stats.totalEpisodes}</Text>
          <Text style={[styles.statSubtext, { color: '#64748B' }]}>Archived and active</Text>
        </View>
        <View style={[styles.statCard, stats.failedJobs > 0 && styles.statCardError]}>
          <Text style={[styles.statTitle, stats.failedJobs > 0 && { color: '#DC2626' }]}>FAILED JOBS</Text>
          <Text style={[styles.statValue, stats.failedJobs > 0 && { color: '#DC2626' }]}>{stats.failedJobs}</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/failed-jobs' as any)}>
            <Text style={[styles.statSubtext, { color: '#DC2626', textDecorationLine: 'underline' }]}>
              Requires attention →
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>FEEDS</Text>
          <Text style={styles.statValue}>{stats.activeFeeds}</Text>
          <Text style={{ fontSize: 12, color: '#64748B' }}>
            Active · {stats.pendingFeeds} pending
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/(admin)/feeds' as any)}
        >
          <Text style={styles.quickActionIcon}>📡</Text>
          <Text style={styles.quickActionTitle}>Manage Feeds</Text>
          <Text style={styles.quickActionDesc}>Add, view, and manage RSS feeds</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/(admin)/ingestion-logs' as any)}
        >
          <Text style={styles.quickActionIcon}>📋</Text>
          <Text style={styles.quickActionTitle}>View Logs</Text>
          <Text style={styles.quickActionDesc}>Review ingestion job history</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/(admin)/raw-data' as any)}
        >
          <Text style={styles.quickActionIcon}>🗃️</Text>
          <Text style={styles.quickActionTitle}>Raw Data</Text>
          <Text style={styles.quickActionDesc}>Browse raw podcast data</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Ingestion Jobs */}
      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <Text style={styles.sectionTitle}>Recent Ingestion Jobs</Text>
          <View style={styles.tableActions}>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push('/(admin)/ingestion-logs' as any)}
            >
              <Text style={styles.viewAllBtnText}>View All →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {recentJobs.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No ingestion jobs yet. Add a feed to get started.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 1.5 }]}>FEED</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>TIME</Text>
              <Text style={[styles.th, { flex: 1 }]}>ITEMS</Text>
              <Text style={[styles.th, { flex: 1 }]}>STATUS</Text>
            </View>
            {recentJobs.map((job) => {
              const badge = getStatusBadge(job.status);
              return (
                <View key={job.id} style={styles.tr}>
                  <Text style={[styles.td, { flex: 1.5, fontWeight: '500' }]} numberOfLines={1}>
                    {job.feed_title || 'Unknown'}
                  </Text>
                  <Text style={[styles.td, { flex: 1.5 }]}>
                    {new Date(job.started_at).toLocaleString()}
                  </Text>
                  <Text style={[styles.td, { flex: 1 }]}>{job.items_processed}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { gap: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  statsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 160, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  statCardError: { borderColor: '#FCA5A5' },
  statTitle: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 12, letterSpacing: 0.5 },
  statValue: { fontSize: 30, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  statSubtext: { fontSize: 13, fontWeight: '500' },
  quickActionsRow: { flexDirection: 'row', gap: 16 },
  quickActionCard: {
    flex: 1, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 8, borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionIcon: { fontSize: 24, marginBottom: 8 },
  quickActionTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  quickActionDesc: { fontSize: 12, color: '#64748B' },
  tableSection: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 },
  tableHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  tableActions: { flexDirection: 'row', gap: 12 },
  viewAllBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  viewAllBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  table: { width: '100%' },
  tableHead: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  th: { fontSize: 12, fontWeight: '600', color: '#64748B', letterSpacing: 0.5 },
  tr: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center',
  },
  td: { fontSize: 14, color: '#334155' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  emptyRow: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
