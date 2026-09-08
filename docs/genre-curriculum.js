window.tunerCurriculum = {
  "version": 1,
  "title": "TUner 多风格原创练习",
  "language": "zh-CN",
  "scope": "Blues、Jazz、Shoegaze、Folk、R&B 各含基础、应用、综合三课；Funk / Soul 六课，额外提供三课经典节奏吉他演奏型。全部任务原创，未转录歌曲或声称真人录音。",
  "integration": {
    "strategyField": "style",
    "strategyKeys": [
      "mixed",
      "call",
      "motif",
      "blues",
      "arpeggio",
      "syncopated",
      "space"
    ],
    "feelKeys": [
      "shuffle",
      "slow",
      "straight",
      "boogie",
      "soul",
      "funk",
      "halftime",
      "latin"
    ],
    "notice": "课程步骤是跟随伴奏完成的演奏任务。生成器提供可变练习材料，不应把随机生成的每条乐句描述为已经逐项完成所有技法的标准答案。",
    "numericNotation": "所有数字按所选主音的大调音级定位；小和弦显式写 m 或 m7。逗号分小节；本资产全部为 4/4。",
    "harmonyCaution": "当前解析器虽识别 add9/9，但没有把九音加入 intervals。本资产不使用九和弦，sus2、m7、maj7 已按当前实现核验。",
    "uiSuggestion": "风格选择与乐句策略分开；先选风格，再选课。课程显示目标、和声、步骤和听辨要点；同一课可载入原创乐句或伴奏，并保留变调、变速、分轨、循环、收藏与 MIDI。",
    "audioNote": "Shoegaze 课程中的空间、延音与层次需要相应音频效果或用户自己的乐器演奏；无效果的谱面示范仅教授音高、节奏和结构。 Funk 新增课程中的无音高闷音为用户演奏任务，除非新引擎已明确实现相应声音与谱面，否则自动伴奏仅示范发声位置。",
    "additionalRhythmStyles": {
      "sixteenth": "Funk 十六分短切；由新引擎提供。",
      "soulcomp": "反拍中高音区小型和弦；由新引擎提供。"
    }
  },
  "sources": [
    {
      "id": "berklee-groove",
      "title": "Berklee Online · Rhythm and Groove Guitar",
      "url": "https://online.berklee.edu/courses/rhythm-and-groove-guitar",
      "supports": "切分、右手律动与和声配合的教学组织。"
    },
    {
      "id": "fender-soul",
      "title": "Fender · Learn to Play R&B / Soul",
      "url": "https://www.fender.com/articles/songs/r-and-b-soul-path",
      "supports": "R&B/Soul 中七和弦、制音和反拍节奏的教学重点。"
    },
    {
      "id": "boss-space",
      "title": "BOSS · Using Delay for Specific Genres",
      "url": "https://articles.boss.info/using-delay-for-specific-genres/",
      "supports": "Shoegaze 的空间效果、延迟叠加与避免低频遮蔽。"
    },
    {
      "id": "fender-fingerstyle",
      "title": "Fender · Learn Travis Picking on Guitar",
      "url": "https://www.fender.com/articles/techniques/travis-picking-on-guitar",
      "supports": "拇指保持交替低音，其他手指演奏高音声部。"
    },
    {
      "id": "berklee-voiceleading",
      "title": "Berklee Online · Voice Leading for Guitar",
      "url": "https://online.berklee.edu/takenote/voice-leading-for-guitar/",
      "supports": "ii–V–I 中三音、七音的平滑连接。"
    },
    {
      "id": "berklee-fundamentals",
      "title": "Berklee Online · Guitar Fundamentals",
      "url": "https://online.berklee.edu/courses/guitar-fundamentals",
      "supports": "Blues 十二小节、shuffle、和弦与指弹由浅入深的能力组织。"
    }
  ],
  "genres": [
    {
      "id": "blues",
      "name": "Blues",
      "nameZh": "蓝调",
      "tagline": "在十二小节里说一句、答一句",
      "description": "围绕属七和弦、蓝调音与 shuffle 建立有呼吸的句子，再学习换和弦落点和十二小节结构。",
      "capabilities": [
        "I7–IV7–V7 与十二小节结构",
        "小三度与大三度的张力",
        "三连音摆动与问答留白",
        "回转、变调与整轮伴奏"
      ],
      "sourceIds": [
        "berklee-fundamentals"
      ],
      "lessons": [
        {
          "id": "blues-01",
          "level": "基础",
          "title": "两小节问，一小节留白",
          "brief": "用 A7 上的少量音符建立短句，先让节奏有呼吸。",
          "steps": [
            "先跟 A7 伴奏数四拍；把每拍想成三连音，只弹第一和第三份，熟悉 shuffle 的长短关系。",
            "用 A、C、D、E、G 中的三个音作一句提问；第二小节回答时减少音数，结束后留出至少一拍。",
            "试听生成材料后关闭主奏，自己连续做四轮问答；保留第一轮的节奏，只换一个音。"
          ],
          "listenFor": [
            "长短八分是否保持同一比例，句尾有没有越弹越赶。",
            "休止后再进入是否仍能找到第一拍，而不是靠伴奏提示补拍。"
          ],
          "progression": "17,17,17,17",
          "key": "A",
          "bpm": 76,
          "strategy": "call",
          "feel": "shuffle",
          "intensity": "easy",
          "arrangement": {
            "bassStyle": "fifths",
            "drumStyle": "shuffle",
            "keyStyle": "none",
            "rhythmStyle": "boogie"
          },
          "focus": "lead",
          "rhythmStyle": "boogie"
        },
        {
          "id": "blues-02",
          "level": "应用",
          "title": "换到 IV7，让三音带路",
          "brief": "同一条短句经过 A7 与 D7 时，靠一个目标音让换和声听得见。",
          "steps": [
            "在 A7 上唱出 C♯，在 D7 上唱出 F♯；再用吉他确认两者分别是当前和弦的大三度。",
            "把第一课的节奏放进四小节；第 3 小节换 D7 时落 F♯，第 4 小节回 A7 时落 C♯ 或 A。",
            "在 A7 的短弱拍加入 C，随后到 C♯；先分别弹准两音，再尝试滑音连接。"
          ],
          "listenFor": [
            "A7 上 C→C♯ 是否有清楚的张力与落地，而不是把 C 当成永远稳定的三音。",
            "D7 出现时旋律是否回应 F♯ 或 C 等和弦特征音。"
          ],
          "progression": "17,17,47,17",
          "key": "A",
          "bpm": 86,
          "strategy": "blues",
          "feel": "shuffle",
          "intensity": "standard",
          "arrangement": {
            "bassStyle": "walking",
            "drumStyle": "shuffle",
            "keyStyle": "offbeat",
            "rhythmStyle": "boogie"
          },
          "focus": "lead",
          "rhythmStyle": "boogie"
        },
        {
          "id": "blues-03",
          "level": "综合",
          "title": "十二小节，三段完整叙事",
          "brief": "将陈述、回答和回转放进完整十二小节，循环后自然接回开头。",
          "steps": [
            "前 4 小节提出动机；第 5–8 小节保留节奏并随 D7 改落点，避免一进入新和弦就重写整句话。",
            "第 9–10 小节跟随 E7→D7，下行选择 G♯→F♯ 或 D→C；第 11 小节回 A7 做短收束。",
            "第 12 小节 E7 留出吸气的位置，下一轮 A7 准时进入；录下两轮，第二轮只增加一个变化。"
          ],
          "listenFor": [
            "不看屏幕时能否听出第 5、9、11 小节的结构位置。",
            "最后一小节是否形成通向下一轮的方向，循环边界有没有抢拍。"
          ],
          "progression": "17,17,17,17,47,47,17,17,57,47,17,57",
          "key": "A",
          "bpm": 96,
          "strategy": "blues",
          "feel": "shuffle",
          "intensity": "auto",
          "arrangement": {
            "bassStyle": "walking",
            "drumStyle": "shuffle",
            "keyStyle": "soul",
            "rhythmStyle": "boogie"
          },
          "focus": "lead",
          "rhythmStyle": "boogie"
        }
      ]
    },
    {
      "id": "jazz",
      "name": "Jazz",
      "nameZh": "爵士",
      "tagline": "让每次换和弦都被旋律听见",
      "description": "从 ii–V–I 的三音、七音入手，把和弦分解、趋近音与有方向的动机结合。",
      "capabilities": [
        "ii–V–I 与回转和声",
        "三音、七音声部连接",
        "和弦分解与半音趋近",
        "直八与摇摆句法比较"
      ],
      "sourceIds": [
        "berklee-voiceleading",
        "berklee-groove"
      ],
      "lessons": [
        {
          "id": "jazz-01",
          "level": "基础",
          "title": "只用一条线听见 ii–V–I",
          "brief": "先用少量长音理解 Dm7→G7→Cmaj7 的解决关系。",
          "steps": [
            "循环四小节，分别找出 Dm7 的 F/C、G7 的 B/F、Cmaj7 的 E/B。",
            "第一轮只弹 F→F→E→E；第二轮改弹 C→B→B→B，用长音听两个声部的移动。",
            "再试听生成乐句，圈出其中的和弦音；关闭主奏，在相同和声上把两条线各弹一遍。"
          ],
          "listenFor": [
            "G7 的 F 下行到 Cmaj7 的 E，是否有明确的解决感。",
            "换和弦时长音有没有被不必要的停顿打断。"
          ],
          "progression": "2m7,57,1maj7,1maj7",
          "key": "C",
          "bpm": 72,
          "strategy": "space",
          "feel": "straight",
          "intensity": "easy",
          "arrangement": {
            "bassStyle": "fifths",
            "drumStyle": "ride",
            "keyStyle": "offbeat",
            "rhythmStyle": "none"
          },
          "focus": "lead",
          "rhythmStyle": "none"
        },
        {
          "id": "jazz-02",
          "level": "应用",
          "title": "分解和弦，接近下一个三音",
          "brief": "把和弦音连成短线，用半音趋近加强下一小节的落点。",
          "steps": [
            "每小节先用当前和弦的 1、3、5、7 作八分音符分解；弹完后保留一拍空隙。",
            "进入 G7 前在弱拍试用 A♯→B，进入 Cmaj7 前试用 D♯→E；趋近音短，目标音较长。",
            "把相同音符分别放在 Straight 和轻摇摆中试听，确定节拍稳定后再增加连贯性。"
          ],
          "listenFor": [
            "半音是否立即去往目标音，强拍有没有停在未解决的经过音上。",
            "句子的方向是否跨越小节线，避免每小节都从根音重新开始。"
          ],
          "progression": "2m7,57,1maj7,6m7",
          "key": "C",
          "bpm": 92,
          "strategy": "arpeggio",
          "feel": "shuffle",
          "intensity": "standard",
          "arrangement": {
            "bassStyle": "walking",
            "drumStyle": "ride",
            "keyStyle": "offbeat",
            "rhythmStyle": "none"
          },
          "focus": "lead",
          "rhythmStyle": "none"
        },
        {
          "id": "jazz-03",
          "level": "综合",
          "title": "八小节动机与回转",
          "brief": "用一个两小节动机走过 I–vi–ii–V，再以 ii–V–I 收束。",
          "steps": [
            "前两小节作一个可以哼唱的节奏动机；第 3–4 小节保留节奏，调整为 Dm7 与 G7 的和弦音。",
            "第 5–6 小节让音区或音数稍微增加，第 7 小节回到 Cmaj7 时延长 E 或 C。",
            "第 8 小节保持短句与留白，循环下一轮；移到 F 调时先重找三音、七音，再复用原节奏。"
          ],
          "listenFor": [
            "和声变化后仍能否认出同一个动机。",
            "第 7 小节是否真正收束，而不是密度一路上升直到循环结束。"
          ],
          "progression": "1maj7,6m7,2m7,57,2m7,57,1maj7,1maj7",
          "key": "C",
          "bpm": 110,
          "strategy": "motif",
          "feel": "shuffle",
          "intensity": "auto",
          "arrangement": {
            "bassStyle": "walking",
            "drumStyle": "ride",
            "keyStyle": "offbeat",
            "rhythmStyle": "chop"
          },
          "focus": "lead",
          "rhythmStyle": "chop"
        }
      ]
    },
    {
      "id": "funk-soul",
      "name": "Funk / Soul",
      "nameZh": "放克与灵魂乐",
      "tagline": "少几个音，把十六分弹得更准",
      "description": "以十六分网格、短促制音和贝斯互动建立 Funk，再用 Soul 的和声回应拓宽句法。",
      "capabilities": [
        "十六分细分与重音位移",
        "短切和弦、制音和休止",
        "八度贝斯与节奏互补",
        "小七和弦 vamp 与 Soul 回应"
      ],
      "sourceIds": [
        "berklee-groove",
        "fender-soul"
      ],
      "lessons": [
        {
          "id": "funk-soul-01",
          "level": "基础",
          "title": "一和弦，四个十六分格",
          "brief": "在 Am7 固定和声上训练短促音头与整齐休止，让律动由节奏产生。",
          "steps": [
            "每拍数「1 e & a」，拨弦手保持均匀上下运动；先只在每拍第一格弹响，其余格轻触制音。",
            "用 Am7 的 C、E、G 做小型和弦或单音，把发声移到第 1 拍、2 的 &、4 的 &；每次发声后及时放松按弦手制音。",
            "保持同一个一小节节奏连续四轮；再加入一个十六分弱起，其余位置保持不动。"
          ],
          "listenFor": [
            "休止是否足够安静，短音是否长短一致。",
            "切分进入时是否仍能感觉到四分音符脉搏，速度有没有变快。"
          ],
          "progression": "6m7,6m7,6m7,6m7",
          "key": "C",
          "bpm": 84,
          "strategy": "syncopated",
          "feel": "funk",
          "intensity": "easy",
          "arrangement": {
            "bassStyle": "octave",
            "drumStyle": "funk",
            "keyStyle": "none",
            "rhythmStyle": "chop"
          },
          "focus": "lead",
          "rhythmStyle": "chop"
        },
        {
          "id": "funk-soul-02",
          "level": "应用",
          "title": "吉他与贝斯错开说话",
          "brief": "在 Am7→D7 的 vamp 中设计互补节奏，听出小和弦上的明亮六度。",
          "steps": [
            "先静音主奏，只听鼓和贝斯一轮；记住低音最明显的两三个音头位置。",
            "在 Am7 上用短句回应贝斯，尽量把自己的主要音头放在低音之间；到 D7 时用 F♯ 或 C 说明和声变化。",
            "对比 Am7 上 F 与 F♯ 的颜色，再选择 F♯ 为这一组 Am7→D7 增加 Dorian 的明亮感；保持节奏不变。"
          ],
          "listenFor": [
            "吉他是否在补充贝斯的空隙，还是所有声部都挤在同一位置。",
            "F♯ 是否与 D7 的大三度形成连贯联系，而不是随机增加色彩音。"
          ],
          "progression": "6m7,27,6m7,27",
          "key": "C",
          "bpm": 98,
          "strategy": "syncopated",
          "feel": "funk",
          "intensity": "standard",
          "arrangement": {
            "bassStyle": "octave",
            "drumStyle": "funk",
            "keyStyle": "offbeat",
            "rhythmStyle": "chop"
          },
          "focus": "lead",
          "rhythmStyle": "chop"
        },
        {
          "id": "funk-soul-03",
          "level": "综合",
          "title": "短切主歌，Soul 回答",
          "brief": "前四小节锁住节奏，后四小节用更连贯的七和弦旋律形成层次。",
          "steps": [
            "第 1–4 小节保留一条短切动机，重音与制音位置每轮保持一致；最多使用四个旋律音。",
            "第 5–8 小节保持鼓贝斯不变，旋律改为较长的回答；从 Fmaj7→G7→Em7→Am7 中选择就近和弦音。",
            "第二轮把前半段减去一次发声，后半段只增加一个双音点缀；对照录音判断段落是否更清楚。"
          ],
          "listenFor": [
            "少弹一个音之后律动是否仍完整，能否依靠休止制造推动。",
            "前后段的短音与长音是否形成层次，同时保持相同的基本速度。"
          ],
          "progression": "6m7,27,6m7,27,4maj7,57,3m7,6m7",
          "key": "C",
          "bpm": 102,
          "strategy": "call",
          "feel": "funk",
          "intensity": "auto",
          "arrangement": {
            "bassStyle": "octave",
            "drumStyle": "funk",
            "keyStyle": "soul",
            "rhythmStyle": "chop"
          },
          "focus": "lead",
          "rhythmStyle": "chop"
        },
        {
          "id": "funk-soul-04",
          "level": "基础",
          "focus": "rhythm",
          "title": "十六分闷音与短切：右手不停",
          "brief": "把一小节分成十六格，练习持续摆动中只让指定位置发声。",
          "steps": [
            "开节拍器，每拍数「1 e & a、2 e & a、3 e & a、4 e & a」；拨弦手按下–上–下–上持续运动，按弦手轻搭弦，先全部弹成无明确音高的轻闷音。",
            "保持手臂运动不变，只在第 1 拍、第 2 拍的 &、第 3 拍的 a、第 4 拍的 & 压实 Am7 的高音弦，其他格回到轻制音。",
            "每次响弦后立刻减轻按弦压力，手指仍留在弦上；先用低力度连续四轮，再让第 1 拍稍重，禁止靠加速制造兴奋感。"
          ],
          "listenFor": [
            "有音高的短切与无音高闷音是否清楚区分，闷音有没有混入意外泛音。",
            "休止格中右手是否继续摆动，下一次响弦能否准时回到十六分格点。"
          ],
          "progression": "6m7,6m7,6m7,6m7",
          "key": "C",
          "bpm": 72,
          "strategy": "syncopated",
          "feel": "funk",
          "intensity": "easy",
          "rhythmStyle": "sixteenth",
          "arrangement": {
            "bassStyle": "pedal",
            "drumStyle": "funk",
            "keyStyle": "none",
            "rhythmStyle": "sixteenth"
          },
          "manualTechnique": "闷音由用户在吉他上演奏；若自动伴奏未实现死音层，界面需把闷音格显示为跟练提示，而不能声称自动示范含真实死音。"
        },
        {
          "id": "funk-soul-05",
          "level": "应用",
          "focus": "rhythm",
          "title": "反拍小和弦：两三根弦就够",
          "brief": "以高音区小型和弦和双音练习反拍，减少低音堆叠并听清声部连接。",
          "steps": [
            "先在 Am7 选 C–E–G 三音，在 D7 选 C–F♯–A 三音；也可各取其中两个音，避免同时扫响六根弦。",
            "每拍保持「1 e & a」下–上–下–上，先只弹四个 &；熟悉后删掉第 3 拍的 &，让这个空位成为固定休止。",
            "Am7→D7 时保留 C，把 E 移到 F♯、G 移到 A；每次发声后短切制音，空弦与低音弦用双手协作消音。"
          ],
          "listenFor": [
            "换和弦时共同音是否连贯，反拍是否紧贴鼓的稳定脉搏。",
            "小和弦是否清晰轻巧，非目标弦有没有残留低频和杂音。"
          ],
          "progression": "6m7,27,6m7,27",
          "key": "C",
          "bpm": 86,
          "strategy": "syncopated",
          "feel": "funk",
          "intensity": "standard",
          "rhythmStyle": "soulcomp",
          "arrangement": {
            "bassStyle": "octave",
            "drumStyle": "backbeat",
            "keyStyle": "none",
            "rhythmStyle": "soulcomp"
          },
          "manualTechnique": "节奏吉他声部应尽量使用中高音区双音或三音；自动音色若未覆盖全部制音技法，保留用户实际制音练习指引。"
        },
        {
          "id": "funk-soul-06",
          "level": "综合",
          "focus": "rhythm",
          "title": "Bass、鼓、吉他：同拍与错位",
          "brief": "在电子鼓、Synth Bass 与合成键盘上，用节奏吉他比较同拍与错位。",
          "steps": [
            "先只听鼓两轮，脚打四分拍、口数「1 e & a」；加入 Bass 后记住第一拍与一个明显的切分低音，吉他先只在第一拍短切。",
            "吉他与 Bass 同弹第一拍，其余只选两个不拥挤的十六分格回应；右手全程持续上下摆动，未发声格轻制音或扫空。",
            "连续三小节保留相同型，第 4 小节删去一次发声并做一个短双音回答；分别只开鼓、鼓加 Bass、全声部检查，最后从 92 BPM 稳定练到 104 BPM。"
          ],
          "listenFor": [
            "第一拍是否真正落在一起，其他切分是否互补而不是全部声部同时堆叠。",
            "静音任一声部后能否继续保持速度，第 4 小节变化后是否准时返回第一拍。"
          ],
          "progression": "6m7,6m7,27,27",
          "key": "C",
          "bpm": 92,
          "strategy": "call",
          "feel": "funk",
          "intensity": "auto",
          "rhythmStyle": "sixteenth",
          "arrangement": {
            "bassStyle": "pocket",
            "drumStyle": "funk",
            "keyStyle": "neo",
            "rhythmStyle": "sixteenth"
          },
          "manualTechnique": "锁拍指稳定共同脉搏，不要求所有吉他音头都和底鼓同时出现。",
          "timbres": {
            "drums": "electro",
            "bass": "synth",
            "keys": "synth",
            "rhythm": "dry",
            "lead": "bright"
          }
        }
      ]
    },
    {
      "id": "shoegaze",
      "name": "Shoegaze",
      "nameZh": "盯鞋与梦幻音墙",
      "tagline": "用持续音、层次和留白塑造空间",
      "description": "从悬挂和弦与共同音开始，学习稀疏旋律、缓慢和声变化和由薄到厚的编排；空间效果服务于音乐层次。",
      "capabilities": [
        "sus2 的开放色彩与共同音",
        "持续音与慢速和声变化",
        "重复动机与音区分层",
        "延音、空间尾音和段落动态"
      ],
      "sourceIds": [
        "boss-space"
      ],
      "lessons": [
        {
          "id": "shoegaze-01",
          "level": "基础",
          "title": "一个共同音穿过悬挂和弦",
          "brief": "在 Dsus2 与 Gsus2 之间保留 A，让和声变化发生在持续音下面。",
          "steps": [
            "先弹 Dsus2 的 D–E–A 与 Gsus2 的 G–A–D，听两者没有三音的开放感。",
            "让高音 A 持续，低音与其他和弦音每两小节变化一次；先用清晰音色确认 A 没被换把打断。",
            "加入每两小节一个短回答，随后留白；如使用延迟或混响，让尾音自然消退后再进入。"
          ],
          "listenFor": [
            "共同音是否持续存在，还是每次换和弦都被切断。",
            "低音变化是否仍然清楚，延音有没有把两个和弦糊成一团。"
          ],
          "progression": "1sus2,1sus2,4sus2,4sus2",
          "key": "D",
          "bpm": 64,
          "strategy": "space",
          "feel": "halftime",
          "intensity": "easy",
          "arrangement": {
            "bassStyle": "fifths",
            "drumStyle": "halftime",
            "keyStyle": "pad",
            "rhythmStyle": "arpeggio"
          },
          "focus": "lead",
          "rhythmStyle": "arpeggio"
        },
        {
          "id": "shoegaze-02",
          "level": "应用",
          "title": "四个音的循环，三个和声的颜色",
          "brief": "固定一个简短动机，让 Dsus2、Bm7 与 Gsus2 改变它的听感。",
          "steps": [
            "用 D、E、A 中的两个或三个音写四次发声，节奏固定；先在 Dsus2 上连续重复。",
            "放进 Dsus2→Bm7→Gsus2→Gsus2：D 在 Bm7 上成为小三度，A 成为小七度，听同音如何改变角色。",
            "第二轮只改变最后一次发声的音区或时值；伴奏保留长音，让变化集中在前景旋律。"
          ],
          "listenFor": [
            "没有不停增加新音时，和声是否已经让同一动机产生变化。",
            "最高声部是否容易辨认，低音与铺底有没有遮盖动机。"
          ],
          "progression": "1sus2,6m7,4sus2,4sus2",
          "key": "D",
          "bpm": 76,
          "strategy": "motif",
          "feel": "straight",
          "intensity": "standard",
          "arrangement": {
            "bassStyle": "pedal",
            "drumStyle": "backbeat",
            "keyStyle": "pad",
            "rhythmStyle": "arpeggio"
          },
          "focus": "lead",
          "rhythmStyle": "arpeggio"
        },
        {
          "id": "shoegaze-03",
          "level": "综合",
          "title": "从一根线到一面音墙",
          "brief": "八小节内依次增加声部、音区和强度，再回到稀疏，让音墙有结构。",
          "steps": [
            "第 1–2 小节只保留低音与一个高音；第 3–4 小节加入缓慢分解，保持原来的共同音。",
            "第 5–6 小节加入更宽的和声音区或持续扫弦；第 7–8 小节减少发声，让尾音承担连接。",
            "用分轨静音逐层检查，再试听全体；如有空间效果，逐步增加效果量，直到音头仍可辨认为止。"
          ],
          "listenFor": [
            "段落增长是否来自层次变化，而不是所有声部一起变响。",
            "第 8 小节减薄后，下一轮开头是否有重新开始的空间。"
          ],
          "progression": "1sus2,1sus2,6m7,6m7,4sus2,4sus2,1sus2,1sus2",
          "key": "D",
          "bpm": 82,
          "strategy": "space",
          "feel": "halftime",
          "intensity": "auto",
          "arrangement": {
            "bassStyle": "fifths",
            "drumStyle": "halftime",
            "keyStyle": "pad",
            "rhythmStyle": "arpeggio"
          },
          "focus": "lead",
          "rhythmStyle": "arpeggio"
        }
      ]
    },
    {
      "id": "folk",
      "name": "Folk",
      "nameZh": "民谣",
      "tagline": "稳住低音，让旋律自然讲故事",
      "description": "以开放三和弦、交替低音与分解伴奏训练左右手独立，再把可哼唱旋律融入简洁段落。",
      "capabilities": [
        "开放和弦与均匀分解",
        "根音和五度交替低音",
        "高音旋律与低音独立",
        "动机、呼吸和主副段对比"
      ],
      "sourceIds": [
        "fender-fingerstyle",
        "berklee-fundamentals"
      ],
      "lessons": [
        {
          "id": "folk-01",
          "level": "基础",
          "title": "低音先走，高音再回答",
          "brief": "用 G、C、D 三和弦建立均匀分解，先让拇指成为稳定的节拍。",
          "steps": [
            "在 G 和弦上用拇指交替弹低音 G 与 D，每拍一个音；保持四小节，暂时不加高音。",
            "加入一、二弦上的和弦音，让食指或中指在低音之间发声；逐渐加入 C 与 D 和弦。",
            "跟四小节伴奏循环，换和弦前一拍准备手型；减少高音数量也要让低音继续。"
          ],
          "listenFor": [
            "高音进入后，拇指的节拍是否保持均匀。",
            "换和弦处是否有突兀的停顿或多余弦响。"
          ],
          "progression": "1,4,1,5",
          "key": "G",
          "bpm": 68,
          "strategy": "arpeggio",
          "feel": "straight",
          "intensity": "easy",
          "arrangement": {
            "bassStyle": "fifths",
            "drumStyle": "backbeat",
            "keyStyle": "none",
            "rhythmStyle": "arpeggio"
          },
          "focus": "rhythm",
          "rhythmStyle": "arpeggio"
        },
        {
          "id": "folk-02",
          "level": "应用",
          "title": "让高音唱出两小节句子",
          "brief": "在稳定低音上突出旋律音，区分伴奏层与歌唱层。",
          "steps": [
            "先哼出两小节短句，再把主要音放在一、二弦；每个和弦切换点先选择三和弦内的音。",
            "保持拇指的根音、五度交替，旋律用较清楚的音头，其他分解音稍轻。",
            "在第 4 小节结尾留半拍至一拍呼吸；第二轮保留旋律节奏，只改变最后两个音。"
          ],
          "listenFor": [
            "能否一边听低音脉搏，一边清楚地哼出高音旋律。",
            "伴奏填充音是否比主旋律更响，导致句子失去中心。"
          ],
          "progression": "1,6m,4,5",
          "key": "G",
          "bpm": 82,
          "strategy": "call",
          "feel": "straight",
          "intensity": "standard",
          "arrangement": {
            "bassStyle": "fifths",
            "drumStyle": "backbeat",
            "keyStyle": "none",
            "rhythmStyle": "arpeggio"
          },
          "focus": "rhythm",
          "rhythmStyle": "arpeggio"
        },
        {
          "id": "folk-03",
          "level": "综合",
          "title": "八小节，从分解走向扫弦",
          "brief": "同一首短曲中练习分解与扫弦切换，用演奏密度区分段落。",
          "steps": [
            "前 4 小节用均匀分解提出动机，低音只强调每小节第一拍与第三拍。",
            "后 4 小节改为轻扫弦，并保留动机的重音位置；到最后 G 和弦让旋律与和弦一起收束。",
            "下一轮恢复分解，保持同一速度；录音后比较两段的力度差，避免扫弦时突然加速。"
          ],
          "listenFor": [
            "分解转扫弦时基本速度是否一致，手感变化有没有带来抢拍。",
            "最后一小节的收束与下一轮的开始能否自然连接。"
          ],
          "progression": "1,6m,4,5,4,1,5,1",
          "key": "G",
          "bpm": 96,
          "strategy": "motif",
          "feel": "straight",
          "intensity": "auto",
          "arrangement": {
            "bassStyle": "fifths",
            "drumStyle": "backbeat",
            "keyStyle": "none",
            "rhythmStyle": "arpeggio"
          },
          "focus": "rhythm",
          "rhythmStyle": "arpeggio"
        }
      ]
    },
    {
      "id": "rnb",
      "name": "R&B",
      "nameZh": "节奏布鲁斯",
      "tagline": "柔和的七和弦，靠后的旋律回应",
      "description": "从小七与大七色彩入手，练习宽松节奏、平滑声部、短装饰句以及为主旋律留空间的伴奏。",
      "capabilities": [
        "m7 与 maj7 色彩辨识",
        "平滑和弦连接与共通音",
        "靠后律动与稳定拍点",
        "主旋律留白及装饰回答"
      ],
      "sourceIds": [
        "fender-soul",
        "berklee-voiceleading",
        "berklee-groove"
      ],
      "lessons": [
        {
          "id": "rnb-01",
          "level": "基础",
          "title": "四个七和弦，一口气唱完",
          "brief": "通过 Am7→Fmaj7→Cmaj7→G7 听出七音颜色，旋律少而连贯。",
          "steps": [
            "先分解每个和弦的 1、3、5、7；对比 Am 与 Am7、F 与 Fmaj7，听加入七音后的变化。",
            "在相邻和弦间优先保持共同音：Am7→Fmaj7 可保留 A/C/E，Fmaj7→Cmaj7 可保留 C/E。",
            "用一至两个长音穿过每小节，句尾留一拍；跟 Soul 律动练习时，先把音头弹准再追求松弛。"
          ],
          "listenFor": [
            "七音是否清楚但不过分突出，和弦更换有没有过大的跳跃。",
            "长音能否持续到句子自然结束，而不是被填充音不断打断。"
          ],
          "progression": "6m7,4maj7,1maj7,57",
          "key": "C",
          "bpm": 68,
          "strategy": "space",
          "feel": "soul",
          "intensity": "easy",
          "arrangement": {
            "bassStyle": "fifths",
            "drumStyle": "halftime",
            "keyStyle": "soul",
            "rhythmStyle": "none"
          },
          "focus": "lead",
          "rhythmStyle": "none"
        },
        {
          "id": "rnb-02",
          "level": "应用",
          "title": "落点准，装饰轻",
          "brief": "在平滑七和弦上加入短弱起和双音回应，装饰之后明确回到目标音。",
          "steps": [
            "先确定每小节一个目标音，可用 Am7 的 C、Dm7 的 F、G7 的 B、Cmaj7 的 E。",
            "在目标音前加一个短弱起或相邻音，目标音保持更长；只在每两小节末尾加入一次双音回应。",
            "保持鼓贝斯准时，旋律尝试略靠后进入；每次都检查下一个主要落点，避免把靠后弹成持续拖拍。"
          ],
          "listenFor": [
            "装饰是否让目标音更清楚，而不是让句子失去方向。",
            "旋律靠后时速度是否仍稳定，与鼓的距离是否大致一致。"
          ],
          "progression": "6m7,2m7,57,1maj7",
          "key": "C",
          "bpm": 80,
          "strategy": "syncopated",
          "feel": "soul",
          "intensity": "standard",
          "arrangement": {
            "bassStyle": "octave",
            "drumStyle": "backbeat",
            "keyStyle": "soul",
            "rhythmStyle": "offbeat"
          },
          "focus": "lead",
          "rhythmStyle": "offbeat"
        },
        {
          "id": "rnb-03",
          "level": "综合",
          "title": "为主唱留空的八小节",
          "brief": "用器乐模拟主唱与乐队的对话，把和声、律动和句末填充组织成段落。",
          "steps": [
            "把前两小节想成主唱一句话：吉他只在句尾回应，键盘和贝斯维持和声；后两小节重复节奏并换落点。",
            "第 5–6 小节稍作展开，第 7–8 小节用 Dm7→G7 回转；短填充结束后留出下一句的入口。",
            "分别静音主奏、键盘和节奏吉他试听，再恢复全部；删去遮盖主旋律的填充，用两轮不同强度完成小段落。"
          ],
          "listenFor": [
            "主旋律发声时伴奏是否留出位置，句尾回应是否接得自然。",
            "回到下一轮 Am7 时是否有继续叙述的感觉，同时没有堆满最后一拍。"
          ],
          "progression": "6m7,4maj7,1maj7,57,6m7,3m7,2m7,57",
          "key": "C",
          "bpm": 88,
          "strategy": "call",
          "feel": "soul",
          "intensity": "auto",
          "arrangement": {
            "bassStyle": "octave",
            "drumStyle": "backbeat",
            "keyStyle": "soul",
            "rhythmStyle": "offbeat"
          },
          "focus": "lead",
          "rhythmStyle": "offbeat"
        }
      ]
    }
  ]
};
