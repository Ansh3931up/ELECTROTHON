package com.attendance.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.attendance.app.plugins.sms.SMSPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(SMSPlugin.class);
    }
} 