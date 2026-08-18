Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\USER\Desktop\workSpace\Mr Tender\.git\icono.jpeg"

if (Test-Path $srcPath) {
    # Read bytes to avoid file lock
    $bytes = [System.IO.File]::ReadAllBytes($srcPath)
    $ms = New-Object System.IO.MemoryStream(,$bytes)
    $srcImg = [System.Drawing.Image]::FromStream($ms)
    
    $publicDir = "c:\Users\USER\Desktop\workSpace\Mr Tender\mr-tender\public"
    $appDir = "c:\Users\USER\Desktop\workSpace\Mr Tender\mr-tender\src\app"
    
    # Clean up previous icons
    @("$publicDir\logo.png", "$publicDir\icon.png", "$publicDir\icon-192.png", "$publicDir\icon-512.png", "$appDir\icon.png", "$appDir\apple-icon.png") | ForEach-Object {
        if (Test-Path $_) { Remove-Item $_ -Force }
    }
    
    # Save full res PNGs
    $bmpFull = New-Object System.Drawing.Bitmap($srcImg)
    $bmpFull.Save("$publicDir\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFull.Save("$publicDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFull.Save("$appDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFull.Save("$appDir\apple-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFull.Dispose()
    
    # 192x192
    $bmp192 = New-Object System.Drawing.Bitmap 192, 192
    $g192 = [System.Drawing.Graphics]::FromImage($bmp192)
    $g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g192.DrawImage($srcImg, 0, 0, 192, 192)
    $bmp192.Save("$publicDir\icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g192.Dispose()
    $bmp192.Dispose()
    
    # 512x512
    $bmp512 = New-Object System.Drawing.Bitmap 512, 512
    $g512 = [System.Drawing.Graphics]::FromImage($bmp512)
    $g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g512.DrawImage($srcImg, 0, 0, 512, 512)
    $bmp512.Save("$publicDir\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g512.Dispose()
    $bmp512.Dispose()
    
    $srcImg.Dispose()
    $ms.Dispose()
    Write-Host "SUCCESS: Generated all PNG logos and icons from icono.jpeg!"
} else {
    Write-Host "Error: File not found at $srcPath"
}
