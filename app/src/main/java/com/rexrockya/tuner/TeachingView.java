package com.rexrockya.tuner;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

final class TeachingView extends ScrollView {
    interface Listener { void onPreview(Lesson lesson); void onOpenSource(); }
    private final LinearLayout body;
    private final Listener listener;
    private final SharedPreferences prefs;
    private int lessonIndex = LessonCatalog.todayIndex();
    private TextView day, title, meta, track, progression, status, analysis, practice;
    private StaffView staff;
    private Button play, done;

    TeachingView(Context context, Listener listener) {
        super(context); this.listener = listener;
        prefs = context.getSharedPreferences("lesson_progress", Context.MODE_PRIVATE);
        setFillViewport(true); setBackgroundColor(0xff11140f);
        body = new LinearLayout(context); body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(20),dp(20),dp(20),dp(30)); addView(body);
        build(); showLesson();
    }

    private void build() {
        LinearLayout header = row();
        TextView brand = text("弦音",25,0xffc8f56a,true); header.addView(brand,new LinearLayout.LayoutParams(0,dp(42),1));
        day = text("",11,0xff777c70,true); day.setGravity(Gravity.END|Gravity.CENTER_VERTICAL); header.addView(day,new LinearLayout.LayoutParams(0,dp(42),1)); body.addView(header);
        title = text("",29,0xfff2f0e6,true); title.setPadding(0,dp(10),0,dp(5)); body.addView(title);
        meta = text("",12,0xffa8ad9f,false); body.addView(meta);
        track = text("",16,0xfff2f0e6,true); track.setPadding(0,dp(18),0,dp(3)); body.addView(track);
        progression = pill(); body.addView(progression, margins(-1,dp(12),-1,dp(14)));
        staff = new StaffView(getContext()); body.addView(staff,new LinearLayout.LayoutParams(-1,dp(126)));
        LinearLayout controls = row();
        play = button("▶ 在线试听"); play.setOnClickListener(v -> listener.onPreview(current())); controls.addView(play,new LinearLayout.LayoutParams(0,dp(50),1));
        Button source = button("打开原曲 ↗"); source.setOnClickListener(v -> listener.onOpenSource()); controls.addView(source,new LinearLayout.LayoutParams(0,dp(50),1));
        body.addView(controls,margins(-1,dp(12),-1,0));
        status = text("试听来自 Apple/iTunes 公开预览",11,0xff777c70,false); status.setGravity(Gravity.CENTER); body.addView(status,margins(-1,dp(7),-1,dp(13)));
        body.addView(section("和声与旋律")); analysis=text("",14,0xffd9ddd2,false); analysis.setLineSpacing(dp(5),1); body.addView(analysis);
        body.addView(section("今天怎么练")); practice=text("",14,0xffd9ddd2,false); practice.setLineSpacing(dp(5),1); body.addView(practice);
        done=button("标记今日完成"); done.setOnClickListener(v -> toggleDone()); body.addView(done,margins(-1,dp(20),-1,0));
        LinearLayout nav=row(); Button prev=button("← 上一条"); Button next=button("下一条 →");
        prev.setOnClickListener(v -> move(-1)); next.setOnClickListener(v -> move(1));
        nav.addView(prev,new LinearLayout.LayoutParams(0,dp(48),1)); nav.addView(next,new LinearLayout.LayoutParams(0,dp(48),1)); body.addView(nav,margins(-1,dp(10),-1,0));
    }

    private Lesson current(){ return LessonCatalog.LESSONS[lessonIndex]; }
    Lesson currentLesson(){ return current(); }
    private void move(int delta){ lessonIndex=Math.floorMod(lessonIndex+delta,LessonCatalog.LESSONS.length); showLesson(); smoothScrollTo(0,0); }
    private void toggleDone(){ String key="done_"+lessonIndex; prefs.edit().putBoolean(key,!prefs.getBoolean(key,false)).apply(); updateDone(); }
    private void updateDone(){ boolean value=prefs.getBoolean("done_"+lessonIndex,false); done.setText(value?"✓ 已完成 · 点击撤销":"标记今日完成"); }
    private void showLesson(){
        Lesson l=current(); day.setText("DAILY / "+String.format(java.util.Locale.US,"%02d",lessonIndex+1)); title.setText(l.title);
        meta.setText(l.style+"  ·  "+l.key+"  ·  "+l.meter); track.setText(l.artist+" — "+l.track);
        progression.setText(l.progression+"\n"+l.sourceMoment); staff.setLesson(l);
        analysis.setText(lines(l.analysis)); practice.setText(numbered(l.practice)); status.setText("试听来自 Apple/iTunes 公开预览"); play.setText("▶ 在线试听"); updateDone();
    }
    void setPreviewState(String value, boolean playing){ status.setText(value); play.setText(playing?"Ⅱ 暂停试听":"▶ 在线试听"); }
    private String lines(String[] values){ return "• "+ TextUtils.join("\n\n• ",values); }
    private String numbered(String[] values){ StringBuilder b=new StringBuilder(); for(int i=0;i<values.length;i++){if(i>0)b.append("\n\n");b.append(i+1).append(". ").append(values[i]);}return b.toString(); }
    private TextView section(String value){ TextView v=text(value,12,0xffc8f56a,true); v.setLetterSpacing(.08f); v.setPadding(0,dp(17),0,dp(9)); return v; }
    private TextView pill(){ TextView v=text("",13,0xffd9ddd2,false); v.setPadding(dp(14),dp(12),dp(14),dp(12)); v.setBackgroundColor(0xff20251d); return v; }
    private Button button(String value){ Button b=new Button(getContext()); b.setText(value); b.setTextColor(0xffe9ecdf); b.setTextSize(13); b.setAllCaps(false); b.setBackgroundColor(0xff262c22); return b; }
    private TextView text(String value,float size,int color,boolean bold){ TextView v=new TextView(getContext());v.setText(value);v.setTextSize(size);v.setTextColor(color);v.setTypeface(Typeface.create("sans",bold?Typeface.BOLD:Typeface.NORMAL));return v; }
    private LinearLayout row(){LinearLayout l=new LinearLayout(getContext());l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
    private LinearLayout.LayoutParams margins(int w,int top,int h,int bottom){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(w,h);p.setMargins(0,top,0,bottom);return p;}
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
}
