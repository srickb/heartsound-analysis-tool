# Execution and Access Structure

## Purpose

This document describes how the Tool is started, stopped, shared, and accessed.
It defines the operational entry points of the current implementation and explains
how local development mode, public sharing mode, and access control work together.

This file focuses on the runtime surface of the product rather than internal
analysis logic.

## Scope

This category covers:

- local development startup
- backend and frontend process lifecycle
- public sharing URL creation
- access mode behavior
- authentication entry states
- operational dependencies and expected runtime status

This category does not cover:

- plot rendering logic
- heartsound parameter extraction
- file upload semantics
- wave playback behavior

## Current Entry Points

The current Tool can be entered through four main shell commands:

- `./start`
- `./stop_dev.sh`
- `./share`
- `./stop_share.sh`

These commands are the primary operational interface for the user.

## Local Development Runtime

### `./start`

`./start` is the standard local launch command.
Its role is to bring up the application stack required for interactive use.

Expected runtime services:

- frontend dev server
- backend API server
- launcher/status supervision layer

User-facing outcome:

- frontend becomes available at `http://127.0.0.1:5173`
- backend becomes available at `http://127.0.0.1:8000`

### `./stop_dev.sh`

`./stop_dev.sh` is the standard local shutdown command.

Its role is to:

- stop the launcher if active
- stop frontend and backend processes managed by the launcher
- leave the workspace in a clean stopped state

### Runtime Status Script

The current implementation also includes a status routine:

- `./scripts/status_dev.sh`

This is used as an operational verification step to confirm that:

- launcher is running
- backend port is listening
- frontend port is listening
- logs exist and are writable

## Public Sharing Runtime

### `./share`

`./share` is the command used to expose the frontend through a public URL.

Current implementation characteristics:

- based on `cloudflared`
- uses a temporary `trycloudflare` tunnel
- exposes the frontend entry URL, not a separate deployment artifact

Expected user-facing outcome:

- a public HTTPS URL is generated
- that URL can be opened outside the local machine

### Automatic Clipboard Copy

The current implementation automatically copies the generated public URL to the
macOS clipboard when `./share` succeeds.

This behavior exists to reduce friction during sharing and testing.

### `./stop_share.sh`

`./stop_share.sh` is the shutdown counterpart for the share tunnel.

Its role is to:

- stop the active `cloudflared` tunnel
- invalidate the current public session
- prevent stale share processes from remaining active

## Access Control Model

The application supports at least two operational access modes:

- `open`
- `code`

### `open`

In `open` mode:

- users enter directly
- the login screen is not shown
- the UI is immediately accessible

This mode is useful for:

- local testing
- live demonstrations
- temporary internal sharing

### `code`

In `code` mode:

- the login screen is shown
- a one-time numeric code is required
- access is mediated through the current code entry flow

This mode is useful for:

- controlled demonstrations
- temporary restricted sharing
- simple session gating without full account management

## Current Authentication Surface

The access state is exposed through the backend public-state endpoint.

Operationally, this means the frontend can determine:

- current access mode
- whether login UI should be shown
- whether admin state exists

The product currently uses lightweight access gating, not a full user account
system.

## Admin Entry

The current UI exposes an `Admin` button in the top status area.

This part of the product is responsible for:

- viewing or changing access-related settings
- controlling mode transitions such as `open` and `code`

The admin surface is configuration-oriented, not content-oriented.

## Operational Dependencies

The current runtime depends on:

- Python backend environment
- frontend Node/Vite environment
- local writable log directories
- `cloudflared` availability for public sharing
- network connectivity for tunnel-based sharing

## Known Runtime Behavior

### Sleep and Sharing

Because the Tool runs on the local Mac:

- if the machine sleeps, local access may remain paused
- public share tunnels may disconnect
- `trycloudflare` links may temporarily fail

This is operationally important for long-running demos.

### 530 Tunnel Errors

The temporary public URL may show:

- `530 The origin has been unregistered from Argo Tunnel`

This usually indicates:

- tunnel interruption
- network instability
- local machine sleep
- tunnel restart or reconnection state

This is a public tunnel lifecycle issue, not necessarily a Tool logic failure.

## Logs and Operational Observability

The current system maintains launcher logs in `.launcher/logs`.

Important runtime log categories include:

- backend log
- frontend log
- share log

These are used to verify:

- server startup
- share URL creation
- reconnect attempts
- process failures

## Core Files

Representative files connected to this category include:

- `scripts/share.sh`
- `scripts/status_dev.sh`
- launcher scripts in the project root
- backend auth/public-state endpoints
- frontend app boot and access-state handling

## Design Intent

The current execution/access structure is optimized for:

- fast local startup
- low-friction demo sharing
- iterative research use
- temporary access gating without deployment overhead

It is not currently optimized for:

- permanent cloud hosting
- multi-user production tenancy
- strong identity management

## Future Expansion Notes

This category can be expanded in the future with:

- persistent hosted deployment
- stable share domains
- stronger auth modes
- role-based access
- reconnect-aware share status UI

## Summary

The current execution and access structure is a local-first runtime model with:

- command-driven startup and shutdown
- optional public sharing through a temporary tunnel
- switchable access gating through `open` and `code` modes
- log-driven operational verification

This is the entry layer of the Tool and forms the basis for all other categories.
