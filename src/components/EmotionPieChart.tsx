import React, { useState, useEffect, useMemo } from 'react';
import { PieChart as PieIcon, Compass, Sparkles } from 'lucide-react';
import { CORE_EMOTION_LIST, getEmotionMeta } from '../services/emotionTaxonomy';

interface EmotionPieChartProps {
  distribution: Record<string, number>;
  primaryEmotion?: string;
  compact?: boolean;
  title?: string;
}

interface SliceData {
  emotion: string;
  percentage: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  color: string;
  gradientTo: string;
  bgLight: string;
  border: string;
  emoji: string;
  description: string;
  subFeelings: string[];
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArcSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.05 || outerR <= innerR + 0.5) return '';

  const clampedEnd = sweep >= 359.9 ? startAngle + 359.99 : endAngle;
  const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';

  const outerStart = polarToCartesian(cx, cy, outerR, clampedEnd);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);

  if (innerR <= 0) {
    return [
      'M',
      cx,
      cy,
      'L',
      outerEnd.x,
      outerEnd.y,
      'A',
      outerR,
      outerR,
      0,
      largeArcFlag,
      1,
      outerStart.x,
      outerStart.y,
      'Z',
    ].join(' ');
  }

  const innerStart = polarToCartesian(cx, cy, innerR, clampedEnd);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    'M',
    outerEnd.x,
    outerEnd.y,
    'A',
    outerR,
    outerR,
    0,
    largeArcFlag,
    1,
    outerStart.x,
    outerStart.y,
    'L',
    innerStart.x,
    innerStart.y,
    'A',
    innerR,
    innerR,
    0,
    largeArcFlag,
    0,
    innerEnd.x,
    innerEnd.y,
    'Z',
  ].join(' ');
}

