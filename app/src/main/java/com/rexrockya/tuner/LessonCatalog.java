package com.rexrockya.tuner;

import java.time.LocalDate;

final class LessonCatalog {
    private LessonCatalog() {}

    static final Lesson[] LESSONS = {
        new Lesson(
            "大小三度的蓝调摩擦", "B.B. King", "The Thrill Is Gone", "现代布鲁斯", "B minor",
            "4/4 · Slow blues", "i7 · Bm7", "聆听主唱间隙中的短句与留白",
            new int[]{71,74,76,77,78,76,74,71},
            new String[]{"B","D","E","F","F♯","E","D","B"},
            new String[]{"♪","♪","♪","♪","♩","♪","♪","♩"},
            new String[]{
                "B 小调布鲁斯：1  ♭3  4  ♭5  5  ♭7",
                "F → F♯ 把蓝调经过音推向五度；不要把 ♭5 当作停留点。",
                "乐句回到 B，而不是连续填满空间：休止本身也是句法。"
            },
            new String[]{"先只唱 F–F♯–E 的方向感。", "保持原节奏，把结尾分别落到 B、D、F♯。", "移到 A 小调：所有音下移全音。"},
            "B.B. King The Thrill Is Gone"
        ),
        new Lesson(
            "I7 → IV7 的三度落点", "Muddy Waters", "Hoochie Coochie Man", "Chicago Blues", "A",
            "4/4 · Shuffle", "I7 → IV7 · A7 → D7", "关注主 riff 之后的吉他回应",
            new int[]{69,72,73,76,79,78,76,74},
            new String[]{"A","C","C♯","E","G","F♯","E","D"},
            new String[]{"♪","♪","♪","♪","♩","♪","♪","♩"},
            new String[]{
                "相对 A：1  ♭3  3  5  ♭7；C → C♯ 是布鲁斯大小三度语汇。",
                "切到 D7 时，F♯ 是它的大三度，也是最清楚的换和弦信号。",
                "核心规则：不要只换音阶；用下一和弦的 3 或 ♭7 表明和声。"
            },
            new String[]{"在 A7 上唱 C→C♯，听紧张如何变稳定。", "只用四个音重新回答这条句子。", "把同一连接移到 D7→G7。"},
            "Muddy Waters Hoochie Coochie Man"
        ),
        new Lesson(
            "属和弦上的大三度", "Freddie King", "Hide Away", "Texas / Chicago Blues", "E",
            "4/4 · Shuffle", "I7 · E7", "聆听主题旋律如何围绕和弦音展开",
            new int[]{64,67,68,71,74,71,68,64},
            new String[]{"E","G","G♯","B","D","B","G♯","E"},
            new String[]{"♪","♪","♪","♪","♩","♪","♪","♩"},
            new String[]{
                "E7 和弦音：E–G♯–B–D，即 1–3–5–♭7。",
                "G 自然音是蓝调 ♭3；紧接 G♯ 会显出属和弦的大调性质。",
                "强拍落在 G♯ 或 D，通常比一直停在 E 更能勾勒和声。"
            },
            new String[]{"只弹 E7 的 3 与 ♭7：G♯、D。", "保留音高，改变一次起拍位置。", "在 12 小节第 1、7 小节各使用一次。"},
            "Freddie King Hide Away"
        ),
        new Lesson(
            "Minor ii–V–i 的导向", "Wes Montgomery", "Round Midnight", "Jazz Ballad", "E♭ minor",
            "4/4 · Ballad", "iiø7 → V7alt → i · Fm7♭5 → B♭7 → E♭m", "听旋律如何延迟解决到主和弦",
            new int[]{65,68,71,74,73,70,67,63},
            new String[]{"F","A♭","B","D","D♭","B♭","G","E♭"},
            new String[]{"♪","♪","♪","♪","♩","♪","♪","♩"},
            new String[]{
                "先抓每个和弦的 3 与 7，而不是把三个和弦当成一个音阶。",
                "B♭7 上的 D♭ 是 ♭3/♯9 色彩，D 自然音则是和弦大三度。",
                "G → E♭ 进入主和弦：G 是 E♭m 的调外大三度，带来短暂张力。"
            },
            new String[]{"先只弹每个和弦的三度。", "把八分音符全部唱出后再拿琴。", "移到 A minor：Bm7♭5→E7→Am。"},
            "Wes Montgomery Round Midnight"
        ),
        new Lesson(
            "ii–V–I 的半音包围", "Charlie Parker", "Confirmation", "Bebop", "F",
            "4/4 · Medium swing", "ii7 → V7 → Imaj7 · Gm7 → C7 → Fmaj7", "聆听主题与独奏中的半音连接",
            new int[]{67,70,71,72,76,75,72,69},
            new String[]{"G","B♭","B","C","E","E♭","C","A"},
            new String[]{"♪","♪","♪","♪","♪","♪","♪","♩"},
            new String[]{
                "B♭→B→C 从下方半音接近 C7 的根音。",
                "E 是 C7 的大三度；E♭ 是经过音，随后解决到 Fmaj7 的五度 C。",
                "终点 A 是 Fmaj7 的三度，比落根音更有典型 Bebop 方向感。"
            },
            new String[]{"圈出每个强拍上的和弦音。", "把最后 A 改成 Fmaj7 的七度 E。", "移到 B♭：Cm7→F7→B♭maj7。"},
            "Charlie Parker Confirmation"
        ),
        new Lesson(
            "Dorian 的自然六度", "Miles Davis", "So What", "Modal Jazz", "D Dorian",
            "4/4 · Medium swing", "i7 vamp · Dm7", "听独奏如何从短动机发展，而非追逐和弦",
            new int[]{62,65,67,69,71,69,67,65},
            new String[]{"D","F","G","A","B","A","G","F"},
            new String[]{"♩","♪","♪","♩","♩","♪","♪","♩"},
            new String[]{
                "D Dorian：D–E–F–G–A–B–C，即 1–2–♭3–4–5–6–♭7。",
                "B 是自然 6，也是它区别于 D 自然小调最明确的特征音。",
                "静态和声中，节奏、重复和发展比堆叠更多音阶更重要。"
            },
            new String[]{"只用 D、F、G、A、B 做两小节问答。", "第一遍避开 B，第二遍加入 B，比较色彩。", "把动机移到 E♭ Dorian。"},
            "Miles Davis So What"
        ),
        new Lesson(
            "Mixolydian 的 ♭7 重心", "The Allman Brothers Band", "Stormy Monday", "Jazz Blues", "G",
            "12/8 · Slow blues", "I7 → IV7 · G7 → C7", "比较伴奏和独奏怎样同时跟随和弦",
            new int[]{67,71,74,77,76,74,70,67},
            new String[]{"G","B","D","F","E","D","B♭","G"},
            new String[]{"♪","♪","♪","♩","♪","♪","♪","♩"},
            new String[]{
                "G7 的 B 与 F 是 3、♭7；它们最能说明当前是属七和弦。",
                "到 C7 后，E 成为大三度；B♭ 是 C7 的 ♭7。",
                "这是用导向音跟和弦，而不是把 G 小调五声音阶覆盖整首。"
            },
            new String[]{"在两个和弦上分别只弹 3 与 ♭7。", "用相同节奏写一条回答句。", "移到 C7→F7。"},
            "Allman Brothers Stormy Monday"
        )
    };

    static int todayIndex() {
        return Math.floorMod(LocalDate.now().getDayOfYear(), LESSONS.length);
    }
}
