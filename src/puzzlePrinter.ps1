param(
    [string]$jsonConfig
)

Write-Host "I'm now in the powershell script!"
# Read the JSON config file
# $scriptDirectory = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
# $parentDirectory = Split-Path -Parent -Path $scriptDirectory

# $jsonConfigPath = Join-Path -Path $parentDirectory -ChildPath "src/configs/$jsonConfig"
# $puzzlesArray = (Get-Content $jsonConfigPath | ConvertFrom-Json).puzzles
Write-Host "I'm looking for the json config in $jsonConfig."
$metadata = (Get-Content $jsonConfig | ConvertFrom-Json).metadata.name

# Generate the PDF filename
$currentTime = Get-Date -Format 'yyyyMMdd'
$filename = "C:/Users/Courtney/source/repos/PuzzlePrinter/puzzles/${metadata}_puzzles_${currentTime}.pdf"
# $fullPath = Join-Path -Path $parentDirectory -ChildPath "$filename"

# Print the PDF to a specific printer
Write-Host("Printing $filename")


# Define the printer name
$printerName = "BULLDOZER"

# Get the current printer configuration
# $printer = Get-Printer -Name $printerName

# Set N-up to 2
# Set-PrintConfiguration -PrinterName $printerName -Nup 2
# # Set duplex mode to along the short side
# $printConfig = Get-PrintConfiguration -PrinterName $printerName
Set-PrintConfiguration -PrinterName $printerName -DuplexingMode TwoSidedLongEdge -PaperSize A5


# foreach ($property in $printConfig.PSObject.Properties) {
#     $propertyName = $property.Name
#     $propertyValue = $property.Value
#     Write-Host "{$propertyName}: $propertyValue\n"
# }
# $printConfig.PaperSize = "A5"
# $printConfig.DuplexingMode = "TwoSidedShortEdge"
# Set-PrintConfiguration -PrinterName $printerName -InputObject $printConfig

Start-Process $filename -Verb Print

# foreach ($item in $puzzlesArray)
# {
#     # Extract puzzle information
#     $puzzleName = $item.puzzleName
#     $replacedPuzzleName = $puzzleName -replace ', | ', '_' # Replace ',' and space in puzzleName with underscores
#     $replacedPuzzleName = $replacedPuzzleName -replace ' ', '_'

#     # Generate the PDF filename
#     $currentTime = Get-Date -Format 'yyyyMMdd'
#     $filename = "puzzles/${replacedPuzzleName}_puzzles_${currentTime}.pdf"
#     $fullPath = Join-Path -Path $parentDirectory -ChildPath "$filename"

#     # Print the PDF to a specific printer
#     Write-Host("Printing $filename")
#     Start-Process $fullPath -Verb Print
# }

