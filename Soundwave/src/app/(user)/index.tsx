import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TRENDING = [
  { title: 'Crime Junkie', color: '#1E293B', icon: 'flame' },
  { title: 'The Daily', color: '#1E3A5F', icon: 'newspaper' },
  { title: 'SmartLess', color: '#3B1F2E', icon: 'chatbubbles' },
  { title: 'Huberman Lab', color: '#1F3B2E', icon: 'fitness' },
];

const CATEGORIES = [
  { label: 'True Crime', color: '#DC2626' },
  { label: 'Science', color: '#2563EB' },
  { label: 'Comedy', color: '#D97706' },
  { label: 'Technology', color: '#059669' },
  { label: 'Business', color: '#7C3AED' },
  { label: 'Health', color: '#DB2777' },
];

export default function UserHomeScreen() {
  const renderFeaturedBanner = () => (
    <LinearGradient
      colors={['#1E293B', '#0F172A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.featuredCard}
    >
      <View style={styles.featuredContent}>
        <View style={styles.featuredBadge}>
          <Ionicons name="sparkles" size={12} color="#FBBF24" />
          <Text style={styles.featuredBadgeText}>FEATURED</Text>
        </View>
        <Text style={styles.featuredTitle}>THE DAILY DRIVE</Text>
        <Text style={styles.featuredHost}>with John Smith</Text>
        <Text style={styles.featuredDesc}>
          Navigating tomorrow's tech landscape — one conversation at a time.
        </Text>
        <TouchableOpacity style={styles.listenButton}>
          <Ionicons name="play" size={18} color="#0F172A" />
          <Text style={styles.listenButtonText}>Listen Now</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.featuredGraphic}>
        <Ionicons name="mic-circle" size={120} color="rgba(56, 189, 248, 0.15)" />
      </View>
    </LinearGradient>
  );

  const renderTrendingRow = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Now</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
        {TRENDING.map((item) => (
          <TouchableOpacity key={item.title} style={styles.trendingCard}>
            <View style={[styles.trendingIconBg, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.trendingTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.trendingEpisodes}>24 episodes</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Categories</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>Browse All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.label} style={styles.categoryCard}>
            <View style={[styles.categoryAccent, { backgroundColor: cat.color }]} />
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {renderFeaturedBanner()}
      {renderTrendingRow()}
      {renderCategories()}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    gap: 32,
  },
  // Featured Banner
  featuredCard: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredContent: {
    flex: 1,
    maxWidth: '60%',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  featuredHost: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 12,
  },
  featuredDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  listenButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  featuredGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Trending Section
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
  },
  trendingRow: {
    gap: 16,
    paddingRight: 24,
  },
  trendingCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: 'rgba(0,0,0,0.04)' }],
  },
  trendingIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  trendingEpisodes: {
    fontSize: 11,
    color: '#94A3B8',
  },
  // Categories
  categoriesRow: {
    gap: 12,
    paddingRight: 24,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  categoryAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});
