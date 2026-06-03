import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const FEATURED_PODCASTS = [
  { id: 1, title: 'The Tech Daily', host: 'Sarah Chen', episodes: 142, category: 'Technology', color: '#DBEAFE' },
  { id: 2, title: 'Global Markets Weekly', host: 'James Rivera', episodes: 89, category: 'Finance', color: '#FEF3C7' },
  { id: 3, title: 'Crime Chronicles', host: 'Maya Thompson', episodes: 56, category: 'True Crime', color: '#FEE2E2' },
  { id: 4, title: 'Science Now', host: 'Dr. Alan Park', episodes: 12, category: 'Science', color: '#D1FAE5' },
  { id: 5, title: 'History Revisited', host: 'Emma Wright', episodes: 78, category: 'History', color: '#E0E7FF' },
  { id: 6, title: 'Mindful Living', host: 'Liam Foster', episodes: 34, category: 'Wellness', color: '#FCE7F3' },
];

const RECENT_EPISODES = [
  { id: 1, podcast: 'The Tech Daily', title: 'AI in 2025: What\'s Real and What\'s Hype', duration: '42 min', date: 'Oct 24' },
  { id: 2, podcast: 'Crime Chronicles', title: 'The Cold Case That Shook a City', duration: '58 min', date: 'Oct 23' },
  { id: 3, podcast: 'Science Now', title: 'Deep Sea Discoveries: New Species Found', duration: '35 min', date: 'Oct 22' },
];

export default function UserDashboard() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Welcome Section */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>Welcome back 👋</Text>
        <Text style={styles.welcomeSubtitle}>
          Discover new podcasts or continue listening to your favorites.
        </Text>
      </View>

      {/* Featured Podcasts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Podcasts</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.podcastGrid}>
          {FEATURED_PODCASTS.map((p) => (
            <TouchableOpacity key={p.id} style={styles.podcastCard}>
              <View style={[styles.podcastCover, { backgroundColor: p.color }]}>
                <Text style={styles.podcastCoverIcon}>🎙️</Text>
              </View>
              <Text style={styles.podcastTitle} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.podcastHost}>{p.host}</Text>
              <View style={styles.podcastMeta}>
                <Text style={styles.podcastEpisodes}>{p.episodes} episodes</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{p.category}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Episodes */}
      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <Text style={styles.sectionTitle}>Recently Added Episodes</Text>
        </View>
        {RECENT_EPISODES.map((ep) => (
          <TouchableOpacity key={ep.id} style={styles.episodeRow}>
            <View style={styles.episodePlay}>
              <Text style={{ fontSize: 18 }}>▶</Text>
            </View>
            <View style={styles.episodeInfo}>
              <Text style={styles.episodeTitle}>{ep.title}</Text>
              <Text style={styles.episodePodcast}>{ep.podcast}</Text>
            </View>
            <Text style={styles.episodeDuration}>{ep.duration}</Text>
            <Text style={styles.episodeDate}>{ep.date}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { gap: 24 },
  welcomeCard: {
    backgroundColor: '#047857',
    borderRadius: 12,
    padding: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#A7F3D0',
    lineHeight: 22,
  },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  podcastGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  podcastCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  podcastCover: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podcastCoverIcon: {
    fontSize: 36,
  },
  podcastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  podcastHost: {
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  podcastMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  podcastEpisodes: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  tableSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  tableHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  episodePlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  episodePodcast: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  episodeDuration: {
    fontSize: 13,
    color: '#9CA3AF',
    marginRight: 24,
  },
  episodeDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
