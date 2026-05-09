# Ralph Loop Orchestrator for Animaker (Intelligent & Forceful)
# This script ensures the agent follows a strict 'Commit & Close' mandate.

param (
    [string]$Label = "ready-for-agent",
    [int]$PollInterval = 60,
    [int]$MaxTurns = 60,
    [int]$Iterations = 999
)

Write-Host "`n[SYSTEM] Ralph Loop initialized. DEFINITION OF DONE: Commit + Issue Closed." -ForegroundColor Cyan
Write-Host "[CONFIG] Polling label: $Label | MaxTurns: $MaxTurns" -ForegroundColor Gray

$settingsPath = ".gemini/settings.json"
$backupPath = ".gemini/settings.json.bak"
$prdFile = "prd.md"
$progressFile = "progress.txt"
$logFile = "ralph-agent.log"

for ($i = 1; $i -le $Iterations; $i++) {
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss') [POLL] Checking for '$Label' issues..." -ForegroundColor Yellow
    
    $issuesJson = gh issue list --label $Label --state open --json number,title,body
    $issues = $issuesJson | ConvertFrom-Json
    
    if (-not $issues -or $issues.Count -eq 0) {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') [IDLE] Backlog empty. Sleeping..." -ForegroundColor Gray
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

        $promptTemplate = @'
You are the AI Engineering Lead. You MUST solve one issue from the backlog and VERIFY it is committed and closed.

BACKLOG:
{0}

CONTEXT:
- prd.md (Requirements)
- progress.txt (History)

STRICT MANDATE (Definition of Done):
A task is NOT finished until you have executed these SPECIFIC tool calls:
1. TRIAGE: Pick the highest priority issue.
2. IMPLEMENT: Write the code.
3. TEST: Run 'pnpm run test' and ensure it passes.
4. DOCUMENT: Update prd.md (status) and progress.txt (log).
5. COMMIT: Use 'git add .' and 'git commit -m "feat: [title] (closes #[number])"'. 
   - DO NOT JUST TALK ABOUT IT. RUN THE COMMAND.
6. CLOSE: Use 'gh issue close [number] --comment "Implemented and verified."'.
   - DO NOT JUST TALK ABOUT IT. RUN THE COMMAND.

If you fail to run 'git commit' and 'gh issue close', you have FAILED the iteration.

ONLY output <promise>BACKLOG_EMPTY</promise> if the entire list above is resolved.

Execute now.
'@
        $prompt = $promptTemplate -f $backlogText

        Write-Host "$(Get-Date -Format 'HH:mm:ss') [AGENT] Launching Gemini Lead..." -ForegroundColor Green
        $prompt | gemini -y | Tee-Object -FilePath $logFile

        if ((Get-Content $logFile -Raw) -match "<promise>BACKLOG_EMPTY</promise>") {
            Write-Host "`n[COMPLETE] Backlog cleared." -ForegroundColor Cyan
            break
        }
    }
    finally {
        if (Test-Path $backupPath) { Move-Item $backupPath $settingsPath -Force }
    }

    Write-Host "`n$(Get-Date -Format 'HH:mm:ss') [ITERATION] Cycle finished. Cooling down..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
}
