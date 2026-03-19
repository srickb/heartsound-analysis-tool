# Graph and Visualization Structure

## Purpose

This document describes how the Tool presents signal data visually.

The graph is the main analysis surface of the product.
It combines raw signal display, overlays, cycle highlighting, parameter-linked
annotations, and audio-synchronized playback state.

## Scope

This category covers:

- plotted signal layers
- default graph visibility
- detail modal series control
- overlay rendering
- legend behavior
- cycle highlight rendering
- parameter-linked measurement annotation

This category does not cover:

- file upload logic
- parameter formulas
- auth/share behavior

## Core Graph Model

The Tool renders a primary graph per panel.

For HeartSound, the graph is built around:

- amplitude waveform
- RS-score-derived overlays
- candidate highlights
- playback-linked playhead

For ECG, the graph has a different marker structure, but the graph container
model remains similar.

## Default Visible Layers

For the HeartSound workspace, the current default visible state prioritizes a
clean review setup.

The baseline visual configuration includes:

- `Amplitude`
- `S1 Area`
- `S2 Area`
- `Parameter` window enabled

This is meant to reduce clutter while keeping the most clinically useful timing
structure visible.

## Detail Modal

Additional visual layers are controlled through the `Detail` modal.

This modal acts as the series management interface.

It currently supports:

- turning individual layers on or off
- `All` selection at the top
- restoring default state through the panel-level `Default` action

## Series Visibility Philosophy

The graph tries to separate:

- essential context
- optional detail

This matters because Heartsound review becomes unreadable when too many score
channels and overlays are shown at the same time.

## S1/S2 Area Overlays

The graph currently displays:

- `S1 Area`
- `S2 Area`

These are rendered as semi-transparent interval overlays corresponding to the
detected S1 and S2 sound regions.

Their role is to provide:

- beat-structure context
- parameter anchor visibility
- cycle interpretation support

## S3/S4 Candidate Overlays

The graph also supports candidate-level extra markings for:

- `S3`
- `S4`

These are not definitive labels.
They are visual candidate regions intended for exploratory review.

Current rendering intent:

- clearly distinguishable from S1/S2
- high-visibility highlighting
- separate toggle behavior through series controls

## Cycle Highlight Overlay

When cycle highlighting is enabled, the selected cycle is also rendered on the
graph.

Its role is to show:

- which exact cycle the parameter window is currently describing
- how the selected cycle aligns with the visible signal range

This is critical for connecting metric interpretation to the waveform.

## Parameter-Driven Annotation Layer

When a parameter card is clicked, the graph displays an annotation showing where
that metric came from.

Examples:

- S1 metrics highlight the S1 segment
- S2 metrics highlight the S2 segment
- S1-S2 metrics highlight the S1 end to S2 start gap
- S2-S1 metrics highlight the S2 end to next S1 start gap
- HR highlights the current cycle span
- RS peak metrics show event points
- RS width metrics show the contiguous half-height region

This turns the parameter area into an interactive explainer rather than a static
table.

## Legend Behavior

The graph includes a compact legend-like explanation area in the upper-right
corner.

Current legend design principles:

- only show what is currently relevant
- avoid listing everything all the time
- do not repeat unnecessary entries

This helps preserve space for the actual waveform.

## Navigator and Viewport

The graph works within a visible range window rather than always showing the
entire record at once.

This allows:

- detailed local inspection
- manageable performance on large records
- playback-linked viewport transitions

The current view range is shown in the UI as row boundaries.

## Graph Navigation

Users can move through the graph using:

- panel range controls
- keyboard shortcuts
- cycle selection
- playback controls

The viewport is not static.
It responds to interaction context.

## Design Goals

The current graph structure is designed to balance:

- signal readability
- clinical/event interpretability
- interactivity
- performance

It is intentionally more review-oriented than purely presentation-oriented.

## Core Files

Representative files in this category include:

- `frontend/src/App.tsx`
- `frontend/src/styles.css`

## Future Expansion Notes

Potential future work:

- denser legend customization
- pinned annotations
- waveform bookmarks
- more advanced cycle comparison overlays
- optional mini-map / overview control refinement

## Summary

The graph structure is the visual analysis engine of the Tool.

It combines:

- raw signal presentation
- event-area overlays
- candidate highlighting
- parameter-linked explanations
- viewport-aware interaction

This is the category that most directly turns computed logic into interpretable
visual review.
