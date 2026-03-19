# S3 and S4 Candidate Structure

## Purpose

This document explains how the Tool currently treats S3 and S4 as candidate
events rather than definitive diagnostic labels.

The emphasis of this category is exploratory detection and visual highlighting.

## Scope

This category covers:

- candidate concept
- timing windows
- amplitude-driven candidate logic
- relation to the S1/S2 cycle structure
- graph rendering behavior
- visibility control

This category does not cover:

- final pathology classification
- user-authored annotation workflows
- external ML prediction systems

## Conceptual Role

The current Tool does not claim to diagnose S3 or S4 with certainty.

Instead, it identifies:

- `S3 candidate`
- `S4 candidate`

These candidates are intended to answer:

- where an additional low-amplitude event might exist relative to the current
  cycle structure

## Temporal Placement Rule

The current conceptual model is:

- `S3` belongs just after `S2`
- `S4` belongs just before the next `S1`

This makes S3/S4 dependent on the already constructed cycle.

They are not searched over the entire record blindly.

## Candidate Windows

The current implementation uses cycle-aware windows.

High-level intent:

- `S3`: early diastolic candidate region after `S2`
- `S4`: late diastolic candidate region before the next `S1`

These windows are deliberately constrained so the candidate search stays tied to
physiologic position rather than arbitrary amplitude fluctuation.

## Signal Basis

The candidate logic is driven primarily by amplitude behavior.

It does not currently depend on:

- ECG-confirmed timing
- expert labels
- pathology-grade adjudication

The method is deliberately lightweight and review-oriented.

## Current Detection Philosophy

The current product interprets S3/S4 as:

- low-confidence exploratory candidates
- useful visual hypotheses
- signals worthy of further inspection

This allows the Tool to surface potentially meaningful regions without
overstating certainty.

## Rendering Style

S3 and S4 are visually distinct from S1 and S2.

Their purpose in the graph is to:

- attract reviewer attention
- remain visibly separate from the primary heart sounds
- support quick toggling on and off

The rendering style is intentionally more alert-like than the normal sound-area
overlay style.

## Interaction with Other Overlays

S3/S4 are secondary overlays.

They are layered on top of a graph that already contains:

- amplitude
- S1 area
- S2 area
- cycle highlight
- parameter annotations

This means their color and shape strategy must avoid confusion with the primary
sound structure.

## Toggle Behavior

The current visualization model allows S3/S4 visibility to be controlled through
the series-selection path.

This reflects an important design assumption:

- not every user wants candidate overlays visible all the time

## Relation to Parameter Logic

At present, S3/S4 are visualization-driven candidate features.

They are not currently part of the main parameter set exported in the
HeartSound parameter sheet.

This separation is useful because:

- the main parameter set is currently designed around stable cycle anchors
- S3/S4 are still exploratory

## Design Intent

The S3/S4 category exists to provide:

- structured exploratory guidance
- visually clear secondary event candidates
- future extension space for pathology-oriented review

It is not yet intended as a final clinical reporting layer.

## Core Files

Representative files in this category include:

- `frontend/src/App.tsx`
- `backend/app/services/plot_data_service.py`

## Future Expansion Notes

Possible future work:

- candidate confidence scoring
- parameterization of S3/S4 waveform features
- export of candidate intervals
- user confirmation workflows
- supervised follow-up validation

## Summary

The current S3/S4 structure is an exploratory candidate layer built on top of
cycle-aware HeartSound timing.

Its purpose is to help the user notice suspicious additional events while
keeping them visually and conceptually distinct from confirmed S1/S2 structure.
