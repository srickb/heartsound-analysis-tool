# Export and Documentation Structure

## Purpose

This document describes how the Tool currently externalizes its computed
information and how project knowledge is documented inside the repository.

This category is about persistence and communication rather than direct
interactive analysis.

## Scope

This category covers:

- parameter xlsx export
- export content structure
- metadata sheet behavior
- implementation documents
- PRD-level documentation
- parameter formula references
- role of the `ideas` folder

This category does not cover:

- runtime behavior
- graph rendering logic
- file upload internals

## Export Philosophy

The current Tool does not stop at on-screen analysis.
It also allows the user to extract computed HeartSound parameters as a workbook.

This is important because many research workflows require:

- offline review
- comparison outside the app
- record keeping
- spreadsheet-based analysis

## Current Parameter Export

The parameter window includes a `Download xlsx` action.

For HeartSound data, this export contains:

- cycle-wise derived parameter rows
- metadata about the export source

This makes the export a structured representation of the current derived
analysis, not just a screenshot of the UI.

## Workbook Structure

The current workbook contains at least:

- `Parameters` sheet
- `Metadata` sheet

### `Parameters` Sheet

This sheet contains:

- one row per valid cycle
- structural anchors such as start/end positions
- derived metrics for S1, S2, relation gaps, RS score, and HR

### `Metadata` Sheet

This sheet records export context such as:

- source file id
- original file name
- workspace kind
- file role
- exported row count

This makes the workbook easier to audit later.

## Export Scope Rule

For HeartSound data:

- the export uses derived parameter rows created from the data file
- invalid cycles are filtered out

This ensures the exported table corresponds to the same valid cycle structure
used in the UI.

## Documentation Layers in the Repository

The current repository already contains multiple documentation layers.

### 1. Current Implementation Spec

This document records how the Tool currently works in implementation terms.

Current file:

- `process/current_implementation_spec.md`

### 2. Product Requirements Document

This document captures product-level requirements and system framing.

Current file:

- `process/product_requirements_document.md`

### 3. Heartsound Parameter Formula Reference

This document records the current formula definitions for the implemented
HeartSound parameter set.

Current file:

- `process/heartsound_parameter_formula_reference.md`

## Role of the `ideas` Folder

The `ideas` folder is the conceptual and planning layer.

It currently contains:

- earlier idea/code notes
- parameter planning material
- structured concept documents such as the ones being added now

Its role is different from `process`.

### `process`

- describes the current product and shipped behavior

### `ideas`

- describes structured concepts, categories, design reasoning, and future-facing
  documentation organization

## Why This Category Matters

Without export and documentation, the Tool would be difficult to:

- explain to collaborators
- extend safely
- validate against intended behavior
- use in research workflows that require saved outputs

This category creates continuity between code, UI, and external artifacts.

## Current Strengths

The current export/documentation model already supports:

- reproducible parameter download
- repository-based knowledge retention
- separation of implementation spec vs product intent vs formula detail

This is a strong foundation for continued development.

## Current Limitations

Some documentation is still distributed across:

- source comments
- process docs
- idea notes
- UI behavior itself

This means continued curation is still valuable.

## Future Expansion Notes

Potential future work:

- export schema versioning
- richer metadata in workbook exports
- user-selected export subsets
- generated docs from source metadata
- tighter linkage between formula docs and code identifiers

## Summary

The current export and documentation structure gives the Tool durability beyond
the live UI session.

It provides:

- downloadable computed parameter workbooks
- implementation documentation
- requirement documentation
- formula documentation
- concept-organization documentation through the `ideas` folder

This category is what allows the Tool to be maintained, explained, and reused
over time.
