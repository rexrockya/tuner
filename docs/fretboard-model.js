/* lesson1297: the source TAB's sounding pitches and original string/fret positions.
   Adapted from BopLand, CC BY-SA 4.0. No claim that an arpeggio identifies one scale. */
(function (root) {
  'use strict';
  const OPEN = [0, 64, 59, 55, 50, 45, 40]; // String 1 first, sounding MIDI.
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const mod = n => ((n % 12) + 12) % 12;
  const midi = (string, fret) => OPEN[string] + fret;
  const pitch = n => NAMES[mod(n)] + (Math.floor(n / 12) - 1);
  const chord = (name, rootPc, tones, anchors, shapes, bridge) => ({name, rootPc, tones, anchors, shapes, bridge});
  const voicing = (name, frets, note) => ({name, frets, note}); // low string 6 to high string 1; null = muted
  const CHORDS = {
    Cmaj7: chord('Cmaj7', 0, {0:'1',4:'3',7:'5',11:'7'}, [[5,3],[6,8]], [
      voicing('A 形 + G 形', [null,3,5,4,5,3], 'Cmaj7 的 A 形骨架 x35453；相邻 C 大三和弦 G 形 875558。E3 在两形重叠区，D4 是旁边的 9。'),
      voicing('A 形 · Cmaj7', [null,3,5,4,5,3], 'Cmaj7：x35453。由熟悉的 C 大三和弦 A 形 x35553，把 3 弦的 C 降为 B（7）。'),
      voicing('G 形 · C 三和弦', [8,7,5,5,5,8], 'C 大三和弦：875558。它是 Cmaj7 的 1–3–5 地标；七音 B 另用骨架圆点显示。')
    ], 'C3：5 弦 3 品与 6 弦 8 品是同一实音。往高处找 C4（3 弦 5 品）。'),
    A7: chord('A7', 9, {0:'1',4:'3',7:'5',10:'♭7'}, [[6,5],[5,0]], [
      voicing('E 形 · A7', [5,7,5,6,5,5], 'A7：575655。熟悉的 E 形中，C♯ 在 3 弦 6 品，E 在 2 弦 5 品。高弦 G 与 B♭ 在形状外侧。')
    ], 'A2（6 弦 5 品）→ A3（4 弦 7 品）→ A4（1 弦 5 品）。5 弦空弦也是 A2。'),
    Dm7: chord('Dm7', 2, {0:'1',3:'♭3',7:'5',10:'♭7'}, [[5,5],[6,10]], [
      voicing('A 小调形 · Dm7', [null,5,7,5,6,5], 'Dm7：x57565。属于 A 小调形家族；F 是 ♭3，C 是 ♭7。A4 在 1 弦 5 品，是当前和弦的 5。')
    ], 'D3：5 弦 5 品与 6 弦 10 品是同一实音。D4 在 3 弦 7 品或 2 弦 3 品。'),
    G7: chord('G7', 7, {0:'1',4:'3',7:'5',10:'♭7'}, [[6,3],[5,10]], [
      voicing('E 形 · G7', [3,5,3,4,3,3], 'G7：353433。3 弦 4 品的 B 是 3；4 弦 3 品的 F 是 ♭7。先认骨架，再看 A♭、B♭。')
    ], 'G2（6 弦 3 品）→ G3（4 弦 5 品 / 5 弦 10 品）→ G4（1 弦 3 品）。')
  };
  const source = [
    {chord:'Cmaj7', notes:[[5,7,'E3'],[4,5,'G3'],[3,4,'B3'],[3,7,'D4']], title:'从中低弦走向高处', text:'E–G–B–D = 3–5–7–9：像 Em7 的琶音，放在 Cmaj7 上形成无根音 Cmaj9 色彩。先看 C 的 A 形与 G 形重叠，再把 D 当作 C4 上方两品的 9。'},
    {chord:'A7', notes:[[3,6,'C♯4'],[2,5,'E4'],[1,3,'G4'],[1,6,'B♭4']], title:'同样的 E、G，换一个角色', text:'C♯–E–G–B♭ = 3–5–♭7–♭9：C♯dim7 的音组成无根音 A7♭9。E4（2/5）回到 E3（5/7），G4（1/3）回到 G3（4/5）：音名相同，和弦角色改变。B♭ 再下半音解决到 Dm7 的 A。'},
    {chord:'Dm7', notes:[[1,5,'A4'],[2,6,'F4'],[2,3,'D4'],[3,5,'C4']], title:'落在 Dm7 的骨架上', text:'A–F–D–C = 5–♭3–1–♭7。把高处的 A4 连回 A3（4 弦 7 品），再连回 A2（6 弦 5 品）。同一个 A，在 A7 是根音，在 Dm7 是五音。'},
    {chord:'G7', notes:[[3,4,'B3'],[4,5,'G3'],[4,6,'A♭3'],[4,8,'B♭3']], title:'骨架之后，再加入张力', text:'B–G–A♭–B♭ = 3–1–♭9–♯9。A♭、B♭ 是 G7 上的变化张力；这里不是普通的 C 大调音阶。观察下一段回到 G 的方向，不把所有音硬塞进一个音阶框。'},
    {chord:'Cmaj7', notes:[[4,5,'G3'],[2,5,'E4'],[3,7,'D4'],[3,5,'C4']], title:'用八度桥接回 C', text:'G–E–D–C = 5–3–9–1。E4（2 弦 5 品）与开头的 E3（5 弦 7 品）相差一个八度；先把这个桥记牢，再听 9 落回根音。'},
    {chord:'A7', notes:[[3,6,'C♯4'],[4,8,'B♭3'],[4,5,'G3'],[4,6,'G♯3',.5,'approach']], title:'把趋近音指向落点', text:'C♯–B♭–G 是 3–♭9–♭7；最后 G♯ 半音上行到下一段的 A。这里把 G♯ 标为趋近音，不当成 A7 的稳定骨架，也不因为 C♯ 不在 C 大调里就叫它经过音。'},
    {chord:'Dm7', notes:[[4,7,'A3',1],[5,8,'F3'],[5,5,'D3']], title:'回到熟悉的中低弦', text:'A–F–D = 5–♭3–1。A 是一拍，F 与 D 各半拍。刚才高弦的 A4，现在落低一个八度到 4 弦 7 品；位置不同，Dm7 的五音角色不变。'},
    {chord:'G7', notes:[[5,8,'F3',2]], title:'停在七音，听见下一轮', text:'最后的 F 持续两拍，是 G7 的 ♭7。留住这个音，再看下一轮 Cmaj7 开头 E：F→E 下行半音，把属七的七音连到主和弦的三音。'}
  ];
  const NOTES = [], SEGMENTS = source.map((s, segment) => {
    const notes = s.notes.map(([string,fret,name,duration=.5,kind]) => {
      const note = {index:NOTES.length, segment, string, fret, name, duration, midi:midi(string,fret), kind};
      NOTES.push(note); return note;
    });
    return {...s, notes, index:segment, bar:Math.floor(segment/2)+1, beat:segment%2 ? 3 : 1};
  });
  function role(ch, pc, kind) {
    const interval = mod(pc - ch.rootPc);
    if (kind === 'approach') return {degree:'趋近', kind:'approach', description:'G♯ 半音上行到下一段的 A（Dm7 的 5）'};
    if (ch.tones[interval]) return {degree:ch.tones[interval], kind:'skeleton', description:ch.name + ' 的 ' + ch.tones[interval] + ' 音 · 和弦骨架'};
    const degree = ({1:'♭9',2:'9',3:'♯9',5:'11',6:'♯11',8:'♭13',9:'13',10:'♭7',11:'7'})[interval];
    return {degree, kind:'color', description:ch.name + ' 的 ' + degree + (['♭9','9','♯9'].includes(degree) ? ' · 色彩 / 张力' : ' · 骨架外的音（需结合走向）')};
  }
  function equivalents(n, maxFret=12) {
    const result = [];
    for (let string=1; string<=6; string++) for (let fret=0; fret<=maxFret; fret++) {
      if (mod(midi(string,fret)) === mod(n)) result.push({string,fret,midi:midi(string,fret),name:pitch(midi(string,fret))});
    }
    return result;
  }
  const api = {OPEN,NAMES,CHORDS,NOTES,SEGMENTS,midi,pitch,mod,role,equivalents};
  root.FretboardLesson = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
