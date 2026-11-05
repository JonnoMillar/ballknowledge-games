# Starts the photo pipeline watchdog at every logon, so a reboot does not stop the jobs for good.
#
#   powershell -ExecutionPolicy Bypass -File scripts\photos\ops\install-task.ps1 [-Remove]
#
# One Task Scheduler task for the current user, "BallKnowledgePhotoPipeline": at logon, run
# .scratch\photo-all\watchdog.py hidden. It changes nothing else on the machine. -Remove deletes it.
# Not installed unless Jonno says yes (docs/photo-pipeline.md).
param([switch]$Remove)

$name = 'BallKnowledgePhotoPipeline'
if ($Remove) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    "removed ${name}"
    return
}

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$dir = Join-Path $repo '.scratch\photo-all'
$python = (Get-Command python.exe).Source
if (-not (Test-Path (Join-Path $dir 'watchdog.py'))) { throw "copy scripts\photos\ops\*.py into $dir first" }

$action = New-ScheduledTaskAction -Execute $python -Argument "-X utf8 `"$dir\watchdog.py`"" -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -Hidden
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description 'Photo pipeline watchdog (candidates and cutouts), see docs/photo-pipeline.md' -RunLevel Limited | Out-Null
"installed ${name}, runs at logon for $env:USERNAME"