export const EmotionPieChart: React.FC<EmotionPieChartProps> = ({
  distribution,
  primaryEmotion,
  compact = false,
  title = 'Emotion Breakdown',
}) => {
  const [chartStyle, setChartStyle] = useState<'donut' | 'pie' | 'wheel'>('donut');
  const [hoveredEmotion, setHoveredEmotion] = useState<string | null>(null);
  const [pinnedEmotion, setPinnedEmotion] = useState<string | null>(null);
  const [sweepProgress, setSweepProgress] = useState(0);

  // Normalize incoming distribution strictly into the 8 core emotions (0 for absent emotions)
  const coreDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    for (const em of CORE_EMOTION_LIST) {
      map[em] = 0;
    }
    for (const [emotion, pct] of Object.entries(distribution || {})) {
      const core = getEmotionMeta(emotion).id;
      const val = Math.max(0, Number(pct) || 0);
      map[core] = Math.round(((map[core] || 0) + val) * 10) / 10;
    }
    return map;
  }, [distribution]);

  // Reset pinned/hovered state when switching entries or distributions
  useEffect(() => {
    setPinnedEmotion(null);
    setHoveredEmotion(null);
  }, [distribution, primaryEmotion]);

  // Smooth entry sweep animation
  useEffect(() => {
    setSweepProgress(0);
    let start: number | null = null;
    let rafId: number;

    const duration = 700;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setSweepProgress(eased);
      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [coreDistribution, chartStyle]);

  const sortedEntries = useMemo(() => {
    return Object.entries(coreDistribution)
      .filter(([, pct]) => pct > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [coreDistribution]);

  const slices: SliceData[] = useMemo(() => {
    const total = sortedEntries.reduce((sum, [, pct]) => sum + pct, 0) || 100;
    let currentAngle = 0;

    return sortedEntries.map(([emotion, pct]) => {
      const meta = getEmotionMeta(emotion);
      const sliceDegrees = (pct / total) * 360 * sweepProgress;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceDegrees;
      const midAngle = startAngle + sliceDegrees / 2;
      currentAngle = endAngle;

      return {
        emotion: meta.id,
        percentage: pct,
        startAngle,
        endAngle,
        midAngle,
        color: meta.color,
        gradientTo: meta.gradientTo,
        bgLight: meta.bgLight,
        border: meta.border,
        emoji: meta.emoji,
        description: meta.description,
        subFeelings: meta.subFeelings,
      };
    });
  }, [sortedEntries, sweepProgress]);

  const normalizedPrimary = primaryEmotion
    ? getEmotionMeta(primaryEmotion).id
    : slices[0]?.emotion || 'Calm';

  const activeEmotionKey =
    hoveredEmotion || pinnedEmotion || normalizedPrimary || slices[0]?.emotion || 'Calm';
  const activePercentage = coreDistribution[activeEmotionKey] ?? 0;
  const activeMeta = getEmotionMeta(activeEmotionKey);

  const cx = 140;
  const cy = 140;
  const outerR = 112;
  const innerR = chartStyle === 'donut' ? 62 : 0;

  // Wheel geometry: 0% stays flat at wheelInnerR (0 extension)
  const wheelInnerR = 24;
  const wheelMaxR = 108;
  const maxWheelVal = useMemo(() => {
    const vals = Object.values(coreDistribution) as number[];
    return Math.max(...vals, 1);
  }, [coreDistribution]);

  // Rows to display on the right side:
  // In wheel mode, show all 8 emotions (active ones sorted first, 0% ones dimmed at 0%)
  // so 0% emotions are clearly visible as 0% alongside the empty wheel petals.
  const displayRows = useMemo(() => {
    if (chartStyle === 'wheel') {
      return [...CORE_EMOTION_LIST]
        .map((em) => ({
          emotion: em,
          percentage: coreDistribution[em] || 0,
          meta: getEmotionMeta(em),
        }))
        .sort((a, b) => b.percentage - a.percentage);
    }
    return slices.map((s) => ({
      emotion: s.emotion,
      percentage: s.percentage,
      meta: getEmotionMeta(s.emotion),
    }));
  }, [chartStyle, coreDistribution, slices]);

  return (
    <div className="space-y-5">
      {/* Header & Dynamic Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
            <PieIcon size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
            <p className="text-xs text-gray-400">
              Hover or tap any segment to explore
            </p>
          </div>
        </div>

        <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setChartStyle('donut')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              chartStyle === 'donut'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Donut
          </button>
          <button
            type="button"
            onClick={() => setChartStyle('pie')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              chartStyle === 'pie'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pie
          </button>
          <button
            type="button"
            onClick={() => setChartStyle('wheel')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              chartStyle === 'wheel'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Compass size={12} />
            <span>8-Mood Wheel</span>
          </button>
        </div>
      </div>

      {/* Main Chart + Interactive Legend Grid */}
      <div
        className={`grid grid-cols-1 ${
          compact ? 'md:grid-cols-12' : 'md:grid-cols-12'
        } gap-6 items-center bg-gradient-to-br from-slate-50/80 via-white to-purple-50/40 rounded-2xl p-4 sm:p-6 border border-gray-100`}
      >
        {/* Left: SVG Interactive Chart */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          {chartStyle === 'wheel' ? (
            /* Dynamic 8-Emotion Polar Wheel — 0% emotions strictly sit at 0 (no petal) */
            <svg viewBox="0 0 280 280" className="w-64 h-64 sm:w-72 sm:h-72 overflow-visible drop-shadow-xs">
              <defs>
                {CORE_EMOTION_LIST.map((em) => {
                  const m = getEmotionMeta(em);
                  return (
                    <radialGradient key={em} id={`wheel-grad-${em}`} cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor={m.color} stopOpacity="0.7" />
                      <stop offset="100%" stopColor={m.gradientTo} stopOpacity="0.98" />
                    </radialGradient>
                  );
                })}
              </defs>

              {/* Concentric reference rings */}
              {[45, 66, 87, 108].map((r) => (
                <circle
                  key={r}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              ))}

              {/* 8 Polar Sectors */}
              {CORE_EMOTION_LIST.map((em, idx) => {
                const meta = getEmotionMeta(em);
                const pct = coreDistribution[em] || 0;
                const isActive = activeEmotionKey === em;
                const anglePerSlice = 360 / 8;
                const startAngle = idx * anglePerSlice + 2.5;
                const endAngle = (idx + 1) * anglePerSlice - 2.5;
                const midAngle = (startAngle + endAngle) / 2;

                // Strictly 0 extension when pct <= 0; proportional radial length when pct > 0
                const petalOuterR =
                  pct > 0
                    ? wheelInnerR +
                      Math.max(8, (pct / maxWheelVal) * (wheelMaxR - wheelInnerR)) * sweepProgress
                    : wheelInnerR;

                const offset =
                  isActive && pct > 0 ? polarToCartesian(0, 0, 5, midAngle) : { x: 0, y: 0 };
                const pathD =
                  pct > 0
                    ? describeArcSlice(cx, cy, petalOuterR, wheelInnerR, startAngle, endAngle)
                    : '';
                const hitWedgeD = describeArcSlice(
                  cx,
                  cy,
                  wheelMaxR,
                  wheelInnerR,
                  startAngle,
                  endAngle
                );
                const spokeEnd = polarToCartesian(cx, cy, wheelMaxR, midAngle);
                const spokeStart = polarToCartesian(cx, cy, wheelInnerR, midAngle);
                const labelPos = polarToCartesian(cx, cy, 123, midAngle);

                return (
                  <g
                    key={em}
                    onMouseEnter={() => setHoveredEmotion(em)}
                    onMouseLeave={() => setHoveredEmotion(null)}
                    onClick={() => setPinnedEmotion(pinnedEmotion === em ? null : em)}
                    className="cursor-pointer transition-all duration-300"
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px)`,
                    }}
                  >
                    {/* Subtle axis spoke so 0% sectors clearly read as empty/zero */}
                    <line
                      x1={spokeStart.x}
                      y1={spokeStart.y}
                      x2={spokeEnd.x}
                      y2={spokeEnd.y}
                      stroke={isActive ? meta.color : '#e2e8f0'}
                      strokeOpacity={isActive ? 0.5 : 0.7}
                      strokeWidth={isActive ? 1.5 : 1}
                    />

                    {/* Transparent hit target across the sector */}
                    <path d={hitWedgeD} fill="transparent" />

                    {/* Colored petal ONLY rendered when pct > 0 */}
                    {pct > 0 && pathD && (
                      <path
                        d={pathD}
                        fill={`url(#wheel-grad-${em})`}
                        stroke={isActive ? '#1e293b' : '#ffffff'}
                        strokeWidth={isActive ? 2 : 1.5}
                        opacity={hoveredEmotion && !isActive ? 0.55 : 1}
                      />
                    )}

                    {/* Zero marker dot on inner ring when pct === 0 */}
                    {pct <= 0 && (
                      <circle
                        cx={spokeStart.x}
                        cy={spokeStart.y}
                        r={isActive ? 3.5 : 2}
                        fill={isActive ? meta.color : '#cbd5e1'}
                      />
                    )}

                    <text
                      x={labelPos.x}
                      y={labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="text-[13px] select-none pointer-events-none transition-opacity"
                      opacity={pct > 0 ? 1 : isActive ? 0.85 : 0.35}
                    >
                      {meta.emoji}
                    </text>
                  </g>
                );
              })}

              {/* Center hub */}
              <circle cx={cx} cy={cy} r={wheelInnerR} fill="#ffffff" stroke="#e2e8f0" strokeWidth={2} />
              <text
                x={cx}
                y={cy - 4}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-sm select-none pointer-events-none"
              >
                {activeMeta.emoji}
              </text>
              <text
                x={cx}
                y={cy + 11}
                textAnchor="middle"
                dominantBaseline="central"
                fill={activePercentage > 0 ? activeMeta.color : '#94a3b8'}
                className="text-[8px] font-mono font-bold select-none pointer-events-none"
              >
                {activePercentage}%
              </text>
            </svg>
          ) : (
            /* Interactive Pie / Donut Chart */
            <svg viewBox="0 0 280 280" className="w-64 h-64 sm:w-72 sm:h-72 overflow-visible drop-shadow-sm">
              <defs>
                {slices.map((s) => (
                  <linearGradient
                    key={s.emotion}
                    id={`pie-grad-${s.emotion}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={s.color} />
                    <stop offset="100%" stopColor={s.gradientTo} />
                  </linearGradient>
                ))}
                <filter id="active-slice-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.18" />
                </filter>
              </defs>

              {/* Soft outer halo */}
              <circle
                cx={cx}
                cy={cy}
                r={outerR + 6}
                fill="none"
                stroke={activeMeta.color}
                strokeOpacity={0.14}
                strokeWidth={4}
                className="transition-colors duration-300"
              />

              {slices.map((slice) => {
                const isActive = activeEmotionKey === slice.emotion;
                const popDistance = isActive ? 9 : 0;
                const offset = polarToCartesian(0, 0, popDistance, slice.midAngle);
                const d = describeArcSlice(
                  cx,
                  cy,
                  outerR,
                  innerR,
                  slice.startAngle,
                  slice.endAngle
                );

                const labelRadius = chartStyle === 'donut' ? (outerR + innerR) / 2 : outerR * 0.64;
                const labelPos = polarToCartesian(cx, cy, labelRadius, slice.midAngle);
                const showSliceLabel = slice.percentage >= 8 && sweepProgress > 0.75;

                return (
                  <g
                    key={slice.emotion}
                    onMouseEnter={() => setHoveredEmotion(slice.emotion)}
                    onMouseLeave={() => setHoveredEmotion(null)}
                    onClick={() =>
                      setPinnedEmotion(pinnedEmotion === slice.emotion ? null : slice.emotion)
                    }
                    className="cursor-pointer transition-all duration-300 ease-out"
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px)`,
                      opacity: hoveredEmotion && !isActive ? 0.68 : 1,
                    }}
                    filter={isActive ? 'url(#active-slice-shadow)' : undefined}
                  >
                    {slices.length === 1 && sweepProgress >= 0.99 ? (
                      chartStyle === 'donut' ? (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={(outerR + innerR) / 2}
                          fill="none"
                          stroke={`url(#pie-grad-${slice.emotion})`}
                          strokeWidth={outerR - innerR}
                        />
                      ) : (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={outerR}
                          fill={`url(#pie-grad-${slice.emotion})`}
                        />
                      )
                    ) : (
                      <path
                        d={d}
                        fill={`url(#pie-grad-${slice.emotion})`}
                        stroke="#ffffff"
                        strokeWidth={slices.length > 1 ? 2.5 : 0}
                        strokeLinejoin="round"
                      />
                    )}

                    {showSliceLabel && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        className="text-[11px] font-bold font-mono select-none pointer-events-none drop-shadow-xs"
                      >
                        {Math.round(slice.percentage)}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Center Hub for Donut Mode */}
              {chartStyle === 'donut' && (
                <g className="pointer-events-none select-none">
                  <circle cx={cx} cy={cy} r={innerR - 4} fill="#ffffff" />
                  <text
                    x={cx}
                    y={cy - 18}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-2xl"
                  >
                    {activeMeta.emoji}
                  </text>
                  <text
                    x={cx}
                    y={cy + 6}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0f172a"
                    className="text-sm font-bold"
                  >
                    {activeMeta.label}
                  </text>
                  <text
                    x={cx}
                    y={cy + 24}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={activeMeta.color}
                    className="text-sm font-mono font-extrabold"
                  >
                    {activePercentage}%
                  </text>
                </g>
              )}
            </svg>
          )}
        </div>

        {/* Right: Dynamic Active Emotion Spotlight + Interactive Breakdown List */}
        <div className="md:col-span-7 space-y-4">
          {/* Dynamic Focus Card */}
          <div
            className="p-4 rounded-2xl border transition-all duration-300"
            style={{
              backgroundColor: activeMeta.bgLight,
              borderColor: activeMeta.border,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{activeMeta.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">
                      {activeMeta.label}
                    </span>
                    {activeEmotionKey === normalizedPrimary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-gray-700 border border-gray-200/70">
                        <Sparkles size={10} style={{ color: activeMeta.color }} />
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                    {activeMeta.description}
                  </p>
                </div>
              </div>

              <div
                className="text-2xl font-mono font-extrabold shrink-0"
                style={{ color: activePercentage > 0 ? activeMeta.color : '#94a3b8' }}
              >
                {activePercentage}%
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {activeMeta.subFeelings.map((sf) => (
                <span
                  key={sf}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/75 text-gray-600 border border-white"
                >
                  {sf}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Slice Rows */}
          <div className={chartStyle === 'wheel' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-2'}>
            {displayRows.map(({ emotion, percentage, meta }) => {
              const isActive = activeEmotionKey === emotion;
              const isZero = percentage <= 0;

              return (
                <button
                  key={emotion}
                  type="button"
                  onMouseEnter={() => setHoveredEmotion(emotion)}
                  onMouseLeave={() => setHoveredEmotion(null)}
                  onClick={() =>
                    setPinnedEmotion(pinnedEmotion === emotion ? null : emotion)
                  }
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-white shadow-sm scale-[1.01]'
                      : isZero
                      ? 'bg-slate-50/60 border-gray-100 opacity-60 hover:opacity-90'
                      : 'bg-white/60 border-gray-100 hover:bg-white'
                  }`}
                  style={isActive ? { borderColor: meta.color } : {}}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 transition-transform"
                        style={{
                          backgroundColor: isZero ? '#cbd5e1' : meta.color,
                          transform: isActive ? 'scale(1.25)' : 'scale(1)',
                        }}
                      />
                      <span>{meta.emoji}</span>
                      <span className={isZero ? 'text-gray-500' : 'text-gray-800'}>
                        {emotion}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        isZero ? 'text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {percentage}%
                    </span>
                  </div>

                  {/* Animated progress bar */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: isZero ? '0%' : `${percentage * sweepProgress}%`,
                        background: `linear-gradient(90deg, ${meta.color}, ${meta.gradientTo})`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
