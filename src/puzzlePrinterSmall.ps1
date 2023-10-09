param(
    [string]$jsonConfig
)

# Load necessary .NET assemblies
Add-Type -TypeDefinition @"
    using System.Diagnostics;
"@

# Function to print a PDF file
function PrintPDF {
    param (
        [string]$pdfPath,
        [string]$printerName
    )

    $pdfPrinterPath = "C:\Program Files (x86)\Adobe\Acrobat Reader DC\Reader\AcroRd32.exe"
    $arguments = "/t $($pdfPath) $($printerName)"
    Start-Process -FilePath $pdfPrinterPath -ArgumentList $arguments -Wait -NoNewWindow
}

# Function to create a PDF with two pages per sheet
function CreatePDFWith2PagesPerSheet {
    param (
        [string]$inputPdfPath,
        [string]$outputPdfPath
    )

    Add-Type -Path "C:\Program Files\itextsharp.dll" # Replace with the actual path to iTextSharp.dll

    $reader = [iTextSharp.text.pdf.PdfReader]::new($inputPdfPath)
    $pageCount = $reader.NumberOfPages

    $doc = [iTextSharp.text.Document]::new()
    $outputStream = [System.IO.File]::Create($outputPdfPath)
    $pdfWriter = [iTextSharp.text.pdf.PdfWriter]::GetInstance($doc, $outputStream)

    $doc.Open()

    for ($i = 1; $i -le $pageCount; $i += 2) {
        $page = $doc.GetPageSize($i)
        $newPage = [iTextSharp.text.Rectangle]::new($page.Width, $page.Height)

        $doc.SetPageSize($newPage)
        $doc.NewPage()
        
        $cb = $pdfWriter.DirectContent

        $page1 = $reader.GetPageN($i)
        $page2 = $reader.GetPageN($i + 1)

        $cb.AddTemplate($page1, 0, 0)
        $cb.AddTemplate($page2, 0, $page.Height / 2)
    }

    $doc.Close()
    $outputStream.Close()
}

# Read the JSON config file
$scriptDirectory = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$parentDirectory = Split-Path -Parent -Path $scriptDirectory

$jsonConfigPath = Join-Path -Path $parentDirectory -ChildPath "src/configs/$jsonConfig"
$puzzlesArray = (Get-Content $jsonConfigPath | ConvertFrom-Json).puzzles

foreach ($item in $puzzlesArray) {
    # Extract puzzle information
    $puzzleName = $item.puzzleName
    $replacedPuzzleName = $puzzleName -replace ', | ', '_' # Replace ',' and space in puzzleName with underscores
    $replacedPuzzleName = $replacedPuzzleName -replace ' ', '_'

    # Generate the PDF filename
    $currentTime = Get-Date -Format 'yyyyMMdd'
    $filename = "puzzles/${replacedPuzzleName}_puzzles_${currentTime}.pdf"
    $fullPath = Join-Path -Path $parentDirectory -ChildPath "$filename"

    # Specify the printer name
    $printerName = "BULLDOZER"

    # Create a new PDF with two pages per sheet
    $outputPdfPath = Join-Path -Path $parentDirectory -ChildPath "${replacedPuzzleName}_2_pages_per_sheet.pdf"
    CreatePDFWith2PagesPerSheet -inputPdfPath $fullPath -outputPdfPath $outputPdfPath

    # Print the modified PDF
    Write-Host("Printing $filename with 2 pages per sheet to printer $printerName")
    PrintPDF -pdfPath $outputPdfPath -printerName $printerName
}
