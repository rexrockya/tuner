package com.rexrockya.tuner;

final class PitchDetector {
    private PitchDetector() {}

    static double detect(float[] input, int sampleRate) {
        double rms = 0;
        for (float value : input) rms += value * value;
        rms = Math.sqrt(rms / input.length);
        if (rms < 0.012) return -1;

        int minLag = sampleRate / 1200;
        int maxLag = Math.min(sampleRate / 55, input.length / 2);
        double[] difference = new double[maxLag + 1];
        for (int lag = minLag; lag <= maxLag; lag++) {
            double sum = 0;
            for (int i = 0; i < input.length - lag; i++) {
                double delta = input[i] - input[i + lag];
                sum += delta * delta;
            }
            difference[lag] = sum;
        }

        double running = 0;
        int candidate = -1;
        for (int lag = minLag; lag <= maxLag; lag++) {
            running += difference[lag];
            double normalized = running == 0 ? 1 : difference[lag] * lag / running;
            difference[lag] = normalized;
            if (lag > minLag && normalized < 0.13) {
                while (lag + 1 <= maxLag && difference[lag + 1] < difference[lag]) lag++;
                candidate = lag;
                break;
            }
        }
        if (candidate < 0) return -1;

        double refined = candidate;
        if (candidate > minLag && candidate < maxLag) {
            double left = difference[candidate - 1];
            double center = difference[candidate];
            double right = difference[candidate + 1];
            double divisor = 2 * (2 * center - right - left);
            if (Math.abs(divisor) > 1e-9) refined += (right - left) / divisor;
        }
        return sampleRate / refined;
    }
}

