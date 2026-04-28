// ─────────────────────────────────────────────────────────────────────────────
// FloodWatch Unified Mobile — API Types
//
// Community backend (port 4001): auth, profile, community, blogs, sensors, feed
// CRM backend      (port 4002): dashboard, analytics, broadcasts, reports, zones, users
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ──────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'customer';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Convenience: firstName + " " + lastName (always present) */
  displayName: string;
  role: UserRole;
  phone?: string;
  locationLabel?: string;
  avatarUrl?: string;
}

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface LoginResponseDto {
  user: AuthUser;
  session: AuthSessionDto;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterRequestDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface VerifyResetCodeDto {
  email: string;
  code: string;
}

export interface ResetPasswordDto {
  email: string;
  newPassword: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface CursorPageDto<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface PageDto<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ── Feed / Alerts ─────────────────────────────────────────────────────────────

export type AlertSeverity = 'normal' | 'watch' | 'warning' | 'critical';

export interface FeedItemDto {
  id: string;
  kind: 'alert' | 'update';
  severity: AlertSeverity;
  title: string;
  summary: string;
  sensorId: string;
  sensorName: string;
  waterLevelMeters: number;
  createdAt: string;
}

// ── Sensor Nodes ──────────────────────────────────────────────────────────────

export type FloodLevel = 0 | 1 | 2 | 3;
export type NodeStatus = 'Normal' | 'Watch' | 'Warning' | 'Critical' | 'Offline';

/**
 * Unified SensorNodeDto — works for both community (port 4001) and CRM (port 4002).
 * 'isDead' is provided by the CRM backend; 'distance' by the community backend.
 */
export interface SensorNodeDto {
  id: string;
  nodeId: string;
  name: string;
  area: string;
  location: string;
  state: string;
  latitude: number;
  longitude: number;
  currentLevel: FloodLevel;
  status: 'active' | 'warning' | 'inactive';
  /** CRM backend: true if the node is offline/dead */
  isDead?: boolean;
  /** Community backend: human-readable distance from user */
  distance?: string;
  lastUpdated?: string;
}

// ── Favourites ────────────────────────────────────────────────────────────────

export interface FavouriteNodeDto extends SensorNodeDto {
  favouritedAt: string;
}

// ── Blogs ─────────────────────────────────────────────────────────────────────

/**
 * Unified BlogDto — covers both community read and admin CRUD.
 */
export interface BlogDto {
  id: string;
  title: string;
  body: string;
  /** Community backend field */
  imageKey?: string;
  category?: string;
  readingTimeMinutes?: number;
  isFeatured: boolean;
  createdAt: string;
  /** CRM backend additional fields */
  updatedAt?: string;
  authorId?: string;
}

export interface CreateBlogDto {
  title: string;
  body: string;
  category?: string;
  isFeatured?: boolean;
  readingTimeMinutes?: number;
}

// ── User Profile & Settings ───────────────────────────────────────────────────

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserRole;
  phone?: string | null;
  locationLabel?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  locationLabel?: string;
  avatarUrl?: string;
}

export interface UserSettingDto {
  key: string;
  label: string;
  enabled: boolean;
}

export interface UpdateSettingDto {
  key: string;
  enabled: boolean;
}

// ── Community Posts & Groups ──────────────────────────────────────────────────

export interface PostDto {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  groupId?: string | null;
  groupSlug?: string | null;
  groupName?: string | null;
  title: string;
  content: string;
  imageUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
  comments?: CommentDto[] | null;
}

export interface CommentDto {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
}

export interface LikeToggleDto {
  liked: boolean;
  likesCount: number;
}

export interface CreatePostDto {
  title: string;
  content: string;
  imageUrl?: string | null;
  groupSlug?: string | null;
}

export interface GroupDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconLetter?: string;
  iconColor?: string;
  membersCount: number;
  postsCount: number;
  joinedByMe: boolean;
  createdAt: string;
}

export interface CreateGroupDto {
  name: string;
  slug: string;
  description?: string;
}

// ── Safety Content ────────────────────────────────────────────────────────────

export interface SafetyContentDto {
  id: string;
  section: string;
  lang: string;
  content: string;
  updatedAt: string;
}

// ── Push Notifications ────────────────────────────────────────────────────────

export interface PushTokenDto {
  token: string;
  platform: 'android' | 'ios';
}

// ── CRM: Dashboard ────────────────────────────────────────────────────────────

export interface DashboardNodeRowDto {
  id: string;
  nodeId: string;
  name: string;
  area: string;
  level: string;
  status: NodeStatus;
  update: string;
  timestamp: string;
}

// ── CRM: Analytics ────────────────────────────────────────────────────────────

export interface StatCardDto {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface AnalyticsDto {
  stats: StatCardDto[];
  chartData: ChartDataPoint[];
  yearlyChartData: ChartDataPoint[];
}

// ── CRM: Broadcasts ───────────────────────────────────────────────────────────

export interface BroadcastDto {
  id: string;
  title: string;
  body: string;
  targetZone: string;
  severity: AlertSeverity;
  sentBy: string;
  sentAt: string;
  recipientCount: number;
}

export interface CreateBroadcastDto {
  title: string;
  body: string;
  targetZone: string;
  severity: AlertSeverity;
}

// ── CRM: Incident Reports ─────────────────────────────────────────────────────

export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface IncidentReportDto {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  severity: AlertSeverity;
  description?: string;
  status: ReportStatus;
  submittedAt: string;
}

// ── CRM: Flood Zones ──────────────────────────────────────────────────────────

export interface FloodZoneDto {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  activeSensorCount: number;
  lastFloodDate?: string;
  floodFrequency12m: number;
}

// ── CRM: User Management ──────────────────────────────────────────────────────

export interface UserSummaryDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

// ── CRM: Community Moderation ─────────────────────────────────────────────────

export interface AdminPostDto {
  id: string;
  title?: string;
  content: string;
  authorName: string;
  authorId: string;
  groupSlug?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface AdminGroupDto {
  id: string;
  slug: string;
  name: string;
  description?: string;
  membersCount: number;
  createdAt: string;
}
