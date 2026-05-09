#!/usr/bin/env node
const fs = require('fs');
try {
  const input = JSON.parse(fs.readFileSync(0, 'utf-8'));
  let command = input.tool_input.command;
  if (command.startsWith('npm ')) {
    command = 'pnpm ' + command.substring(4);
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        tool_input: { command }
      }
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }
} catch (err) {
  process.stdout.write(JSON.stringify({}));
}
