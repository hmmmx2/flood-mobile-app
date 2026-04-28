/**
 * Analytics screen — admin only (hidden tab, push from More screen)
 * Includes live analytics + AI Flood Risk Prediction chart from flood-ai-prediction service.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Svg, { Rect, Line, Path, Text as SvgText, G } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';

import ScreenHeader from '@/src/components/ui/ScreenHeader';
import { analyticsApi, aiPredictionApi } from '@/src/api';
import { colors, spacing, typography, radius, shadow } from '@/src/theme/admin';
import type { ChartDataPoint } from '@/src/api/types';

// ── Risk constants ─────────────────────────────────────────────────────────────

const RISK_COLORS = ['#22C55E', '#F59E0B', '#F97316', '#EF4444'];
const RISK_LABELS = ['Normal', 'Alert', 'Warning', 'Critical'];
type RiskScale = 'monthly' | 'weekly' | 'daily';

// ── Bar chart (generic) ────────────────────────────────────────────────────────

function BarChart({ data, height = 160 }: { data: ChartDataPoint[]; height?: number }) {
  if (!data.length) return null;
  const W = 340;
  const PAD = { top: 16, bottom: 28, left: 28, right: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(4, (chartW / data.length) - 4);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.top + chartH * (1 - t);
        return (
          <G key={t}>
            <Line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={colors.border} strokeWidth={1} strokeDasharray="4 3" />
            <SvgText x={PAD.left - 4} y={y + 4} textAnchor="end"
              fontSize={8} fill={colors.textMuted}>
              {Math.round(maxVal * t)}
            </SvgText>
          </G>
        );
      })}
      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * chartH, 2);
        const x = PAD.left + i * (chartW / data.length) + (chartW / data.length - barW) / 2;
        const y = PAD.top + chartH - barH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH}
              fill={colors.primary} rx={3} opacity={0.85} />
            <SvgText x={x + barW / 2} y={PAD.top + chartH + 16}
              textAnchor="middle" fontSize={8} fill={colors.textMuted}>
              {d.label.slice(0, 3)}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Risk bar chart (color-coded by level) ─────────────────────────────────────

interface RiskPoint { label: string; level: number }

function RiskBarChart({ data, height = 160 }: { data: RiskPoint[]; height?: number }) {
  if (!data.length) return null;
  const W = 340;
  const PAD = { top: 16, bottom: 28, left: 48, right: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;
  const maxVal = 3;
  const barW = Math.max(5, (chartW / data.length) - 3);

  const riskLabels = ['Normal', 'Alert', 'Warn', 'Crit'];

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>
      {[0, 1, 2, 3].map((lvl) => {
        const y = PAD.top + chartH * (1 - lvl / maxVal);
        return (
          <G key={lvl}>
            <Line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
            <SvgText x={PAD.left - 4} y={y + 4} textAnchor="end"
              fontSize={7} fill={RISK_COLORS[lvl]}>
              {riskLabels[lvl]}
            </SvgText>
          </G>
        );
      })}
      {data.map((d, i) => {
        const lvl = Math.min(3, Math.max(0, d.level));
        const barH = Math.max(4, (lvl / maxVal) * chartH);
        const x = PAD.left + i * (chartW / data.length) + (chartW / data.length - barW) / 2;
        const y = PAD.top + chartH - barH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH}
              fill={RISK_COLORS[lvl] ?? '#22C55E'} rx={2} opacity={0.9} />
            {data.length <= 14 && (
              <SvgText x={x + barW / 2} y={PAD.top + chartH + 16}
                textAnchor="middle" fontSize={7} fill={colors.textMuted}>
                {d.label.slice(0, 3)}
              </SvgText>
            )}
            {data.length > 14 && i % 4 === 0 && (
              <SvgText x={x + barW / 2} y={PAD.top + chartH + 16}
                textAnchor="middle" fontSize={7} fill={colors.textMuted}>
                {d.label.slice(0, 3)}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ── Line chart ─────────────────────────────────────────────────────────────────

function LineChart({ data, height = 140 }: { data: ChartDataPoint[]; height?: number }) {
  if (data.length < 2) return null;
  const W = 340;
  const PAD = { top: 16, bottom: 28, left: 32, right: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * chartW,
    y: PAD.top + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x},${PAD.top + chartH} L${pts[0].x},${PAD.top + chartH} Z`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + chartH * (1 - t);
        return (
          <G key={t}>
            <Line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={colors.border} strokeWidth={1} strokeDasharray="4 3" />
            <SvgText x={PAD.left - 4} y={y + 4} textAnchor="end"
              fontSize={8} fill={colors.textMuted}>
              {Math.round(minVal + range * t)}
            </SvgText>
          </G>
        );
      })}
      <Path d={areaD} fill={colors.primary} opacity={0.12} />
      <Path d={pathD} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <Rect key={i} x={p.x - 3} y={p.y - 3} width={6} height={6}
          rx={3} fill={colors.primary} stroke={colors.card} strokeWidth={1.5} />
      ))}
      {[0, Math.floor(data.length / 2), data.length - 1].map((idx) => {
        const p = pts[idx];
        if (!p) return null;
        return (
          <SvgText key={idx} x={p.x} y={PAD.top + chartH + 16}
            textAnchor="middle" fontSize={8} fill={colors.textMuted}>
            {data[idx].label.slice(0, 3)}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({
  label, value, change, trend,
}: {
  label: string; value: string | number; change?: string; trend?: 'up' | 'down' | 'flat';
}) {
  const trendColor = trend === 'up' ? colors.status.critical
    : trend === 'down' ? colors.status.normal
    : colors.textMuted;
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  return (
    <View style={chip.container}>
      <Text style={chip.value}>{value}</Text>
      <Text style={chip.label}>{label}</Text>
      {change ? (
        <View style={[chip.changePill, { backgroundColor: trendColor + '20' }]}>
          <Text style={[chip.changeText, { color: trendColor }]}>{trendIcon} {change}</Text>
        </View>
      ) : null}
    </View>
  );
}

const chip = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    alignItems: 'center',
    gap: 4,
    ...shadow.light,
  },
  value: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  label: { ...typography.caption, textAlign: 'center' },
  changePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, marginTop: 2 },
  changeText: { fontSize: 10, fontWeight: '700' },
});

// ── Chart card ─────────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={cc.card}>
      <Text style={cc.title}>{title}</Text>
      {children}
    </View>
  );
}

const cc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    overflow: 'hidden',
    ...shadow.light,
  },
  title: { ...typography.h3, fontSize: 14, marginBottom: spacing.sm },
});

// ── AI Flood Risk card ─────────────────────────────────────────────────────────

function AiRiskCard({
  monthlyData,
  weeklyData,
  dailyData,
  isLoading,
  isOffline,
}: {
  monthlyData: RiskPoint[];
  weeklyData: RiskPoint[];
  dailyData: RiskPoint[];
  isLoading: boolean;
  isOffline: boolean;
}) {
  const [scale, setScale] = useState<RiskScale>('monthly');
  const scales: RiskScale[] = ['monthly', 'weekly', 'daily'];

  const chartData: RiskPoint[] =
    scale === 'monthly' ? monthlyData
    : scale === 'weekly' ? weeklyData
    : dailyData;

  return (
    <View style={aiCard.container}>
      {/* Header */}
      <View style={aiCard.header}>
        <View>
          <Text style={aiCard.title}>AI Flood Risk Prediction</Text>
          <Text style={aiCard.subtitle}>XGBoost · Sarawak Monsoon Model</Text>
        </View>
        {isOffline ? (
          <View style={aiCard.offlineBadge}>
            <Text style={aiCard.offlineText}>Offline</Text>
          </View>
        ) : (
          <View style={aiCard.liveBadge}>
            <View style={aiCard.liveDot} />
            <Text style={aiCard.liveText}>Live</Text>
          </View>
        )}
      </View>

      {/* Scale selector */}
      <View style={aiCard.scaleRow}>
        {scales.map((s) => (
          <TouchableOpacity
            key={s}
            style={[aiCard.scaleBtn, scale === s && aiCard.scaleBtnActive]}
            onPress={() => setScale(s)}
            activeOpacity={0.7}
          >
            <Text style={[aiCard.scaleBtnText, scale === s && aiCard.scaleBtnTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
      ) : isOffline ? (
        <View style={aiCard.offlineMsg}>
          <Text style={aiCard.offlineMsgText}>
            AI service offline. Start flood-ai-prediction service.
          </Text>
        </View>
      ) : (
        <RiskBarChart data={chartData} height={160} />
      )}

      {/* Legend */}
      <View style={aiCard.legend}>
        {RISK_LABELS.map((lbl, i) => (
          <View key={lbl} style={aiCard.legendItem}>
            <View style={[aiCard.legendDot, { backgroundColor: RISK_COLORS[i] }]} />
            <Text style={aiCard.legendText}>{lbl}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const aiCard = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    ...shadow.light,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  title: { ...typography.h3, fontSize: 14 },
  subtitle: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#56E40A20', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#56E40A' },
  liveText: { fontSize: 10, fontWeight: '700', color: '#56E40A' },
  offlineBadge: { backgroundColor: '#6b728020', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  offlineText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  scaleRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  scaleBtn: { flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  scaleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleBtnText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  scaleBtnTextActive: { color: '#fff' },
  offlineMsg: { alignItems: 'center', paddingVertical: 30 },
  offlineMsgText: { ...typography.caption, textAlign: 'center', maxWidth: 240 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.textMuted },
});

// ── Main screen ────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const year = new Date().getFullYear();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsApi.get,
    staleTime: 60_000,
  });

  const { data: aiMonthly, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-predict-monthly', year],
    queryFn: () => aiPredictionApi.getMonthly(year),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const { data: aiWeekly } = useQuery({
    queryKey: ['ai-predict-weekly', year],
    queryFn: () => aiPredictionApi.getWeekly(year),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const { data: aiDaily } = useQuery({
    queryKey: ['ai-predict-daily', year],
    queryFn: () => aiPredictionApi.getDaily(year),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const aiOffline = !aiLoading && !aiMonthly?.data;

  const monthlyRiskData: RiskPoint[] = (aiMonthly?.data ?? []).map(
    (d: { month: string; level: number }) => ({ label: d.month.slice(0, 3), level: d.level })
  );

  const weeklyRiskData: RiskPoint[] = (() => {
    const wd = aiWeekly?.data ?? {};
    const result: RiskPoint[] = [];
    let wk = 1;
    for (const q of Object.values(wd) as number[][]) {
      for (const lvl of q) {
        result.push({ label: `W${wk++}`, level: lvl });
      }
    }
    return result;
  })();

  const dailyRiskData: RiskPoint[] = (() => {
    const dd = aiDaily?.daily_data ?? {};
    const result: RiskPoint[] = [];
    const monthNames = Object.keys(dd);
    for (const m of monthNames) {
      const levels: number[] = dd[m] ?? [];
      levels.forEach((lvl, i) => result.push({ label: `${m.slice(0, 3)}${i + 1}`, level: lvl }));
    }
    return result;
  })();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Analytics"
        subtitle="Performance Overview"
        showBack
        rightAction={{ icon: 'refresh-outline', onPress: refetch }}
      />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : isError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Failed to load analytics</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {(data?.stats?.length ?? 0) > 0 && (
            <View style={styles.statsGrid}>
              {data!.stats.map((s) => (
                <StatChip key={s.label} label={s.label} value={s.value} change={s.change} trend={s.trend} />
              ))}
            </View>
          )}

          {/* AI Flood Risk Prediction */}
          <AiRiskCard
            monthlyData={monthlyRiskData}
            weeklyData={weeklyRiskData}
            dailyData={dailyRiskData}
            isLoading={aiLoading}
            isOffline={aiOffline}
          />

          {(data?.chartData?.length ?? 0) > 0 && (
            <ChartCard title="Monthly Flood Events">
              <BarChart data={data!.chartData} />
            </ChartCard>
          )}

          {(data?.yearlyChartData?.length ?? 1) > 1 && (
            <ChartCard title="Yearly Water Level Trend">
              <LineChart data={data!.yearlyChartData} />
            </ChartCard>
          )}

          {!data && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No analytics data available</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingTop: spacing.base, paddingBottom: spacing.xxl },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { ...typography.bodySmall },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
