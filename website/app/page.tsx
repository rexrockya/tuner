"use client";

import { useEffect, useRef, useState } from "react";

const NOTES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

function detectPitch(buffer: Float32Array, sampleRate: number) {
  let rms = 0;
  for (const value of buffer) rms += value * value;
  if (Math.sqrt(rms / buffer.length) < 0.012) return -1;
  const minLag = Math.floor(sampleRate / 1200);
  const maxLag = Math.min(Math.floor(sampleRate / 55), Math.floor(buffer.length / 2));
  const differences = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < buffer.length - lag; i++) { const delta = buffer[i] - buffer[i + lag]; sum += delta * delta; }
    differences[lag] = sum / (buffer.length - lag);
  }
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (differences[lag] < differences[lag - 1] && differences[lag] <= differences[lag + 1] && differences[lag] < 0.03) {
      return sampleRate / lag;
    }
  }
  return -1;
}

export default function Home() {
  const [active, setActive] = useState(false);
  const [pitch, setPitch] = useState(-1);
  const [error, setError] = useState("");
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  async function toggleTuner() {
    if (active) { stopRef.current?.(); setActive(false); setPitch(-1); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const analyser = context.createAnalyser(); analyser.fftSize = 4096;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize); let frame = 0;
      const update = () => { analyser.getFloatTimeDomainData(samples); const found = detectPitch(samples, context.sampleRate); if (found > 0) setPitch(found); frame = requestAnimationFrame(update); };
      update(); setActive(true); setError("");
      stopRef.current = () => { cancelAnimationFrame(frame); stream.getTracks().forEach((track) => track.stop()); void context.close(); };
    } catch { setError("无法使用麦克风，请检查浏览器权限。音频不会离开你的设备。"); }
  }

  const midi = pitch > 0 ? Math.round(69 + 12 * Math.log2(pitch / 440)) : 0;
  const note = pitch > 0 ? NOTES[((midi % 12) + 12) % 12] : "—";
  const cents = pitch > 0 ? 1200 * Math.log2(pitch / (440 * 2 ** ((midi - 69) / 12))) : 0;
  const tuned = pitch > 0 && Math.abs(cents) < 5;

  return <main>
    <nav><a className="brand" href="#top">弦音<span>01</span></a><div><a href="#features">特点</a><a href="#web-tuner">在线调音</a><a href="https://github.com/rexrockya/tuner">源代码</a></div></nav>
    <section className="hero" id="top">
      <div className="eyebrow"><i />为每一根弦找到正确的位置</div>
      <h1>听得清。<br /><em>调得准。</em></h1>
      <p>为 Android 打造的极简乐器调音器。没有广告，不用注册，所有声音只在你的设备上处理。</p>
      <div className="actions"><a className="primary" href="https://github.com/rexrockya/tuner/releases/latest/download/tuner.apk">下载 Android APK <b>↓</b></a><a className="secondary" href="#web-tuner">先在线试用</a></div>
      <div className="compat">Android 8.0+ · 适配荣耀手机 · 开源免费</div>
      <div className="hero-dial" aria-hidden="true"><div className="needle"/><strong>A</strong><span>440.0 Hz</span></div>
    </section>
    <section className="features" id="features"><div className="section-label">01 / 为什么选择弦音</div><div className="feature-grid">
      <article><span>±1¢</span><h2>精确识音</h2><p>实时显示音名、频率和音分偏差，直观判断偏高或偏低。</p></article>
      <article><span>4×</span><h2>多种乐器</h2><p>支持吉他、尤克里里、小提琴，以及完整十二平均律模式。</p></article>
      <article><span>0KB</span><h2>上传流量</h2><p>音频仅在本地分析。不保存录音，也不会发送到服务器。</p></article>
    </div></section>
    <section className="web-tuner" id="web-tuner">
      <div className="tuner-copy"><div className="section-label">02 / 浏览器版</div><h2>不用安装，<br />现在就调。</h2><p>打开麦克风后弹奏一个稳定的单音。安静环境、靠近乐器的手机会得到更准确的结果。</p><button onClick={toggleTuner}>{active ? "停止聆听" : "开启麦克风"}</button>{error && <small>{error}</small>}</div>
      <div className={`live-card ${tuned ? "is-tuned" : ""}`}><div className="status"><i />{active ? "正在聆听" : "等待开始"}</div><div className="note">{note}<sup>{pitch > 0 ? Math.floor(midi / 12) - 1 : ""}</sup></div><div className="meter"><span style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }} /></div><div className="readout"><span>{pitch > 0 ? `${pitch.toFixed(1)} Hz` : "— Hz"}</span><b>{pitch > 0 ? `${cents > 0 ? "+" : ""}${cents.toFixed(0)} 音分` : "弹奏一个音"}</b></div></div>
    </section>
    <footer><div className="brand">弦音<span>01</span></div><p>个人开源项目 · 用耳朵，也用心。</p><a href="https://github.com/rexrockya/tuner">GitHub ↗</a></footer>
  </main>;
}
