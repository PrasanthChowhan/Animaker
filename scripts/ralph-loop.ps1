# Ralph Loop Orchestrator for Animaker (AI-Driven & Noisy)
# This script polls for issues, lets the AI triage, and provides detailed terminal feedback.

param (
    [string]$Label = "ready-for-agent",
    [int]$PollInterval = 60,
    [int]$MaxTurns = 45,
    [int]$Iterations = 999
)

Write-Host "`n[SYSTEM] Ralph Loop initialized. Press Ctrl+C to terminate." -ForegroundColor Cyan
Write-Host "[CONFIG] Polling label: $Label | MaxTurns: $MaxTurns" -ForegroundColor Gray

$settingsPath = ".gemini/settings.json"
$backupPath = ".gemini/settings.json.bak"
$prdFile = "prd.md"
$progressFile = "progress.txt"
$logFile = "ralph-agent.log"

for ($i = 1; $i -le $Iterations; $i++) {
    Write-Host "`n$(Get-Date -Format 'HH:mm:ss') [POLL] Checking GitHub for '$Label' issues..." -ForegroundColor Yellow
    
    # 1. Fetch ALL open issues with the label
    $issuesJson = gh issue list --label $Label --state open --json number,title,body
    $issues = $issuesJson | ConvertFrom-Json
    
    if (-not $issues -or $issues.Count -eq 0) {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') [IDLE] No issues found. Waiting $PollInterval seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds $PollInterval
        continue
    }

    Write-Host "`n==================================================" -ForegroundColor Magenta
    Write-Host " ITERATION $i | BACKLOG: $($issues.Count) ISSUES" -ForegroundColor Magenta
    Write-Host "==================================================" -ForegroundColor Magenta
    
    foreach ($issue in $issues) {
        Write-Host "  #$($issue.number) - $($issue.title)" -ForegroundColor White
    }
    Write-Host "--------------------------------------------------" -ForegroundColor Magenta

    # 2. Setup temporary turn limit
    if (Test-Path $settingsPath) {
        Copy-Item $settingsPath $backupPath -Force
        $settingsJson = Get-Content $settingsPath -Raw | ConvertFrom-Json
        if ($settingsJson.PSObject.Properties['maxTurns']) { $settingsJson.maxTurns = $MaxTurns } 
        else { $settingsJson | Add-Member -MemberType NoteProperty -Name "maxTurns" -Value $MaxTurns }
        $settingsJson | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
    }

    try {
        $backlogText = ""
        foreach ($issue in $issues) { $backlogText += "ISSUE #$($issue.number): $($issue.title)`nBODY: $($issue.body)`n`n" }

        # 3. Prepare the prompt (Instructions for "Noisy" behavior)
        $promptTemplate = @'
You are the AI Engineering Lead in an autonomous Ralph Loop. 

BACKLOG:
{0}

CONTEXT:
- prd.md (Requirements)
- progress.txt (History)

MISSION:
1. TRIAGE & ANNOUNCE: Look at the backlog. Choose the most important task. Explain your choice clearly.
2. IMPLEMENT: Solve the task surgically.
3. VERIFY: Run 'pnpm run test'.
4. DOCUMENT: Update prd.md and progress.txt.
5. COMMIT & CLOSE: Close the issue and commit.

IMPORTANT: BE NOISY.
- Output your progress frequently so the user knows you are working.
- If you hit a turn limit or get stuck, explain why before exiting.
- If the PRD is 100% complete, output: <promise>COMPLETE</promise>

Execute now.
'@
        $prompt = $promptTemplate -f $backlogText

        # 4. Invoke Gemini with Live Feedback
        Write-Host "$(Get-Date -Format 'HH:mm:ss') [AGENT] Launching Gemini Lead..." -ForegroundColor Green
        # We pipe to Tee-Object so it shows in terminal AND saves to a log file
        $prompt | gemini -y | Tee-Object -FilePath $logFile

        if ((Get-Content $logFile -Raw) -match "<promise>COMPLETE</promise>") {
            Write-Host "`n[COMPLETE] All tasks finished. Exiting." -ForegroundColor Cyan
            break
        }
    }
    finally {
        if (Test-Path $backupPath) { Move-Item $backupPath $settingsPath -Force }
    }

    Write-Host "`n$(Get-Date -Format 'HH:mm:ss') [ITERATION] Finished Issue. Cooling down for 10s..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
}
