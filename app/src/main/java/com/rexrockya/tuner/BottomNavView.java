package com.rexrockya.tuner;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;

final class BottomNavView extends View {
    interface Listener { void onPageSelected(int page); }
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Listener listener;
    private int selected;

    BottomNavView(Context context, Listener listener) {
        super(context); this.listener = listener; setBackgroundColor(0xff11140f);
    }

    void setSelected(int value) { selected = value; invalidate(); }

    @Override protected void onDraw(Canvas canvas) {
        float d = getResources().getDisplayMetrics().density, w = getWidth(), h = getHeight();
        paint.setColor(0xff2b3028); paint.setStrokeWidth(d); canvas.drawLine(0, 0, w, 0, paint);
        String[] labels = {"调音", "教学", "节拍"};
        String[] icons = {"音准", "DAILY", "BPM"};
        for (int i = 0; i < 3; i++) {
            float cx = w * (i * 2 + 1) / 6f;
            if (i == selected) {
                paint.setColor(0xffc8f56a); paint.setStyle(Paint.Style.FILL);
                canvas.drawRoundRect(new RectF(cx-34*d, 6*d, cx+34*d, 9*d), 2*d, 2*d, paint);
            }
            paint.setTextAlign(Paint.Align.CENTER); paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
            paint.setTextSize(9*d); paint.setColor(i == selected ? 0xffc8f56a : 0xff686e63);
            canvas.drawText(icons[i], cx, 27*d, paint);
            paint.setTextSize(14*d); paint.setColor(i == selected ? 0xfff2f0e6 : 0xff8b9185);
            canvas.drawText(labels[i], cx, 49*d, paint);
        }
    }

    @Override public boolean onTouchEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_UP) {
            selected = Math.min(2, (int)(event.getX() / (getWidth()/3f)));
            invalidate(); listener.onPageSelected(selected);
        }
        return true;
    }
}
