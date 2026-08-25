# ElevenLabs agent configs (local only — not committed)

Managed with the ElevenLabs CLI (`@elevenlabs/cli`, installed globally).

## Why this is gitignored

`agent_configs/*.json` is a verbatim dump of the live agent, and it contains
live secrets — the RAZ booking webhook sends `x-raz-secret`, which authenticates
calls to the `raz-booking` Supabase function. Committing the pull would publish
that key. Everything here stays local until the secrets are moved out of the
agent config (see "Making this committable" below).

## Setup

The CLI reads `ELEVENLABS_API_KEY` from the environment. The repo keeps it in
`../.env`, so from this directory:

```powershell
$env:ELEVENLABS_API_KEY = (Select-String -Path ..\.env -Pattern '^ELEVENLABS_API_KEY=(.+)$').Matches.Groups[1].Value.Trim()
```

`elevenlabs agents init .` has already been run; don't re-run it with
`--override` or it will discard the local configs.

## Pulling the current live config

```powershell
cmd /c "echo y| elevenlabs agents pull --agent agent_7501kzx1z7xaekxbegasw7cpqs7n --all"
```

The `cmd /c "echo y| ..."` wrapper is needed because the CLI asks "Proceed?"
on stdin via readline, and piping through PowerShell alone does not reach it.

## Pushing — read this first

`elevenlabs agents push` overwrites the live agent that clients are talking to.
Always dry-run, and diff against a fresh pull, before pushing:

```powershell
elevenlabs agents push --dry-run
```

Known hazard: a pulled config carries both `tool_ids` and inline `tools`. The
REST API rejects receiving both ("Cannot specify both tools and tool IDs"), so
a push may fail or need one of them stripped. This has not been verified
against a real push yet — treat the first push as risky and have a fresh pull
saved as a rollback.

## What this replaces

`scripts/raz-fix-end-edges.cjs` and `scripts/raz-restore.cjs` patch the live
agent directly over REST. They still work and remain the tested path. The CLI
is here so drift is visible as a file diff instead of being discovered in a
client meeting — the agent's voice has silently changed twice, once mid-demo.

To see drift: pull, then `git diff` (once committable) or compare against a
known-good copy.

## Making this committable

Move `x-raz-secret` out of the agent config — ElevenLabs supports workspace
secrets referenced from tool headers rather than inlined values. Once no live
secret remains in the dump, drop `elevenlabs/` from `.gitignore` so the config
is version-controlled and drift shows up in review.
