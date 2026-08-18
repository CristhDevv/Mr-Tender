Add-Type -AssemblyName System.Drawing

$src = "C:\Users\USER\.gemini\antigravity\brain\8cb54e0a-b849-424a-ba5e-93d76817a16a\mr_tender_app_icon_1787079994011.jpg"
$orig = [System.Drawing.Image]::FromFile($src)
$bmp = New-Object System.Drawing.Bitmap($orig)
$orig.Dispose()

$paths = @(
  "c:\Users\USER\Desktop\workSpace\Mr Tender\mr-tender\public\icon-192.png",
  "c:\Users\USER\Desktop\workSpace\Mr Tender\mr-tender\public\icon-512.png",
  "c:\Users\USER\Desktop\workSpace\Mr Tender\mr-tender\public\icon.png",
  "c:\Users\USER\Desktop\workSpace\Mr Tender\mr-tender\src\app\icon.png",
  "c:\Users\USER\Desktop\workSpace\Mr Tender\mr-tender\src\app\apple-icon.png"
)

foreach ($p in $paths) {
  if (Test-Path $p) {
    Set-ItemProperty -Path $p -Name IsReadOnly -Value $false -ErrorAction SilentlyContinue
    Remove-Item $p -Force -ErrorAction SilentlyContinue
  }
  $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
}

$bmp.Dispose()
Write-Host "REAL PNG CONVERSION COMPLETE"
