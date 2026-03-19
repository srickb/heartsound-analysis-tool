# Panel and Layout Structure

## Purpose

This document describes the visual and structural layout model of the Tool.

The panel system is one of the core architectural concepts of the application.
It defines how users compare cases, bind files, inspect plots, and open the
parameter window.

## Scope

This category covers:

- one-panel and two-panel modes
- panel identity
- header actions
- chart/parameter split layout
- per-panel linked state
- panel reset behavior

This category does not cover:

- the analytical meaning of parameter values
- S1/S2 detection formulas
- wave timing formulas

## Core Layout Model

The current application layout is divided into two major areas:

- left sidebar
- right analysis area

Within the analysis area, the product supports:

- `1 Panel`
- `2 Panels`

This makes the panel the central unit of inspection.

## Panel Identity

Each panel has its own state and identity.

A panel can independently hold:

- a primary data file
- a linked wave file
- a linked parameter source
- a linked unsupervised file
- its own current graph range
- its own selected cycle
- its own selected parameter metric

This means panels are not merely duplicated visuals.
They are independent review contexts.

## Supported Review Modes

### Single-Panel Mode

Single-panel mode is optimized for:

- focused review
- detailed inspection
- parameter-driven exploration
- audio-linked investigation

### Two-Panel Mode

Two-panel mode is optimized for:

- case comparison
- left/right variation review
- cross-file analysis
- feature comparison under the same UI rules

## Panel Header Structure

Each analysis panel has a header area that exposes several controls.

Current major elements include:

- panel title and linked file name
- linked wave information
- `Default` button
- `Detail` button
- parameter window toggle
- settings button
- reset button
- wave playback controls in the central header area

This header is not purely decorative.
It is the main command surface for the active panel.

## `Default` Button

The `Default` button restores the default visualization state for the panel.

Its purpose is to give the user a quick reset path when:

- too many series have been toggled
- the graph becomes visually noisy
- a known starting configuration is needed

## `Detail` Button

The `Detail` button opens the series-selection modal.

Its purpose is to allow:

- fine-grained control over visible overlays and score channels
- restoration through the `All` toggle or the default-state path

This panel-level modal is part of the current review workflow.

## Parameter Toggle

The parameter window can be shown or hidden per panel.

This means the panel supports at least two inspection modes:

- graph-only emphasis
- graph + parameter interpretation

The toggle is intentionally lightweight because users frequently switch between
these two review modes.

## Settings and Reset

### Settings

The panel settings control is used for per-panel visualization and auxiliary
configuration.

### Reset

The reset control restores the panel’s assigned analysis context.
It is designed to recover from accumulated exploratory state.

## Graph and Parameter Split

Inside a panel, the lower content area is vertically divided into:

- graph area
- parameter window

These are separated by a draggable resize handle.

### Current Behavior

When the parameter window is visible:

- the user can drag the split handle
- the chart and parameter areas resize dynamically

This allows:

- more graph space for wave-following review
- more parameter space for metric comparison

## Current Split Design Intent

The split system supports two very different use styles:

- waveform-centric review
- metric-centric review

It avoids forcing one fixed ratio for all sessions.

## Per-Panel State Isolation

A key design principle of the panel system is state isolation.

What this means:

- changing one panel does not automatically mutate the other
- file bindings are panel-specific
- cycle selection is panel-specific
- graph viewport is panel-specific
- wave playback context is panel-specific

This is necessary for meaningful side-by-side comparison.

## Active Panel Concept

The application tracks an active panel concept for interactions that depend on
current focus.

Examples include:

- assigning a sidebar file to the intended panel
- opening modal actions for the correct panel
- keyboard-driven actions tied to the current review target

## Range Awareness

Each panel maintains its own visible row range.

This is important because:

- graph rendering depends on current range
- cycle visibility depends on current range
- parameter-linked annotations depend on current range
- wave playback viewport behavior depends on current range

## Layout Stability

The current layout prioritizes:

- consistent placement of core controls
- stable panel header organization
- predictable graph/parameter separation

This is especially important because the Tool is used interactively rather than
as a static dashboard.

## Core Files

Representative files in this category include:

- `frontend/src/App.tsx`
- `frontend/src/styles.css`

## Future Expansion Notes

Possible future enhancements:

- panel presets
- detachable comparison modes
- saved per-panel views
- panel-specific note widgets
- more advanced multi-panel synchronization

## Summary

The current panel and layout structure gives the product its working shape.

It combines:

- independent analysis panels
- a consistent action header
- flexible graph/parameter resizing
- panel-level file context

This category is the UI container layer for almost every other major feature.
