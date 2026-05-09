# Ralph Loop Orchestrator for Animaker (AI-Driven & High-Visibility)
# This script ensures real-time feedback and intelligent backlog management.

param (
    [string]$Label = "ready-for-agent",
    [int]$PollInterval = 60,
    [int]$MaxTurns = 60,
    [int]$Iterations = 999
)

Write-Host "`n[SYSTEM] Ralph Loop initialized. Status: Transparent & Forceful." -ForegroundColor Cyan
Write-Host "[CONFIG] Polling label: $Label | MaxTurns: $MaxTurns" -ForegroundColor Gray

$settingsPath = ".gemini/settings.json"
$backupPath = ".gemini/settings.json.bak"
$prdFile = "prd.md"
$progressFile = "progress.txt"

for ($i = 1; $i -le $Iterations; $i++) {
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss') [POLL] Checking for '$Label' issues..." -ForegroundColor Yellow
    
    $issuesJson = gh issue list --label $Label --state open --json number,title,body
    $issues = $issuesJson | ConvertFrom-Json
    
    if (-not $issues -or $issues.Count -eq 0) {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') [IDLE] Backlog empty. PRD may be complete. Sleeping..." -ForegroundColor Gray
        Start-Sleep -Seconds $PollInterval
        continue
    }

    Write-Host "`n==================================================" -ForegroundColor Magenta
    Write-Host " ITERATION $i | BACKLOG: $($issues.Count) ISSUES" -ForegroundColor Magenta
    Write-Host "==================================================" -ForegroundColor Magenta
    foreach ($issue in $issues) { Write-Host "  #$($issue.number) - $($issue.title)" -ForegroundColor White }
    Write-Host "--------------------------------------------------" -ForegroundColor Magenta

    if (Test-Path $settingsPath) {
        Copy-Item $settingsPath $backupPath -Force
        $settingsJson = Get-Content $settingsPath -Raw | ConvertFrom-Json
        $settingsJson.maxTurns = $MaxTurns
        $settingsJson | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
    }

    try {
        $backlogText = ""
        foreach ($issue in $issues) { $backlogText += "ISSUE #$($issue.number): $($issue.title)`nBODY: $($issue.body)`n`n" }

        # Prepare the prompt
        $promptTemplate = @'
You are the AI Engineering Lead. Solve ONE issue and VERIFY it is committed and closed.

BACKLOG:
{0}

CONTEXT:
- prd.md (Requirements)
- progress.txt (History)

STRICT MANDATE:
1. TRIAGE: Pick the highest priority issue.
2. IMPLEMENT: Write the code.
3. TEST: Run 'pnpm run test'.
4. DOCUMENT: Update prd.md (status) and progress.txt (log).
5. COMMIT: 'git add .' and 'git commit -m "feat: [title] (closes #[number])"'.
6. CLOSE: 'gh issue close [number] --comment "Done."'.

BE TRANSPARENT:
- Output your actions clearly so the user sees you working.
- If you hit a tool error (like a 'replace' failure), explain that you are retrying with a different approach.

Execute now.
'@
        $prompt = $promptTemplate -f $backlogText

        Write-Host "$(Get-Date -Format 'HH:mm:ss') [AGENT] Launching Gemini Lead..." -ForegroundColor Green
        
        # We run gemini directly to avoid any pipe buffering issues.
        # This ensures the user sees the output EXACTLY as it happens.
        gemini -y --prompt "$prompt"

    }
    catch {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') [ERROR] Agent execution failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    finally {
        if (Test-Path $backupPath) { Move-Item $backupPath $settingsPath -Force }
    }

    Write-Host "`n$(Get-Date -Format 'HH:mm:ss') [ITERATION] Cycle finished. Cooling down..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
}
