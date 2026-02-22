@echo off
echo === Deploying Picture Pros Sales Site to Cloud Run ===

set PROJECT=colemans-ai-database
set REGION=us-central1
set SERVICE=picturepros-sales
set API_URL=https://teamscoutai-474460553303.us-central1.run.app

echo.
echo Building and deploying to Cloud Run...
echo Project: %PROJECT%
echo Service: %SERVICE%
echo Region: %REGION%
echo API URL: %API_URL%
echo.

gcloud run deploy %SERVICE% ^
  --source . ^
  --region %REGION% ^
  --project %PROJECT% ^
  --allow-unauthenticated ^
  --port 8080 ^
  --memory 512Mi ^
  --cpu 1 ^
  --min-instances 0 ^
  --max-instances 3 ^
  --set-env-vars "NEXT_PUBLIC_API_URL=%API_URL%" ^
  --set-build-env-vars "NEXT_PUBLIC_API_URL=%API_URL%"

echo.
echo === Deploy complete! ===
pause
