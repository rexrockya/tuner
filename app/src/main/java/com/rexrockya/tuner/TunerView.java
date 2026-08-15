package com.rexrockya.tuner;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;
import java.util.Locale;

final class TunerView extends View {
    private static final String[] NOTES = {"C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"};
    private static final String[] MODES = {"十二平均律", "吉他", "尤克里里", "小提琴"};
    private static final int[][] INSTRUMENT_NOTES = {
            {}, {40, 45, 50, 55, 59, 64}, {60, 64, 67, 69}, {55, 62, 69, 76}
    };
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private double reference = 440.0, pitch = -1, cents = 0;
    private String note = "—", octave = "";
    private int mode = 0;
    private boolean denied;
    private long lastSignal;
    private final RectF modeBox = new RectF(), minusBox = new RectF(), plusBox = new RectF();

    TunerView(Context context) { super(context); paint.setTypeface(android.graphics.Typeface.create("sans", 0)); setBackgroundColor(0xff11140f); }
    void setPermissionDenied(boolean value) { denied = value; invalidate(); }
    void signalQuiet() { if (SystemClock.elapsedRealtime() - lastSignal > 800) { pitch = -1; invalidate(); } }
    void setPitch(double value) {
        pitch = value; lastSignal = SystemClock.elapsedRealtime();
        double midi = 69 + 12 * Math.log(value / reference) / Math.log(2);
        int rounded = nearestTarget(midi);
        note = NOTES[Math.floorMod(rounded, 12)];
        octave = String.valueOf(rounded / 12 - 1);
        cents = 1200 * Math.log(value / (reference * Math.pow(2, (rounded - 69) / 12.0))) / Math.log(2);
        invalidate();
    }
    private int nearestTarget(double midi) {
        if (mode == 0) return (int) Math.round(midi);
        int nearest = INSTRUMENT_NOTES[mode][0];
        for (int candidate : INSTRUMENT_NOTES[mode]) {
            if (Math.abs(candidate - midi) < Math.abs(nearest - midi)) nearest = candidate;
        }
        return nearest;
    }
    private void text(Canvas c, String value, float x, float y, float size, int color, Paint.Align align) {
        paint.setStyle(Paint.Style.FILL); paint.setTextSize(size); paint.setColor(color); paint.setTextAlign(align); paint.setTypeface(Typeface.create("sans", Typeface.NORMAL)); c.drawText(value, x, y, paint);
    }
    @Override protected void onDraw(Canvas c) {
        super.onDraw(c); float w = getWidth(), h = getHeight(), d = getResources().getDisplayMetrics().density;
        text(c, "弦音", 24*d, 48*d, 25*d, 0xffc8f56a, Paint.Align.LEFT);
        text(c, "TUNER / 01", w-24*d, 46*d, 11*d, 0xff777c70, Paint.Align.RIGHT);
        float cx = w/2, cy = Math.min(h*.39f, 330*d), radius = Math.min(w*.43f, 176*d);
        paint.setStyle(Paint.Style.STROKE); paint.setStrokeWidth(1*d); paint.setColor(0xff34392f); c.drawCircle(cx, cy, radius, paint);
        for (int i=-10;i<=10;i++) {
            double angle = Math.toRadians(-120 + (i+10)*12);
            float outerX = cx + (float)Math.sin(angle)*radius, outerY = cy - (float)Math.cos(angle)*radius;
            float len = i%5==0 ? 16*d : 8*d;
            float innerX = cx + (float)Math.sin(angle)*(radius-len), innerY = cy - (float)Math.cos(angle)*(radius-len);
            paint.setColor(i==0 ? 0xffc8f56a : 0xff596052); paint.setStrokeWidth(i==0 ? 3*d : 1*d); c.drawLine(innerX, innerY, outerX, outerY, paint);
        }
        double clamped = Math.max(-50, Math.min(50, cents));
        double needleAngle = Math.toRadians(clamped / 50 * 105);
        paint.setColor(Math.abs(cents)<5 && pitch>0 ? 0xffc8f56a : 0xfff2f0e6); paint.setStrokeWidth(3*d);
        c.drawLine(cx, cy+45*d, cx+(float)Math.sin(needleAngle)*(radius-42*d), cy+45*d-(float)Math.cos(needleAngle)*(radius-42*d), paint);
        paint.setStyle(Paint.Style.FILL); c.drawCircle(cx, cy+45*d, 7*d, paint);
        if (denied) {
            text(c, "需要麦克风权限", cx, cy-10*d, 24*d, 0xfff2f0e6, Paint.Align.CENTER);
            text(c, "请在系统设置中允许弦音使用麦克风", cx, cy+24*d, 13*d, 0xffa7aa9e, Paint.Align.CENTER);
        } else {
            text(c, pitch > 0 ? note : "—", cx, cy+8*d, 78*d, 0xfff2f0e6, Paint.Align.CENTER);
            if (pitch > 0) text(c, octave, cx+58*d, cy-25*d, 22*d, 0xff8f9487, Paint.Align.LEFT);
            String state = pitch < 0 ? "弹奏一个音" : Math.abs(cents)<5 ? "音准" : cents<0 ? "偏低" : "偏高";
            text(c, state, cx, cy+86*d, 15*d, Math.abs(cents)<5&&pitch>0?0xffc8f56a:0xffa7aa9e, Paint.Align.CENTER);
            text(c, pitch>0 ? String.format(Locale.US, "%.1f Hz   %+.0f 音分", pitch, cents) : "正在聆听…", cx, cy+112*d, 13*d, 0xff777c70, Paint.Align.CENTER);
        }
        float bottom = h-50*d;
        modeBox.set(20*d,bottom-126*d,w-20*d,bottom-74*d); round(c,modeBox,14*d,0xff20251d);
        text(c,"模式",34*d,bottom-95*d,12*d,0xff7f8577,Paint.Align.LEFT); text(c,MODES[mode],w-34*d,bottom-95*d,15*d,0xfff2f0e6,Paint.Align.RIGHT);
        minusBox.set(20*d,bottom-60*d,80*d,bottom); plusBox.set(w-80*d,bottom-60*d,w-20*d,bottom); round(c,minusBox,14*d,0xff20251d); round(c,plusBox,14*d,0xff20251d);
        text(c,"−",50*d,bottom-21*d,28*d,0xffc8f56a,Paint.Align.CENTER); text(c,"+",w-50*d,bottom-21*d,26*d,0xffc8f56a,Paint.Align.CENTER);
        text(c,"A4 基准",w/2,bottom-36*d,11*d,0xff7f8577,Paint.Align.CENTER); text(c,String.format(Locale.US,"%.0f Hz",reference),w/2,bottom-15*d,18*d,0xfff2f0e6,Paint.Align.CENTER);
    }
    private void round(Canvas c, RectF box, float radius, int color) { paint.setStyle(Paint.Style.FILL); paint.setColor(color); c.drawRoundRect(box,radius,radius,paint); }
    @Override public boolean onTouchEvent(MotionEvent e) {
        if (e.getAction()!=MotionEvent.ACTION_UP) return true;
        if (modeBox.contains(e.getX(),e.getY())) mode=(mode+1)%MODES.length;
        else if (minusBox.contains(e.getX(),e.getY())) reference=Math.max(430,reference-1);
        else if (plusBox.contains(e.getX(),e.getY())) reference=Math.min(450,reference+1);
        invalidate(); return true;
    }
}
