Add-Type -AssemblyName System.Drawing

$size = 180
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#26251F'))

$bronze = [System.Drawing.ColorTranslator]::FromHtml('#755F42')
$cream = [System.Drawing.ColorTranslator]::FromHtml('#F1ECE2')
$borderPen = New-Object System.Drawing.Pen($bronze, 1)
$graphics.DrawRectangle($borderPen, 13, 13, 154, 154)

$serif = New-Object System.Drawing.Font('Georgia', 44, ([System.Drawing.FontStyle]::Italic), ([System.Drawing.GraphicsUnit]::Pixel))
$serifFormat = New-Object System.Drawing.StringFormat
$serifFormat.Alignment = [System.Drawing.StringAlignment]::Center
$serifFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$creamBrush = New-Object System.Drawing.SolidBrush($cream)
$graphics.DrawString('RBC', $serif, $creamBrush, (New-Object System.Drawing.RectangleF(0, 52, 180, 52)), $serifFormat)

$linePen = New-Object System.Drawing.Pen($bronze, 1)
$graphics.DrawLine($linePen, 64, 101, 116, 101)

$sans = New-Object System.Drawing.Font('Arial', 11, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel))
$graphics.DrawString('S T U D I O', $sans, $creamBrush, (New-Object System.Drawing.RectangleF(0, 111, 180, 24)), $serifFormat)

$target = Join-Path (Split-Path $PSScriptRoot -Parent) 'apple-touch-icon.png'
$bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)

$sans.Dispose()
$serif.Dispose()
$serifFormat.Dispose()
$creamBrush.Dispose()
$linePen.Dispose()
$borderPen.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
