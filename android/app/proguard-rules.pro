# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Fresco & Facebook common internal classes
-keep class com.facebook.common.internal.VisibleForTesting { *; }
-keep class com.facebook.fresco.animation.bitmap.cache.FrescoFrameCache { *; }

# Stripe SDK push provisioning
-keep class com.stripe.android.pushProvisioning.** { *; }
-dontwarn com.stripe.android.pushProvisioning.**

# React Native Stripe SDK
-keep class com.reactnativestripesdk.pushprovisioning.** { *; }
-dontwarn com.reactnativestripesdk.pushprovisioning.**

# General safety rules
-keep class com.facebook.** { *; }
-dontwarn com.facebook.**
-keep class androidx.** { *; }
-dontwarn androidx.**
