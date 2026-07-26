# Getting Started

This guide takes you from a fresh checkout to one safe, read-only Caido task.
You do not need to understand TypeScript or MCP internals.

## Before You Begin

You need:

- an Intel Mac where `uname -m` prints `x86_64`;
- Node.js 24 where `node -p process.arch` prints `x64`;
- Corepack and internet access for the one-time dependency installation;
- Caido installed separately and running locally;
- a Caido project with an intentionally configured scope;
- a Caido PAT with the minimum permissions you need;
- Codex, Claude Code, or Cursor; and
- explicit authorization for every system and action you intend to test.

Check the machine:

```bash
uname -m
node --version
node -p process.arch
corepack pnpm --version
```

Expected values are `x86_64`, Node 24 or newer, `x64`, and pnpm `10.28.2`.
If they differ, follow the [Intel macOS guide](06-macos-intel-guide.md).

## Install and Build

Run these commands from the repository root:

```bash
make setup
make build
```

`make setup` installs the exact versions recorded in `pnpm-lock.yaml`.
`make build` creates `packages/mcp-server/dist/cli.js`, the process your AI
client will start. Generated dependencies and build output must not be
committed.

## Run the Doctor

```bash
make doctor
```

The doctor reports `PASS`, `WARN`, or `FAIL` for the runtime, architecture,
package manager, dependencies, build output, safe defaults, credential
presence, local URL, and Caido connection.

- `FAIL` means setup is incomplete; follow the printed `Next:` instruction.
- `WARN` means the integration can start but needs attention.
- A missing credential and a stopped Caido instance are warnings, not crashes.

The doctor checks only whether a credential variable exists. It never prints
the value. Its network probe accepts only loopback HTTP/HTTPS URLs and sends no
target traffic.

## Provide the Credential Safely

Use `CAIDO_PAT` through your AI client's private environment or secret manager.
Do not paste the PAT into this guide's commands, a configuration committed to
Git, a prompt, terminal history, an issue, or a screenshot.

The server also accepts `CAIDO_TOKEN` as a fallback. The default owner-only
token cache and audit log are:

```text
~/Library/Application Support/caido-agent-kit/tokens.json
~/Library/Application Support/caido-agent-kit/audit.jsonl
```

Do not loosen their permissions. If a credential may have leaked, revoke it in
Caido and create a replacement before continuing.

## Connect Your AI Client

Print the template for your client:

```bash
make config CLIENT=codex
make config CLIENT=claude
make config CLIENT=cursor
```

Run only the command you need. The helper resolves the current Node executable
and repository path, including paths with spaces. It prints configuration for
manual review and never modifies your user files.

Copy the result to the location shown in
[Client Configuration](09-client-configuration.md). Ensure `CAIDO_PAT` is a
variable reference, not a literal value. Restart the client and inspect its MCP
status.

Install the complete Skill directory in the location supported by your client:

```bash
node skills/caido-operator/scripts/verify-skill.mjs
```

Copy or link `skills/caido-operator`, not only `SKILL.md`; its `references`,
`assets`, and `scripts` directories are required.

## Your First Read-Only Task

Start Caido, select the intended project, review its scope, then ask:

> Check the Caido connection. Show the current project and configured scopes.
> Do not send target traffic and do not change anything.

The response should separate:

```text
Objective:
Scope:
Evidence:
Observation:
Limitations:
Recommended Next Step:
```

You should see evidence identifiers or bounded metadata, not credentials or
unredacted sensitive headers. A connection or authentication error is not a
finding; follow the safe recovery step and retry only the read operation.

Continue with the [practical examples](examples.md) after this succeeds.

## Active Mode

Active mode can select projects, create or update findings, toggle Intercept,
and perform a bounded Replay or raw request. It is not a scanner or autonomous
exploitation mode.

Before enabling it, confirm all of the following:

1. You have explicit authorization for the asset, identity, technique, time,
   and effect.
2. The correct Caido project and scope are selected.
3. `CAIDO_REQUIRE_SCOPE=true`.
4. The intended mutation is specific and bounded.
5. Your AI client will ask before active tool calls; auto-run is disabled.

Then change `CAIDO_AGENT_MODE` to `active` in the private client environment
and restart the client. The operator skill must still check health, project,
scope, and the exact destination before outbound traffic. Never automatically
retry an active operation after a timeout or ambiguous result.

Return to `read-only` when the bounded task is finished.

## Update

Review [CHANGELOG.md](../CHANGELOG.md) and the
[release checklist](release-checklist.md), then:

```bash
git pull --ff-only
make setup
make build
make doctor
```

Regenerate your client configuration if Node or the repository path changed.

## Uninstall

1. Remove the Caido Agent Kit entry from your AI client configuration.
2. Remove the installed `caido-operator` Skill directory or symlink.
3. Stop processes using `packages/mcp-server/dist/cli.js`.
4. Revoke the Caido PAT if it was created only for this integration.
5. Review and remove the token cache and audit log only if your retention policy
   permits it.
6. Delete the repository checkout.

Removing the repository does not remove Caido, its projects, findings, or
captured traffic.
