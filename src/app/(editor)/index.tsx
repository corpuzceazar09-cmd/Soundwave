import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const MOCK_PODCASTS = [
  { id: 1, title: 'The Tech Daily', episodes: 142, status: 'Published', lastEdit: 'Oct 24, 2024' },
  { id: 2, title: 'Global Markets Weekly', episodes: 89, status: 'Draft', lastEdit: 'Oct 23, 2024' },
  { id: 3, title: 'Crime Chronicles', episodes: 56, status: 'Published', lastEdit: 'Oct 22, 2024' },
  { id: 4, title: 'Science Now', episodes: 12, status: 'Review', lastEdit: 'Oct 21, 2024' },
];

export default function EditorDashboard() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>MY PODCASTS</Text>
          <Text style={styles.statValue}>4</Text>
          <Text style={styles.statSubtitle}>Assigned to you</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>TOTAL EPISODES</Text>
          <Text style={styles.statValue}>299</Text>
          <Text style={styles.statSubtitle}>Across all podcasts</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWarning]}>
          <Text style={[styles.statTitle, { color: '#D97706' }]}>PENDING REVIEW</Text>
          <Text style={[styles.statValue, { color: '#D97706' }]}>3</Text>
          <Text style={styles.statSubtitle}>Needs approval</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>DRAFTS</Text>
          <Text style={styles.statValue}>7</Text>
          <Text style={styles.statSubtitle}>In progress</Text>
        </View>
      </View>

      {/* My Podcasts */}
      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <Text style={styles.sectionTitle}>My Podcasts</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ New Episode</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 2.5 }]}>TITLE</Text>
            <Text style={[styles.th, { flex: 1 }]}>EPISODES</Text>
            <Text style={[styles.th, { flex: 1 }]}>STATUS</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>LAST EDITED</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>ACTION</Text>
          </View>

          {MOCK_PODCASTS.map((p) => (
            <View key={p.id} style={styles.tr}>
              <Text style={[styles.td, { flex: 2.5, fontWeight: '500' }]}>{p.title}</Text>
              <Text style={[styles.td, { flex: 1 }]}>{p.episodes}</Text>
              <View style={{ flex: 1 }}>
                <View style={[
                  styles.badge,
                  p.status === 'Published' && styles.badgeSuccess,
                  p.status === 'Draft' && styles.badgeDraft,
                  p.status === 'Review' && styles.badgeReview,
                ]}>
                  <Text style={[
                    styles.badgeText,
                    p.status === 'Published' && styles.badgeSuccessText,
                    p.status === 'Draft' && styles.badgeDraftText,
                    p.status === 'Review' && styles.badgeReviewText,
                  ]}>{p.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={[styles.td, { flex: 1.5 }]}>{p.lastEdit}</Text>
              <TouchableOpacity style={{ width: 80, alignItems: 'center' }}>
                <Text style={{ color: '#7C3AED', fontWeight: '600', fontSize: 13 }}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <View style={styles.quickAction}>
          <Text style={styles.quickActionIcon}>📝</Text>
          <Text style={styles.quickActionTitle}>Create Draft</Text>
          <Text style={styles.quickActionDesc}>Start a new episode draft</Text>
        </View>
        <View style={styles.quickAction}>
          <Text style={styles.quickActionIcon}>📤</Text>
          <Text style={styles.quickActionTitle}>Upload Media</Text>
          <Text style={styles.quickActionDesc}>Add audio or images</Text>
        </View>
        <View style={styles.quickAction}>
          <Text style={styles.quickActionIcon}>👁️</Text>
          <Text style={styles.quickActionTitle}>Preview</Text>
          <Text style={styles.quickActionDesc}>Preview published content</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { gap: 24 },
  statsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  statCardWarning: { borderColor: '#FDE68A' },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  statSubtitle: { fontSize: 13, color: '#6B7280' },
  tableSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E9D5FF',
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  addBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  table: { width: '100%' },
  tableHead: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8FF',
    backgroundColor: '#FAFAF9',
  },
  th: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5 },
  tr: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
    alignItems: 'center',
  },
  td: { fontSize: 14, color: '#374151' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  badgeSuccessText: { color: '#059669' },
  badgeDraft: { backgroundColor: '#F3F4F6' },
  badgeDraftText: { color: '#6B7280' },
  badgeReview: { backgroundColor: '#FEF3C7' },
  badgeReviewText: { color: '#D97706' },
  quickActionsRow: { flexDirection: 'row', gap: 16 },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
  },
  quickActionIcon: { fontSize: 28, marginBottom: 12 },
  quickActionTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  quickActionDesc: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
});
