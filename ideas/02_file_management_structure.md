# File Management Structure

## Purpose

This document describes how files are organized, uploaded, identified, linked,
and consumed inside the Tool.

The goal of this category is to document the current file-role model that drives
the rest of the application.

## Scope

This category covers:

- file roles
- upload entry points
- role-specific behavior
- sidebar organization
- panel assignment rules
- auto-linking rules
- metadata handling

This category does not cover:

- signal analysis formulas
- graph rendering behavior
- parameter card design
- wave playback controls

## Core File Role Model

The current Tool distinguishes files by role.

The active roles are:

- `Data`
- `Wave`
- `Parameter`
- `Unsupervised`

Each role exists for a different functional purpose.

## 1. Data

### Purpose

`Data` is the primary analytical input.

For HeartSound:

- `Data` contains the signal used for plotting
- it contains RS-score columns used for S1/S2 event logic
- it is the current source of derived parameter computation

For ECG:

- `Data` contains the raw signal and marker channels required for ECG plots

### HeartSound Data Expectations

HeartSound data files are expected to include columns such as:

- `Amplitude`
- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

These columns drive both visualization and downstream cycle/parameter logic.

## 2. Wave

### Purpose

`Wave` is the audio role.

It is used to:

- attach a `.wav` file to a panel
- support playback controls
- synchronize playback position with the graph

### Accepted Format

The current implementation treats `Wave` as a `.wav` upload role.

### Current UX Model

Users do not upload wave files into the graph directly.
Instead:

- `Wave` files are listed in the sidebar
- a file can be linked to a panel
- playback controls activate when the panel has a linked wave source

## 3. Parameter

### Current Role in the Product

The `Parameter` role still exists in the file model, but its meaning differs by
workspace.

For ECG:

- parameter files remain a direct uploaded input

For HeartSound:

- current derived parameter display is centered on `Data`
- the application calculates parameter values directly from the HeartSound data

This means the role still exists structurally, but HeartSound no longer depends
on uploaded parameter files for the main parameter window.

## 4. Unsupervised

### Purpose

`Unsupervised` files provide auxiliary analytical context.

They are used to:

- link cluster-like or auxiliary summary information to a panel
- support additional highlight and comparison workflows

This role remains separate from the core parameter pipeline.

## Sidebar Structure

The left sidebar is the main file management surface.

It is organized by:

- currently selected workspace
- currently selected file role
- upload action buttons
- searchable file list

The user flow is:

1. choose workspace
2. choose file role
3. upload files or inspect uploaded files
4. click a file to assign or link it to a panel

## File List Metadata

Each file item exposes metadata appropriate to its role.

Examples:

- `rows 57984` for tabular data files
- `WAV` or extension-specific metadata for wave files

This helps the user quickly distinguish analysis sources from audio sources.

## Upload Paths and Accepted Types

Current upload patterns:

- tabular roles use `.csv` and `.xlsx`
- wave role uses `.wav`

The UI also distinguishes between:

- single file upload
- folder upload

## Panel Assignment Model

Files are not globally activated.
They are panel-linked.

This means:

- a `Data` file is assigned to a specific panel
- `Wave`, `Parameter`, and `Unsupervised` can be linked to that same panel
- different panels can hold different analysis contexts

This is important for side-by-side comparison mode.

## Auto-Linking Rules

The product includes automatic linking behavior for compatible files.

Current role pairing includes:

- `Data` -> matching `Wave`
- `Data` -> matching linked analysis files where naming rules permit

The auto-linking logic relies on filename normalization.

For HeartSound, the current behavior is built around identifiers such as:

- record number
- valve/location token

Example pattern:

- `85252_PV_RS_Score.xlsx`
- `85252_PV.wav`

These share the same sync key and are treated as corresponding resources.

## Workspace Awareness

File behavior is workspace-specific.

HeartSound and ECG do not share identical expectations.

The current file model adapts to:

- different column schemas
- different role meaning
- different downstream consumers

## Metadata and Backend Registry

Uploaded files are registered with metadata such as:

- `fileId`
- original name
- stored name
- workspace kind
- file role
- extension
- row count
- upload timestamp

This registry is what powers:

- file listing
- plot data lookup
- parameter summary lookup
- export lookup
- wave content serving

## Deletion Surface

The sidebar includes a `Delete Files` action.

This means file management is not only additive.
The user can also remove uploaded assets through the current UI.

## Design Intent

The current file-management model is designed for:

- multi-source research workflows
- reproducible panel linkage
- mixed signal and audio review
- low-friction switching between cases

It is intentionally more explicit than a hidden background loader.

## Current Constraints

This system assumes:

- uploaded files conform to the expected schema per role
- name-based auto-linking is strong enough for current datasets
- a panel is the fundamental unit of file context

## Future Expansion Notes

This category could later support:

- richer folder semantics
- batch case grouping
- derived-file provenance
- validation previews before upload
- stronger mismatch warnings

## Summary

The current file-management structure is a role-based, panel-linked, workspace-
aware system that organizes all analytical inputs into a consistent operating
model.

It is the data-ingestion layer that feeds plotting, audio playback, parameter
generation, export, and auxiliary analysis.
