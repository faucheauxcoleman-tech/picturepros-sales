@echo off
echo === Deploying Picture Pros Sales Site to Cloud Run ===

set PROJECT=colemans-ai-database
set REGION=us-central1
set SERVICE=picturepros-sales
set API_URL=https://teamscoutai-474460553303.us-central1.run.app

REM Read Firebase + Stripe config from internal tool's .env.local
set ENV_FILE=%~dp0teamscout-ai-extractor (1)\.env.local
if exist "%ENV_FILE%" (
  echo Reading config from %ENV_FILE%...
  for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    if "%%A"=="VITE_FIREBASE_API_KEY" set FB_API_KEY=%%B
    if "%%A"=="VITE_FIREBASE_AUTH_DOMAIN" set FB_AUTH_DOMAIN=%%B
    if "%%A"=="VITE_FIREBASE_PROJECT_ID" set FB_PROJECT_ID=%%B
    if "%%A"=="VITE_FIREBASE_STORAGE_BUCKET" set FB_STORAGE_BUCKET=%%B
    if "%%A"=="VITE_FIREBASE_MESSAGING_SENDER_ID" set FB_MSG_SENDER_ID=%%B
    if "%%A"=="VITE_FIREBASE_APP_ID" set FB_APP_ID=%%B
    if "%%A"=="STRIPE_SECRET_KEY" set STRIPE_SK=%%B
    if "%%A"=="STRIPE_PUBLISHABLE_KEY" set STRIPE_PK=%%B
  )
) else (
  echo WARNING: %ENV_FILE% not found! Firebase/Stripe vars will be missing.
)

echo.
echo Building and deploying to Cloud Run...
echo Project: %PROJECT%
echo Service: %SERVICE%
echo Region: %REGION%
echo API URL: %API_URL%
echo.

set ENV_VARS=NEXT_PUBLIC_API_URL=%API_URL%,API_URL=%API_URL%
set ENV_VARS=%ENV_VARS%,NEXT_PUBLIC_FIREBASE_API_KEY=%FB_API_KEY%
set ENV_VARS=%ENV_VARS%,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=%FB_AUTH_DOMAIN%
set ENV_VARS=%ENV_VARS%,NEXT_PUBLIC_FIREBASE_PROJECT_ID=%FB_PROJECT_ID%
set ENV_VARS=%ENV_VARS%,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=%FB_STORAGE_BUCKET%
set ENV_VARS=%ENV_VARS%,NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=%FB_MSG_SENDER_ID%
set ENV_VARS=%ENV_VARS%,NEXT_PUBLIC_FIREBASE_APP_ID=%FB_APP_ID%
set ENV_VARS=%ENV_VARS%,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=%STRIPE_PK%
set ENV_VARS=%ENV_VARS%,STRIPE_SECRET_KEY=%STRIPE_SK%

gcloud run deploy %SERVICE% ^
  --source "%~dp0." ^
  --region %REGION% ^
  --project %PROJECT% ^
  --allow-unauthenticated ^
  --port 8080 ^
  --memory 512Mi ^
  --cpu 1 ^
  --min-instances 0 ^
  --max-instances 3 ^
  --set-env-vars "%ENV_VARS%" ^
  --set-build-env-vars "%ENV_VARS%"

echo.
echo === Deploy complete! ===
if not defined DEPLOY_ALL pause
