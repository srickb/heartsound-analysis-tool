# Parameter Computation Rules

## Purpose

This document explains the computational rules that govern the current
HeartSound parameter system.

It is not a line-by-line formula reference.
Instead, it records the rule system that makes the formulas internally
consistent.

## Scope

This category covers:

- sampling assumptions
- index semantics
- interval semantics
- unit rules
- invalid-case handling
- cycle dependency
- RS parameter computation rules

This category does not replace the dedicated formula reference document.

## Core Signal Assumptions

The current HeartSound parameter pipeline assumes:

- sample rate = `4000 Hz`
- therefore `1 sample = 0.25 ms`
- signal amplitude unit = `mV`

These assumptions are used across all current derived HeartSound parameter
families.

## Index Semantics

The current system treats event locations as sample indices.

Examples:

- `S1_start`
- `S1_end`
- `S2_start`
- `S2_end`
- `next_S1_start`

These are not time values by themselves.
They become time values only after sample-to-time conversion.

## Interval Semantics

The system uses half-open interval semantics for signal slicing:

- `[start, end)`

This means:

- the start sample is included
- the end sample is excluded

This rule is important because it keeps slicing behavior consistent across
segment parameters and gap parameters.

## Cycle Dependency Rule

Most HeartSound parameters are not global-record statistics.
They are cycle-local metrics.

That means the current parameter set depends on:

- a valid current cycle
- valid S1 and S2 anchors inside that cycle
- a valid next S1 anchor when required

If those anchors are missing or invalid, the system prefers `NaN` rather than a
fake numeric default.

## Invalid Value Policy

The current parameter system uses:

- `NaN` for not computable

It avoids:

- coercing invalid cases to `0`

This is important because zero could be misread as a valid physical result.

## Unit Rules

The current unit policy is:

- durations and middle positions -> `ms`
- amplitude magnitude summaries -> `mV`
- area-like absolute integrals -> `mV·ms`
- energy-like quantities -> `mV²·ms`
- centroid balance values -> `%`
- HR -> `bpm`
- RS peak -> `RS score`
- RS width -> `ms`

These rules define the interpretive surface of the parameter cards.

## Sound-Internal Parameter Rules

Parameters inside `S1` and `S2` are computed from the sound interval itself.

Typical rules include:

- use only the samples inside the sound interval
- use absolute value when measuring magnitude concentration
- use RMS for energy-like amplitude concentration
- use midpoint for `Middle`
- use weighted distribution logic for centroid balance

## Gap Parameter Rules

The current `S1-S2` and `S2-S1` metrics are gap-based.

This means:

- `S1-S2` metrics use `S1 end -> S2 start`
- `S2-S1` metrics use `S2 end -> next S1 start`

These are not sound-body metrics.
They describe between-sound intervals.

## Centroid Rules

The centroid values are not geometric centers.
They describe weighted balance within the sound interval.

Current interpretation rule:

- `S*_s Centroid` and `S*_e Centroid` together describe how much the energy
  distribution leans toward the start or the end

The current intended interpretation is complementary balance across the sound.

## HR Rule

The current heart-rate rule is cycle-based:

- use `current S1 start -> next S1 start`
- convert that cycle span to bpm

This makes HR a cycle-local rhythm context value rather than a record-wide
average.

## RS Peak Rule

`RS Peak` is defined by:

- taking the final selected event point
- reading the RS score at exactly that event point

The current display policy rounds these values to integer form because RS score
is interpreted as a discrete event-strength scale.

## RS Width Rule

The current `RS Width` logic is event-centered.

It does not use the entire RS signal globally.

Instead it:

- starts at the selected event peak
- uses that peak’s local height
- expands left and right while the RS score remains above half-height
- converts the resulting span into `ms`

So the width is a local event spread rule, not a record-level spread rule.

## Consistency Rule

A major principle of the current parameter system is consistency between:

- graph structure
- cycle structure
- parameter extraction
- annotation display
- export output

This matters because a parameter is only trustworthy if it points back to the
same structural anchors everywhere in the product.

## Design Intent

The current computation rules aim to be:

- stable
- interpretable
- cycle-specific
- conservative in failure cases

This is more important to the Tool than squeezing in large numbers of unstable
derived features.

## Related Reference

For exact parameter-by-parameter formulas, see:

- `process/heartsound_parameter_formula_reference.md`

This document should be read as the rule system behind that formula sheet.

## Summary

The current HeartSound computation rules define a consistent parameter system
built on:

- fixed sample-rate interpretation
- cycle-local segmentation
- half-open intervals
- explicit unit handling
- `NaN` for invalid cases
- event-centered RS measurement

These rules keep the Tool internally coherent across UI, export, and graph
interaction.
