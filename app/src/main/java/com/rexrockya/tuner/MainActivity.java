package com.rexrockya.tuner;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.os.Process;
import android.view.Window;

public class MainActivity extends Activity {
    private static final int AUDIO_PERMISSION = 7;
    private TunerView tunerView;
    private AudioRecord recorder;
    private Thread audioThread;
    private volatile boolean listening;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Window window = getWindow();
        window.setStatusBarColor(0xff11140f);
        window.setNavigationBarColor(0xff11140f);
        tunerView = new TunerView(this);
        setContentView(tunerView);
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) startListening();
        else requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION);
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

    @Override protected void onPause() { super.onPause(); stopListening(); }
    @Override protected void onResume() {
        super.onResume();
        if (tunerView != null && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) startListening();
    }
    private void stopListening() {
        listening = false;
        if (recorder != null) {
            try { recorder.stop(); } catch (IllegalStateException ignored) {}
            recorder.release();
            recorder = null;
        }
    }
}

