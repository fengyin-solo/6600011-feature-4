import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useEEGStore } from '../store/eeg';
import { EEGData, BandPower, BrainState, CorrelationData } from '../types';
import axios from 'axios';

const CHANNEL_NAMES: Record<string, string> = {
  Fp1: '左前额', Fp2: '右前额', F3: '左额', F4: '右额',
  C3: '左中央', C4: '右中央', P3: '左顶', P4: '右顶',
  O1: '左枕', O2: '右枕'
};

const ALL_CHANNELS = ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4', 'O1', 'O2'];
const SAMPLE_RATE = 256;
const WINDOW_DURATION = 1.0;

const extractSignalWindow = (
  eegData: EEGData, centerTime: number, duration: number
): { windowData: Record<string, number[]>; windowTime: number[] } | null => {
  const halfDur = duration / 2;
  const startTime = Math.max(0, centerTime - halfDur);
  const endTime = Math.min(eegData.duration, centerTime + halfDur);
  let startIdx = 0;
  let endIdx = eegData.time.length - 1;
  for (let i = 0; i < eegData.time.length; i++) {
    if (eegData.time[i] < startTime) startIdx = i + 1;
    if (eegData.time[i] > endTime) { endIdx = i - 1; break; }
  }
  if (startIdx >= eegData.time.length || endIdx < startIdx) return null;
  const windowTime = eegData.time.slice(startIdx, endIdx + 1);
  const windowData: Record<string, number[]> = {};
  for (const ch of eegData.channels) {
    windowData[ch] = eegData.data[ch].slice(startIdx, endIdx + 1);
  }
  return { windowData, windowTime };
};

const computeBandPowerFromSignal = (
  signal: number[], sampleRate: number
): BandPower => {
  const n = signal.length;
  const bandRanges: Record<string, [number, number]> = {
    delta: [0.5, 4],
    theta: [4, 8],
    alpha: [8, 13],
    beta: [13, 30],
    gamma: [30, 100],
  };
  const bandPower: Record<string, number> = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
  const halfN = Math.floor(n / 2);
  const freqResolution = sampleRate / n;
  for (let k = 0; k < halfN; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const angle = -2 * Math.PI * k * i / n;
      re += signal[i] * Math.cos(angle);
      im += signal[i] * Math.sin(angle);
    }
    const power = (re * re + im * im) / (n * n);
    const freq = k * freqResolution;
    for (const [band, [lo, hi]] of Object.entries(bandRanges)) {
      if (freq >= lo && freq < hi) {
        bandPower[band] += power;
      }
    }
  }
  return {
    delta: Math.round(bandPower.delta * 10000) / 10000,
    theta: Math.round(bandPower.theta * 10000) / 10000,
    alpha: Math.round(bandPower.alpha * 10000) / 10000,
    beta: Math.round(bandPower.beta * 10000) / 10000,
    gamma: Math.round(bandPower.gamma * 10000) / 10000,
  };
};

const generateMockEEG = (durationSec: number = 3.0): EEGData => {
  const length = Math.floor(SAMPLE_RATE * durationSec);
  const time: number[] = [];
  const data: Record<string, number[]> = {};
  for (let i = 0; i < length; i++) {
    time.push(i / SAMPLE_RATE);
  }
  for (const ch of ALL_CHANNELS) {
    const sig: number[] = [];
    const alphaFreq = 8 + Math.random() * 4;
    const betaFreq = 15 + Math.random() * 10;
    for (let i = 0; i < length; i++) {
      const t = i / SAMPLE_RATE;
      const value = 0.5 * Math.sin(2 * Math.PI * alphaFreq * t) +
                    0.3 * Math.sin(2 * Math.PI * betaFreq * t) +
                    0.2 * (Math.random() * 2 - 1);
      sig.push(value);
    }
    data[ch] = sig;
  }
  return { channels: ALL_CHANNELS, sample_rate: SAMPLE_RATE, data, time, duration: durationSec };
};

