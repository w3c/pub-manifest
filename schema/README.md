# Publication Manifest Schema

The schema in [this directory](https://github.com/w3c/pub-manifest/tree/master/schema) provides validation for publication manifests. (Note, however, that not all constraints can be captured through the schemas.)

The schema and its components are written in [JSON Schema](https://json-schema.org/), and currently conform to **Draft-07**.

The schema is updated to newer drafts as broad support in validators becomes available. 

## Structure

The schema consists of a primary schema file `publication.schema.json` and several component files, each of which encapsulates tests specific to an area of validation. These component files are located in the `module` subdirectory.

In some cases, it may be possible to validate without downloading the physical schemas (i.e., if the validator can retrieve the schemas automatically). In these cases, only the URL `https://w3c.github.io/pub-manifest/schema/publication.schema.json` needs to be specified.

## Validators

A [list of JSON Schema validators](https://json-schema.org/implementations.html) and the draft(s) they support is available from the JSON Schema site.

The publication manifest schema is known to work with the following validators/tools:

- [ajv-cli](https://github.com/jessedc/ajv-cli)
- [Oxygen Editor](https://www.oxygenxml.com/)
