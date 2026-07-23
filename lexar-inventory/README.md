# Pexar Work Hub

Pexar internal automation skills for Claude Code.

## Skills

### lexar-inventory

Lexar customer inventory and sales weekly report automation.

- **SKILL.md**: Skill definition for Claude Code
- **scripts/process_weekly.py**: Data processing script that reads from Feishu and generates upload files

#### Usage

Trigger in Claude Code by saying "update inventory", "upload sales data", etc.

#### Scheduled Task

A companion scheduled task `lexar-weekly-inventory` runs every Monday at 13:00 to auto-process data and send Lark notifications.
