Add-Type -AssemblyName System.Drawing
$src = 'C:\Users\Francesco\Downloads\ChatGPT Image 8. Juni 2026, 14_33_14.png'
$outDir = 'C:\Users\Francesco\Desktop\FranChess.co\public'
$original = [System.Drawing.Bitmap]::new($src)
$w = $original.Width
$h = $original.Height
$visited = New-Object 'bool[,]' $w, $h
$remove = New-Object 'bool[,]' $w, $h
$q = [System.Collections.Generic.Queue[object]]::new()
function IsBackground([System.Drawing.Color]$c) {
  $min = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
  $max = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
  return ($min -gt 218 -and ($max - $min) -lt 24)
}
function AddPoint([int]$x, [int]$y) {
  if ($x -lt 0 -or $y -lt 0 -or $x -ge $script:w -or $y -ge $script:h) { return }
  if ($script:visited[$x,$y]) { return }
  $script:visited[$x,$y] = $true
  $c = $script:original.GetPixel($x,$y)
  if (IsBackground $c) {
    $script:remove[$x,$y] = $true
    $script:q.Enqueue(@($x,$y))
  }
}
for ($x=0; $x -lt $w; $x++) { AddPoint $x 0; AddPoint $x ($h-1) }
for ($y=0; $y -lt $h; $y++) { AddPoint 0 $y; AddPoint ($w-1) $y }
$dirs = @(@(1,0),@(-1,0),@(0,1),@(0,-1))
while ($q.Count -gt 0) {
  $p = $q.Dequeue(); $px = [int]$p[0]; $py = [int]$p[1]
  foreach ($d in $dirs) { AddPoint ($px + [int]$d[0]) ($py + [int]$d[1]) }
}
for ($pass=0; $pass -lt 2; $pass++) {
  $toRemove = New-Object 'bool[,]' $w, $h
  for ($y=1; $y -lt $h-1; $y++) {
    for ($x=1; $x -lt $w-1; $x++) {
      if ($remove[$x,$y]) { continue }
      $c = $original.GetPixel($x,$y)
      if (-not (IsBackground $c)) { continue }
      $touch = $false
      foreach ($d in $dirs) { if ($remove[$x + [int]$d[0],$y + [int]$d[1]]) { $touch = $true; break } }
      if ($touch) { $toRemove[$x,$y] = $true }
    }
  }
  for ($y=0; $y -lt $h; $y++) { for ($x=0; $x -lt $w; $x++) { if ($toRemove[$x,$y]) { $remove[$x,$y] = $true } } }
}
$minX=$w; $minY=$h; $maxX=0; $maxY=0
for ($y=0; $y -lt $h; $y++) {
  for ($x=0; $x -lt $w; $x++) {
    if (-not $remove[$x,$y]) {
      if ($x -lt $minX) { $minX=$x }
      if ($y -lt $minY) { $minY=$y }
      if ($x -gt $maxX) { $maxX=$x }
      if ($y -gt $maxY) { $maxY=$y }
    }
  }
}
$pad = 22
$minX = [Math]::Max(0, $minX - $pad); $minY = [Math]::Max(0, $minY - $pad); $maxX = [Math]::Min($w-1, $maxX + $pad); $maxY = [Math]::Min($h-1, $maxY + $pad)
$cw = $maxX - $minX + 1; $ch = $maxY - $minY + 1
$logo = [System.Drawing.Bitmap]::new($cw, $ch, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y=0; $y -lt $ch; $y++) {
  for ($x=0; $x -lt $cw; $x++) {
    $sx = $x + $minX; $sy = $y + $minY
    if ($remove[$sx,$sy]) { $logo.SetPixel($x,$y,[System.Drawing.Color]::FromArgb(0,255,255,255)) }
    else { $c = $original.GetPixel($sx,$sy); $logo.SetPixel($x,$y,[System.Drawing.Color]::FromArgb(255,$c.R,$c.G,$c.B)) }
  }
}
function SaveSquarePng([System.Drawing.Bitmap]$srcBmp, [int]$size, [string]$path, [bool]$maskable) {
  $canvas = [System.Drawing.Bitmap]::new($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear([System.Drawing.Color]::FromArgb(0,255,255,255))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $scale = if ($maskable) { 0.72 } else { 0.88 }
  $target = [Math]::Round($size * $scale)
  $ratio = [Math]::Min($target / $srcBmp.Width, $target / $srcBmp.Height)
  $dw = [Math]::Round($srcBmp.Width * $ratio); $dh = [Math]::Round($srcBmp.Height * $ratio)
  $dx = [Math]::Round(($size - $dw) / 2); $dy = [Math]::Round(($size - $dh) / 2)
  $g.DrawImage($srcBmp, $dx, $dy, $dw, $dh)
  $canvas.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $canvas.Dispose()
}
$logo.Save((Join-Path $outDir 'franchess-logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
SaveSquarePng $logo 16 (Join-Path $outDir 'favicon-16x16.png') $false
SaveSquarePng $logo 32 (Join-Path $outDir 'favicon-32x32.png') $false
SaveSquarePng $logo 48 (Join-Path $outDir 'favicon-48x48.png') $false
SaveSquarePng $logo 180 (Join-Path $outDir 'apple-touch-icon.png') $false
SaveSquarePng $logo 192 (Join-Path $outDir 'android-chrome-192x192.png') $false
SaveSquarePng $logo 512 (Join-Path $outDir 'android-chrome-512x512.png') $false
SaveSquarePng $logo 512 (Join-Path $outDir 'maskable-icon.png') $true
$og = [System.Drawing.Bitmap]::new(1200,630,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gog = [System.Drawing.Graphics]::FromImage($og)
$gog.Clear([System.Drawing.ColorTranslator]::FromHtml('#f4f1ea'))
$gog.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gog.DrawImage($logo, 410, 62, 380, 380)
$font = [System.Drawing.Font]::new('Segoe UI', 48, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#1f2933'))
$stringFormat = [System.Drawing.StringFormat]::new(); $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$gog.DrawString('FranChess.co', $font, $brush, [System.Drawing.RectangleF]::new(0,460,1200,80), $stringFormat)
$og.Save((Join-Path $outDir 'og-image.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$gog.Dispose(); $font.Dispose(); $brush.Dispose(); $stringFormat.Dispose(); $og.Dispose()
function ReadBytes($path) { return [System.IO.File]::ReadAllBytes($path) }
$frames = @(
  @{Size=16; Bytes=(ReadBytes (Join-Path $outDir 'favicon-16x16.png'))},
  @{Size=32; Bytes=(ReadBytes (Join-Path $outDir 'favicon-32x32.png'))},
  @{Size=48; Bytes=(ReadBytes (Join-Path $outDir 'favicon-48x48.png'))}
)
$icoPath = Join-Path $outDir 'favicon.ico'
$ms = [System.IO.MemoryStream]::new(); $bw = [System.IO.BinaryWriter]::new($ms)
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$frames.Count)
$offset = 6 + (16 * $frames.Count)
foreach ($frame in $frames) {
  $s = [int]$frame.Size; $bytes = [byte[]]$frame.Bytes
  $bw.Write([byte]$s); $bw.Write([byte]$s); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$bytes.Length); $bw.Write([UInt32]$offset)
  $offset += $bytes.Length
}
foreach ($frame in $frames) { $bw.Write([byte[]]$frame.Bytes) }
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())
$bw.Dispose(); $ms.Dispose(); $logo.Dispose(); $original.Dispose()
Write-Output 'Generated FranChess.co brand assets.'
