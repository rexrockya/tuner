package com.rexrockya.tuner;

final class Lesson {
    final String title, artist, track, style, key, meter, progression, sourceMoment;
    final String[] notes, durations, analysis, practice;
    final int[] midi;
    final String searchTerm;

    Lesson(String title, String artist, String track, String style, String key,
           String meter, String progression, String sourceMoment, int[] midi,
           String[] notes, String[] durations, String[] analysis, String[] practice,
           String searchTerm) {
        this.title = title;
        this.artist = artist;
        this.track = track;
        this.style = style;
        this.key = key;
        this.meter = meter;
        this.progression = progression;
        this.sourceMoment = sourceMoment;
        this.midi = midi;
        this.notes = notes;
        this.durations = durations;
        this.analysis = analysis;
        this.practice = practice;
        this.searchTerm = searchTerm;
    }
}
