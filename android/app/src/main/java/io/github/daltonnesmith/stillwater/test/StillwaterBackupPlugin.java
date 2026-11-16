package io.github.daltonnesmith.stillwater.test;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "StillwaterBackup")
public class StillwaterBackupPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename");
        if (data == null || filename == null || !filename.matches("stillwater-backup-\\d{4}-\\d{2}-\\d{2}\\.json")) {
            call.reject("A JSON backup and a valid backup filename are required.");
            return;
        }
        try {
            new JSONObject(data);
        } catch (JSONException error) {
            call.reject("The backup is not valid JSON.", error);
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(call, intent, "saved");
        } catch (ActivityNotFoundException error) {
            call.reject("No Android file picker is available to save this backup.", error);
        }
    }

    @ActivityCallback
    private void saved(PluginCall call, ActivityResult result) {
        if (call == null) {
            Logger.error("The backup request was interrupted. Open Stillwater and export a new backup.");
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK) {
            JSObject response = new JSObject();
            response.put("cancelled", true);
            call.resolve(response);
            return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (uri == null) {
            call.reject("Android did not return a backup file location.");
            return;
        }
        String data = call.getString("data");
        if (data == null) {
            call.reject("Backup contents could not be restored. Export a new backup.");
            return;
        }
        execute(() -> {
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new IOException("The chosen file could not be opened.");
                output.write(data.getBytes(StandardCharsets.UTF_8));
            } catch (IOException | SecurityException error) {
                call.reject("The backup could not be written. Choose a writable location and try again.", error);
                return;
            }
            JSObject response = new JSObject();
            response.put("cancelled", false);
            call.resolve(response);
        });
    }
}
