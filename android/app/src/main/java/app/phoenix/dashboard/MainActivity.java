package app.phoenix.dashboard;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // ─── Notification channel IDs ────────────────────────────────────────────
    // Capacitor Push Notifications uses "default" as the channel ID.
    // We pre-create it here with IMPORTANCE_HIGH so sound + heads-up work
    // even when the app is fully closed (system delivers it natively).
    private static final String CHANNEL_ID_DEFAULT  = "default";
    private static final String CHANNEL_ID_TRADES   = "phoenix_trades";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        AudioAttributes audioAttr = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        // ── Default channel (Capacitor sends here by default) ────────────────
        NotificationChannel defaultCh = new NotificationChannel(
                CHANNEL_ID_DEFAULT,
                "Phoenix Alerts",
                NotificationManager.IMPORTANCE_HIGH
        );
        defaultCh.setDescription("Trade opens, closes and bot alerts");
        defaultCh.enableVibration(true);
        defaultCh.setVibrationPattern(new long[]{0, 250, 150, 250});
        defaultCh.setSound(soundUri, audioAttr);
        defaultCh.enableLights(true);
        nm.createNotificationChannel(defaultCh);

        // ── Trade channel (for explicit trade open/close pushes) ─────────────
        NotificationChannel tradeCh = new NotificationChannel(
                CHANNEL_ID_TRADES,
                "Bot Trades",
                NotificationManager.IMPORTANCE_HIGH
        );
        tradeCh.setDescription("Live trade signals from Phoenix bots");
        tradeCh.enableVibration(true);
        tradeCh.setVibrationPattern(new long[]{0, 300, 200, 300});
        tradeCh.setSound(soundUri, audioAttr);
        tradeCh.enableLights(true);
        nm.createNotificationChannel(tradeCh);
    }
}
