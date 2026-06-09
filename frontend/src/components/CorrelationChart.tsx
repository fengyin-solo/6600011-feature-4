import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine } from 'recharts';
import { useEEGStore } from '../store/eeg';

const CHANNEL_NAMES: Record<string, string> = {
  Fp1: '左前额', Fp2: '右前额', F3: '左额', F4: '右额',
  C3: '左中央', C4: '右中央', P3: '左顶', P4: '右顶',
  O1: '左枕', O2: '右枕'
};

export const CorrelationChart: React.FC = () => {
  const { correlationData, selectedChannel, selectedTimePoint, setSelectedTimePoint } = useEEGStore();
  const channelName = CHANNEL_NAMES[selectedChannel] || selectedChannel;
  const isLinked = selectedTimePoint !== null;

  if (!correlationData) {
    return (
      <div style={{
        padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        outline: isLinked ? '2px solid #1565c0' : 'none',
        outlineOffset: '-2px',
        transition: 'outline 0.2s ease',
      }}>
        <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🔗</span>
          <span>{selectedChannel}</span>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 400 }}>{channelName} · 通道相关分析</span>
          {isLinked && (
            <span style={{
              fontSize: '12px', fontWeight: 600, color: '#fff', background: '#1565c0',
              padding: '2px 10px', borderRadius: '12px', marginLeft: 'auto',
            }}>
              联动 t={selectedTimePoint!.toFixed(3)}s
            </span>
          )}
        </h3>
        <div style={{ color: '#999', padding: '40px 0', textAlign: 'center' }}>等待数据中...</div>
      </div>
    );
  }

  const chartData = correlationData.correlations
    .filter(c => c.channel !== selectedChannel)
    .map(c => ({
      name: c.channel,
      nameCn: CHANNEL_NAMES[c.channel] || c.channel,
      correlation: Math.abs(c.correlation) * 100,
      coherence: c.coherence * 100,
      isTarget: c.channel === selectedChannel
    }));

  const topCorrIndex = chartData.reduce((maxIdx, d, i, arr) =>
    d.correlation > arr[maxIdx].correlation ? i : maxIdx, 0
  );

  const getCorrelationColor = (value: number, isActive: boolean) => {
    if (!isActive) return '#bdbdbd';
    if (value >= 80) return '#2e7d32';
    if (value >= 60) return '#689f38';
    if (value >= 40) return '#f9a825';
    if (value >= 20) return '#ef6c00';
    return '#c62828';
  };

  const getCoherenceColor = (isActive: boolean) => isActive ? '#1565c0' : '#90caf9';

  return (
    <div style={{
      padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px',
      boxShadow: isLinked ? '0 2px 8px rgba(21,101,192,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
      outline: isLinked ? '2px solid #1565c0' : 'none',
      outlineOffset: '-2px',
      transition: 'outline 0.2s ease, box-shadow 0.2s ease',
    }}>
      <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>🔗</span>
        <span>{selectedChannel}</span>
        <span style={{ fontSize: '13px', color: '#666', fontWeight: 400 }}>{channelName} · 通道相关分析</span>
        {isLinked && (
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#fff', background: '#1565c0',
            padding: '2px 10px', borderRadius: '12px', marginLeft: 'auto',
          }}>
            联动 t={selectedTimePoint!.toFixed(3)}s
          </span>
        )}
      </h3>
      {isLinked && chartData.length > 0 && (
        <div style={{
          fontSize: '12px', color: '#1565c0', fontWeight: 500,
          background: '#e3f2fd', padding: '6px 12px', borderRadius: '6px',
          marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>📌 最高相关: {chartData[topCorrIndex].name} ({chartData[topCorrIndex].correlation.toFixed(1)}%)</span>
          <span
            style={{ cursor: 'pointer', color: '#999', fontSize: '11px' }}
            onClick={() => setSelectedTimePoint(null)}
          >
            ✕ 清除选中
          </span>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        {chartData.slice(0, 3).map((item, i) => {
          const isActive = !isLinked || i === topCorrIndex;
          return (
            <div
              key={i}
              style={{
                flex: 1, minWidth: '120px', padding: '12px', borderRadius: '8px',
                background: `linear-gradient(135deg, ${getCorrelationColor(item.correlation, isActive)}15, ${getCorrelationColor(item.correlation, isActive)}08)`,
                border: `1px solid ${getCorrelationColor(item.correlation, isActive)}30`,
                opacity: isActive ? 1 : 0.5,
                transition: 'opacity 0.3s ease',
              }}
            >
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>与 {item.name} 相关度</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: getCorrelationColor(item.correlation, isActive) }}>
                {item.correlation.toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{item.nameCn}</div>
            </div>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} barGap={4}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name === 'correlation' ? '相关性' : '相干性'
            ]}
            labelFormatter={(label: string) => `${label} (${CHANNEL_NAMES[label] || label})`}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          {isLinked && chartData.length > 0 && (
            <ReferenceLine y={chartData[topCorrIndex].correlation} stroke="#2e7d32" strokeDasharray="4 4" strokeOpacity={0.5} />
          )}
          <Bar dataKey="correlation" name="相关性" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={getCorrelationColor(d.correlation, !isLinked || i === topCorrIndex)}
                opacity={isLinked ? (i === topCorrIndex ? 1 : 0.35) : 1}
                style={{ transition: 'opacity 0.3s ease, fill 0.3s ease' }}
              />
            ))}
          </Bar>
          <Bar dataKey="coherence" name="Alpha相干性" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={getCoherenceColor(!isLinked || i === topCorrIndex)}
                opacity={isLinked ? (i === topCorrIndex ? 0.7 : 0.2) : 0.7}
                style={{ transition: 'opacity 0.3s ease' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