const computeBandPower = (): BandPower => {
  const total = 10 + Math.random() * 5;
  return {
    delta: total * (0.2 + Math.random() * 0.1),
    theta: total * (0.15 + Math.random() * 0.1),
    alpha: total * (0.25 + Math.random() * 0.15),
    beta: total * (0.3 + Math.random() * 0.15),
    gamma: total * (0.1 + Math.random() * 0.05),
  };
};

const computeBrainState = (bands: BandPower): BrainState => {
  const total = bands.delta + bands.theta + bands.alpha + bands.beta + bands.gamma + 1e-10;
  const betaRel = bands.beta / total;
  const alphaRel = bands.alpha / total;
  const thetaRel = bands.theta / total;
  const focus = Math.min(100, Math.max(0, betaRel * 300 + (Math.random() - 0.5) * 10));
  const relaxation = Math.min(100, Math.max(0, alphaRel * 300 + (Math.random() - 0.5) * 10));
  const fatigue = Math.min(100, Math.max(0, thetaRel * 300 + (Math.random() - 0.5) * 10));
  const scores = { focused: focus, relaxed: relaxation, fatigued: fatigue };
  const maxScore = Math.max(...Object.values(scores));
  let status: 'focused' | 'relaxed' | 'fatigued' | 'neutral' = 'neutral';
  let statusLabel = '平稳';
  let statusColor = '#757575';
  if (maxScore >= 50) {
    const maxKey = Object.keys(scores).find(k => scores[k as keyof typeof scores] === maxScore) as keyof typeof scores;
    status = maxKey;
    if (status === 'focused') { statusLabel = '专注'; statusColor = '#1976d2'; }
    else if (status === 'relaxed') { statusLabel = '放松'; statusColor = '#388e3c'; }
    else { statusLabel = '疲劳'; statusColor = '#d32f2f'; }
  }
  return {
    focus: Math.round(focus * 10) / 10,
    relaxation: Math.round(relaxation * 10) / 10,
    fatigue: Math.round(fatigue * 10) / 10,
    status,
    statusLabel,
    statusColor,
    timestamp: Date.now(),
  };
};

const computeCorrelation = (targetChannel: string, eegData: EEGData): CorrelationData => {
  const targetData = eegData.data[targetChannel];
  const correlations = ALL_CHANNELS.map(ch => {
    if (ch === targetChannel) {
      return { channel: ch, targetChannel, correlation: 1.0, coherence: 1.0 };
    }
    const chData = eegData.data[ch];
    let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
    const n = targetData.length;
    for (let i = 0; i < n; i++) {
      sumXY += targetData[i] * chData[i];
      sumX += targetData[i];
      sumY += chData[i];
      sumX2 += targetData[i] * targetData[i];
      sumY2 += chData[i] * chData[i];
    }
    const corr = (n * sumXY - sumX * sumY) /
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return {
      channel: ch,
      targetChannel,
      correlation: Math.round(corr * 10000) / 10000,
      coherence: Math.round((0.3 + Math.random() * 0.5) * 10000) / 10000,
    };
  });
  return { targetChannel, correlations };
};

