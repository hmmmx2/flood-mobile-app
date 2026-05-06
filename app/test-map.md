Test Map - Appium + WDIO

Goal
Provide a quick lookup that maps app screens to the existing e2e page objects, recommended selectors to add in the app, and the spec files you should create or extend.

Legend
- App screen: file in app/ that renders the screen
- Page object: class in e2e/src/pageObjects/
- Spec: file in e2e/specs/ to create or extend
- Selector: testID or accessibilityLabel you should add in the app screen if missing

Core app (authenticated)

Home / Dashboard
- App screen: app/(app)/index.tsx
- Page object: e2e/src/pageObjects/DashboardScreen.ts
- Spec: e2e/specs/home.e2e.ts (create)
- Selector: home.title, home.alertBanner, home.navTabs

Alerts
- App screen: app/(app)/alerts.tsx
- Page object: e2e/src/pageObjects/AlertsScreen.ts
- Spec: e2e/specs/alerts.e2e.ts (existing folder e2e/specs/alerts/)
- Selector: alerts.list, alerts.item, alerts.filter

Analytics
- App screen: app/(app)/analytics.tsx
- Page object: e2e/src/pageObjects/AnalyticsScreen.ts
- Spec: e2e/specs/analytics.e2e.ts (create)
- Selector: analytics.chart, analytics.rangePicker

Blog list
- App screen: app/(app)/blog.tsx
- Page object: e2e/src/pageObjects/BlogScreen.ts
- Spec: e2e/specs/blog.e2e.ts (create)
- Selector: blog.list, blog.item

Blog detail
- App screen: app/(app)/blog/[id].tsx
- Page object: e2e/src/pageObjects/BlogDetailScreen.ts
- Spec: e2e/specs/blog-detail.e2e.ts (create)
- Selector: blogDetail.title, blogDetail.content

Broadcasts
- App screen: app/(app)/broadcasts.tsx
- Page object: e2e/src/pageObjects/BroadcastsScreen.ts
- Spec: e2e/specs/broadcasts.e2e.ts (create)
- Selector: broadcasts.list, broadcasts.item

Community list
- App screen: app/(app)/community.tsx
- Page object: e2e/src/pageObjects/CommunityScreen.ts
- Spec: e2e/specs/community.e2e.ts (create)
- Selector: community.list, community.item

Group detail
- App screen: app/(app)/g/[slug].tsx
- Page object: e2e/src/pageObjects/GroupDetailScreen.ts
- Spec: e2e/specs/community-group.e2e.ts (create)
- Selector: group.title, group.members, group.joinButton

Map
- App screen: app/(app)/map.tsx
- Page object: e2e/src/pageObjects/MapScreen.ts
- Spec: e2e/specs/map.e2e.ts (create)
- Selector: map.container, map.layersToggle, map.recenter

More
- App screen: app/(app)/more.tsx
- Page object: e2e/src/pageObjects/MoreScreen.ts
- Spec: e2e/specs/more.e2e.ts (create)
- Selector: more.list, more.logout

Post detail
- App screen: app/(app)/post/[id].tsx
- Page object: e2e/src/pageObjects/PostDetailScreen.ts
- Spec: e2e/specs/post-detail.e2e.ts (create)
- Selector: post.title, post.body, post.commentBox

Profile
- App screen: app/(app)/profile.tsx
- Page object: e2e/src/pageObjects/ProfileScreen.ts
- Spec: e2e/specs/profile.e2e.ts (create)
- Selector: profile.name, profile.editButton

Reports
- App screen: app/(app)/reports.tsx
- Page object: e2e/src/pageObjects/ReportsScreen.ts
- Spec: e2e/specs/reports.e2e.ts (create)
- Selector: reports.list, reports.newButton

Safety
- App screen: app/(app)/safety.tsx
- Page object: none yet
- Spec: e2e/specs/safety.e2e.ts (create)
- Selector: safety.list, safety.item
- TODO: add SafetyScreen page object

Sensors
- App screen: app/(app)/sensors.tsx
- Page object: e2e/src/pageObjects/SensorsScreen.ts
- Spec: e2e/specs/sensors.e2e.ts (create)
- Selector: sensors.list, sensors.item

Users (admin)
- App screen: app/(app)/users.tsx
- Page object: e2e/src/pageObjects/UsersScreen.ts
- Spec: e2e/specs/admin/users.e2e.ts (create)
- Selector: users.list, users.item, users.search

Admin blogs
- App screen: app/(app)/admin-blogs.tsx
- Page object: e2e/src/pageObjects/AdminBlogsScreen.ts
- Spec: e2e/specs/admin/admin-blogs.e2e.ts (create)
- Selector: adminBlogs.list, adminBlogs.newButton

Admin community
- App screen: app/(app)/admin-community.tsx
- Page object: e2e/src/pageObjects/AdminCommunityScreen.ts
- Spec: e2e/specs/admin/admin-community.e2e.ts (create)
- Selector: adminCommunity.list, adminCommunity.newButton

Auth

Login
- App screen: app/(auth)/login.tsx
- Page object: e2e/src/pageObjects/LoginScreen.ts
- Spec: e2e/specs/auth/login.e2e.ts (existing folder e2e/specs/auth/)
- Selector: auth.email, auth.password, auth.loginButton

Register
- App screen: app/(auth)/register.tsx
- Page object: e2e/src/pageObjects/RegisterScreen.ts
- Spec: e2e/specs/auth/register.e2e.ts (create)
- Selector: auth.name, auth.email, auth.password, auth.registerButton

Forgot password
- App screen: app/(auth)/forgot-password.tsx
- Page object: e2e/src/pageObjects/ForgotPasswordScreen.ts
- Spec: e2e/specs/auth/forgot-password.e2e.ts (create)
- Selector: auth.email, auth.resetButton

Cross-cutting components

Bottom tabs
- Component: e2e/src/pageObjects/BottomTabBar.ts
- Selector: tabs.home, tabs.alerts, tabs.community, tabs.map, tabs.more

Toast / banners
- Component: src/components/Toast.tsx, src/components/FloodAlertBanner.tsx
- Selector: toast.message, floodAlert.banner

Error boundary
- Component: src/components/ErrorBoundary.tsx
- Selector: errorBoundary.message, errorBoundary.retry

Recommended spec layering
- Smoke: login, open home, open alerts, logout
- Regression: full navigation + CRUD flows for reports, posts, admin flows

Open gaps to implement
- Missing page object for Safety screen
- Add testID or accessibilityLabel on screens where selectors are not stable
- Add specs for every screen listed above
