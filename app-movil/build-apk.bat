@echo off
rem Recompila la APK de prueba (debug) con los ultimos cambios de la web.
set JAVA_HOME=C:\Users\hervi\android-tools\jdk21
set ANDROID_HOME=C:\Users\hervi\android-tools\sdk
cd /d "%~dp0"
call npm run sync || exit /b 1
cd /d "%~dp0android"
call "%~dp0android\gradlew.bat" assembleDebug || exit /b 1
copy /Y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0HeDreamer.apk"
echo APK lista: %~dp0HeDreamer.apk
