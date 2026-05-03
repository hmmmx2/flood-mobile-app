/**
 * FloodWatch Unified Mobile — API namespaces
 *
 * Community APIs  → client    → flood-service-community (port 4001)
 * CRM Admin APIs  → crmClient → flood-service-crm       (port 4002)
 *
 * Naming convention:
 *   authApi, profileApi, feedApi, sensorsApi, blogsApi, postsApi, groupsApi,
 *   favouritesApi, settingsApi, safetyApi, pushApi
 *     → community endpoints (all roles)
 *
 *   dashboardApi, adminSensorsApi, analyticsApi, broadcastsApi, reportsApi,
 *   zonesApi, usersApi, adminBlogsApi, communityModApi, crmFeedApi
 *     → CRM/admin endpoints (admin role only)
 */

import { client, crmClient, tokenStore } from './client';
import type {
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  ForgotPasswordRequestDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
  FeedItemDto,
  CursorPageDto,
  SensorNodeDto,
  FavouriteNodeDto,
  BlogDto,
  PageDto,
  UpdateProfileDto,
  UserProfileDto,
  UserSettingDto,
  UpdateSettingDto,
  PostDto,
  CommentDto,
  LikeToggleDto,
  CreatePostDto,
  GroupDto,
  CreateGroupDto,
  SafetyContentDto,
  PushTokenDto,
  // CRM types
  DashboardNodeRowDto,
  AnalyticsDto,
  BroadcastDto,
  CreateBroadcastDto,
  IncidentReportDto,
  FloodZoneDto,
  UserSummaryDto,
  CreateBlogDto,
  AdminPostDto,
  AdminGroupDto,
} from './types';

// ═════════════════════════════════════════════════════════════════════════════
// COMMUNITY APIs (port 4001)
// ═════════════════════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (payload: LoginRequestDto): Promise<LoginResponseDto> => {
    const { data } = await client.post<LoginResponseDto>('/auth/login', payload);
    await tokenStore.set({
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
    });
    return data;
  },

  register: async (payload: RegisterRequestDto): Promise<LoginResponseDto> => {
    const { data } = await client.post<LoginResponseDto>('/auth/register', payload);
    await tokenStore.set({
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
    });
    return data;
  },

  logout: async (): Promise<void> => {
    await tokenStore.clear();
  },

  forgotPassword: (payload: ForgotPasswordRequestDto) =>
    client.post('/auth/forgot-password', payload),

  verifyResetCode: (payload: VerifyResetCodeDto) =>
    client.post('/auth/verify-reset-code', payload),

  resetPassword: (payload: ResetPasswordDto) =>
    client.post('/auth/reset-password', payload),
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () => client.get<UserProfileDto>('/profile').then((r) => r.data),
  update: (payload: UpdateProfileDto) =>
    client.patch<UserProfileDto>('/profile', payload).then((r) => r.data),
};

// ── Feed (community — end-user alert stream) ──────────────────────────────────

export const feedApi = {
  getPage: (cursor?: string) =>
    client
      .get<CursorPageDto<FeedItemDto>>('/feed', {
        params: cursor ? { cursor } : undefined,
      })
      .then((r) => r.data),

  getById: (id: string) =>
    client.get<FeedItemDto>(`/feed/${id}`).then((r) => r.data),
};

// ── Community sensors (end-user facing) ───────────────────────────────────────

export const sensorsApi = {
  getAll: () => client.get<SensorNodeDto[]>('/sensors').then((r) => r.data),
};

// ── Favourites ────────────────────────────────────────────────────────────────

export const favouritesApi = {
  getAll: () =>
    client.get<FavouriteNodeDto[]>('/favourites').then((r) => r.data),

  add: (nodeId: string) =>
    client.post<FavouriteNodeDto>('/favourites', { nodeId }).then((r) => r.data),

  remove: (nodeId: string) =>
    client.delete(`/favourites/${nodeId}`),
};