export const WaveformChart: React.FC = () => {
  const {
    eegData, selectedChannel, setEEGData, setBandPower, setBrainState, setCorrelationData,
    isRecording, addRecordingFrame, playbackMode,
    selectedTimePoint, setSelectedTimePoint,
  } = useEEGStore();
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const fetchEEG = async () => {
    const state = useEEGStore.getState();
    if (state.playbackMode) return;
    setLoading(true);
    let eeg: EEGData, bands: BandPower, brainState: BrainState, correlation: CorrelationData;
    try {
      const { data } = await axios.get(`/api/eeg/sample/${state.selectedChannel}?duration=3`);
      eeg = data.eeg;
      bands = data.bands;
      brainState = data.brainState;
      correlation = data.correlation;
    } catch {
      eeg = generateMockEEG(3);
      bands = computeBandPower();
      brainState = computeBrainState(bands);
      correlation = computeCorrelation(state.selectedChannel, eeg);
    }
    state.setEEGData(eeg);
    state.setBandPower(bands);
    state.setBrainState(brainState);
    state.setCorrelationData(correlation);
    state.setSelectedTimePoint(null);
    if (state.isRecording) {
      state.addRecordingFrame(eeg, bands, brainState);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (playbackMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    fetchEEG();
    intervalRef.current = window.setInterval(fetchEEG, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedChannel, playbackMode]);

  const chartData = eegData?.data[selectedChannel]?.map((v: number, i: number) => ({
    t: eegData.time[i]?.toFixed(3), value: v.toFixed(4)
  })) || [];

  const handleChartClick = useCallback((e: any) => {
    if (!e || !e.activeLabel) return;
    const clickedTime = parseFloat(e.activeLabel);
    if (isNaN(clickedTime)) return;
    const state = useEEGStore.getState();
    const current = state.selectedTimePoint;
    const diff = Math.abs(clickedTime - (current ?? -1));
    if (diff < 0.005) {
      state.setSelectedTimePoint(null);
      return;
    }
    if (!state.eegData) {
      state.setSelectedTimePoint(clickedTime);
      return;
    }
    const window_ = extractSignalWindow(state.eegData, clickedTime, WINDOW_DURATION);
    if (!window_) {
      state.setSelectedTimePoint(clickedTime);
      return;
    }
    const selectedCh = state.selectedChannel;
    const chSignal = window_.windowData[selectedCh];
    const bands = chSignal
      ? computeBandPowerFromSignal(chSignal, state.eegData.sample_rate)
      : computeBandPower();
    const brainState = computeBrainState(bands);
    const windowEeg: EEGData = {
      channels: state.eegData.channels,
      sample_rate: state.eegData.sample_rate,
      data: window_.windowData,
      time: window_.windowTime,
      duration: WINDOW_DURATION,
    };
    const correlation = computeCorrelation(selectedCh, windowEeg);
    state.setSelectedTimePoint(clickedTime);
    state.setSelectedAnalysisData(bands, brainState, correlation);
  }, []);

  const selectedTimeStr = selectedTimePoint !== null ? selectedTimePoint.toFixed(3) : null;

  const channelName = CHANNEL_NAMES[selectedChannel] || selectedChannel;

  return (
    <div style={{
      padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      outline: selectedTimePoint !== null ? '2px solid #1565c0' : 'none',
      outlineOffset: '-2px',
      transition: 'outline 0.2s ease',
    }}>
      <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>📈</span>
        <span>{selectedChannel}</span>
        <span style={{ fontSize: '13px', color: '#666', fontWeight: 400 }}>{channelName} · 波形图</span>
        {isRecording && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#d32f2f', fontWeight: 500 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d32f2f', animation: 'pulse 1s infinite' }} />
            录制中
          </span>
        )}
        {playbackMode && (
          <span style={{ fontSize: '12px', color: '#1565c0', fontWeight: 500 }}>⏮ 回放模式</span>
        )}
        {loading && !playbackMode && <span style={{ fontSize: '12px', color: '#999' }}>刷新中...</span>}
        {selectedTimeStr && (
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#fff', background: '#1565c0',
            padding: '2px 10px', borderRadius: '12px', marginLeft: 'auto',
            letterSpacing: '0.5px',
          }}>
            选中 t={selectedTimeStr}s
          </span>
        )}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
          <XAxis dataKey="t" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />
          {selectedTimeStr && (
            <ReferenceLine x={selectedTimeStr} stroke="#1565c0" strokeWidth={2} strokeDasharray="6 3" />
          )}
          <Line type="monotone" dataKey="value" stroke="#1565c0" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
