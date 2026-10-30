package com.livecameraapp

import android.content.pm.ActivityInfo
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OrientationModule(ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "AppOrientation"

  @ReactMethod
  fun lock(mode: String) {
    val activity = reactApplicationContext.currentActivity ?: return
    val value = when (mode) {
      "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
      else -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    }
    activity.runOnUiThread { activity.requestedOrientation = value }
  }
}
