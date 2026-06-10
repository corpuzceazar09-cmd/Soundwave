import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function AnalyticsPage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.pageTitle}>Analytics</Text>
      <Text style={styles.pageSubtitle}>Cross-database analytics coming soon.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 24, gap: 16 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#0F172A' },
  pageSubtitle: { fontSize: 14, color: '#64748B' },
});
