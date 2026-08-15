package com.rexrockya.tuner;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.view.View;

final class StaffView extends View {
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private Lesson lesson;

    StaffView(Context context) { super(context); setBackgroundColor(0xfff2f0e6); }
    void setLesson(Lesson value) { lesson = value; invalidate(); }

    @Override protected void onDraw(Canvas c) {
        super.onDraw(c); if (lesson == null) return;
        float d = getResources().getDisplayMetrics().density, w = getWidth();
        float left = 42*d, right = w-18*d, top = 38*d, gap = 12*d;
        paint.setColor(0xff22251f); paint.setStrokeWidth(1.1f*d); paint.setStyle(Paint.Style.STROKE);
        for (int i=0;i<5;i++) c.drawLine(left,top+i*gap,right,top+i*gap,paint);
        paint.setStyle(Paint.Style.FILL); paint.setTextSize(42*d); paint.setTypeface(android.graphics.Typeface.create("serif",0));
        c.drawText("𝄞",7*d,top+43*d,paint);
        paint.setTextSize(12*d); c.drawText(lesson.meter.split(" · ")[0],34*d,top+18*d,paint);
        float available = right-left-18*d;
        for (int i=0;i<lesson.midi.length;i++) {
            float x = left+16*d+available*(i+.5f)/lesson.midi.length;
            float y = top+4*gap-(lesson.midi[i]-64)*gap/2f;
            if (((lesson.midi[i]-64)&1)!=0) {
                paint.setStrokeWidth(.8f*d); c.drawLine(x-8*d,y,x+8*d,y,paint);
            }
            paint.setStyle(Paint.Style.FILL); c.save(); c.rotate(-18,x,y); c.drawOval(x-5*d,y-3.5f*d,x+5*d,y+3.5f*d,paint); c.restore();
            c.drawRect(x+4*d,y-27*d,x+5.3f*d,y,paint);
            if (lesson.notes[i].contains("♯") || lesson.notes[i].contains("♭")) {
                paint.setTextSize(12*d); paint.setTypeface(android.graphics.Typeface.DEFAULT);
                c.drawText(lesson.notes[i].contains("♯")?"♯":"♭",x-14*d,y+4*d,paint);
            }
            paint.setTextAlign(Paint.Align.CENTER); paint.setTextSize(10*d); paint.setColor(0xff686d62);
            c.drawText(lesson.notes[i],x,top+72*d,paint); paint.setColor(0xff22251f); paint.setTextAlign(Paint.Align.LEFT);
        }
        paint.setStrokeWidth(2*d); c.drawLine(right,top,right,top+4*gap,paint);
    }
}
