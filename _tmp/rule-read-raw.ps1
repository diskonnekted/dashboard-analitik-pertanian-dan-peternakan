[IO.File]::WriteAllText('I:\pertanian\pertanian-2\_tmp\asst-in.json', '{"assistant_id": "custom-1790041593426-8edd"}', (New-Object System.Text.UTF8Encoding($false)))
cmd /c '"C:\Program Files\AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe" config assistants rule read < I:\pertanian\pertanian-2\_tmp\asst-in.json'
