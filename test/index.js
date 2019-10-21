/**
 * @license
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* global process */

const fs = require('fs');
const URL = require('url');

const Ajv = require('ajv');
const chai = require('chai');
const expect = chai.expect;
const fetch = require('node-fetch');
const resolve = require('resolve');

// file or URL location
let url = '';
// find the URL parameter (which might be a relative path to a file)
let found_url = false;
process.argv.forEach((val, index) => {
  if (val.startsWith('--url')) {
    found_url = true;
    if (val[5] === '=') {
      url = val.split('=')[1];
    } else {
      // assume the next parameter is a URL
      url = process.argv[index + 1];
    }
  }
});

function readSchema(schemaPath, base = '../schema/') {
  const resolverOptions = { extensions: ['.json', '.test'] };
  const resolvedPath = resolve.sync(`${base}${schemaPath}`, resolverOptions);
  const schemaUnparsed = fs.readFileSync(resolvedPath);
  return JSON.parse(schemaUnparsed);
}

const DEFINITIONS = [
  'bcp.schema',
  'contributor-object.schema',
  'contributor.schema',
  'link.schema',
  'localizable-object.schema',
  'localizable.schema',
  'resource.categorization.schema',
  'url.schema',
].map(name => readSchema(`${name}`));

// TODO: bring back a test manifest similar to the one at https://github.com/w3c/web-annotation-tests/blob/master/annotations/annotationMusts.test
//const MUSTS = readSchema('annotations/annotationMusts');

const ajv = new Ajv({ schemaId: 'auto', allErrors: true });
DEFINITIONS.forEach(schema => ajv.addSchema(schema));

describe('Test JSON against Schemas', () => {
  let data = '';

  before(async function() {
    if (!found_url) {
      this.skip();
    } else {
      // load the data from the file or URL
      let url_parsed = URL.parse(url);
      if (url_parsed.path !== url_parsed.href) {
        const data_response = await fetch(url_parsed.href);
        data = await data_response.json();
      } else {
        // assume we have a local file and use that
        data = JSON.parse(fs.readFileSync(url_parsed.path, 'utf8'));
      }
      if (data === '') {
        this.skip();
      }
    }
  });

// TODO: bring back a test manifest outer loop to test various sections
  //MUSTS.assertions.forEach(schemaPath => {
    const schema = readSchema('publication.schema');
    it(schema.title, () => {
      let valid = ajv.validate(schema, data);
      assert.isOk(valid, ajv.errorsText().replace('data', 'The manifest'));
    });
  //});
});
