
function generateResults(testsuite) {

	getTestList(testsuite)
		.then ( function(data) {
			
			var testsuite = data.testsuite;
			var tests = data.data;
			
			var results = document.getElementById('results');
			var manifest_link = document.getElementById('manifest-link');
			var test_base_url = 'https://w3c.github.io/publ-tests/';
			
			while(results.hasChildNodes()){
				results.removeChild(results.firstChild);
			}
			
			for (var t = 0; t < tests['tests'].length; t++) {
			
				var testgroup = tests['tests'][t];
				
				for (var z = 0; z < testgroup['tests'].length; z++) {
				
					var test = testgroup['tests'][z];
					manifest_link.href = test_base_url + testsuite + '/manifest_processing/tests/test_' + test['id'] + '.jsonld'
					
					if (test.hasOwnProperty('media-type') && test['media-type'] == 'application/ld+json') {
						manifestProcessor.processManifest({'test' : test, 'flags' : { 'skipAudioInReadingOrder' : 1 }})
							.then(function(processed) {
								var test_result = processResult(processed);
								results.appendChild(test_result);
							})
							.catch(function(processed) {
								var test_result = processResult(processed);
								results.appendChild(test_result);
							});
					}
					else {
						var err = test.hasOwnProperty('media-type') ? 
									(test['media-type'] == 'text/html' ? 'This test can only be run on an embedded manifest.' 
																			: 'This test has the unknown media type "' + test['media-type'] + '".')
									: 'The media-type of this test must be specified in the configuration file in order to process.'
						
						var warning = {
							'internal_rep' : null,
							'manifest_link' : manifest_link.href,
							'test' : test,
							'skipped' : true,
							'error' : err 
						};
						var test_result = processResult(warning);
						results.appendChild(test_result);
					}
				}
			}
		})
		.catch(function(err) {
			var fatal = document.createElement('div');
				fatal.appendChild(document.createTextNode(err));
			results.appendChild(fatal);
		});

}

function getTestList(testsuite) {
	return new Promise( function(resolve, reject) {
		
		var url = 'https://w3c.github.io/publ-tests/' + testsuite + '/manifest_processing/tests/index.json';
		
		$.ajax({
			url:       url,
			cache:     false,
			success: function(testlist) {
				var data = {'testsuite': testsuite, 'data': testlist}
				resolve(data);
			},
			error: function(xhr, status, error) {
				console.error('Test suite config file not found or an error occurred retrieving.');
				reject('Test suite config file not found or an error occurred retrieving.');
			}
		});

	});
}


function processResult(processed) {

	var skipped = processed.hasOwnProperty('skipped') ? true : false;
	
	var test_result = document.createElement('section');
		test_result.setAttribute('class', 'test');
	
	var test_hd = document.createElement('h2');
		test_hd.appendChild(document.createTextNode('Result for '));
		var a = document.createElement('a');
			a.setAttribute('href', processed.manifest_link);
			a.appendChild(document.createTextNode(processed.manifest_link.substring(processed.manifest_link.lastIndexOf('/')+1, processed.manifest_link.lastIndexOf('.'))));
		test_hd.appendChild(a);
		test_hd.appendChild(document.createTextNode(':'));
	test_result.appendChild(test_hd);
	
	var test_desc = document.createElement('p');
		test_desc.setAttribute('class', 'desc');
	var test_desc_label = document.createElement('strong');
		test_desc_label.appendChild(document.createTextNode('Description:'));
		test_desc.appendChild(test_desc_label);
		test_desc.appendChild(document.createTextNode(' ' + processed.test['description']));
	test_result.appendChild(test_desc);
	
	if (!skipped) {
		if (processed.test.hasOwnProperty('actions')) {
			var test_res = document.createElement('p');
				test_res.setAttribute('class', 'desc');
			var test_res_label = document.createElement('strong');
				test_res_label.appendChild(document.createTextNode('Expected Result:'));
				test_res.appendChild(test_res_label);
				test_res.appendChild(document.createTextNode(' ' + processed.test['actions']));
			test_result.appendChild(test_res);
		}
		
		if (processed.test.hasOwnProperty('errors')) {
			var test_err = document.createElement('p');
				test_err.setAttribute('class', 'desc');
			var test_err_label = document.createElement('strong');
				test_err_label.appendChild(document.createTextNode('Expected Errors:'));
				test_err.appendChild(test_err_label);
				test_err.appendChild(document.createTextNode(' ' + processed.test['errors']));
			test_result.appendChild(test_err);
		}
		
		var issues = document.createElement('ul');
		
		var internal_rep = document.createElement('pre');
			internal_rep.setAttribute('class', 'manifest');
			internal_rep.innerHTML = processed.internal_rep ? JSON.stringify(processed.internal_rep, '', '\t') : 'Failed to generate internal representation.';
		test_result.appendChild(internal_rep);
		
		if (processed.issues.warnings.length == 0 && processed.issues.errors.length == 0) {
			var li = document.createElement('li');
				li.setAttribute('class', 'valid');
				li.appendChild(document.createTextNode('Manifest validated successfully.'));
			issues.appendChild(li);
			test_result.appendChild(issues);
		}
		
		else {
			for (var x = 0; x < processed.issues.errors.length; x++) {
				var li = document.createElement('li');
					li.setAttribute('class', 'error');
					li.appendChild(document.createTextNode("ERROR: " + processed.issues.errors[x]));
				issues.appendChild(li);
			}
			
			for (var y = 0; y < processed.issues.warnings.length; y++) {
				var li = document.createElement('li');
					li.setAttribute('class', 'warn');
					li.appendChild(document.createTextNode("WARNING: " + processed.issues.warnings[y]));
				issues.appendChild(li);
			}
			test_result.appendChild(issues);
		}
	
	}
	
	if (processed.hasOwnProperty('error')) {
		var err = document.createElement('p');
			err.setAttribute('class', 'error');
			err.appendChild(document.createTextNode("ERROR: " + processed.error));
		test_result.appendChild(err);
	}
	
	return test_result;

}