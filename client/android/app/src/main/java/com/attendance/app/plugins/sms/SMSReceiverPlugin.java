package com.attendance.app.plugins.sms;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SMSReceiver",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS
            }
        )
    }
)
public class SMSReceiverPlugin extends Plugin {
    private static final int SMS_PERMISSION_CODE = 23457;
    private BroadcastReceiver smsReceiver;
    private boolean isListening = false;

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (!hasPermission("sms")) {
            requestPermissionForAlias("sms", call, "smsPermsCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        if (hasPermission("sms")) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void startReception(final PluginCall call) {
        if (!hasPermission("sms")) {
            call.reject("SMS permission not granted");
            return;
        }

        if (isListening) {
            call.resolve();
            return;
        }

        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
                    for (SmsMessage smsMessage : Telephony.Sms.Intents.getMessagesFromIntent(intent)) {
                        String messageBody = smsMessage.getMessageBody();
                        if (messageBody != null && messageBody.startsWith("FREQ_DATA:")) {
                            JSObject message = new JSObject();
                            message.put("body", messageBody);
                            message.put("sender", smsMessage.getOriginatingAddress());
                            notifyListeners("smsReceived", message);
                        }
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Telephony.Sms.Intents.SMS_RECEIVED_ACTION);
        getContext().registerReceiver(smsReceiver, filter);
        isListening = true;

        call.resolve();
    }

    @PluginMethod
    public void stopReception(PluginCall call) {
        if (smsReceiver != null && isListening) {
            getContext().unregisterReceiver(smsReceiver);
            smsReceiver = null;
            isListening = false;
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (smsReceiver != null) {
            getContext().unregisterReceiver(smsReceiver);
            smsReceiver = null;
            isListening = false;
        }
    }
} 