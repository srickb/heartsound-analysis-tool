# Parameter Window and Interaction Structure

## Purpose

This document describes the structure and interaction model of the current
HeartSound parameter window.

The parameter window is not only a display surface.
It is also an explanatory and navigational layer tied to the selected cycle.

## Scope

This category covers:

- parameter window layout
- cycle navigation controls
- HR placement
- parameter card interaction
- tooltip behavior
- graph-linked annotations
- export trigger location

This category does not cover:

- exact parameter formulas
- file upload behavior
- wave control internals

## Parameter Window Role

The parameter window provides a cycle-centered summary of the currently selected
HeartSound beat.

Its current responsibilities are:

- show cycle-specific parameter values
- allow cycle-by-cycle navigation
- explain what each metric represents
- connect a clicked metric back to the graph
- support export of computed parameters

## Placement in the UI

The parameter window lives below the graph inside the panel.

It is visually separate from the graph, but functionally coupled to it.

This is important because:

- the graph supplies the context
- the parameter window supplies the interpretation

## Header Structure

The current parameter window header includes:

- title
- download button
- cycle highlight toggle
- unsupervised toggle
- current row range information

This header acts as the operational command layer for the lower analysis area.

## Cycle Navigation

The current cycle navigation design is a stepper-style control:

- previous cycle button
- current cycle label
- next cycle button

The current cycle is displayed explicitly as:

- `Cycle n`

This is more direct than a dropdown and encourages sequential review.

## Keyboard Support

Cycle navigation also supports:

- `[` for previous cycle
- `]` for next cycle

This makes the parameter window part of the active review workflow rather than a
static summary table.

## Cycle Range Display

Below the cycle stepper, the window shows the currently highlighted sample range.

This gives the user a concrete sense of where the active cycle sits in the
record.

## HR Placement

Heart rate is visually separated from the main parameter cards.

Current behavior:

- HR appears near the cycle control
- it is styled as a highlighted card/badge
- it is treated as cycle-level context rather than just another metric tile

This reflects its importance as a contextual summary value.

## Section Structure

The current Heartsound parameter layout is divided into major categories:

- `S1`
- `S2`
- `S1-S2`
- `RS Score`

`HR` is intentionally outside that grid.

This structure helps the user understand:

- sound-local metrics
- gap-local metrics
- RS-derived metrics
- cycle-level tempo context

## Parameter Cards

Each metric is displayed as a clickable card.

Each card includes:

- metric name
- current value
- unit

This design makes each parameter visually independent and easy to scan.

## Hover Explanation

When the user hovers a parameter card, a compact explanation appears.

Current tooltip content includes:

- parameter title
- short summary
- simple schematic

The tooltip is designed to explain:

- what interval or quantity is being measured
- not to provide a long textbook definition

## Click-to-Annotate Behavior

Clicking a parameter card triggers a graph annotation.

This is one of the most important interaction patterns in the current Tool.

It lets the user move from:

- value

to

- where that value comes from in the waveform

This transforms the parameter window into an interactive measurement browser.

## Download Behavior

The `Download xlsx` button is part of the parameter window rather than the
sidebar.

This placement is deliberate because:

- the export belongs to the currently interpreted parameter state
- the user naturally looks here when reviewing derived values

## Design Intent

The parameter window is designed to be:

- dense but readable
- cycle-specific rather than file-global
- interactive rather than static
- strongly tied to graph review

## Core Files

Representative files in this category include:

- `frontend/src/App.tsx`
- `frontend/src/styles.css`

## Future Expansion Notes

Possible future work:

- metric pinning
- cycle comparison mode
- collapsible parameter sections
- favorite metrics
- annotation persistence

## Summary

The parameter window is the explanatory control center of the HeartSound review
experience.

It combines:

- cycle navigation
- metric display
- hover explanation
- graph-linked measurement feedback
- export access

This category turns computed features into usable reviewer knowledge.
