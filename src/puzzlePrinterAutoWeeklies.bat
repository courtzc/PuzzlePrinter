setlocal

REM Start the Node.js script to save
set Config="C:\Users\Courtney\source\repos\PuzzlePrinter\src\configs\puzzleSaverConfigWeeklies.json"
node "C:\Users\Courtney\source\repos\PuzzlePrinter\src\puzzleSaverCombinedPdf.js" "%Config%"

REM Start the PowerShell script to print
set PowerShellScript="C:\Users\Courtney\source\repos\PuzzlePrinter\src\puzzlePrinter.ps1"
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File %PowerShellScript% -jsonConfig  "%Config%"

REM Waiting for you to look at the error
echo Waiting for Node.js script to finish...
timeout /t 30 /nobreak

endlocal