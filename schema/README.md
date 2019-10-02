# Publication Manifest Schema

The schemas in [this directory](https://github.com/w3c/pub-manifest/tree/master/schema) provide validation for publication manifests. (Note, however, that not all constraints can be captured through the schemas.)

The schemas are written in [JSON Schema](https://json-schema.org/), and currently conform to Draft-07.

The schemas are updated to newer drafts as broad support in validators becomes available. A [list of validators](https://json-schema.org/implementations.html) and the draft(s) they support is available from the JSON Schema site.

## Structure

The schema consists of a primary schema file `publication.schema.json` and several component files, each of which encapsulates tests specific to an area of validation.

Only the primary schema file needs to be specified for validation, as the other files are automatically imported.

The schemas will not work with a validator that cannot handle multi-document schemas unless the components are manually combined.
