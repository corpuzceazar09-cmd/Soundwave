import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

type IngestionJob = {
  id: string;
  feed_id: string | null;
  feed_title: string | null;
  status: 'success' | 'error' | 'running';
  items_processed: number;
  duration_ms: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

export default function IngestionLogsPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'running'>('all');

  const fetchJobs = useCallback(async () => {
    try {
      let query = supabase.from('ingestion_jobs').select('*').order('started_at', { ascending: false });
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      const { data } = await query;
      setJobs(data || []);
    } catch (err) {
      console.error('Ingestion logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => { fetchJobs(); }, [fetchJobs])
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'success': return { bg: '#D1FAE5', text: '#059669', label: 'Success' };
      case 'error': return { bg: '#FEE2E2', text: '#DC2626', label: 'Error' };
      case 'running': return { bg: '#DBEAFE', text: '#2563EB', label: 'Running' };
      default: return { bg: '#F3F4F6', text: '#6B7280', label: status };
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const filterTabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'success' as const, label: 'Success' },
    { key: 'error' as const, label: 'Errors' },
    { key: 'running' as const, label: 'Running' },
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
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Ingestion Job Logs</Text>
        <Text style={styles.pageSubtitle}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} logged
        </Text>
      </View>

      {/* Stats Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{jobs.filter(j => j.status === 'success').length}</Text>
          <Text style={[styles.summaryLabel, { color: '#059669' }]}>Success</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{jobs.filter(j => j.status === 'error').length}</Text>
          <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>Errors</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{jobs.filter(j => j.status === 'running').length}</Text>
          <Text style={[styles.summaryLabel, { color: '#2563EB' }]}>Running</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {jobs.reduce((sum, j) => sum + (j.items_processed || 0), 0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: '#64748B' }]}>Total Items</Text>
        </View>
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

      {/* Jobs Table */}
      {jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {filter === 'all' ? 'No ingestion jobs yet.' : `No ${filter} jobs found.`}
          </Text>
        </View>
      ) : (
        <View style={styles.tableSection}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 2 }]}>FEED</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>STARTED</Text>
            <Text style={[styles.th, { flex: 1 }]}>DURATION</Text>
            <Text style={[styles.th, { flex: 1 }]}>ITEMS</Text>
            <Text style={[styles.th, { flex: 1 }]}>STATUS</Text>
          </View>
          {jobs.map((job) => {
            const s = getStatusStyle(job.status);
            return (
              <View key={job.id} style={styles.tr}>
                <Text style={[styles.td, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>
                  {job.feed_title || 'Unknown'}
                </Text>
                <Text style={[styles.td, { flex: 1.5, fontSize: 12 }]}>
                  {new Date(job.started_at).toLocaleString()}
                </Text>
                <Text style={[styles.td, { flex: 1 }]}>{formatDuration(job.duration_ms)}</Text>
                <Text style={[styles.td, { flex: 1 }]}>{job.items_processed}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
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
  header: {},
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
  },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9',
  },
  filterTabActive: { backgroundColor: '#DBEAFE' },
  filterTabText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  filterTabTextActive: { color: '#2563EB', fontWeight: '600' },
  tableSection: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  tableHead: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  th: { fontSize: 11, fontWeight: '600', color: '#64748B', letterSpacing: 0.5 },
  tr: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center',
  },
  td: { fontSize: 13, color: '#334155' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
