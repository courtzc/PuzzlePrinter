param(
    [string]$jsonConfig
)

# Read the JSON config file
$scriptDirectory = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$parentDirectory = Split-Path -Parent -Path $scriptDirectory

$jsonConfigPath = Join-Path -Path $parentDirectory -ChildPath "src/configs/$jsonConfig"
$puzzlesArray = (Get-Content $jsonConfigPath | ConvertFrom-Json).puzzles

foreach ($item in $puzzlesArray)
{
    # Extract puzzle information
    $puzzleName = $item.puzzleName
    $replacedPuzzleName = $puzzleName -replace ', | ', '_' # Replace ',' and space in puzzleName with underscores
    $replacedPuzzleName = $replacedPuzzleName -replace ' ', '_'

    # Generate the PDF filename
    $currentTime = Get-Date -Format 'yyyyMMdd'
    $filename = "puzzles/${replacedPuzzleName}_puzzles_${currentTime}.pdf"
    $fullPath = Join-Path -Path $parentDirectory -ChildPath "$filename"

    # Print the PDF to a specific printer with 2 sheets per page
    Write-Host("Printing $filename")
    Start-Process $fullPath -Verb Print
}

