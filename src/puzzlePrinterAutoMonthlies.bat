setlocal

REM Start the Node.js script to save
set NodeScript="C:\Users\Courtney\source\repos\PuzzlePrinter\src\puzzleSaverCombinedPdf.js"
node "C:\Users\Courtney\source\repos\PuzzlePrinter\src\puzzleSaverCombinedPdf.js" "%Config%"

REM Start the PowerShell script to print
set PowerShellScript="C:\Users\Courtney\source\repos\PuzzlePrinter\src\puzzlePrinter.ps1"
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File %PowerShellScript% -jsonConfig  "%Config%"

REM Wait for error messages
echo Waiting for error messages...
timeout /t 30 /nobreak

endlocal