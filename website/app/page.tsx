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
  const [roomCode, setRoomCode] = useState("");
  const [remoteBpm, setRemoteBpm] = useState(80);
  const [remoteRunning, setRemoteRunning] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState("输入孩子手机上显示的 6 位控制码");
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => {
    const stop = stopRef.current;
    stopRef.current = null;
    stop?.();
  }, []);

  async function toggleTuner() {
    if (active) {
      const stop = stopRef.current;
      stopRef.current = null;
      stop?.();
      setActive(false);
      setPitch(-1);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const analyser = context.createAnalyser(); analyser.fftSize = 4096;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize); let frame = 0;
      const update = () => { analyser.getFloatTimeDomainData(samples); const found = detectPitch(samples, context.sampleRate); if (found > 0) setPitch(found); frame = requestAnimationFrame(update); };
      update(); setActive(true); setError("");
      stopRef.current = () => {
        cancelAnimationFrame(frame);
        stream.getTracks().forEach((track) => track.stop());
        if (context.state !== "closed") void context.close();
      };
    } catch { setError("无法使用麦克风，请检查浏览器权限。音频不会离开你的设备。"); }
  }

  async function sendRemote(nextBpm = remoteBpm, nextRunning = remoteRunning) {
    if (!/^\d{6}$/.test(roomCode)) { setRemoteStatus("请输入 6 位控制码"); return; }
    setRemoteStatus("正在同步…");
    try {
      const response = await fetch(`/api/metronome/${roomCode}`, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ bpm: nextBpm, running: nextRunning }),
      });
      if (!response.ok) throw new Error();
      setRemoteBpm(nextBpm); setRemoteRunning(nextRunning); setRemoteStatus("已同步到孩子手机");
    } catch { setRemoteStatus("同步失败，请检查网络后重试"); }
  }

  function changeBpm(value: number) {
    const next = Math.max(30, Math.min(240, value)); setRemoteBpm(next); void sendRemote(next, remoteRunning);
  }

  const midi = pitch > 0 ? Math.round(69 + 12 * Math.log2(pitch / 440)) : 0;
  const note = pitch > 0 ? NOTES[((midi % 12) + 12) % 12] : "—";
  const cents = pitch > 0 ? 1200 * Math.log2(pitch / (440 * 2 ** ((midi - 69) / 12))) : 0;
  const tuned = pitch > 0 && Math.abs(cents) < 5;

  return <main>
    <nav>
      <a className="brand" href="#top">弦音<span>TUNER</span></a>
      <div><a href="#remote">远程节拍</a><a href="https://github.com/rexrockya/tuner/releases/latest/download/tuner.apk">下载 APK</a><a href="https://github.com/rexrockya/tuner">GitHub ↗</a></div>
    </nav>
    <section className={`tuner-screen ${tuned ? "is-tuned" : ""}`} id="top">
      <div className="status"><i />{active ? "正在聆听" : "准备就绪"}</div>
      <div className="pitch" aria-live="polite">
        <div className="note">{note}<sup>{pitch > 0 ? Math.floor(midi / 12) - 1 : ""}</sup></div>
        <div className="frequency">{pitch > 0 ? `${pitch.toFixed(1)} Hz` : "— Hz"}</div>
      </div>
      <div className="meter-wrap">
        <div className="meter-labels"><span>−50</span><span>0</span><span>+50</span></div>
        <div className="meter"><span style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }} /></div>
        <div className="tune-state">{pitch > 0 ? (tuned ? "音准" : cents < 0 ? "偏低" : "偏高") : "弹奏一个音"}</div>
      </div>
      <div className="controls">
        <button onClick={toggleTuner}>{active ? "停止" : "开启麦克风"}</button>
        <p>音频仅在本机处理，不会录制或上传</p>
        {error && <small>{error}</small>}
      </div>
    </section>
    <section className="remote-screen" id="remote">
      <div className="remote-copy"><span>REMOTE METRONOME</span><h1>远程节拍器</h1><p>输入孩子手机“节拍”栏底部的控制码，即可在另一台手机上直接改变拍速和启停。</p></div>
      <div className="remote-card">
        <label htmlFor="room-code">控制码</label>
        <input id="room-code" inputMode="numeric" maxLength={6} placeholder="000000" value={roomCode} onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
        <div className="bpm-readout"><strong>{remoteBpm}</strong><span>BPM</span></div>
        <input className="bpm-slider" aria-label="拍速" type="range" min="30" max="240" value={remoteBpm} onChange={(event) => setRemoteBpm(Number(event.target.value))} onPointerUp={() => void sendRemote()} onKeyUp={() => void sendRemote()} />
        <div className="tempo-buttons"><button onClick={() => changeBpm(remoteBpm - 5)}>− 5</button><button onClick={() => changeBpm(remoteBpm + 5)}>+ 5</button></div>
        <button className="remote-toggle" onClick={() => void sendRemote(remoteBpm, !remoteRunning)}>{remoteRunning ? "停止节拍" : "开始节拍"}</button>
        <p className="remote-status" aria-live="polite">{remoteStatus}</p>
      </div>
    </section>
  </main>;
}
