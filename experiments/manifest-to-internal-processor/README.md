# Publication Manifest Processor

The publication manifest processor is a JavaScript implementation of the processing algorithm defined
in Publication Manifest specification. It also incorporates the extension rules for processing
Audiobooks.

The processor returns both the internal representation of the manifest data and any warning and
errors that were generated during processing.

## Setup

The manifest processor code is contained in the [manifestProcessor.js](manifestProcessor.js) file.
This file also requires the jQuery library (known to run with 2.2.4) for making ajax calls to obtain
an external manifest as well as the [duration.js](https://github.com/evanisnor/durationjs) library
for parsing duration values.

To run the code, call `manifestProcessor.processManifest()`. Create a function called `initPublication`
to run your initialization code; this function is called after the manifest has been processed.

Example initialization
```
manifestProcessor.processManifest();

function initPublication() {
   var internalRep = manifestProcessor.getInternalRep(); // get the processed manifest
   var toc = manifestProcessor.getTOC(); // get the processed table of contents

   // initialize publication
}
```

## Implementations

- [JSON testing tool](https://w3c.github.io/pub-manifest/experiments/manifest-to-internal-processor/index.html) &#8212; Interactive tool that returns the result of processing a JSON manifest.
- [Publication testing tool](https://w3c.github.io/pub-manifest/experiments/manifest-to-internal-processor/linked.html) &#8212; Basic setup for testing an HTML page with a linked or embedded manifest and with support for toc processing.
