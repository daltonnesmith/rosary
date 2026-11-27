package io.github.daltonnesmith.stillwater.test;

import static androidx.test.espresso.intent.Intents.intending;
import static androidx.test.espresso.intent.matcher.IntentMatchers.hasAction;
import static org.junit.Assert.*;

import android.Manifest;
import android.app.Activity;
import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.intent.Intents;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
@SdkSuppress(minSdkVersion = 35)
public class OfflineAppTest {
    private ActivityScenario<MainActivity> scenario;

    private Object evaluate(String expression) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch ready = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
            "(function(){" + expression + "})()", value -> { result.set(value); ready.countDown(); }));
        assertTrue("WebView JavaScript did not respond", ready.await(15, TimeUnit.SECONDS));
        return new JSONTokener(result.get()).nextValue();
    }
    private void waitFor(String expression) throws Exception {
        long end = SystemClock.elapsedRealtime() + 20000;
        while (SystemClock.elapsedRealtime() < end) {
            if (Boolean.TRUE.equals(evaluate("return Boolean(" + expression + ");"))) return;
            SystemClock.sleep(150);
        }
        fail("WebView condition did not become true: " + expression);
    }
    private void click(String selector) throws Exception {
        evaluate("document.querySelector(" + JSONObject.quote(selector) + ").click();");
    }
    private String text(String selector) throws Exception {
        return (String) evaluate("return document.querySelector(" + JSONObject.quote(selector) + ").textContent;");
    }

    @Test
    public void firstLaunchOfflinePrayersCalendarJournalBackupsAndResumption() throws Exception {
        UiAutomation automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        automation.adoptShellPermissionIdentity(Manifest.permission.ACCESS_NETWORK_STATE);
        try {
            // Device-test setup can re-enable Wi-Fi after the workflow disabled it.
            for (String command : new String[] {
                "cmd connectivity airplane-mode enable", "svc wifi disable", "svc data disable"
            }) {
                try (InputStream output = new ParcelFileDescriptor.AutoCloseInputStream(
                    automation.executeShellCommand(command))) {
                    assertEquals("Network setup failed: " + command, "",
                        new String(output.readAllBytes(), StandardCharsets.UTF_8).trim());
                }
            }
            ConnectivityManager connectivity = InstrumentationRegistry.getInstrumentation()
                .getTargetContext().getSystemService(ConnectivityManager.class);
            Network network = connectivity.getActiveNetwork();
            long deadline = SystemClock.elapsedRealtime() + 20000;
            while (network != null && SystemClock.elapsedRealtime() < deadline) {
                SystemClock.sleep(200);
                network = connectivity.getActiveNetwork();
            }
            // WebView's navigator.onLine does not reliably reflect Android connectivity.
            assertNull("Emulator must be offline before first launch: " +
                (network == null ? "none" : connectivity.getNetworkCapabilities(network)), network);
        } finally {
            automation.dropShellPermissionIdentity();
        }
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            waitFor("document.querySelector('#prayer-title')?.textContent");
            assertEquals(Boolean.TRUE, evaluate("return document.documentElement.classList.contains('native-app');"));
            assertEquals(Boolean.TRUE, evaluate("return document.querySelector('#web-install-guidance').hidden;"));
            assertEquals(Boolean.TRUE, evaluate("return typeof Capacitor.Plugins.StillwaterBackup.save === 'function';"));
            assertEquals("Sign of the Cross", text("#prayer-title"));
            click("#switch-view");
            click("#view-chapel");
            click("#next");
            click("#next");
            assertEquals("Our Father", text("#prayer-title"));
            click("#switch-view");
            click("#view-chapel");
            String chapel = "document.querySelector('#chapel-host').shadowRoot";
            waitFor(chapel + "?.getElementById('title')?.textContent === 'Our Father'");
            // Smaller screens paginate the prayer before offering the next bead.
            int pages = 0;
            while (Boolean.TRUE.equals(evaluate("return " + chapel + ".getElementById('next').textContent.startsWith('Continue reading');"))) {
                assertTrue("Prayer pagination must reach the next bead", ++pages < 100);
                evaluate(chapel + ".getElementById('next').click();");
            }
            evaluate(chapel + ".getElementById('next').click();");
            waitFor(chapel + ".getElementById('title').textContent === 'Hail Mary'");
            scenario.recreate();
            waitFor("document.querySelector('#prayer-title')?.textContent === 'Hail Mary'");
            click("#view-chapel");
            waitFor(chapel + "?.getElementById('title')?.textContent === 'Hail Mary'");
            evaluate(chapel + ".getElementById('back').click();");
            evaluate(chapel + ".getElementById('exit').click();");
            assertEquals("Our Father", text("#prayer-title"));
            click("[data-tab=scripture]");
            click("#reading-next");
            assertTrue(text("#reading-title").startsWith("Tobit 1:"));
            evaluate("document.querySelector('#reading-plan').value='gospels';document.querySelector('#reading-plan').dispatchEvent(new Event('change'));");
            click("#reading-next");
            click("#reading-next");
            assertEquals("Passage 3 of 5", text("#reading-step-count"));
            click("[data-tab=liturgical]");
            evaluate("const d=document.querySelector('#lit-date');d.value='2026-02-18';d.dispatchEvent(new Event('change'));");
            assertTrue(text("#lit-events").contains("Ash Wednesday"));
            assertTrue(text("#lit-season").contains("Lent"));
            click("[data-tab=journal]");
            evaluate("document.querySelector('#note-date').value='2026-11-16';document.querySelector('#note-text').value='Synthetic Android backup test.';document.querySelector('#note-form').requestSubmit();");
            assertTrue(text("#notes-list").contains("Synthetic Android backup test."));
            Intents.init();
            try {
                intending(hasAction(Intent.ACTION_CREATE_DOCUMENT)).respondWith(new Instrumentation.ActivityResult(Activity.RESULT_CANCELED, null));
                click("#export");
                waitFor("document.querySelector('#status').textContent.includes('Backup cancelled')");
                // Verify the recorded request, not the WebView's window focus after cancellation.
                assertEquals(1L, Intents.getIntents().stream().filter(intent ->
                    Intent.ACTION_CREATE_DOCUMENT.equals(intent.getAction()) &&
                    "application/json".equals(intent.getType())).count());
            } finally { Intents.release(); }
            Uri backup = Uri.parse("content://io.github.daltonnesmith.stillwater.test.backup-test/backup.json");
            Intents.init();
            try {
                intending(hasAction(Intent.ACTION_CREATE_DOCUMENT)).respondWith(new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent().setData(backup)));
                click("#export");
                waitFor("document.querySelector('#status').textContent.startsWith('Backup saved')");
            } finally { Intents.release(); }
            try (InputStream input = InstrumentationRegistry.getInstrumentation().getContext().getContentResolver().openInputStream(backup)) {
                assertNotNull(input);
                JSONObject saved = new JSONObject(new String(input.readAllBytes(), StandardCharsets.UTF_8));
                assertEquals(2, saved.getInt("version"));
                assertEquals("Synthetic Android backup test.", saved.getJSONArray("notes").getJSONObject(0).getString("text"));
                assertEquals(2, saved.getJSONObject("progress").getInt("step"));
                assertEquals(14, saved.getJSONObject("reading").getJSONObject("deuterocanon").getJSONObject("progress").getInt("step"));
                assertEquals(27, saved.getJSONObject("reading").getJSONObject("gospels").getJSONObject("progress").getInt("step"));
            }
            String before = (String) evaluate("return localStorage.getItem('stillwater-v1');");
            Intents.init();
            try {
                Uri denied = Uri.parse("content://io.github.daltonnesmith.stillwater.test.backup-test/denied.json");
                intending(hasAction(Intent.ACTION_CREATE_DOCUMENT)).respondWith(new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent().setData(denied)));
                click("#export");
                waitFor("document.querySelector('#status').textContent.startsWith('Backup could not be exported')");
                assertEquals(before, evaluate("return localStorage.getItem('stillwater-v1');"));
                assertEquals(Boolean.FALSE, evaluate("return document.querySelector('#export').disabled;"));
            } finally { Intents.release(); }
            scenario.recreate();
            waitFor("document.querySelector('#prayer-title')?.textContent");
            assertEquals(before, evaluate("return localStorage.getItem('stillwater-v1');"));
            assertEquals("Our Father", text("#prayer-title"));
            assertTrue(text("#notes-list").contains("Synthetic Android backup test."));
            assertEquals(Boolean.TRUE, evaluate("return !navigator.serviceWorker?.controller;"));
        }
    }
}
