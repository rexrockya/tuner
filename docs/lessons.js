(function () {
const SOURCE = [
  ["eLDBSVZa", "A Blues", "A7 → D7 → A7", "I7 → IV7 → I7", 3, "blues"],
  ["yKz58nSf", "A Blues", "A7 → D7 → A7", "I7 → IV7 → I7", 3, "blues"],
  ["fzJaVIxn", "A Blues", "A7 → D7 → A7", "I7 → IV7 → I7", 3, "blues"],
  ["QOSPR0a1", "A Blues", "A7 → D7 → A7 → A7", "I7 → IV7 → I7 → I7", 4, "blues"],
  ["UfowT5v3", "A Blues", "A7 → D7 → A7 → A7", "I7 → IV7 → I7 → I7", 4, "blues"],
  ["t8TkFr4v", "A Blues", "A7 → D7 → A7 → A7", "I7 → IV7 → I7 → I7", 4, "blues"],
  ["Szj35Uoa", "A Blues", "A7 → D7 → A7 → A7", "I7 → IV7 → I7 → I7", 4, "blues"],
  ["PIgYRhbv", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["vI0IswBl", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["04jp5dZE", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["TYt5eFDM", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["mpaDfNQ2", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["fmixbFZm", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["R7oKcEug", "A Minor Vamp", "Am7 × 4", "i7", 4, "minor"],
  ["ybBt5IbQ", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["f6C7FvbB", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["fkZzs2c5", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["CKE9kGwg", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["zqpkxP6Z", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"],
  ["Dhxnpii8", "A ii–V–I", "Bm7 → E7 → Amaj", "ii7 → V7 → Imaj7", 3, "major"]
];

const groupNumbers = {};
const LICKS = SOURCE.map(([id, group, chord, degree, bars, kind]) => {
  groupNumbers[group] = (groupNumbers[group] || 0) + 1;
  return {
    id, group, chord, degree, bars, kind,
    name: `${group} Lick ${groupNumbers[group]}`,
    score: `https://bopland.org/data/${id}.png`,
    audio: `https://bopland.org/data/${id}.mp3`
  };
});

const THEORY = {
  blues: {
    tags: ["蓝调音：C / C♯（♭3→3）", "落点：G（A7 的 ♭7）", "律动：弱拍起，八分音符推进"],
    context: "衍生：把结尾移到 D7 · 语境：《Now’s the Time》类 blues（非原句出处）"
  },
  minor: {
    tags: ["骨架音：C（♭3）、G（♭7）", "色彩：留意 F / F♯ 的小调差异", "律动：vamp 上保持连续句型"],
    context: "衍生：结尾落 A / C / E / G · 语境：《So What》类 vamp（非原句出处）"
  },
  major: {
    tags: ["声部：A→G♯（ii7→V7）", "解决：D→C♯（V7→Imaj7）", "律动：换和弦处落三音或七音"],
    context: "衍生：移调练 12 个 ii–V–I · 语境：《Tune Up》类进行（非原句出处）"
  }
};

const THEORY_OVERRIDES = {
  fzJaVIxn: {
    tags: ["特征音：G♮（A7 的 ♭7）", "经过音：G♯→A 半音导向", "换和弦：F♯ 是 D7 的三音", "律动：弱拍起，连续八分音符"],
    context: "衍生：末两拍顺移到 D7 · 语境：《Now’s the Time》类 blues（非原句出处）"
  }
};

const CHORD_GUIDES = {
  A7: { tones: "A（根音）· C♯（3）· E（5）· G（♭7）", scale: "A Mixolydian：A B C♯ D E F♯ G", color: "C 是蓝调 ♭3；E♭ 是 ♭5；B♭/G♯ 多半应按趋向解决理解。" },
  D7: { tones: "D（根音）· F♯（3）· A（5）· C（♭7）", scale: "D Mixolydian：D E F♯ G A B C", color: "F 可作 ♯9/蓝调色彩，E♭ 是 ♭9，通常半音解决到 D。" },
  Am7: { tones: "A（根音）· C（♭3）· E（5）· G（♭7）", scale: "先比较 A Dorian（F♯）与 A Aeolian（F）", color: "F♯ 是明亮的 6；F 是小调 ♭6。不要把两者混成同一种功能。" },
  Bm7: { tones: "B（根音）· D（♭3）· F♯（5）· A（♭7）", scale: "B Dorian：B C♯ D E F♯ G♯ A", color: "D、A 定义 ii7；它们常分别半音解决到 E7 的 C♯/G♯ 或 Amaj 的 C♯/G♯。" },
  E7: { tones: "E（根音）· G♯（3）· B（5）· D（♭7）", scale: "E Mixolydian；出现 F/G/C 时再考虑 altered 或半音趋近", color: "G♯ 与 D 是导向 Amaj 的核心：G♯ 留作大七度，D 下行到 C♯。" },
  Amaj: { tones: "A（根音）· C♯（3）· E（5）· G♯（大7）", scale: "A Ionian：A B C♯ D E F♯ G♯", color: "C♯、G♯ 是落地感最强的音；D（11）通常经过到 C♯。" }
};

const DETAILED_ANALYSIS = {
  yKz58nSf: [
    {
      chord: "第 1 小节 · A7",
      scale: "骨架是 A7；不是一条音阶从头跑到底，而是和弦音加趋近音。",
      why: "G、C♯、E 是 A7 的 ♭7、3、5；G♯ 从下方半音导向根音 A。B♭ 是短暂的 ♭9 张力，不要把它误认成稳定音。",
      notes: [["G","♭7","chord"],["B♭","♭9","color"],["G","♭7","chord"],["G♯","→A","chromatic"],["A","1","chord"],["C♯","3","chord"],["E","5","chord"],["G","♭7","chord"]]
    },
    {
      chord: "第 2 小节 · D7",
      scale: "以 D Mixolydian 为底，但中间故意加入 ♯9/♭9 的属和弦摩擦。",
      why: "F♯、A 是 3、5；F♮ 夹在 F♯ 与 E 之间，既可听成 ♯9，也承担半音经过；结尾 E♭ 是 ♭9，强烈趋向下一小节的 D。",
      notes: [["F♯","3","chord"],["A","5","chord"],["F♯","3","chord"],["F","♯9/经过","chromatic"],["E","9","color"],["G","11","color"],["E","9","color"],["E♭","♭9→D","chromatic"]]
    },
    {
      chord: "第 3 小节 · A7",
      scale: "A blues 与 A Mixolydian 的结合。",
      why: "D 是 11；C→C♯ 是最典型的蓝调 ♭3 推向大三度；随后 E、G、A 用 5、♭7、根音收束。",
      notes: [["D","11","color"],["C","♭3 蓝调","color"],["C♯","3","chord"],["E","5","chord"],["G","♭7","chord"],["A","1","chord"]]
    }
  ]
};

const SCALE_LIBRARY = [
  { id: "ionian", group: "七种调式", name: "Ionian（自然大调）", steps: [0,2,4,5,7,9,11], degrees: ["1","2","3","4","5","6","7"], use: "大调主和弦与明亮、稳定的调性中心。" },
  { id: "dorian", group: "七种调式", name: "Dorian（多利亚）", steps: [0,2,3,5,7,9,10], degrees: ["1","2","♭3","4","5","6","♭7"], use: "m7 上最常用；自然 6 是区别于自然小调的关键。" },
  { id: "phrygian", group: "七种调式", name: "Phrygian（弗里几亚）", steps: [0,1,3,5,7,8,10], degrees: ["1","♭2","♭3","4","5","♭6","♭7"], use: "小和弦上的强烈 ♭2 色彩，常用于西班牙/金属语汇。" },
  { id: "lydian", group: "七种调式", name: "Lydian（利底亚）", steps: [0,2,4,6,7,9,11], degrees: ["1","2","3","♯4","5","6","7"], use: "maj7 上的漂浮感；♯4 是必须听清的特征音。" },
  { id: "mixolydian", group: "七种调式", name: "Mixolydian（混合利底亚）", steps: [0,2,4,5,7,9,10], degrees: ["1","2","3","4","5","6","♭7"], use: "属七和弦的基础音阶；3 与 ♭7 决定它的功能。" },
  { id: "aeolian", group: "七种调式", name: "Aeolian（自然小调）", steps: [0,2,3,5,7,8,10], degrees: ["1","2","♭3","4","5","♭6","♭7"], use: "自然小调；♭6 带来比 Dorian 更暗的声音。" },
  { id: "locrian", group: "七种调式", name: "Locrian（洛克里亚）", steps: [0,1,3,5,6,8,10], degrees: ["1","♭2","♭3","4","♭5","♭6","♭7"], use: "m7♭5 的基础选择；♭5 与 ♭2 是核心色彩。" },
  { id: "majorPent", group: "五声与蓝调", name: "大调五声音阶", steps: [0,2,4,7,9], degrees: ["1","2","3","5","6"], use: "大调、乡村、流行；没有 4 与 7，落音较安全。" },
  { id: "minorPent", group: "五声与蓝调", name: "小调五声音阶", steps: [0,3,5,7,10], degrees: ["1","♭3","4","5","♭7"], use: "摇滚与蓝调骨架；在属七和弦上会产生大小三度摩擦。" },
  { id: "minorBlues", group: "五声与蓝调", name: "小调布鲁斯音阶", steps: [0,3,5,6,7,10], degrees: ["1","♭3","4","♭5","5","♭7"], use: "小调五声加入 ♭5 蓝调音，练习 ♭5→5 的解决。" },
  { id: "majorBlues", group: "五声与蓝调", name: "大调布鲁斯音阶", steps: [0,2,3,4,7,9], degrees: ["1","2","♭3","3","5","6"], use: "大调五声加入 ♭3，关键动作是 ♭3→3。" },
  { id: "mixedBlues", group: "五声与蓝调", name: "混合布鲁斯音阶", steps: [0,3,4,5,6,7,9,10], degrees: ["1","♭3","3","4","♭5","5","6","♭7"], use: "合并大小调蓝调语汇；把 ♭3→3、♭5→5 当作动作练，而非静态音阶。" },
  { id: "harmonicMinor", group: "小调与旋律小调", name: "和声小调", steps: [0,2,3,5,7,8,11], degrees: ["1","2","♭3","4","5","♭6","7"], use: "小调 V7→i；自然 7 是导向根音的核心。" },
  { id: "melodicMinor", group: "小调与旋律小调", name: "旋律小调（爵士）", steps: [0,2,3,5,7,9,11], degrees: ["1","2","♭3","4","5","6","7"], use: "mMaj7 与现代爵士小调色彩，也是多个属和弦音阶的母体。" },
  { id: "dorianB2", group: "小调与旋律小调", name: "Dorian ♭2", steps: [0,1,3,5,7,9,10], degrees: ["1","♭2","♭3","4","5","6","♭7"], use: "旋律小调第二模式；sus♭9 或特殊小和弦色彩。" },
  { id: "lydianAug", group: "小调与旋律小调", name: "Lydian Augmented", steps: [0,2,4,6,8,9,11], degrees: ["1","2","3","♯4","♯5","6","7"], use: "maj7♯5；同时听见 ♯4 与 ♯5。" },
  { id: "lydianDominant", group: "小调与旋律小调", name: "Lydian Dominant", steps: [0,2,4,6,7,9,10], degrees: ["1","2","3","♯4","5","6","♭7"], use: "7♯11；属七骨架上加入利底亚 ♯4。" },
  { id: "mixolydianB6", group: "小调与旋律小调", name: "Mixolydian ♭6", steps: [0,2,4,5,7,8,10], degrees: ["1","2","3","4","5","♭6","♭7"], use: "属七和弦带 ♭13，常向小调主和弦解决。" },
  { id: "locrianN2", group: "小调与旋律小调", name: "Locrian ♮2", steps: [0,2,3,5,6,8,10], degrees: ["1","2","♭3","4","♭5","♭6","♭7"], use: "小调 ii–V–i 的 m7♭5；自然 2 比普通 Locrian 更平滑。" },
  { id: "altered", group: "属和弦与对称音阶", name: "Altered（变化音阶）", steps: [0,1,3,4,6,8,10], degrees: ["1","♭9","♯9","3","♭5","♭13","♭7"], use: "7alt；保留 3、♭7，同时使用所有变化张力。" },
  { id: "bebopDominant", group: "属和弦与对称音阶", name: "Bebop Dominant", steps: [0,2,4,5,7,9,10,11], degrees: ["1","2","3","4","5","6","♭7","7"], use: "Mixolydian 加自然 7；八分音符下让和弦音落在强拍。" },
  { id: "bebopMajor", group: "属和弦与对称音阶", name: "Bebop Major", steps: [0,2,4,5,7,8,9,11], degrees: ["1","2","3","4","5","♯5","6","7"], use: "大调音阶加入 ♯5/♭6 经过音，保持八音对称落点。" },
  { id: "halfWhole", group: "属和弦与对称音阶", name: "半–全减音阶", steps: [0,1,3,4,6,7,9,10], degrees: ["1","♭9","♯9","3","♭5","5","6","♭7"], use: "7♭9/13；半音与全音交替，包含完整属七骨架。" },
  { id: "wholeHalf", group: "属和弦与对称音阶", name: "全–半减音阶", steps: [0,2,3,5,6,8,9,11], degrees: ["1","2","♭3","4","♭5","♭6","6","7"], use: "dim7；全音与半音交替，适合减七和弦移动。" },
  { id: "wholeTone", group: "属和弦与对称音阶", name: "全音阶", steps: [0,2,4,6,8,10], degrees: ["1","2","3","♯4","♯5","♭7"], use: "7♯5；没有半音，声音悬浮且方向模糊。" },
  { id: "chromatic", group: "属和弦与对称音阶", name: "半音阶", steps: [0,1,2,3,4,5,6,7,8,9,10,11], degrees: ["1","♭2","2","♭3","3","4","♭5","5","♭6","6","♭7","7"], use: "用于连接目标音；练习重点是解决方向，不是把十二个音平均对待。" }
];

const SCALE_ROOTS = ["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
const NATURAL_PITCHES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_LETTERS = ["C","D","E","F","G","A","B"];
const SCALE_FOCUS = {
  ionian: { indexes: [6], cue: "听 7→1 的导向：明亮、完整、稳定。" },
  dorian: { indexes: [5], cue: "在小三度背景里听自然 6：小调但不阴暗。" },
  phrygian: { indexes: [1], cue: "听 ♭2→1 的挤压感：黑暗、紧张、带西班牙色彩。" },
  lydian: { indexes: [3], cue: "听 ♯4 悬在 5 下方：明亮、漂浮、没有普通大调的落地感。" },
  mixolydian: { indexes: [6], cue: "把 3 与 ♭7 一起听：开放、带属功能与蓝调气质。" },
  aeolian: { indexes: [5], cue: "听 ♭6→5：自然小调最明显的阴影。" },
  locrian: { indexes: [4], cue: "听 ♭5 对根音造成的不稳定，适合 m7♭5。" },
  majorPent: { indexes: [2,4], cue: "3 与 6 让声音明亮、开阔，几乎没有冲突音。" },
  minorPent: { indexes: [1,4], cue: "♭3 与 ♭7 带来粗粝、直接的摇滚/蓝调听感。" },
  minorBlues: { indexes: [3,4], cue: "重点听 ♭5→5，它是蓝调张力向稳定音的动作。" },
  majorBlues: { indexes: [2,3], cue: "重点听 ♭3→3：蓝调味来自滑向大三度。" },
  mixedBlues: { indexes: [1,2,4,5], cue: "听 ♭3→3 与 ♭5→5 两组摩擦和解决。" },
  harmonicMinor: { indexes: [5,6], cue: "♭6 与自然 7 拉开增二度，7→1 有强烈小调解决。" },
  melodicMinor: { indexes: [5,6], cue: "小三度上叠自然 6、7：顺滑、现代、略带悬浮感。" },
  dorianB2: { indexes: [1,5], cue: "♭2 的暗色与自然 6 的亮色并存。" },
  lydianAug: { indexes: [3,4], cue: "♯4 与 ♯5 同时上扬，梦幻但不稳定。" },
  lydianDominant: { indexes: [3,6], cue: "♯4 的明亮悬浮加 ♭7 的属和弦张力。" },
  mixolydianB6: { indexes: [5,6], cue: "♭6→5 带苦甜色彩，♭7 保留属功能。" },
  locrianN2: { indexes: [1,4], cue: "自然 2 缓和普通 Locrian 的 ♭2，♭5 仍保持半减不稳。" },
  altered: { indexes: [1,2,5], cue: "把 ♭9、♯9、♭13 当成要解决到和弦音的张力。" },
  bebopDominant: { indexes: [6,7], cue: "自然 7 是 ♭7 与根音之间的经过音，连续八分音符最明显。" },
  bebopMajor: { indexes: [5,6], cue: "♯5 是 5 与 6 之间的经过音，让强拍更容易落到和弦音。" },
  halfWhole: { indexes: [1,2,3], cue: "♭9、♯9 围绕 3，产生对称而强烈的变化属和弦声音。" },
  wholeHalf: { indexes: [2,4,6], cue: "减七和弦每隔小三度重复，听感持续悬而未决。" },
  wholeTone: { indexes: [3,4], cue: "没有半音与明确导音，♯4、♯5 让方向感消失。" },
  chromatic: { indexes: [1], cue: "半音本身不是终点；听它如何从上下方逼近目标音。" }
};

const $ = id => document.getElementById(id);
const audio = document.createElement("audio");
audio.preload = "metadata";
let current = 0;
let looping = true;
let loopA = 0;
let loopB = 1;
let backingEnabled = false;
let backingContext = null;
let backingFrame = null;
let lastBackingBeat = -1;
let scaleVoices = [];
let scaleExerciseTimer = null;
let scaleSynthCache = { context: null, guitarWave: null, pickBuffer: null };
let scoreZoom = 1;
let waveformDuration = 1;
let waveformLoadToken = 0;
const waveformCache = new Map();
const fallbackWaveform = Array.from({ length: 560 }, (_, index) => {
  const position = index / 559;
  const envelope = .16 + .72 * Math.sin(Math.PI * position) ** .65;
  const texture = .24 + .36 * Math.abs(Math.sin(index * .37)) + .4 * Math.abs(Math.sin(index * .071 + .8));
  const peak = Math.min(1, envelope * texture);
  return [-peak, peak];
});
let waveformPeaks = fallbackWaveform;
let practiceBpm = Math.max(40, Math.min(180, Number(localStorage.getItem("tuner-bpm-v1") || 80)));
const SOURCE_BPM = 120;

function chordProgression(lick = LICKS[current]) {
  if (lick.chord.includes("×")) {
    const [name, count] = lick.chord.split("×").map(item => item.trim());
    return Array.from({ length: Number(count) || lick.bars }, () => name);
  }
  return lick.chord.split("→").map(item => item.trim());
}

function chordShape(name) {
  const match = name.match(/^([A-G])([♯#♭b]?)(.*)$/);
  if (!match) return { root: 45, intervals: [0, 4, 7, 10] };
  const semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pitch = semitones[match[1]] + (/[♯#]/.test(match[2]) ? 1 : /[♭b]/.test(match[2]) ? -1 : 0);
  while (pitch < 0) pitch += 12;
  const quality = match[3].toLowerCase();
  const intervals = quality.includes("m7") ? [0, 3, 7, 10] : quality.includes("maj") ? [0, 4, 7, 11] : quality.includes("7") ? [0, 4, 7, 10] : [0, 4, 7];
  return { root: 36 + pitch, intervals };
}

function midiFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function playBackingTone(frequency, duration, volume, type = "triangle") {
  if (!backingContext) return;
  const now = backingContext.currentTime;
  const oscillator = backingContext.createOscillator();
  const gain = backingContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(backingContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

async function ensureBackingContext() {
  backingContext ??= new AudioContext();
  if (backingContext.state === "suspended") await backingContext.resume();
}

function triggerBackingBeat(beat) {
  const progression = chordProgression();
  const bar = Math.floor(beat / 4) % progression.length;
  const beatInBar = ((beat % 4) + 4) % 4;
  const shape = chordShape(progression[bar]);
  const beatSeconds = 60 / practiceBpm;
  playBackingTone(midiFrequency(shape.root - 12), beatSeconds * 0.72, 0.055, "triangle");
  playBackingTone(beatInBar % 2 ? 1320 : 1760, 0.035, 0.012, "square");
  if (beatInBar === 0 || beatInBar === 2) {
    shape.intervals.forEach(interval => playBackingTone(midiFrequency(shape.root + 12 + interval), beatSeconds * 1.45, 0.012, "sine"));
  }
}

function stopBackingClock() {
  if (backingFrame) cancelAnimationFrame(backingFrame);
  backingFrame = null;
  lastBackingBeat = -1;
}

async function startBackingClock() {
  if (!backingEnabled) return;
  await ensureBackingContext();
  stopBackingClock();
  const tick = () => {
    if (audio.paused || !backingEnabled) return stopBackingClock();
    const beat = Math.floor(audio.currentTime * SOURCE_BPM / 60 + 0.06);
    if (beat !== lastBackingBeat) {
      lastBackingBeat = beat;
      triggerBackingBeat(beat);
    }
    backingFrame = requestAnimationFrame(tick);
  };
  tick();
}

function selectedScale() {
  return SCALE_LIBRARY.find(scale => scale.id === $("scale-type").value) || SCALE_LIBRARY[4];
}

function spellScaleNote(root, step, degree) {
  const rootName = SCALE_ROOTS[root];
  const rootLetter = rootName[0];
  const degreeNumber = Number(degree.match(/\d+/)?.[0] || 1);
  const letter = NOTE_LETTERS[(NOTE_LETTERS.indexOf(rootLetter) + degreeNumber - 1) % 7];
  const targetPitch = (root + step) % 12;
  let accidental = (targetPitch - NATURAL_PITCHES[letter] + 12) % 12;
  if (accidental > 6) accidental -= 12;
  return letter + (accidental > 0 ? "♯".repeat(accidental) : "♭".repeat(-accidental));
}

function scaleToneAt(scale, index, root = Number($("scale-root").value || 0)) {
  const length = scale.steps.length;
  const octave = Math.floor(index / length);
  const position = ((index % length) + length) % length;
  const degree = scale.degrees[position];
  const step = scale.steps[position] + octave * 12;
  const octaveMark = octave > 0 ? "↑".repeat(octave) : "";
  return { step, degree: `${degree}${octaveMark}`, note: `${spellScaleNote(root, step, degree)}${octaveMark}` };
}

function scaleLicks(scale) {
  const length = scale.steps.length;
  const focus = SCALE_FOCUS[scale.id]?.indexes || [Math.min(3, length - 1)];
  const first = Math.max(0, Math.min(...focus) - 1);
  const focusPath = [...new Set([first, ...focus.flatMap(index => [index, Math.min(index + 1, length)])])];
  const rawCharacteristic = [...focusPath, ...focusPath.slice(0, -1).reverse()].map(index => index + length).concat([length + 2, length + 1, length]);
  const characteristic = rawCharacteristic.filter((index, position) => position === 0 || index !== rawCharacteristic[position - 1]);
  const descending = [4,3,2,1,3,2,1,0,2,1,0].map(index => index + length);
  return [
    { id: "character", name: "特征音句", hint: "围绕特征音制造并解决张力", indexes: characteristic },
    { id: "resolve", name: "下行收束句", hint: "练习级进、回绕与落回根音", indexes: descending }
  ];
}

function renderScaleTrainer() {
  const root = Number($("scale-root").value || 0);
  const scale = selectedScale();
  const notes = [...scale.steps, 12];
  const degrees = [...scale.degrees, "8"];
  $("scale-name").textContent = `${SCALE_ROOTS[root]} ${scale.name}`;
  $("scale-formula").textContent = scale.degrees.join(" · ");
  $("scale-use").textContent = scale.use;
  $("scale-character").textContent = `听感重点：${SCALE_FOCUS[scale.id].cue}`;
  $("scale-notes").innerHTML = notes.map((step, index) => `<span class="scale-note">${spellScaleNote(root, step, degrees[index])}<small>${degrees[index]}</small></span>`).join("");
  $("scale-lick-list").innerHTML = scaleLicks(scale).map(lick => {
    const tones = lick.indexes.map(index => scaleToneAt(scale, index, root));
    return `<article class="scale-lick"><div class="scale-lick-head"><strong>${lick.name}</strong><button data-scale-lick="${lick.id}">▶ 播放</button></div><p>${lick.hint}</p><p>级数（↑ 高八度）：${tones.map(tone => tone.degree).join(" – ")}</p><p class="lick-notes">音名：${tones.map(tone => tone.note).join(" – ")}</p></article>`;
  }).join("");
}

function stopScaleExercise(message = "已停止") {
  scaleVoices.forEach(oscillator => {
    try { oscillator.stop(); } catch (_) {}
  });
  scaleVoices = [];
  clearTimeout(scaleExerciseTimer);
  scaleExerciseTimer = null;
  if ($("scale-status")) $("scale-status").textContent = message;
}

function scalePattern(mode, scale) {
  const ascending = [...scale.steps, 12];
  if (mode === "updown") return [...ascending, ...ascending.slice(0, -1).reverse()];
  const extended = [...scale.steps, ...scale.steps.map(step => step + 12), 24];
  if (mode === "thirds") {
    const result = [];
    for (let index = 0; index < scale.steps.length; index++) result.push(extended[index], extended[index + 2]);
    return result;
  }
  if (mode === "four") {
    const result = [];
    for (let index = 0; index <= scale.steps.length; index++) result.push(...extended.slice(index, index + 4));
    return result;
  }
  return ascending;
}

function scaleSynthAssets() {
  if (scaleSynthCache.context !== backingContext) {
    const guitarHarmonics = new Float32Array([0, 1, .62, .34, .2, .12, .075, .045]);
    const pickBuffer = backingContext.createBuffer(1, Math.ceil(backingContext.sampleRate * .018), backingContext.sampleRate);
    const pick = pickBuffer.getChannelData(0);
    for (let index = 0; index < pick.length; index++) pick[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / pick.length, 2);
    scaleSynthCache = { context: backingContext, guitarWave: backingContext.createPeriodicWave(new Float32Array(guitarHarmonics.length), guitarHarmonics), pickBuffer };
  }
  return scaleSynthCache;
}

function scheduleScaleNote(midi, at, noteLength, instrument) {
  const frequency = midiFrequency(midi);
  const filter = backingContext.createBiquadFilter();
  const envelope = backingContext.createGain();
  filter.type = "lowpass";
  filter.Q.value = instrument === "guitar" ? 1.15 : .55;
  filter.frequency.setValueAtTime(instrument === "guitar" ? 4600 : 6200, at);
  filter.frequency.exponentialRampToValueAtTime(instrument === "guitar" ? 1050 : 2100, at + Math.max(.35, noteLength * 1.8));
  envelope.gain.setValueAtTime(.0001, at);
  envelope.gain.exponentialRampToValueAtTime(instrument === "guitar" ? .105 : .075, at + (instrument === "guitar" ? .006 : .012));
  const tail = instrument === "guitar" ? Math.max(.58, noteLength * 2.4) : Math.max(.82, noteLength * 3.1);
  envelope.gain.exponentialRampToValueAtTime(.0001, at + tail);
  filter.connect(envelope).connect(backingContext.destination);

  if (instrument === "guitar") {
    const assets = scaleSynthAssets();
    const string = backingContext.createOscillator();
    string.setPeriodicWave(assets.guitarWave);
    string.frequency.value = frequency;
    string.detune.value = -2;
    string.connect(filter);
    string.start(at);
    string.stop(at + tail + .03);
    scaleVoices.push(string);

    const pick = backingContext.createBufferSource();
    const pickFilter = backingContext.createBiquadFilter();
    const pickGain = backingContext.createGain();
    pick.buffer = assets.pickBuffer;
    pickFilter.type = "bandpass";
    pickFilter.frequency.value = Math.min(5200, Math.max(900, frequency * 3.5));
    pickFilter.Q.value = .7;
    pickGain.gain.value = .035;
    pick.connect(pickFilter).connect(pickGain).connect(backingContext.destination);
    pick.start(at);
    scaleVoices.push(pick);
  } else {
    [[1,0],[2,-4],[3,3],[4,-7]].forEach(([harmonic, detune], index) => {
      const partial = backingContext.createOscillator();
      const partialGain = backingContext.createGain();
      partial.type = "sine";
      partial.frequency.value = frequency * harmonic;
      partial.detune.value = detune;
      partialGain.gain.value = [1,.34,.16,.07][index];
      partial.connect(partialGain).connect(filter);
      partial.start(at);
      partial.stop(at + tail + .03);
      scaleVoices.push(partial);
    });
  }
}

async function playScaleSequence(sequence, label, options = {}) {
  stopScaleExercise("");
  stopLick(false);
  await ensureBackingContext();
  const root = Number($("scale-root").value || 0);
  const instrument = $("scale-instrument").value || "guitar";
  const instrumentLabel = instrument === "piano" ? "钢琴" : "木吉他";
  const noteLength = (options.slow ? 42 : 30) / practiceBpm;
  const start = backingContext.currentTime + 0.06;
  const duration = sequence.length * noteLength;
  if (options.drone) {
    [36 + root, 48 + root].forEach((midi, index) => {
      const oscillator = backingContext.createOscillator();
      const gain = backingContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = midiFrequency(midi);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(index ? 0.018 : 0.026, start + 0.08);
      gain.gain.setValueAtTime(index ? 0.018 : 0.026, start + duration);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration + 0.18);
      oscillator.connect(gain).connect(backingContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.2);
      scaleVoices.push(oscillator);
    });
  }
  sequence.forEach((step, index) => {
    const at = start + index * noteLength;
    scheduleScaleNote(48 + root + step, at, noteLength, instrument);
  });
  $("scale-status").textContent = `正在播放：${label} · ${instrumentLabel} · ${practiceBpm} BPM${options.drone ? " · 持续根音" : ""}`;
  scaleExerciseTimer = setTimeout(() => {
    $("scale-status").textContent = options.finish || "完成一轮；现在不看提示，自己弹一遍。";
  }, (duration + 0.25) * 1000);
}

function playScaleFeel() {
  const scale = selectedScale();
  const root = Number($("scale-root").value || 0);
  const lick = scaleLicks(scale)[0];
  const sequence = [0, 12, ...lick.indexes.map(index => scaleToneAt(scale, index, root).step)];
  playScaleSequence(sequence, `${SCALE_ROOTS[root]} ${scale.name} · 听感示范`, { drone: true, slow: true, finish: `再听一次，并跟唱：${SCALE_FOCUS[scale.id].cue}` });
}

function playScaleLick(id) {
  const scale = selectedScale();
  const root = Number($("scale-root").value || 0);
  const lick = scaleLicks(scale).find(item => item.id === id) || scaleLicks(scale)[0];
  playScaleSequence(lick.indexes.map(index => scaleToneAt(scale, index, root).step), `${SCALE_ROOTS[root]} ${scale.name} · ${lick.name}`, { finish: "轮到你：保持节拍，照着级数弹，再改最后两个音。" });
}

async function playScaleExercise(mode) {
  const labels = { up: "上行", updown: "上下行", thirds: "三度进行", four: "四音序列" };
  const scale = selectedScale();
  const root = Number($("scale-root").value || 0);
  const sequence = scalePattern(mode, scale);
  playScaleSequence(sequence, `${SCALE_ROOTS[root]} ${scale.name} · ${labels[mode]}`);
}

function initScaleTrainer() {
  $("scale-root").innerHTML = SCALE_ROOTS.map((name, index) => `<option value="${index}" ${index === 9 ? "selected" : ""}>${name}</option>`).join("");
  const groups = [...new Set(SCALE_LIBRARY.map(scale => scale.group))];
  $("scale-type").innerHTML = groups.map(group => `<optgroup label="${group}">${SCALE_LIBRARY.filter(scale => scale.group === group).map(scale => `<option value="${scale.id}" ${scale.id === "mixolydian" ? "selected" : ""}>${scale.name}</option>`).join("")}</optgroup>`).join("");
  $("scale-root").addEventListener("change", renderScaleTrainer);
  $("scale-type").addEventListener("change", renderScaleTrainer);
  $("scale-feel").addEventListener("click", playScaleFeel);
  $("scale-lick-list").addEventListener("click", event => {
    const button = event.target.closest("[data-scale-lick]");
    if (button) playScaleLick(button.dataset.scaleLick);
  });
  document.querySelectorAll("[data-scale-pattern]").forEach(button => button.addEventListener("click", () => playScaleExercise(button.dataset.scalePattern)));
  $("scale-stop").addEventListener("click", () => stopScaleExercise());
  renderScaleTrainer();
}

function readSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch (_) {
    return new Set();
  }
}

function saveSet(key, items) {
  localStorage.setItem(key, JSON.stringify([...items]));
}

function completed() {
  return readSet("lick-done-v2");
}

function favorites() {
  return readSet("lick-favorites-v1");
}

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function mediaDuration() {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : waveformDuration || 1;
}

function updateWaveformAria() {
  const duration = mediaDuration();
  const currentTime = Math.max(0, Math.min(duration, Number(audio.currentTime) || 0));
  const waveform = $("lick-waveform");
  waveform.setAttribute("aria-valuemax", duration.toFixed(2));
  waveform.setAttribute("aria-valuenow", currentTime.toFixed(2));
  waveform.setAttribute("aria-valuetext", `${formatTime(currentTime)} / ${formatTime(duration)}`);
  $("waveform-playhead").style.left = `${duration ? currentTime / duration * 100 : 0}%`;
}

function drawWaveform() {
  updateWaveformAria();
  if (/jsdom/i.test(navigator.userAgent)) return;
  const canvas = $("lick-waveform-canvas");
  const waveform = $("lick-waveform");
  const width = Math.max(1, Math.round(waveform.clientWidth));
  const height = Math.max(1, Math.round(waveform.clientHeight));
  if (width <= 1 || height <= 1) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "#283026";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, height / 2 + .5);
  context.lineTo(width, height / 2 + .5);
  context.stroke();
  const columns = Math.max(1, Math.min(waveformPeaks.length, Math.floor(width / 2)));
  const duration = mediaDuration();
  const progress = duration ? Math.max(0, Math.min(1, (Number(audio.currentTime) || 0) / duration)) : 0;
  context.lineWidth = Math.max(1, width / columns * .72);
  context.lineCap = "round";
  for (let column = 0; column < columns; column++) {
    const peak = waveformPeaks[Math.floor(column / columns * waveformPeaks.length)] || [-.1, .1];
    const x = (column + .5) / columns * width;
    context.strokeStyle = x / width <= progress ? "#f2ff83" : "#626b5e";
    context.beginPath();
    context.moveTo(x, height / 2 + peak[0] * height * .46);
    context.lineTo(x, height / 2 + peak[1] * height * .46);
    context.stroke();
  }
}

async function decodeWaveform(source) {
  if (waveformCache.has(source)) return waveformCache.get(source);
  if (typeof fetch !== "function" || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) throw new Error("waveform decoding unavailable");
  const response = await fetch(source, { mode: "cors" });
  if (!response.ok) throw new Error(`waveform fetch ${response.status}`);
  const bytes = await response.arrayBuffer();
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const decoder = new OfflineContext(1, 1, 44100);
  const buffer = await decoder.decodeAudioData(bytes.slice(0));
  const bins = 720;
  const peaks = [];
  let absoluteMax = .0001;
  for (let bin = 0; bin < bins; bin++) {
    const start = Math.floor(bin / bins * buffer.length);
    const end = Math.max(start + 1, Math.floor((bin + 1) / bins * buffer.length));
    const stride = Math.max(1, Math.floor((end - start) / 90));
    let minimum = 0;
    let maximum = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let index = start; index < end; index += stride) {
        minimum = Math.min(minimum, samples[index]);
        maximum = Math.max(maximum, samples[index]);
      }
    }
    absoluteMax = Math.max(absoluteMax, -minimum, maximum);
    peaks.push([minimum, maximum]);
  }
  const result = { duration: buffer.duration, peaks: peaks.map(([minimum, maximum]) => [minimum / absoluteMax, maximum / absoluteMax]) };
  waveformCache.set(source, result);
  return result;
}

async function loadWaveform(source) {
  const token = ++waveformLoadToken;
  waveformPeaks = fallbackWaveform;
  $("lick-waveform").dataset.state = "loading";
  drawWaveform();
  try {
    const decoded = await decodeWaveform(source);
    if (token !== waveformLoadToken) return;
    waveformPeaks = decoded.peaks;
    waveformDuration = decoded.duration || waveformDuration;
    $("lick-waveform").dataset.state = "ready";
  } catch (_) {
    if (token !== waveformLoadToken) return;
    $("lick-waveform").dataset.state = "fallback";
  }
  drawWaveform();
  renderLoopPoints();
}

function storedLoopPoints() {
  try {
    return JSON.parse(localStorage.getItem("lick-loops-v1") || "{}");
  } catch (_) {
    return {};
  }
}

function saveLoopPoints() {
  const points = storedLoopPoints();
  points[LICKS[current].id] = [Number(loopA.toFixed(2)), Number(loopB.toFixed(2))];
  localStorage.setItem("lick-loops-v1", JSON.stringify(points));
}

function renderLoopPoints() {
  const duration = mediaDuration();
  const aPercent = Math.max(0, Math.min(100, loopA / duration * 100));
  const bPercent = Math.max(0, Math.min(100, loopB / duration * 100));
  const aMarker = $("loop-a-marker");
  const bMarker = $("loop-b-marker");
  aMarker.style.left = `${aPercent}%`;
  bMarker.style.left = `${bPercent}%`;
  aMarker.classList.toggle("marker-edge-start", aPercent < 2);
  aMarker.classList.toggle("marker-edge-end", aPercent > 98);
  bMarker.classList.toggle("marker-edge-start", bPercent < 2);
  bMarker.classList.toggle("marker-edge-end", bPercent > 98);
  $("loop-region").style.left = `${aPercent}%`;
  $("loop-region").style.width = `${Math.max(0, bPercent - aPercent)}%`;
  $("loop-a-time").max = Math.max(0, loopB - 0.02).toFixed(2);
  $("loop-b-time").max = duration.toFixed(2);
  $("loop-a-time").value = loopA.toFixed(2);
  $("loop-b-time").value = loopB.toFixed(2);
  $("loop-a-marker").setAttribute("aria-valuetext", `A 点 ${loopA.toFixed(2)} 秒`);
  $("loop-b-marker").setAttribute("aria-valuetext", `B 点 ${loopB.toFixed(2)} 秒`);
}

function setLoopPoint(point, next, options = {}) {
  const duration = mediaDuration();
  if (next === "") return;
  const value = Number(next);
  if (!Number.isFinite(value)) return;
  if (point === "a") loopA = Math.max(0, Math.min(value, loopB - 0.02));
  else loopB = Math.max(loopA + 0.02, Math.min(value, duration));
  renderLoopPoints();
  if (options.seek) audio.currentTime = point === "a" ? loopA : loopB;
  if (options.persist !== false) saveLoopPoints();
}

function loadLoopPoints() {
  const duration = mediaDuration();
  const saved = storedLoopPoints()[LICKS[current].id];
  const savedA = Number(saved?.[0]);
  const savedB = Number(saved?.[1]);
  loopA = Number.isFinite(savedA) ? Math.max(0, Math.min(savedA, duration - 0.02)) : 0;
  loopB = Number.isFinite(savedB) ? Math.max(loopA + 0.02, Math.min(savedB, duration)) : duration;
  renderLoopPoints();
}

function lickHref(index) {
  return `#lick/${LICKS[index].id}`;
}

function indexFromHash() {
  const match = location.hash.match(/^#lick\/([A-Za-z0-9]+)$/);
  if (!match) return -1;
  return LICKS.findIndex(lick => lick.id === match[1]);
}

function stopLick(reset = false) {
  audio.pause();
  $("play-lick").textContent = "▶";
  if (reset) {
    audio.currentTime = 0;
    drawWaveform();
  }
}

function bindLickLinks(container) {
  container.querySelectorAll("a[data-lick-index]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      goToLick(Number(link.dataset.lickIndex));
    });
  });
}

function goToLick(index) {
  const next = Math.max(0, Math.min(LICKS.length - 1, Number(index)));
  selectLick(next);
  const hash = lickHref(next);
  if (location.hash !== hash) location.hash = hash;
}

function enableDrag(container, axis = "x") {
  if (container.dataset.dragReady) return;
  container.dataset.dragReady = "true";
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;
  let suppressClick = false;

  container.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = container.scrollLeft;
    startTop = container.scrollTop;
    moved = false;
    suppressClick = false;
  });
  container.addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) > 6) {
      moved = true;
      suppressClick = true;
      container.setPointerCapture(pointerId);
      container.classList.add("dragging");
    }
    if (moved) event.preventDefault();
    if (axis === "x" || axis === "both") container.scrollLeft = startLeft - dx;
    if (axis === "both") container.scrollTop = startTop - dy;
  });
  const end = event => {
    if (event.pointerId !== pointerId) return;
    if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
    pointerId = null;
    container.classList.remove("dragging");
    moved = false;
  };
  container.addEventListener("pointerup", end);
  container.addEventListener("pointercancel", end);
  container.addEventListener("click", event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);
  container.addEventListener("dragstart", event => event.preventDefault());
}

function updateScoreZoom() {
  const image = $("lick-staff").querySelector("img");
  if (image) image.style.width = `${scoreZoom * 100}%`;
  $("score-zoom").textContent = `${Math.round(scoreZoom * 100)}%`;
}

function renderList() {
  const saved = favorites();
  const visible = LICKS.map((lick, index) => ({ lick, index })).filter(item => saved.has(item.lick.id));
  $("favorite-count").textContent = `★ ${saved.size}`;
  $("harmony-map").innerHTML = visible.length ? visible.map(({ lick, index }) => `
    <a class="bar ${index === current ? "active" : ""}"
       href="${lickHref(index)}" data-lick-index="${index}">
      <span class="num">★${index + 1}</span>
      <strong>${lick.chord}</strong><small>${lick.degree}</small>
    </a>`).join("") : '<p class="empty-list">还没有收藏</p>';
  bindLickLinks($("harmony-map"));
}

function updatePracticeBpm(next, syncMetronome = true) {
  practiceBpm = Math.max(40, Math.min(180, Math.round(Number(next) / 5) * 5));
  localStorage.setItem("tuner-bpm-v1", String(practiceBpm));
  audio.playbackRate = practiceBpm / SOURCE_BPM;
  audio.preservesPitch = true;
  audio.webkitPreservesPitch = true;
  $("lesson-bpm").textContent = `${practiceBpm} BPM`;
  $("lesson-original-speed").classList.toggle("on", practiceBpm === SOURCE_BPM);
  if (syncMetronome) window.metronome?.setBpm(practiceBpm);
}

function updateMetronomeButton(running) {
  $("lesson-metro").classList.toggle("on", Boolean(running));
  $("lesson-metro").textContent = `节拍：${running ? "开" : "关"}`;
}

function genericBarAnalysis(lick) {
  return chordProgression(lick).map((chord, index) => {
    const guide = CHORD_GUIDES[chord] || { tones: "先找根音、3、5、7", scale: "先用和弦音判断，再选择音阶", color: "非和弦音要看它如何解决到前后音。" };
    return {
      chord: `第 ${index + 1} 小节 · ${chord}`,
      scale: guide.scale,
      why: `${guide.tones}。${guide.color}`,
      notes: []
    };
  });
}

function renderAnalysis(lick, theory) {
  const bars = DETAILED_ANALYSIS[lick.id] || genericBarAnalysis(lick);
  $("bar-detail").innerHTML = `
    <div class="analysis-title"><strong>为什么这样走</strong><small>${DETAILED_ANALYSIS[lick.id] ? "按谱面逐音分析" : "按当前和弦分析"}</small></div>
    <div class="theory-tags">${theory.tags.map(item => `<span>${item}</span>`).join("")}</div>
    <small class="theory-context">${theory.context}</small>
    <div class="bar-analysis">${bars.map(bar => `
      <article class="analysis-bar">
        <h4>${bar.chord}</h4>
        ${bar.notes.length ? `<div class="note-flow">${bar.notes.map(([note, role, type]) => `<span class="note-chip ${type}">${note}<small>${role}</small></span>`).join("<b>›</b>")}</div>` : ""}
        <p class="scale-choice"><strong>音阶视角：</strong>${bar.scale}</p>
        <p>${bar.why}</p>
      </article>`).join("")}</div>
    <details class="theory-help"><summary>怎么看“半减七音阶”和经过音？</summary>
      <p><strong>先和弦、后音阶：</strong>先圈出每个和弦的 1、3、5、7；稳定停留的非和弦音才当张力。夹在两个目标音之间并立刻解决的音，优先理解为经过音或趋近音，不必硬塞进同一条音阶。</p>
      <p><strong>m7♭5（半减七）：</strong>和弦骨架是 1–♭3–♭5–♭7。大调语境常用 Locrian；小调 ii–V–i 中常用 Locrian ♮2（旋律小调第六模式）。是否真是“半减七音阶”，要由当时的和弦和解决方向决定。</p>
      <div class="legend"><span class="chord-key">和弦音</span><span class="color-key">音阶色彩/张力</span><span class="chromatic-key">半音经过/趋近</span></div>
    </details>`;
}

function render() {
  const finished = completed();
  const saved = favorites();
  const lick = LICKS[current];
  const percent = Math.round((finished.size / LICKS.length) * 100);

  $("course-progress").style.width = `${percent}%`;
  $("progress-label").textContent = `${finished.size}/${LICKS.length}`;
  $("course-map").innerHTML = LICKS.map((item, index) => `
    <a class="level ${finished.has(item.id) ? "done" : ""} ${index === current ? "current" : ""}"
       href="${lickHref(index)}" data-lick-index="${index}">
      <small>Lick ${index + 1}</small><strong>${item.group}</strong>
    </a>`).join("");
  bindLickLinks($("course-map"));
  renderList();

  $("lesson-title").textContent = lick.name;
  $("lesson-meta").textContent = `公开授权 · ${lick.bars} 小节`;
  $("lesson-track").textContent = lick.chord;
  $("lesson-harmony").innerHTML = `<strong>${lick.degree}</strong>`;
  const theory = THEORY_OVERRIDES[lick.id] || THEORY[lick.kind];
  renderAnalysis(lick, theory);
  $("lick-staff").innerHTML = `<img src="${lick.score}" alt="${lick.name} 五线谱" draggable="false">`;
  $("preview-status").innerHTML = '谱面与示范音频：<a href="https://bopland.org/database#guitar-licks" target="_blank" rel="noopener">BopLand</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hans" target="_blank" rel="noopener">CC BY-SA 4.0</a> · 伴奏为本站按和弦实时生成';
  $("master-lick").textContent = finished.has(lick.id) ? "✓ 已掌握" : "标记已掌握";
  $("favorite-lick").textContent = saved.has(lick.id) ? "★ 已收藏" : "☆ 收藏这条 Lick";

  const nextSource = new URL(lick.audio, location.href).href;
  if (audio.src !== nextSource) {
    audio.src = lick.audio;
    waveformDuration = 1;
    waveformPeaks = fallbackWaveform;
    $("lick-time").textContent = "0:00";
    $("play-lick").textContent = "▶";
    loopA = 0;
    loopB = 1;
    renderLoopPoints();
    loadWaveform(nextSource);
  }
  audio.loop = false;
  updatePracticeBpm(practiceBpm, false);
  $("toggle-loop").textContent = `A/B 循环：${looping ? "开" : "关"}`;
  updateMetronomeButton(window.metronome?.isRunning?.() || false);
  updateScoreZoom();
  drawWaveform();
  $("lick-staff").scrollTo({ left: 0, top: 0 });
}

function selectLick(index) {
  const next = Math.max(0, Math.min(LICKS.length - 1, Number(index)));
  if (next === current && audio.src) return;
  stopLick(true);
  current = next;
  scoreZoom = 1;
  localStorage.setItem("lick-current-v2", String(current));
  render();
}

audio.addEventListener("loadedmetadata", () => {
  waveformDuration = audio.duration || waveformDuration;
  $("lick-time").textContent = formatTime(audio.duration);
  loadLoopPoints();
  drawWaveform();
});
audio.addEventListener("timeupdate", () => {
  if (looping && !audio.paused && audio.currentTime >= loopB) audio.currentTime = loopA;
  drawWaveform();
});
audio.addEventListener("play", () => { $("play-lick").textContent = "■"; startBackingClock(); });
audio.addEventListener("pause", () => { $("play-lick").textContent = "▶"; stopBackingClock(); });
audio.addEventListener("ended", async () => {
  if (!looping) {
    $("play-lick").textContent = "▶";
    return;
  }
  audio.currentTime = loopA;
  try {
    await audio.play();
  } catch (_) {
    $("preview-status").textContent = "循环播放被浏览器阻止，请再点一次播放。";
  }
});
audio.addEventListener("error", () => {
  $("preview-status").textContent = "音频加载失败，请检查网络后重试。";
});

async function togglePlayback() {
  if (!audio.paused) {
    audio.pause();
    return;
  }
  if (looping && audio.currentTime >= loopB) audio.currentTime = loopA;
  try {
    await audio.play();
  } catch (_) {
    $("preview-status").textContent = "浏览器阻止了播放，请再点一次。";
  }
}

$("play-lick").addEventListener("click", togglePlayback);
$("loop-a-time").addEventListener("input", event => setLoopPoint("a", event.target.value, { seek: true }));
$("loop-b-time").addEventListener("input", event => setLoopPoint("b", event.target.value, { seek: true }));
$("set-loop-a").addEventListener("click", () => setLoopPoint("a", audio.currentTime));
$("set-loop-b").addEventListener("click", () => setLoopPoint("b", audio.currentTime));
$("reset-loop-points").addEventListener("click", () => {
  loopA = 0;
  loopB = mediaDuration();
  renderLoopPoints();
  saveLoopPoints();
});
$("lesson-bpm-minus").addEventListener("click", () => updatePracticeBpm(practiceBpm - 5));
$("lesson-bpm-plus").addEventListener("click", () => updatePracticeBpm(practiceBpm + 5));
$("lesson-original-speed").addEventListener("click", () => updatePracticeBpm(SOURCE_BPM));
$("toggle-backing").addEventListener("click", async () => {
  backingEnabled = !backingEnabled;
  $("toggle-backing").classList.toggle("on", backingEnabled);
  $("toggle-backing").setAttribute("aria-pressed", String(backingEnabled));
  $("toggle-backing").textContent = `伴奏：${backingEnabled ? "开" : "关"}`;
  if (backingEnabled) {
    await ensureBackingContext();
    if (!audio.paused) startBackingClock();
  } else stopBackingClock();
});
$("toggle-demo").addEventListener("click", () => {
  audio.muted = !audio.muted;
  const enabled = !audio.muted;
  $("toggle-demo").classList.toggle("on", enabled);
  $("toggle-demo").setAttribute("aria-pressed", String(enabled));
  $("toggle-demo").textContent = `示范音：${enabled ? "开" : "关"}`;
});
$("lesson-metro").addEventListener("click", () => {
  if (!window.metronome) return;
  window.metronome.toggle();
  updateMetronomeButton(window.metronome.isRunning());
});
$("toggle-loop").addEventListener("click", () => {
  looping = !looping;
  $("toggle-loop").classList.toggle("on", looping);
  $("toggle-loop").textContent = `A/B 循环：${looping ? "开" : "关"}`;
});
$("master-lick").addEventListener("click", () => {
  const items = completed();
  const id = LICKS[current].id;
  items.has(id) ? items.delete(id) : items.add(id);
  saveSet("lick-done-v2", items);
  render();
});
$("favorite-lick").addEventListener("click", () => {
  const items = favorites();
  const id = LICKS[current].id;
  items.has(id) ? items.delete(id) : items.add(id);
  saveSet("lick-favorites-v1", items);
  render();
});
$("score-minus").addEventListener("click", () => {
  scoreZoom = Math.max(1, scoreZoom - 0.25);
  updateScoreZoom();
});
$("score-plus").addEventListener("click", () => {
  scoreZoom = Math.min(3, scoreZoom + 0.25);
  updateScoreZoom();
});
$("score-zoom").addEventListener("click", () => {
  scoreZoom = 1;
  updateScoreZoom();
  $("lick-staff").scrollTo({ left: 0, top: 0 });
});
$("score-expand").addEventListener("click", async () => {
  const stage = $("score-stage");
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else if (stage.requestFullscreen) {
    await stage.requestFullscreen();
  } else {
    stage.classList.toggle("expanded");
  }
});
window.addEventListener("hashchange", () => {
  const index = indexFromHash();
  if (index >= 0) selectLick(index);
});
window.addEventListener("tuner:metro-change", event => {
  if (event.detail?.bpm) updatePracticeBpm(event.detail.bpm, false);
  updateMetronomeButton(event.detail?.running);
});

function bindWaveformScrub() {
  const waveform = $("lick-waveform");
  let activePointer = null;
  const seek = event => {
    const bounds = waveform.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
    audio.currentTime = ratio * mediaDuration();
    drawWaveform();
  };
  waveform.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    activePointer = event.pointerId;
    waveform.setPointerCapture(activePointer);
    seek(event);
  });
  waveform.addEventListener("pointermove", event => {
    if (event.pointerId === activePointer) seek(event);
  });
  const finish = event => {
    if (event.pointerId !== activePointer) return;
    seek(event);
    activePointer = null;
  };
  waveform.addEventListener("pointerup", finish);
  waveform.addEventListener("pointercancel", event => {
    if (event.pointerId === activePointer) activePointer = null;
  });
  waveform.addEventListener("keydown", event => {
    const duration = mediaDuration();
    let next = Number(audio.currentTime) || 0;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const amount = event.shiftKey ? .01 : .05;
      next += event.key === "ArrowRight" ? amount : -amount;
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      next += event.key === "PageUp" ? 1 : -1;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = duration;
    else return;
    event.preventDefault();
    audio.currentTime = Math.max(0, Math.min(duration, next));
    drawWaveform();
  });
  if (window.ResizeObserver) new ResizeObserver(drawWaveform).observe(waveform);
  else window.addEventListener("resize", drawWaveform);
}

function bindLoopMarker(id, point) {
  const marker = $(id);
  let activePointer = null;
  const updateFromPointer = (event, persist) => {
    const bounds = $("lick-timeline").getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setLoopPoint(point, ratio * mediaDuration(), { seek: true, persist });
  };
  marker.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    activePointer = event.pointerId;
    marker.setPointerCapture(activePointer);
    updateFromPointer(event, false);
  });
  marker.addEventListener("pointermove", event => {
    if (event.pointerId === activePointer) updateFromPointer(event, false);
  });
  const finish = event => {
    if (event.pointerId !== activePointer) return;
    updateFromPointer(event, true);
    activePointer = null;
  };
  marker.addEventListener("pointerup", finish);
  marker.addEventListener("pointercancel", finish);
  marker.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const amount = event.shiftKey ? 0.01 : 0.05;
    const currentPoint = point === "a" ? loopA : loopB;
    setLoopPoint(point, currentPoint + (event.key === "ArrowRight" ? amount : -amount), { seek: true });
  });
}

document.addEventListener("keydown", event => {
  if (event.code !== "Space" || event.repeat) return;
  const target = event.target;
  if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target?.tagName || "")) return;
  if (getComputedStyle($("lesson-page")).display === "none") return;
  event.preventDefault();
  togglePlayback();
});

enableDrag($("course-map"), "x");
enableDrag($("harmony-map"), "x");
enableDrag($("lick-staff"), "both");
bindWaveformScrub();
bindLoopMarker("loop-a-marker", "a");
bindLoopMarker("loop-b-marker", "b");
initScaleTrainer();
const initialFromHash = indexFromHash();
const savedIndex = Math.max(0, Math.min(LICKS.length - 1, Number(localStorage.getItem("lick-current-v2") || 0)));
current = initialFromHash >= 0 ? initialFromHash : savedIndex;
window.lessonPlayer = { stop: () => { stopLick(true); stopScaleExercise(""); }, select: selectLick, setBpm: updatePracticeBpm, setLoopPoint, getLoopPoints: () => [loopA, loopB] };
render();
})();
