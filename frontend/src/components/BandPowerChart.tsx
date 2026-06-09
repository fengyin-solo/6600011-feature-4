import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useEEGStore } from '../store/eeg';

const COLORS = ['#1565c0','#2e7d32','#f9a825','#e53935','#6a1b9a'];
const COLORS_ACTIVE = ['#0d47a1','#1b5e20','#f57f17','#b71c1c','#4a148c'];
const LABELS = ['Delta','Theta','Alpha','Beta','Gamma'];
const CHANNEL_NAMES: Record<string, string> = {
  Fp1: '左前额', Fp2: '右前额', F3: '左额', F4: '右额',
  C3: '左中央', C4: '右中央', P3: '左顶', P4: '右顶',
  O1: '左枕', O2: '右枕'
};

export const BandPowerChart: React.FC = () => {
  const { bandPower, selectedChannel, playbackMode, selectedTimePoint, setSelectedTimePoint } = useEEGStore();
  const channelName = CHANNEL_NAMES[selectedChannel] || selectedChannel;
  const isLinked = selectedTimePoint !== null;

  if (!bandPower) {
    return (
      <div style={{
        padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        outline: isLinked ? '2px solid #1565c0' : 'none',
        outlineOffset: '-2px',
        transition: 'outline 0.2s ease',
      }}>
        <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <span>{selectedChannel}</span>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 400 }}>{channelName} · 频段能量</span>
          {playbackMode && <span style={{ fontSize: '12px', color: '#1565c0', fontWeight: 500 }}>⏮ 回放中</span>}
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

  const data = LABELS.map((label, i) => ({
    name: label,
    power: (bandPower as any)[label.toLowerCase()] || 0,
    color: COLORS[i]
  }));

  const dominantBandIndex = data.reduce((maxIdx, d, i, arr) =>
    d.power > arr[maxIdx].power ? i : maxIdx, 0
  );

  return (
    <div style={{
      padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px',
      boxShadow: isLinked ? '0 2px 8px rgba(21,101,192,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
      outline: isLinked ? '2px solid #1565c0' : 'none',
      outlineOffset: '-2px',
      transition: 'outline 0.2s ease, box-shadow 0.2s ease',
    }}>
      <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '20px' }}>📊</span>
        <span>{selectedChannel}</span>
        <span style={{ fontSize: '13px', color: '#666', fontWeight: 400 }}>{channelName} · 频段能量</span>
        {playbackMode && <span style={{ fontSize: '12px', color: '#1565c0', fontWeight: 500 }}>⏮ 回放模式</span>}
        {isLinked && (
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#fff', background: '#1565c0',
            padding: '2px 10px', borderRadius: '12px', marginLeft: 'auto',
          }}>
            联动 t={selectedTimePoint!.toFixed(3)}s
          </span>
        )}
      </h3>
      {isLinked && (
        <div style={{
          fontSize: '12px', color: '#1565c0', fontWeight: 500,
          background: '#e3f2fd', padding: '6px 12px', borderRadius: '6px',
          marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>📌 主导频段: {LABELS[dominantBandIndex]} ({data[dominantBandIndex].power.toFixed(2)})</span>
          <span
            style={{ cursor: 'pointer', color: '#999', fontSize: '11px' }}
            onClick={() => setSelectedTimePoint(null)}
          >
            ✕ 清除选中
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          {isLinked && (
            <ReferenceLine y={data[dominantBandIndex].power} stroke="#1565c0" strokeDasharray="4 4" strokeOpacity={0.5} />
          )}
          <Bar dataKey="power" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={isLinked && i === dominantBandIndex ? COLORS_ACTIVE[i] : d.color}
                opacity={isLinked ? (i === dominantBandIndex ? 1 : 0.4) : 1}
                style={{ transition: 'opacity 0.3s ease, fill 0.3s ease' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
