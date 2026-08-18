Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path "..\.git\icono.jpeg").Path
$fileBytes = [System.IO.File]::ReadAllBytes($srcPath)
$ms = New-Object System.IO.MemoryStream($fileBytes, $false)
$srcImg = [System.Drawing.Image]::FromStream($ms)

$w = $srcImg.Width
$h = $srcImg.Height

# Character crop:
# Let's frame the character head, hat, eyes, and big mustache squarely.
# The character starts near Y = 10% and ends near Y = 68% (above "Mr Tender" text).
$cropWidth = [int]($w * 0.70)
$cropHeight = [int]($h * 0.70)
$cropX = [int](($w - $cropWidth) / 2)
$cropY = [int]($h * 0.03)

$destRect = New-Object System.Drawing.Rectangle(0, 0, 512, 512)
$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropWidth, $cropHeight)

$bmp = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$graphics.Clear([System.Drawing.Color]::White)
$graphics.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$graphics.Dispose()
$srcImg.Dispose()
$ms.Dispose()

$tempPath = Join-Path (Get-Location) "temp-cropped.png"
if (Test-Path $tempPath) { Remove-Item $tempPath -Force }

$outStream = New-Object System.IO.MemoryStream
$bmp.Save($outStream, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $outStream.ToArray()
$outStream.Dispose()
$bmp.Dispose()

[System.IO.File]::WriteAllBytes($tempPath, $pngBytes)
Write-Host "Temp cropped image saved, applying with node..."
