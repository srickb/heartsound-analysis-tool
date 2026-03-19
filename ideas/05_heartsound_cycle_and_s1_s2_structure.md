# Heartsound Cycle and S1/S2 Structure

## Purpose

This document explains how the current Tool defines HeartSound cycles and how it
derives usable S1 and S2 event regions from RS-score channels.

This is one of the most important structural categories in the product because
many downstream features depend on it.

## Scope

This category covers:

- S1 and S2 area construction
- peak pairing logic
- overlap handling
- cycle validity rules
- cycle indexing
- panel cycle selection semantics

This category does not cover:

- parameter formulas themselves
- wave playback
- export formatting

## Input Signals Used for Boundary Logic

The HeartSound data model includes RS-score channels that act as boundary
signals:

- `S1-Start_RS_Score`
- `S1-End_RS_Score`
- `S2-Start_RS_Score`
- `S2-End_RS_Score`

These are used together with the amplitude signal to construct the event
structure of each record.

## S1 and S2 Region Construction

The current implementation builds event regions by:

1. extracting threshold-based peak candidates from start and end RS-score series
2. pairing start peaks with end peaks of the same sound type
3. discarding invalid or excessively wide pairings
4. constructing an interval overlay using the selected start and end peaks

This results in:

- `S1` overlays
- `S2` overlays

Each overlay contains:

- start peak
- end peak
- area start
- area end

## Threshold and Pairing Behavior

The event logic is not based on arbitrary nearest-neighbor pairing alone.

It also considers:

- region ordering
- spacing constraints
- maximum width relative to cycle spacing

This helps reject unrealistic intervals.

## Overlap Resolution

S1 and S2 candidates can become visually or logically ambiguous.

To reduce this problem, the current implementation resolves overlap conflicts.

High-level rule:

- if overlapping regions compete, stronger evidence is preferred

This prevents obviously conflicting S1/S2 intervals from surviving together.

## Current Cycle Definition

The current cycle rule is:

- cycle `n` starts at `S1 start` of cycle `n`
- cycle `n` ends immediately before `S1 start` of cycle `n+1`

Operationally, this means:

- current cycle span = `current S1 start -> next S1 start`

This is the cycle definition used by:

- cycle navigation
- parameter grouping
- HR calculation
- graph cycle highlight

## Valid Cycle Ordering Rule

A cycle is considered valid only when the following order holds:

- `S1 start < S1 end < S2 start < S2 end < next S1 start`

This ordering rule is fundamental.

It prevents malformed cycles from being treated as analyzable beats.

## S2 Matching Rule

Within a cycle:

- S2 must occur after the current S1 end
- S2 must occur before the next S1 start
- the selected S2 must preserve the valid ordering rule

This means S2 is not chosen independently of cycle context.

## Cycle Indexing

Cycles are assigned explicit cycle numbers in order.

The numbering is based on the sorted valid S1 sequence.

This cycle index is then used in:

- the parameter window
- cycle stepping controls
- exported parameter rows
- graph-linked interactions

## Cycle Visibility in the UI

The UI currently supports:

- selecting a cycle by stepping left/right
- seeing the selected cycle index
- viewing the highlighted sample range of that cycle
- automatically moving the graph viewport when the selected cycle is outside the
  visible range

This makes cycle review deterministic and navigable.

## Importance to the Product

This category underpins:

- S1 parameter extraction
- S2 parameter extraction
- S1-S2 gap parameter extraction
- S2-S1 gap parameter extraction
- HR calculation
- parameter export
- parameter-to-graph annotation

If cycle structure breaks, nearly the entire HeartSound review layer becomes
unreliable.

## Design Intent

The current design intentionally favors:

- strict beat ordering
- explicit cycle validity
- interpretability over permissive matching

This is important because downstream metrics need stable anchors.

## Core Files

Representative files in this category include:

- `backend/app/services/plot_data_service.py`
- `frontend/src/App.tsx`

## Future Expansion Notes

Possible next steps:

- more explicit cycle validity diagnostics in the UI
- user-visible rejected-cycle explanations
- cycle confidence scoring
- optional manual correction workflows

## Summary

The current HeartSound cycle and S1/S2 structure defines the temporal backbone
of the Tool.

It determines:

- where each sound begins and ends
- which cycles are valid
- how beats are indexed
- how all major downstream HeartSound analysis is anchored
