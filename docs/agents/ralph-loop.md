# Ralph Loop

The Ralph Loop is an autonomous workflow for processing GitHub issues. It is named after the principle of "persistently naive" agents that start each task with a fresh context to avoid context rot and maintain high reasoning quality.

## How it Works

The loop is orchestrated by a PowerShell script (`scripts/ralph-loop.ps1`) that performs the following steps:

1.  **Polls GitHub Issues**: It looks for open issues with the `ready-for-agent` label.
2.  **Invokes the Agent**: For each issue, it spawns a fresh instance of the Gemini CLI in **Headless Mode** with **YOLO Approval Mode**.
3.  **Autonomous Execution**: The agent follows a strict set of instructions to:
    -   Research and plan the solution.
    -   Implement the changes.
    -   Verify the work with tests (`pnpm run test`).
    -   Commit the changes with a reference to the issue.
    -   Close the issue with a summary comment.
4.  **Repeats**: The loop continues until stopped or no more issues are found.

## Prerequisites

- **GitHub CLI (`gh`)**: Must be installed and authenticated.
- **Gemini CLI**: Must be installed and available in the PATH.
- **pnpm**: Used for dependency management and running tests.

## Usage

To start the Ralph Loop, run the following command in PowerShell from the project root:

```powershell
.\scripts\ralph-loop.ps1
```

### Options

- `-Label`: The label to filter issues by (default: `ready-for-agent`).
- `-PollInterval`: The time in seconds to wait between polling (default: `60`).
- `-MaxTurns`: The maximum number of turns (actions) the agent can take per issue (default: `30`).

Example:
```powershell
.\scripts\ralph-loop.ps1 -Label "bug" -PollInterval 30 -MaxTurns 50
```

## Security & Safety

- **YOLO Mode**: The agent runs with `--approval-mode yolo`, meaning it will execute shell commands and modify files without manual confirmation. Use only in trusted environments.
- **Rate Limits**: The loop manages the `maxTurns` limit by temporarily modifying `.gemini/settings.json` during execution and restoring it afterwards. This ensures each task respects the limit set in the script without requiring manual configuration.
