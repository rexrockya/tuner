package com.rexrockya.tuner;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.MediaPlayer;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Process;
import android.view.Window;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;

public class MainActivity extends Activity {
    private static final int AUDIO_PERMISSION = 7;
    private TunerView tunerView;
    private AudioRecord recorder;
    private Thread audioThread;
    private volatile boolean listening;
    private TeachingView teachingView;
    private MetronomeView metronomeView;
    private MediaPlayer previewPlayer;
    private String previewLessonTerm, previewSourceUrl;
    private int page;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Window window = getWindow();
        window.setStatusBarColor(0xff11140f);
        window.setNavigationBarColor(0xff11140f);
        tunerView = new TunerView(this);
        teachingView = new TeachingView(this, new TeachingView.Listener() {
            @Override public void onPreview(Lesson lesson) { togglePreview(lesson); }
            @Override public void onOpenSource() { openPreviewSource(); }
        });
        metronomeView = new MetronomeView(this);
        FrameLayout content = new FrameLayout(this);
        content.addView(tunerView, new FrameLayout.LayoutParams(-1,-1));
        content.addView(teachingView, new FrameLayout.LayoutParams(-1,-1));
        content.addView(metronomeView, new FrameLayout.LayoutParams(-1,-1));
        teachingView.setVisibility(View.GONE);
        metronomeView.setVisibility(View.GONE);
        BottomNavView navigation = new BottomNavView(this, selected -> {
            page = selected;
            tunerView.setVisibility(selected == 0 ? View.VISIBLE : View.GONE);
            teachingView.setVisibility(selected == 1 ? View.VISIBLE : View.GONE);
            metronomeView.setVisibility(selected == 2 ? View.VISIBLE : View.GONE);
            metronomeView.setPageVisible(selected == 2);
            if (selected == 0) {
                stopPreview();
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) startListening();
            } else stopListening();
        });
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.addView(content, new LinearLayout.LayoutParams(-1,0,1));
        root.addView(navigation, new LinearLayout.LayoutParams(-1, Math.round(60*getResources().getDisplayMetrics().density)));
        setContentView(root);
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) startListening();
        else requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION);
    }

    private void togglePreview(Lesson lesson) {
        if (previewPlayer != null && lesson.searchTerm.equals(previewLessonTerm)) {
            if (previewPlayer.isPlaying()) {
                previewPlayer.pause(); teachingView.setPreviewState("试听已暂停", false);
            } else {
                previewPlayer.start(); teachingView.setPreviewState("正在播放试听片段", true);
            }
            return;
        }
        stopPreview();
        previewLessonTerm = lesson.searchTerm;
        teachingView.setPreviewState("正在查找经典录音…", false);
        new Thread(() -> {
            try {
                PreviewResolver.Result result = PreviewResolver.resolve(lesson.searchTerm);
                runOnUiThread(() -> preparePreview(lesson.searchTerm, result));
            } catch (Exception error) {
                runOnUiThread(() -> teachingView.setPreviewState("暂时无法取得试听，请稍后重试", false));
            }
        }, "preview-resolver").start();
    }

    private void preparePreview(String term, PreviewResolver.Result result) {
        if (!term.equals(previewLessonTerm)) return;
        if (result == null || result.previewUrl.isEmpty()) {
            teachingView.setPreviewState("这首曲目暂无可用试听", false); return;
        }
        previewSourceUrl = result.trackUrl;
        previewPlayer = new MediaPlayer();
        previewPlayer.setOnPreparedListener(player -> {
            player.start(); teachingView.setPreviewState("正在播放试听片段", true);
        });
        previewPlayer.setOnCompletionListener(player -> teachingView.setPreviewState("试听结束 · 点击重播", false));
        previewPlayer.setOnErrorListener((player, what, extra) -> {
            teachingView.setPreviewState("试听加载失败", false); return true;
        });
        try {
            previewPlayer.setDataSource(result.previewUrl); previewPlayer.prepareAsync();
            teachingView.setPreviewState("正在加载试听…", false);
        } catch (Exception error) { stopPreview(); teachingView.setPreviewState("试听加载失败", false); }
    }

    private void openPreviewSource() {
        String url = previewSourceUrl;
        if (url == null || url.isEmpty()) {
            Lesson lesson = teachingView.currentLesson();
            url = "https://music.apple.com/us/search?term=" + Uri.encode(lesson.searchTerm);
        }
        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
    }

    private void stopPreview() {
        previewLessonTerm = null;
        if (previewPlayer != null) {
            try { previewPlayer.stop(); } catch (IllegalStateException ignored) {}
            previewPlayer.release(); previewPlayer = null;
        }
        if (teachingView != null) teachingView.setPreviewState("试听来自 Apple/iTunes 公开预览", false);
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == AUDIO_PERMISSION && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startListening();
        else tunerView.setPermissionDenied(true);
    }

    private void startListening() {
        if (listening) return;
        final int sampleRate = 44100;
        final int frameSize = 4096;
        int minBuffer = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT);
        recorder = new AudioRecord(MediaRecorder.AudioSource.UNPROCESSED, sampleRate,
                AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT, Math.max(minBuffer, frameSize * 4));
        if (recorder.getState() != AudioRecord.STATE_INITIALIZED) {
            recorder.release();
            recorder = new AudioRecord(MediaRecorder.AudioSource.DEFAULT, sampleRate,
                    AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_FLOAT, Math.max(minBuffer, frameSize * 4));
        }
        listening = true;
        recorder.startRecording();
        audioThread = new Thread(() -> {
            Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO);
            float[] buffer = new float[frameSize];
            while (listening) {
                int read = recorder.read(buffer, 0, buffer.length, AudioRecord.READ_BLOCKING);
                if (read == frameSize) {
                    double pitch = PitchDetector.detect(buffer, sampleRate);
                    if (pitch > 0) runOnUiThread(() -> tunerView.setPitch(pitch));
                    else runOnUiThread(tunerView::signalQuiet);
                }
            }
        }, "pitch-detector");
        audioThread.start();
    }

    @Override protected void onPause() { super.onPause(); stopListening(); if (metronomeView != null) metronomeView.setPageVisible(false); }
    @Override protected void onResume() {
        super.onResume();
        if (page == 0 && tunerView != null && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) startListening();
        if (page == 2 && metronomeView != null) metronomeView.setPageVisible(true);
    }
    private void stopListening() {
        listening = false;
        if (recorder != null) {
            try { recorder.stop(); } catch (IllegalStateException ignored) {}
            recorder.release();
            recorder = null;
        }
    }

    @Override protected void onDestroy() { stopPreview(); stopListening(); metronomeView.release(); super.onDestroy(); }
}
