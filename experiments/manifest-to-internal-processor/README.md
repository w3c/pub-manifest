# Publication Manifest Processor

The publication manifest processor is a JavaScript implementation of the processing algorithm defined in Publication Manifest specification. It also incorporates the extension rules for processing Audiobooks.

The processor returns both the internal representation of the manifest data and any warning and errors that were generated during processing.

## Setup

The manifest processor code is contained in the [manifestProcessor.js](manifestProcessor.js) file. This file also requires the jQuery library (known to run with 2.2.4) for making ajax calls to obtain an external manifest as well as the [duration.js](https://github.com/evanisnor/durationjs) library for parsing duration values.

## Implementations

- [JSON testing tool](index.html) &#8212; Interactive tool that returns the result of processing a JSON manifest.
- [Publication testing tool](linked.html) &#8212; Basic setup for testing an HTML page with a linked or embedded manifest.

## Test Suite Results

The [automated results of running the Publication Manifest and Audiobooks test suites](testsuite_results.html) against the processor are available for review. Note that the tests are not ordered within the document due the nature of the AJAX calls involved.

Please **do not open** the testsuite_run.html file. This page dynamically re-runs the test suite tests each time it is accessed.
