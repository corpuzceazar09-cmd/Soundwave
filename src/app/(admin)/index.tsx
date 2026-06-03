import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>TOTAL PODCASTS</Text>
          <Text style={styles.statValue}>12,402</Text>
          <Text style={styles.statChange}>↑ +4.2% from last month</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>TOTAL EPISODES</Text>
          <Text style={styles.statValue}>450,210</Text>
          <Text style={styles.statSubtitle}>Archived and active</Text>
        </View>
        <View style={[styles.statCard, styles.statCardError]}>
          <Text style={[styles.statTitle, styles.textError]}>FAILED JOBS</Text>
          <Text style={[styles.statValue, styles.textError]}>14</Text>
          <Text style={[styles.statSubtitle, styles.textErrorUnderline]}>Requires attention</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.syncStatusHeader}>
            <Text style={styles.statTitle}>SYNC STATUS</Text>
            <View style={styles.dotGreen} />
          </View>
          <Text style={styles.statValue}>98.2%</Text>
          <Text style={styles.statSuccess}>HEALTHY</Text>
        </View>
      </View>

      <View style={styles.mainRow}>
        {/* System Health Graph Mock */}
        <View style={styles.graphSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>System Health</Text>
            <View style={styles.legend}>
              <View style={[styles.dotBlue, { marginRight: 4 }]} />
              <Text style={styles.legendText}>Response Time</Text>
              <View style={[styles.dotGray, { marginLeft: 16, marginRight: 4 }]} />
              <Text style={styles.legendText}>Traffic Load</Text>
            </View>
          </View>
          <View style={styles.graphMock}>
            {/* Simple CSS-based sine wave mock or just a placeholder for the graph */}
            <View style={styles.graphLine} />
            <View style={styles.graphTooltip}>
              <Text style={styles.tooltipText}>248ms (Avg)</Text>
            </View>
          </View>
        </View>

        {/* Active Workers */}
        <View style={styles.workersSection}>
          <Text style={styles.sectionTitle}>Active Workers</Text>
          <View style={styles.workerList}>
            <View style={styles.workerItem}>
              <View style={styles.workerIconBlue} />
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>Ingestion-01</Text>
                <Text style={styles.workerTask}>Parsing RSS XML</Text>
              </View>
              <Text style={styles.workerCpu}>88% CPU</Text>
            </View>
            <View style={styles.workerItem}>
              <View style={styles.workerIconLightBlue} />
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>Ingestion-02</Text>
                <Text style={styles.workerTask}>Analyzing Metadata</Text>
              </View>
              <Text style={styles.workerCpu}>42% CPU</Text>
            </View>
            <View style={styles.workerItem}>
              <View style={styles.workerIconGray} />
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>Worker-Idle</Text>
                <Text style={styles.workerTask}>Standby</Text>
              </View>
              <Text style={styles.workerCpuGray}>2% CPU</Text>
            </View>
          </View>
          <Text style={styles.viewAllText}>View All Nodes →</Text>
        </View>
      </View>

      {/* Recent Ingestion Jobs Table */}
      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <Text style={styles.sectionTitle}>Recent Ingestion Jobs</Text>
          <View style={styles.tableActions}>
            <View style={styles.filterBtn}>
              <Text style={styles.filterBtnText}>Filter</Text>
            </View>
            <View style={styles.exportBtn}>
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 1 }]}>JOB ID</Text>
            <Text style={[styles.th, { flex: 2 }]}>FEED SOURCE</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>TIMESTAMP</Text>
            <Text style={[styles.th, { flex: 1 }]}>DURATION</Text>
            <Text style={[styles.th, { flex: 1 }]}>ITEMS</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>STATUS</Text>
            <Text style={[styles.th, { width: 50, textAlign: 'center' }]}>ACTION</Text>
          </View>
          
          {/* Table Row 1 */}
          <View style={styles.tr}>
            <Text style={[styles.td, { flex: 1 }]}>#J-92812</Text>
            <Text style={[styles.td, { flex: 2, fontWeight: '500' }]}>The Tech Daily</Text>
            <Text style={[styles.td, { flex: 1.5 }]}>Oct 24, 09:42:12</Text>
            <Text style={[styles.td, { flex: 1 }]}>12.4s</Text>
            <Text style={[styles.td, { flex: 1 }]}>142</Text>
            <View style={{ flex: 1.5 }}>
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeSuccessText}>SUCCESS</Text>
              </View>
            </View>
            <Text style={[styles.td, { width: 50, textAlign: 'center', color: '#1D4ED8', fontWeight: 'bold' }]}>•••</Text>
          </View>

          {/* Table Row 2 */}
          <View style={styles.tr}>
            <Text style={[styles.td, { flex: 1 }]}>#J-92811</Text>
            <Text style={[styles.td, { flex: 2, fontWeight: '500' }]}>Global Markets Weekly</Text>
            <Text style={[styles.td, { flex: 1.5 }]}>Oct 24, 09:40:01</Text>
            <Text style={[styles.td, { flex: 1 }]}>1.2s</Text>
            <Text style={[styles.td, { flex: 1 }]}>0</Text>
            <View style={{ flex: 1.5 }}>
              <View style={styles.badgeError}>
                <Text style={styles.badgeErrorText}>ERROR</Text>
              </View>
            </View>
            <Text style={[styles.td, { width: 50, textAlign: 'center', color: '#1D4ED8', fontWeight: 'bold' }]}>•••</Text>
          </View>

          {/* Table Row 3 */}
          <View style={styles.tr}>
            <Text style={[styles.td, { flex: 1 }]}>#J-92810</Text>
            <Text style={[styles.td, { flex: 2, fontWeight: '500' }]}>Crime Chronicles</Text>
            <Text style={[styles.td, { flex: 1.5 }]}>Oct 24, 09:38:45</Text>
            <Text style={[styles.td, { flex: 1 }]}>--</Text>
            <Text style={[styles.td, { flex: 1 }]}>56</Text>
            <View style={{ flex: 1.5 }}>
              <View style={styles.badgeInfo}>
                <Text style={styles.badgeInfoText}>RUNNING</Text>
              </View>
            </View>
            <Text style={[styles.td, { width: 50, textAlign: 'center', color: '#1D4ED8', fontWeight: 'bold' }]}>•••</Text>
          </View>

        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    gap: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardError: {
    borderColor: '#FCA5A5',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    numberOfLines: 1,
  },
  statChange: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  statSuccess: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  textError: {
    color: '#DC2626',
  },
  textErrorUnderline: {
    color: '#DC2626',
    textDecorationLine: 'underline',
  },
  syncStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  dotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  dotGray: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  mainRow: {
    flexDirection: 'row',
    gap: 16,
  },
  graphSection: {
    flex: 3,
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 24,
  },
  workersSection: {
    flex: 1.5,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
  },
  graphMock: {
    height: 250,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  graphLine: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#2563EB',
    borderRadius: 2,
    opacity: 0.5,
    transform: [{ rotate: '-5deg' }],
  },
  graphTooltip: {
    position: 'absolute',
    top: '30%',
    left: '60%',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tooltipText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  workerList: {
    gap: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerIconBlue: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
    marginRight: 12,
  },
  workerIconLightBlue: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    marginRight: 12,
  },
  workerIconGray: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  workerInfo: {
    flex: 1,
    marginRight: 4,
  },
  workerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  workerTask: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  workerCpu: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  workerCpuGray: {
    fontSize: 13,
    color: '#94A3B8',
  },
  viewAllText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  exportBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  table: {
    width: '100%',
  },
  tableHead: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  th: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tr: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  td: {
    fontSize: 14,
    color: '#334155',
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSuccessText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeError: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeErrorText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeInfo: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeInfoText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '700',
  },
});
