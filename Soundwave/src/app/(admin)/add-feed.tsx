import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Category = { id: string; name: string; color: string };

export default function AddFeedPage() {
  const router = useRouter();
  const [rssUrl, setRssUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!rssUrl.trim()) {
      errs.rssUrl = 'RSS URL is required';
    } else if (!rssUrl.startsWith('http://') && !rssUrl.startsWith('https://')) {
      errs.rssUrl = 'Must be a valid URL starting with http:// or https://';
    }
    if (!selectedCategory) {
      errs.category = 'Please select a category';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('feeds').insert({
        rss_url: rssUrl.trim(),
        category: selectedCategory || null,
        status: 'pending',
      });
      if (error) throw error;

      Alert.alert('Feed Added', 'The RSS feed has been added and is pending ingestion.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      if (err.code === '23505') {
        setErrors({ rssUrl: 'This RSS feed URL already exists' });
      } else {
        Alert.alert('Error', err.message || 'Failed to add feed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back to Feeds</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Add RSS Feed</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formSectionTitle}>Feed Details</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>RSS Feed URL *</Text>
          <TextInput
            style={[styles.input, errors.rssUrl && styles.inputError]}
            placeholder="https://example.com/feed/podcast/rss.xml"
            value={rssUrl}
            onChangeText={(v) => { setRssUrl(v); setErrors(prev => ({ ...prev, rssUrl: '' })); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {errors.rssUrl && <Text style={styles.errorText}>{errors.rssUrl}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.name && { backgroundColor: cat.color + '20', borderColor: cat.color },
                ]}
                onPress={() => { setSelectedCategory(cat.name); setErrors(prev => ({ ...prev, category: '' })); }}
              >
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === cat.name && { color: cat.color, fontWeight: '600' },
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Podcast Title (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Auto-detected from RSS feed"
            editable={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Add Feed</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ About RSS Feeds</Text>
        <Text style={styles.infoText}>
          The system will fetch the RSS feed, parse it for podcast episodes,
          and store them in the database. This process runs asynchronously.
          You can check the ingestion logs for status updates.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { gap: 20, paddingBottom: 40 },
  header: { gap: 8 },
  backBtn: { fontSize: 14, color: '#2563EB', fontWeight: '500' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  formCard: {
    backgroundColor: '#FFFFFF', padding: 24, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  formSectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12,
    fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryChipText: { fontSize: 13, color: '#475569' },
  submitBtn: {
    backgroundColor: '#1D4ED8', paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#93C5FD' },
  submitBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  infoCard: {
    backgroundColor: '#EFF6FF', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#1E40AF', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },
});
