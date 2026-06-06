import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Feed = {
  id: string;
  rss_url: string;
  title: string | null;
  description: string | null;
  status: 'active' | 'failed' | 'pending';
  category: string | null;
  image_url: string | null;
  last_fetched_at: string | null;
  error_message: string | null;
  created_at: string;
};

export default function FeedsPage() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'failed' | 'pending'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFeeds = async () => {
    try {
      let query = supabase.from('feeds').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      const { data } = await query;
      setFeeds(data || []);
    } catch (err) {
      console.error('Feeds fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeeds();
    }, [filter])
  );

  const deleteFeed = async (id: string) => {
    Alert.alert('Delete Feed', 'Are you sure? This will also remove associated podcasts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setActionLoading(id);
          try {
            const { error } = await supabase.from('feeds').delete().eq('id', id);
            if (error) throw error;
            setFeeds(prev => prev.filter(f => f.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete feed');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const triggerIngestion = async (feed: Feed) => {
    setActionLoading(feed.id);
    try {
      // Create an ingestion job record
      const { error: jobError } = await supabase.from('ingestion_jobs').insert({
        feed_id: feed.id,
        feed_title: feed.title || feed.rss_url,
        status: 'running',
        items_processed: 0,
      });
      if (jobError) throw jobError;

      // Simulate ingestion (in production this would trigger a server-side process)
      setTimeout(async () => {
        const mockItems = Math.floor(Math.random() * 50) + 5;
        await supabase.from('ingestion_jobs').update({
          status: 'success',
          items_processed: mockItems,
          duration_ms: Math.floor(Math.random() * 15000) + 1000,
          completed_at: new Date().toISOString(),
        }).eq('feed_title', feed.title || feed.rss_url).eq('status', 'running');

        await supabase.from('feeds').update({
          status: 'active',
          last_fetched_at: new Date().toISOString(),
          error_message: null,
        }).eq('id', feed.id);

        fetchFeeds();
      }, 2000);

      Alert.alert('Ingestion Started', `Fetching: ${feed.title || feed.rss_url}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start ingestion');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#D1FAE5', text: '#059669' };
      case 'failed': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'pending': return { bg: '#FEF3C7', text: '#D97706' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const filterTabs = [
    { key: 'all' as const, label: 'All Feeds' },
    { key: 'active' as const, label: 'Active' },
    { key: 'pending' as const, label: 'Pending' },
    { key: 'failed' as const, label: 'Failed' },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>RSS Feed Manager</Text>
        <TouchableOpacity
          style={styles.addFeedBtn}
          onPress={() => router.push('/(admin)/add-feed' as any)}
        >
          <Text style={styles.addFeedBtnText}>+ Add Feed</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feed List */}
      {feeds.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>No feeds yet</Text>
          <Text style={styles.emptyDesc}>
            Add your first RSS feed to start ingesting podcast data.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(admin)/add-feed' as any)}
          >
            <Text style={styles.emptyBtnText}>+ Add Your First Feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.feedList}>
          {feeds.map((feed) => {
            const statusStyle = getStatusStyle(feed.status);
            return (
              <View key={feed.id} style={styles.feedCard}>
                <View style={styles.feedCardLeft}>
                  <View style={styles.feedImagePlaceholder}>
                    <Text style={styles.feedImageText}>
                      {(feed.title || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.feedInfo}>
                    <Text style={styles.feedTitle} numberOfLines={1}>
                      {feed.title || 'Untitled Feed'}
                    </Text>
                    <Text style={styles.feedUrl} numberOfLines={1}>{feed.rss_url}</Text>
                    <View style={styles.feedMeta}>
                      <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
                      <Text style={[styles.feedStatus, { color: statusStyle.text }]}>
                        {feed.status.toUpperCase()}
                      </Text>
                      {feed.category && (
                        <Text style={styles.feedCategory}>{feed.category}</Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.feedCardRight}>
                  {feed.status === 'failed' && feed.error_message && (
                    <Text style={styles.feedError} numberOfLines={2}>{feed.error_message}</Text>
                  )}
                  <View style={styles.feedActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => triggerIngestion(feed)}
                      disabled={actionLoading === feed.id}
                    >
                      {actionLoading === feed.id ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                      ) : (
                        <Text style={styles.actionBtnText}>Fetch</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtnDanger}
                      onPress={() => deleteFeed(feed.id)}
                    >
                      <Text style={styles.actionBtnDangerText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { gap: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  addFeedBtn: {
    backgroundColor: '#1D4ED8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6,
  },
  addFeedBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9',
  },
  filterTabActive: { backgroundColor: '#DBEAFE' },
  filterTabText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  filterTabTextActive: { color: '#2563EB', fontWeight: '600' },
  feedList: { gap: 12 },
  feedCard: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF',
    padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  feedCardLeft: { flexDirection: 'row', flex: 1, gap: 14 },
  feedImagePlaceholder: {
    width: 48, height: 48, borderRadius: 8, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  feedImageText: { fontSize: 18, fontWeight: '700', color: '#2563EB' },
  feedInfo: { flex: 1, justifyContent: 'center' },
  feedTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  feedUrl: { fontSize: 12, color: '#94A3B8', marginBottom: 6 },
  feedMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  feedStatus: { fontSize: 11, fontWeight: '700' },
  feedCategory: {
    fontSize: 11, color: '#64748B', backgroundColor: '#F1F5F9',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  feedCardRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 8, maxWidth: 180 },
  feedError: { fontSize: 11, color: '#DC2626', backgroundColor: '#FEF2F2', padding: 6, borderRadius: 4 },
  feedActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: '#EFF6FF',
  },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  actionBtnDanger: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: '#FEF2F2',
  },
  actionBtnDangerText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', maxWidth: 300 },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#1D4ED8', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 6,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