// ── Blogs (community read — all roles) ───────────────────────────────────────

export const blogsApi = {
  getAll: (page = 0, size = 20, category?: string) =>
    client
      .get<PageDto<BlogDto>>('/blogs', {
        params: { page, size, ...(category ? { category } : {}) },
      })
      .then((r) => r.data),

  getFeatured: () =>
    client.get<BlogDto[]>('/blogs/featured').then((r) => r.data),

  getById: (id: string) =>
    client.get<BlogDto>(`/blogs/${id}`).then((r) => r.data),
};

// ── Settings ──────────────────────────────────────────────────────────────────

export const settingsApi = {
  get: () => client.get<UserSettingDto[]>('/settings').then((r) => r.data),
  update: (payload: UpdateSettingDto) =>
    client.patch<UserSettingDto>('/settings', payload).then((r) => r.data),
};

// ── Community Posts ───────────────────────────────────────────────────────────

export const postsApi = {
  getAll: (page = 0, size = 20, sort: 'new' | 'top' = 'new', groupSlug?: string) =>
    client
      .get<PageDto<PostDto>>('/community/posts', {
        params: { page, size, sort, ...(groupSlug ? { group: groupSlug } : {}) },
      })
      .then((r) => r.data),

  getById: (id: string) =>
    client.get<PostDto>(`/community/posts/${id}`).then((r) => r.data),

  create: (payload: CreatePostDto) =>
    client.post<PostDto>('/community/posts', payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreatePostDto>) =>
    client.patch<PostDto>(`/community/posts/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    client.delete(`/community/posts/${id}`),

  toggleLike: (id: string) =>
    client.post<LikeToggleDto>(`/community/posts/${id}/like`).then((r) => r.data),

  addComment: (postId: string, content: string) =>
    client
      .post<CommentDto>(`/community/posts/${postId}/comments`, { content })
      .then((r) => r.data),

  deleteComment: (postId: string, commentId: string) =>
    client.delete(`/community/posts/${postId}/comments/${commentId}`),
};

// ── Community Groups ──────────────────────────────────────────────────────────

export const groupsApi = {
  getAll: () => client.get<GroupDto[]>('/community/groups').then((r) => r.data),

  getBySlug: (slug: string) =>
    client.get<GroupDto>(`/community/groups/${slug}`).then((r) => r.data),

  toggleMembership: (slug: string) =>
    client.post<GroupDto>(`/community/groups/${slug}/membership`).then((r) => r.data),

  create: (payload: CreateGroupDto) =>
    client.post<GroupDto>('/community/groups', payload).then((r) => r.data),
};

// ── Safety ────────────────────────────────────────────────────────────────────

export const safetyApi = {
  getAll: (lang = 'en') =>
    client.get<SafetyContentDto[]>('/safety', { params: { lang } }).then((r) => r.data),
};

// ── Push Notifications ────────────────────────────────────────────────────────

export const pushApi = {
  registerToken: (payload: PushTokenDto) =>
    client.patch('/settings/push-token', payload),
};

// ═════════════════════════════════════════════════════════════════════════════
// CRM / ADMIN APIs (port 4002 unless noted)
// ═════════════════════════════════════════════════════════════════════════════

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getNodes: () =>
    crmClient.get<DashboardNodeRowDto[]>('/dashboard/nodes').then((r) => r.data),
};

// ── Admin Sensors (CRM backend — includes isDead flag) ────────────────────────

export const adminSensorsApi = {
  getAll: () => crmClient.get<SensorNodeDto[]>('/sensors').then((r) => r.data),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsApi = {
  get: () => crmClient.get<AnalyticsDto>('/analytics').then((r) => r.data),
};

// ── CRM Alert Feed (admin view — from CRM backend) ────────────────────────────

export const crmFeedApi = {
  getPage: (cursor?: string) =>
    crmClient
      .get<CursorPageDto<FeedItemDto>>('/feed', {
        params: cursor ? { cursor } : undefined,
      })
      .then((r) => r.data),
};

// ── Broadcasts ────────────────────────────────────────────────────────────────

export const broadcastsApi = {
  getAll: () => crmClient.get<BroadcastDto[]>('/broadcasts').then((r) => r.data),

  send: (payload: CreateBroadcastDto) =>
    crmClient.post<BroadcastDto>('/broadcasts', payload).then((r) => r.data),
};

// ── Incident Reports ──────────────────────────────────────────────────────────

export const reportsApi = {
  getAll: () =>
    crmClient.get<IncidentReportDto[]>('/reports').then((r) => r.data),

  updateStatus: (id: string, status: 'reviewed' | 'resolved') =>
    crmClient
      .patch<IncidentReportDto>(`/reports/${id}/status`, { status })
      .then((r) => r.data),
};

// ── Flood Zones ───────────────────────────────────────────────────────────────

export const zonesApi = {
  getAll: () => crmClient.get<FloodZoneDto[]>('/zones').then((r) => r.data),
};

// ── User Management ───────────────────────────────────────────────────────────

export const usersApi = {
  getAll: () =>
    crmClient.get<UserSummaryDto[]>('/admin/users').then((r) => r.data),
};

// ── Admin Blog CRUD (served by community backend — BUG-CRM01 fix) ─────────────

export const adminBlogsApi = {
  getAll: (page = 0, size = 20) =>
    client.get<PageDto<BlogDto>>('/blogs', { params: { page, size } }).then((r) => r.data),
  getById: (id: string) =>
    client.get<BlogDto>(`/blogs/${id}`).then((r) => r.data),
  create: (payload: CreateBlogDto) =>
    client.post<BlogDto>('/blogs', payload).then((r) => r.data),
  update: (id: string, payload: Partial<CreateBlogDto>) =>
    client.patch<BlogDto>(`/blogs/${id}`, payload).then((r) => r.data),
  delete: (id: string) =>
    client.delete(`/blogs/${id}`).then((r) => r.data),
};

// ── AI Flood Risk Prediction (flood-ai-prediction FastAPI service) ─────────────

const AI_BASE_URL =
  process.env.EXPO_PUBLIC_AI_API_URL ?? 'http://localhost:8000';

async function aiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(35_000) });
  if (!res.ok) throw new Error(`AI service returned ${res.status}`);
  return res.json();
}

export const aiPredictionApi = {
  getMonthly: (year = new Date().getFullYear()) =>
    aiFetch(`${AI_BASE_URL}/api/v1/predict/monthly?year=${year}`),

  getDaily: (year = new Date().getFullYear()) =>
    aiFetch(`${AI_BASE_URL}/api/v1/predict/daily?year=${year}`),

  getWeekly: (year = new Date().getFullYear()) =>
    aiFetch(`${AI_BASE_URL}/api/v1/predict/weekly?year=${year}`),

  getHourly: (date: string) =>
    aiFetch(`${AI_BASE_URL}/api/v1/predict/hourly?date=${date}`),

  predictNode: (nodeId: string, waterLevel: number, rainToday = 10) =>
    aiFetch(`${AI_BASE_URL}/api/v1/predict/node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, water_level: waterLevel, rain_1day: rainToday }),
    }),

  isOnline: () =>
    fetch(`${AI_BASE_URL}/health`, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.ok)
      .catch(() => false),
};

// ── Community Moderation (served by community backend — BUG-CRM01 fix) ────────

export const communityModApi = {
  getPosts: (page = 0, size = 50) =>
    client.get<PageDto<AdminPostDto>>('/admin/posts', { params: { page, size } }).then((r) => r.data),
  deletePost: (id: string) =>
    client.delete(`/admin/posts/${id}`).then((r) => r.data),
  getGroups: () =>
    client.get<AdminGroupDto[]>('/admin/groups').then((r) => r.data),
  deleteGroup: (id: string) =>
    client.delete(`/admin/groups/${id}`).then((r) => r.data),
};
