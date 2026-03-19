# Wave Playback Structure

## Purpose

This document explains how wave playback is attached to a panel and how audio
playback interacts with the graph.

Wave playback is not a standalone media feature.
It is a synchronized review aid for the active HeartSound panel.

## Scope

This category covers:

- wave file linking
- playback controls
- playhead behavior
- drag interaction
- viewport synchronization
- speed control
- reset/end behavior

This category does not cover:

- upload registry details
- parameter extraction formulas
- share/auth runtime

## Wave as a Panel-Linked Resource

A wave file is linked to a panel rather than globally opened.

This means:

- each panel can have its own wave context
- playback controls act on the panel’s linked wave
- the graph and audio relationship is panel-specific

## Playback Control Set

The current playback control group includes:

- jump back 5 seconds
- play / pause
- jump forward 5 seconds
- reset to 0 seconds
- slow playback speed control

These controls are placed in the panel header and are intended to be quick,
high-frequency review tools.

## Play / Pause Behavior

The central play control changes icon depending on state.

Behavior:

- when stopped, it shows play
- when playing, it shows pause

This mirrors familiar media-control interaction patterns.

## Jump Controls

### `-5 sec`

Moves the current playback position backward by five seconds.

### `+5 sec`

Moves the current playback position forward by five seconds.

### Reset

Resets playback to the beginning of the linked wave.

Important current behavior:

- graph position also follows reset behavior

## Speed Control

The playback speed control currently emphasizes slower-than-normal review.

The current design focuses on:

- normal speed
- slower stepped playback modes

This is useful for acoustic detail inspection.

## Playhead

The graph displays a playhead corresponding to the current audio time.

The playhead is rendered as:

- vertical bar
- circular handle at the top

This creates a clear visual marker for the active playback position.

## Drag Interaction

The playhead handle can be dragged by the user.

This means:

- the graph is not just passively following audio
- the user can scrub audio directly from the waveform context

Dragging updates the audio position and the graph state together.

## Graph Synchronization

The wave system is tightly coupled to the graph viewport.

Current synchronization behaviors include:

- playback updates the playhead position on the graph
- stepping controls move the graph when necessary
- reset moves both audio and graph back to the start
- if the playhead exits the visible range, the graph can advance

This makes wave review spatially meaningful.

## End-of-Playback Behavior

When playback reaches the end:

- the audio returns to the beginning
- the graph is also restored to the initial viewing region

This keeps the visual state consistent with playback state.

## Current Design Goal

Wave playback is designed as:

- a review synchronization feature
- not a generic media player

The product intent is to let the user hear what is being visually analyzed.

## Relation to Heartsound Review

Wave playback is especially valuable because it creates direct alignment between:

- the plotted signal
- the cycle structure
- the area overlays
- the parameter interpretation workflow

This is one of the most distinctive parts of the current Tool.

## Core Files

Representative files in this category include:

- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- `backend/app/main.py`

## Future Expansion Notes

Possible next steps:

- waveform/audio bidirectional snapping
- exact time readout display
- cue points
- repeat segment playback
- export of reviewed playback ranges

## Summary

The current wave playback structure turns the graph into an audio-synchronized
inspection surface.

It provides:

- panel-specific audio linkage
- transport controls
- draggable playhead review
- graph-aware playback movement

This category is essential for acoustic interpretation workflows.
