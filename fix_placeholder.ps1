$content = Get-Content 'Soundwave\src\app\index.tsx' -Raw
$oldPlaceholder = 'placeholder="' + [char]7 + [char]7 + [char]7 + [char]7 + [char]7 + [char]7 + [char]7 + [char]7 + [char]7 + [char]7 + [char]7 + [char]7 + '"'
$newPlaceholder = 'placeholder="' + ([char]0x2022 -join '') + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + ([char]0x2022) + '"'
$content = $content.Replace($oldPlaceholder, $newPlaceholder)
Set-Content 'Soundwave\src\app\index.tsx' $content -NoNewline -Encoding UTF8
Write-Host "Done"
