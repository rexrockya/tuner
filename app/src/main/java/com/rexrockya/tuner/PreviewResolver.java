package com.rexrockya.tuner;

import android.net.Uri;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class PreviewResolver {
    static final class Result {
        final String previewUrl, trackUrl;
        Result(String previewUrl, String trackUrl) { this.previewUrl = previewUrl; this.trackUrl = trackUrl; }
    }

    private PreviewResolver() {}

    static Result resolve(String term) throws Exception {
        String endpoint = "https://itunes.apple.com/search?entity=song&limit=8&country=US&term="
                + Uri.encode(term);
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(10000);
        connection.setRequestProperty("User-Agent", "XianYin/1.1 preview-audio");
        try {
            if (connection.getResponseCode() != 200) return null;
            StringBuilder json = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) json.append(line);
            }
            JSONArray items = new JSONObject(json.toString()).optJSONArray("results");
            if (items == null) return null;
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                String preview = item.optString("previewUrl", "");
                if (!preview.isEmpty()) return new Result(preview, item.optString("trackViewUrl", ""));
            }
            return null;
        } finally {
            connection.disconnect();
        }
    }
}
