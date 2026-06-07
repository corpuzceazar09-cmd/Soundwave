import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

type FailedFeed = {
  id: string;
  rss_url: string;
  title: string | null;
  status: 'failed';
  category: string | null;
  error_message: string | null;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function FailedJobsPage() {
  const [feeds, setFeeds] = useState<FailedFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);

  const fetchFailedFeeds = useCallback(async () => {
    try {
      const [feedsRes, jobsRes] = await Promise.all([
        supabase.from('feeds').select('*').eq('status', 'failed').order('updated_at', { ascending: false }),
        supabase.from('ingestion_jobs').select('*').eq('status', 'error').order('started_at', { ascending: false }).limit(20),
      ]);
      setFeeds((feedsRes.data ?? []) as FailedFeed[]);
      setFailedJobs(jobsRes.data ?? []);
    } catch (err) {
      console.error('Failed jobs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchFailedFeeds(); }, [fetchFailedFeeds])
  );

  const retryFeed = async (feed: FailedFeed) => {
    setRetryingId(feed.id);
    try {
      const { error } = await supabase
        .from('feeds')
        .update({ status: 'pending', error_message: null })
        .eq('id', feed.id);
      if (error) throw error;
      setFeeds(prev => prev.filter(f => f.id !== feed.id));
      Alert.alert('Retry Initiated', `Re-ingesting: ${feed.title || feed.rss_url}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to retry feed');
    } finally {
      setRetryingId(null);
    }
  };

  const retryAll = async () => {
    Alert.alert('Retry All', `Retry all ${feeds.length} failed feeds?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Retry All', onPress: () => feeds.forEach((f) => retryFeed(f)) },
    ]);
  };

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
        <View>
          <Text style={styles.pageTitle}>Failed Jobs Queue</Text>
          <Text style={styles.pageSubtitle}>
            {feeds.length} failed feed{feeds.length !== 1 ? 's' : ''} · {failedJobs.length} failed job{feeds.length !== 1 ? 's' : ''} in logs
          </Text>
        </View>
        {feeds.length > 0 && (
          <TouchableOpacity style={styles.retryAllBtn} onPress={retryAll}>
            <Text style={styles.retryAllBtnText}>Retry All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Failed Feeds */}
      {feeds.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>All Clear!</Text>
          <Text style={styles.emptyDesc}>There are no failed feeds. Everything is running smoothly.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Failed Feeds</Text>
          {feeds.map((feed) => (
            <View key={feed.id} style={styles.failedCard}>
              <View style={styles.failedCardLeft}>
                <View style={styles.errorIcon}>
                  <Text style={styles.errorIconText}>!</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedTitle}>{feed.title || 'Untitled Feed'}</Text>
                  <Text style={styles.feedUrl} numberOfLines={1}>{feed.rss_url}</Text>
                  {feed.error_message && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{feed.error_message}</Text>
                    </View>
                  )}
                  <Text style={styles.failedDate}>
                    Failed on: {new Date(feed.updated_at || feed.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => retryFeed(feed)}
                disabled={retryingId === feed.id}
              >
                {retryingId === feed.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.retryBtnText}>Retry</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Failed Job Logs */}
      {failedJobs.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Failed Ingestion Jobs (Logs)</Text>
          {failedJobs.map((job) => (
            <View key={job.id} style={styles.logItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.logFeed}>{job.feed_title || 'Unknown'}</Text>
                <Text style={styles.logDate}>{new Date(job.started_at).toLocaleString()}</Text>
                {job.error_message && (
                  <Text style={styles.logError}>{job.error_message}</Text>
                )}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { gap: 12, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  retryAllBtn: {
    backgroundColor: '#DC2626', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6,
  },
  retryAllBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  failedCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 16,
    borderRadius: 8, borderWidth: 1, borderColor: '#FECACA',
  },
  failedCardLeft: { flexDirection: 'row', flex: 1, gap: 12 },
  errorIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },
  errorIconText: { fontSize: 18, fontWeight: '700', color: '#DC2626' },
  feedTitle: { fontSize: 14, fontWeight: '600', color: '#991B1B' },
  feedUrl: { fontSize: 12, color: '#B91C1C', marginTop: 2 },
  errorBox: {
    backgroundColor: '#FEE2E2', padding: 8, borderRadius: 4, marginTop: 6,
  },
  errorText: { fontSize: 12, color: '#DC2626' },
  failedDate: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  retryBtn: {
    backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, marginLeft: 12, minWidth: 60, alignItems: 'center',
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  logItem: {
    backgroundColor: '#FEF2F2', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA',
  },
  logFeed: { fontSize: 14, fontWeight: '500', color: '#991B1B' },
  logDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  logError: { fontSize: 12, color: '#DC2626', marginTop: 4, backgroundColor: '#FEE2E2', padding: 6, borderRadius: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12, backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#166534' },
  emptyDesc: { fontSize: 14, color: '#166534', textAlign: 'center', maxWidth: 300 },
});
