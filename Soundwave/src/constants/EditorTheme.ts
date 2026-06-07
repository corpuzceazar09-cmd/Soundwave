export type EditorThemeColors = {
  /** Base backgrounds */
  background: string;
  surface: string;
  surfaceAlt: string;

  /** Sidebar */
  sidebarBg: string;
  sidebarBorder: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarActiveBorder: string;
  sidebarIconBg: string;
  sidebarIconActiveBg: string;

  /** Purple accent family */
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;

  /** Text */
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  /** Borders */
  border: string;
  borderLight: string;

  /** Table */
  tableHeadBg: string;
  tableRowBorder: string;

  /** Badges */
  badgeSuccess: string;
  badgeSuccessText: string;
  badgeNeutral: string;
  badgeNeutralText: string;
  badgeDanger: string;
  badgeDangerText: string;
  badgeWarning: string;
  badgeWarningText: string;

  /** Modal */
  modalOverlay: string;

  /** Misc */
  danger: string;
  warning: string;
  warningBg: string;
  cardBorder: string;
  searchBg: string;
  tabBg: string;
  tabActiveBg: string;
};

export const LightEditorTheme: EditorThemeColors = {
  background: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAF9',

  sidebarBg: '#FAF5FF',
  sidebarBorder: '#E9D5FF',
  sidebarHover: '#F3E8FF',
  sidebarActive: '#F3E8FF',
  sidebarActiveBorder: '#7C3AED',
  sidebarIconBg: '#F3E8FF',
  sidebarIconActiveBg: '#EDE9FE',

  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#8B5CF6',
  primaryMuted: '#C4B5FD',

  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  border: '#E9D5FF',
  borderLight: '#F3E8FF',

  tableHeadBg: '#FAFAF9',
  tableRowBorder: '#F5F3FF',

  badgeSuccess: '#D1FAE5',
  badgeSuccessText: '#059669',
  badgeNeutral: '#F3F4F6',
  badgeNeutralText: '#6B7280',
  badgeDanger: '#FEE2E2',
  badgeDangerText: '#DC2626',
  badgeWarning: '#FEF3C7',
  badgeWarningText: '#D97706',

  modalOverlay: 'rgba(0,0,0,0.5)',

  danger: '#EF4444',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  cardBorder: '#E9D5FF',
  searchBg: '#FFFFFF',
  tabBg: '#F3F4F6',
  tabActiveBg: '#EDE9FE',
};

export const DarkEditorTheme: EditorThemeColors = {
  background: '#0E0A16',
  surface: '#1A1423',
  surfaceAlt: '#161022',

  sidebarBg: '#120E1C',
  sidebarBorder: '#2D2440',
  sidebarHover: '#1E1730',
  sidebarActive: '#1E1730',
  sidebarActiveBorder: '#8B5CF6',
  sidebarIconBg: '#2D2440',
  sidebarIconActiveBg: '#372D50',

  primary: '#8B5CF6',
  primaryDark: '#A78BFA',
  primaryLight: '#7C3AED',
  primaryMuted: '#5B21B6',

  text: '#F1F1F1',
  textSecondary: '#A0A0B0',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',

  border: '#2D2440',
  borderLight: '#1E1730',

  tableHeadBg: '#120E1C',
  tableRowBorder: '#1E1730',

  badgeSuccess: '#064E3B',
  badgeSuccessText: '#34D399',
  badgeNeutral: '#2D2440',
  badgeNeutralText: '#A0A0B0',
  badgeDanger: '#450A0A',
  badgeDangerText: '#F87171',
  badgeWarning: '#451A03',
  badgeWarningText: '#FBBF24',

  modalOverlay: 'rgba(0,0,0,0.7)',

  danger: '#F87171',
  warning: '#FBBF24',
  warningBg: '#451A03',
  cardBorder: '#2D2440',
  searchBg: '#1A1423',
  tabBg: '#1A1423',
  tabActiveBg: '#2D2440',
};
