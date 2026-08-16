package com.rexrockya.tuner;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.Random;

final class MetronomeView extends View {
    private static final int MIN_BPM = 30, MAX_BPM = 240;
    private static final String API_BASE = "https://xianyin-tuner.cobainrexzhang.chatgpt.site/api/metronome/";
    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ToneGenerator tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 82);
    private final String roomCode;
    private int bpm = 80;
    private boolean running, visible, flash;
    private long lastRemoteUpdate;

    MetronomeView(Context context) {
        super(context); setBackgroundColor(0xff11140f);
        SharedPreferences prefs = context.getSharedPreferences("metronome", Context.MODE_PRIVATE);
        String stored = prefs.getString("room", "");
        if (stored.isEmpty()) {
            stored = String.format(Locale.US, "%06d", 100000 + new Random().nextInt(900000));
            prefs.edit().putString("room", stored).apply();
        }
        roomCode = stored;
    }

    void setPageVisible(boolean value) {
        visible = value;
        handler.removeCallbacks(pollRemote);
        if (value) { pollRemote.run(); if (running) scheduleBeat(0); }
        else { handler.removeCallbacks(beat); flash = false; }
    }

    private final Runnable beat = new Runnable() {
        @Override public void run() {
            if (!running || !visible) return;
            flash = true; tone.startTone(ToneGenerator.TONE_PROP_BEEP, 45); invalidate();
            handler.postDelayed(() -> { flash = false; invalidate(); }, 110);
            handler.postDelayed(this, Math.round(60000f / bpm));
        }
    };

    private void scheduleBeat(long delay) { handler.removeCallbacks(beat); handler.postDelayed(beat, delay); }

    private final Runnable pollRemote = new Runnable() {
        @Override public void run() {
            if (!visible) return;
            new Thread(() -> {
                try {
                    HttpURLConnection connection = (HttpURLConnection) new URL(API_BASE + roomCode).openConnection();
                    connection.setConnectTimeout(4000); connection.setReadTimeout(4000);
                    if (connection.getResponseCode() == 200) {
                        BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                        JSONObject json = new JSONObject(reader.readLine()); reader.close();
                        int remoteBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, json.getInt("bpm")));
                        boolean remoteRunning = json.getBoolean("running"); long updated = json.getLong("updatedAt");
                        handler.post(() -> {
                            if (updated > lastRemoteUpdate) {
                                lastRemoteUpdate = updated; bpm = remoteBpm;
                                if (running != remoteRunning) { running = remoteRunning; if (running) scheduleBeat(0); else handler.removeCallbacks(beat); }
                                else if (running) scheduleBeat(0);
                                invalidate();
                            }
                        });
                    }
                    connection.disconnect();
                } catch (Exception ignored) {}
            }, "metronome-remote").start();
            handler.postDelayed(this, 1200);
        }
    };

    private void adjust(int delta) { bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm + delta)); if (running) scheduleBeat(0); invalidate(); }
    private void toggle() { running = !running; if (running) scheduleBeat(0); else handler.removeCallbacks(beat); invalidate(); }

    @Override protected void onDraw(Canvas canvas) {
        float d = getResources().getDisplayMetrics().density, w = getWidth(), h = getHeight();
        paint.setTextAlign(Paint.Align.CENTER); paint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        paint.setColor(0xff858d80); paint.setTextSize(12*d); canvas.drawText("节 拍 器", w/2, 46*d, paint);
        float cy = Math.min(h*.33f, 250*d);
        paint.setColor(flash ? 0xffc8f56a : 0xff2b3327); canvas.drawCircle(w/2, cy-48*d, flash ? 24*d : 18*d, paint);
        paint.setColor(0xfff2f0e6); paint.setTextSize(Math.min(128*d, w*.34f)); canvas.drawText(String.valueOf(bpm), w/2, cy+72*d, paint);
        paint.setColor(0xff737b6f); paint.setTextSize(14*d); canvas.drawText("BPM", w/2, cy+105*d, paint);

        float buttonY = Math.min(h-175*d, cy+150*d);
        drawButton(canvas, new RectF(24*d, buttonY, w/2-8*d, buttonY+58*d), "− 5", false, d);
        drawButton(canvas, new RectF(w/2+8*d, buttonY, w-24*d, buttonY+58*d), "+ 5", false, d);
        drawButton(canvas, new RectF(24*d, buttonY+74*d, w-24*d, buttonY+136*d), running ? "停止" : "开始", true, d);
        paint.setColor(0xff687062); paint.setTextSize(11*d); canvas.drawText("远程控制码", w/2, h-54*d, paint);
        paint.setColor(0xffc8f56a); paint.setTextSize(24*d); paint.setLetterSpacing(.16f); canvas.drawText(roomCode, w/2, h-23*d, paint); paint.setLetterSpacing(0);
    }

    private void drawButton(Canvas c, RectF r, String label, boolean primary, float d) {
        paint.setColor(primary ? 0xffc8f56a : 0xff20261e); c.drawRoundRect(r, 8*d, 8*d, paint);
        paint.setColor(primary ? 0xff11140f : 0xfff2f0e6); paint.setTextSize(18*d); paint.setTextAlign(Paint.Align.CENTER);
        c.drawText(label, r.centerX(), r.centerY()+6*d, paint);
    }

    @Override public boolean onTouchEvent(MotionEvent event) {
        if (event.getAction() != MotionEvent.ACTION_UP) return true;
        float d = getResources().getDisplayMetrics().density, w = getWidth(), h = getHeight();
        float cy = Math.min(h*.33f, 250*d), y = Math.min(h-175*d, cy+150*d);
        if (event.getY() >= y && event.getY() <= y+58*d) adjust(event.getX() < w/2 ? -5 : 5);
        else if (event.getY() >= y+74*d && event.getY() <= y+136*d) toggle();
        return true;
    }

    void release() { handler.removeCallbacksAndMessages(null); tone.release(); }
}
