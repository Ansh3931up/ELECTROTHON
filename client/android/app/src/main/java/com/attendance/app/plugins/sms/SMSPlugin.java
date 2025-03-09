package com.attendance.app.plugins.sms;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
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
import com.getcapacitor.PermissionState;

@CapacitorPlugin(
    name = "SMS",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.SEND_SMS,
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS
            }
        )
    }
)
public class SMSPlugin extends Plugin {
    private static final int SMS_PERMISSION_CODE = 23456;
    private BroadcastReceiver smsReceiver;

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (!getPermissionState("sms").equals(PermissionState.GRANTED)) {
            requestPermissionForAlias("sms", call, "smsPermsCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        if (getPermissionState("sms").equals(PermissionState.GRANTED)) {
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
    public void sendSMS(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        String message = call.getString("message");

        if (phoneNumber == null || message == null) {
            call.reject("Phone number and message are required");
            return;
        }

        if (!getPermissionState("sms").equals(PermissionState.GRANTED)) {
            call.reject("SMS permission not granted");
            return;
        }

        try {
            SmsManager smsManager = SmsManager.getDefault();
            smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to send SMS: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (!getPermissionState("sms").equals(PermissionState.GRANTED)) {
            call.reject("SMS permission not granted");
            return;
        }

        if (smsReceiver != null) {
            call.reject("Already listening for SMS");
            return;
        }

        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent.getAction().equals("android.provider.Telephony.SMS_RECEIVED")) {
                    Object[] pdus = (Object[]) intent.getExtras().get("pdus");
                    if (pdus != null) {
                        for (Object pdu : pdus) {
                            SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                            String messageBody = smsMessage.getMessageBody();
                            
                            if (messageBody != null && messageBody.startsWith("FREQ_DATA:")) {
                                JSObject ret = new JSObject();
                                ret.put("message", messageBody);
                                notifyListeners("smsReceived", ret);
                            }
                        }
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter("android.provider.Telephony.SMS_RECEIVED");
        getContext().registerReceiver(smsReceiver, filter);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        if (smsReceiver != null) {
            getContext().unregisterReceiver(smsReceiver);
            smsReceiver = null;
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        if (smsReceiver != null) {
            getContext().unregisterReceiver(smsReceiver);
            smsReceiver = null;
        }
    }
} 