setlocal

REM Start the Node.js script (replace "node_script.js" with your script's filename)
set Config="C:\Users\Courtney\source\repos\PuzzlePrinter\src\configs\puzzleSaverConfigDailies.json"
node "C:\Users\Courtney\source\repos\PuzzlePrinter\src\puzzleSaverCombinedPdf.js" "%Config%"

set PowerShellScript="C:\Users\Courtney\source\repos\PuzzlePrinter\src\puzzlePrinter.ps1"
REM Start the PowerShell script (replace "powershell_script.ps1" with your script's filename)
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File %PowerShellScript% -jsonConfig  "%Config%"

REM Wait for error messages
echo Waiting for error messages...
timeout /t 30 /nobreak

endlocal