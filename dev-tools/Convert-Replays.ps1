<#
.SYNOPSIS
    Batch‑convert Warcraft III replay files (.w3g) to build‑order CSVs.

.DESCRIPTION
    Enumerates every .w3g replay in a target directory and invokes the Node
    script `export-build-order-with-heroes.js`, passing <replayPath> <csvPath>.
    Results are written to a sibling \csv folder.

.NOTES
    Run with -Verbose to see per‑file progress.
#>

param(
    [Parameter(Mandatory)]
    [ValidateScript({Test-Path $_ -PathType Container})]
    [string]$ReplayDirectory,

    [string]$CsvDirectory = (Join-Path $ReplayDirectory 'csv'),

    [string]$NodeScript   = '.\export-build-order-with-heroes.js'
)

#── Prep output directory ──────────────────────────────────────────────────────
if (-not (Test-Path $CsvDirectory)) {
    New-Item -ItemType Directory -Path $CsvDirectory -Force | Out-Null
    Write-Verbose "Created output folder: $CsvDirectory"
}

#── Main loop ──────────────────────────────────────────────────────────────────
Get-ChildItem -Path $ReplayDirectory -Filter '*.w3g' -File |
ForEach-Object {
    $replayPath = $_.FullName
    $csvPath    = Join-Path $CsvDirectory "$($_.BaseName).csv"

    Write-Verbose "→ [$($_.Name)] → [$([IO.Path]::GetFileName($csvPath))]"

    # Call the Node parser (inherit $LASTEXITCODE for error handling if needed)
    node $NodeScript $replayPath $csvPath

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Parsing failed for $($_.Name) ‑ exit code $LASTEXITCODE"
    }
}
