# Heartsound Parameter Set Structure

## Purpose

This document catalogs the currently implemented HeartSound parameter set as it
appears in the Tool.

Its goal is to describe what families of parameters currently exist and how they
are organized for user interpretation.

## Scope

This category covers:

- current implemented parameter families
- category-level organization
- role of each parameter family
- what each family is intended to tell the user

This category does not cover:

- exact formulas
- export formatting mechanics
- rendering implementation details

## Current Top-Level Parameter Categories

The current HeartSound parameter system is organized into:

- `S1`
- `S2`
- `S1-S2`
- `RS Score`
- `HR`

The first four appear as main parameter categories in the parameter window.
`HR` is shown separately near the cycle control.

## 1. S1 Category

The `S1` category contains parameters derived from the S1 sound interval itself.

Current implemented members:

- `S1 Duration`
- `S1 Peak`
- `S1 Mean`
- `S1 RMS`
- `S1 Area`
- `S1 Middle`
- `S1_s Centroid`
- `S1_e Centroid`

### What This Category Tells the User

The `S1` category answers questions such as:

- how long S1 lasts
- how strong S1 is
- how much signal mass exists inside S1
- whether the S1 energy distribution leans toward the start or the end

## 2. S2 Category

The `S2` category mirrors the S1 category but applies to the S2 sound interval.

Current implemented members:

- `S2 Duration`
- `S2 Peak`
- `S2 Mean`
- `S2 RMS`
- `S2 Area`
- `S2 Middle`
- `S2_s Centroid`
- `S2_e Centroid`

### What This Category Tells the User

The `S2` category helps interpret:

- S2 duration
- S2 strength
- S2 internal signal energy
- whether S2 is front-weighted or back-weighted

## 3. S1-S2 Category

The current `S1-S2` category contains both systolic and diastolic gap-style
measurements.

It includes:

- `S1-S2 Duration`
- `S1-S2 Peak`
- `S1-S2 Mean`
- `S1-S2 Energy`
- `S2-S1 Duration`
- `S2-S1 Peak`
- `S2-S1 Mean`
- `S2-S1 Energy`

Even though the visual section title is `S1-S2`, the section intentionally
contains both directions of between-sound gap measurement.

### What This Category Tells the User

This category helps answer:

- how large the S1 to S2 gap is
- how large the S2 to next S1 gap is
- how much signal exists between the primary sound regions
- how energetic those inter-sound regions are

## 4. RS Score Category

The `RS Score` category contains parameters derived from the RS-score channels
that were already used to determine the primary HeartSound event structure.

Current implemented members:

- `S1_s RS Peak`
- `S1_e RS Peak`
- `S2_s RS Peak`
- `S2_e RS Peak`
- `S1_s RS Width`
- `S1_e RS Width`
- `S2_s RS Width`
- `S2_e RS Width`

### What This Category Tells the User

This category helps interpret:

- how strong each selected event peak is in the RS domain
- how wide each selected RS event spreads around its local peak

These metrics are about the event-detection representation, not the raw
amplitude waveform alone.

## 5. HR Category

`HR` is currently separated from the main card grid.

Displayed form:

- `HR xxx bpm`

### What This Category Tells the User

This category answers:

- how fast the current cycle is repeating
- the implied beats-per-minute value from the current cycle span

## Why the Current Set Is Structured This Way

The current set is intentionally divided into:

- sound-internal metrics
- gap metrics
- RS-score event metrics
- cycle-level rhythm metric

This is more interpretable than mixing everything into one long flat list.

## Current Naming Style

The visible naming system aims to be:

- short
- direct
- close to the displayed UI form

Examples:

- `S1 Duration`
- `S2 Peak`
- `S1_s Centroid`
- `S1_s RS Peak`
- `S1-S2 Energy`
- `HR`

## Relationship to Graph Annotations

Each parameter family maps naturally to graph interpretation:

- `S1` -> S1 segment
- `S2` -> S2 segment
- `S1-S2` -> inter-sound gap
- `RS Score` -> event-centered RS region or point
- `HR` -> cycle span

This is why the parameter families are meaningful as separate categories rather
than only as data columns.

## Design Intent

The current parameter set is meant to be:

- compact
- interpretable
- cycle-specific
- strongly grounded in visible signal structure

It is not intended to be a maximal feature dump.

## Future Expansion Notes

Possible future additions:

- morphology metrics
- more stable energy-shape descriptors
- candidate-event parameter families
- pathology-focused summary groups

## Summary

The current HeartSound parameter set is a structured, reviewer-oriented feature
catalog composed of:

- sound-specific metrics
- between-sound gap metrics
- RS-score event metrics
- cycle-level heart-rate context

This category defines what the Tool currently measures and exposes.
