
'use strict';


var manifestProcessor = (function() {

	var base = location.href.substring(0, location.href.lastIndexOf("/")+1);
	var doc = document;
	
	var absolute_url = new RegExp('^https?://', 'i');
	var valid_url = new RegExp('^(https?:\\/\\/)?(((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|localhost)|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$','i');
	var duration = new RegExp('^P([0-9]+(?:[,\.][0-9]+)?Y)?([0-9]+(?:[,\.][0-9]+)?M)?([0-9]+(?:[,\.][0-9]+)?D)?(?:T([0-9]+(?:[,\.][0-9]+)?H)?([0-9]+(?:[,\.][0-9]+)?M)?([0-9]+(?:[,\.][0-9]+)?S)?)?$');
	var language = new RegExp('^((?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?:([A-Za-z]{2,3}(-(?:[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?:[A-Za-z]{4}))?(-(?:[A-Za-z]{2}|[0-9]{3}))?(-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?:[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?:x(-[A-Za-z0-9]{1,8})+))?)|(?:x(-[A-Za-z0-9]{1,8})+))$');
	// regex works for general cases, but haven't tested in depth 
	var dateTime = new RegExp('^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])(T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]{3})?(Z)?)?$');
	
	var knownProfiles = {
		'https://www.w3.org/TR/pub-manifest': 'generic',
		'https://www.w3.org/TR/audiobooks': 'audiobooks'
	};
	
	var expectsObject = {
		
	};
	
	var expectsArray = {
		'type': 1,
		'inLanguage': 1,
		'name': 1,
		'address': 1,
		'accessMode': 1,
		'accessModeSufficient': 1,
		'accessibilityFeature': 1,
		'accessibilityHazard': 1,
		'artist': 1,
		'author': 1,
		'colorist': 1,
		'contributor': 1,
		'creator': 1,
		'editor': 1,
		'illustrator': 1,
		'inker': 1,
		'letterer': 1,
		'penciler': 1,
		'publisher': 1,
		'readBy': 1,
		'translator': 1,
		'readingOrder': 1,
		'resources': 1,
		'links': 1,
		'alternate': 1
	};
	
	var expectsEntity = {
		'artist': 1,
		'author': 1,
		'colorist': 1,
		'contributor': 1,
		'creator': 1,
		'editor': 1,
		'illustrator': 1,
		'inker': 1,
		'letterer': 1,
		'penciler': 1,
		'publisher': 1,
		'readBy': 1,
		'translator': 1
	};
	
	var expectsLocalizableString = {
		'name': 1,
		'accessibilitySummary': 1,
		'artist': 1,
		'author': 1,
		'colorist': 1,
		'contributor': 1,
		'creator': 1,
		'editor': 1,
		'illustrator': 1,
		'inker': 1,
		'letterer': 1,
		'penciler': 1,
		'publisher': 1,
		'readBy': 1,
		'translator': 1,
		'description': 1
	}
	
	var expectsLinkedResource = {
		'readingOrder': 1,
		'resources': 1,
		'links': 1,
		'alternate': 1
	};
	
	var expectsURL = {
		'url': 1,
		'address': 1
	};
	
	var expectsLiteral = {
		'type': 1,
		'encodingFormat': 1,
		'rel': 1,
		'integrity': 1,
		'accessMode': 1,
		'accessibilityHazard': 1,
		'accessibilityFeature': 1,
		'duration': 1,
		'dateModified': 1,
		'datePublished': 1,
		'inLanguage': 1,
		'readingProgression': 1,
		'identifier': 1
	};
	
	var expectsIdentifier = {
		'id': 1
	}
	
	var expectsBoolean = {
		'abridged': 1
	};
	
	var expectsNumber = {
		'length': 1
	}
	
	function generateInternalRep() {
		
		getManifest()
			.then(function(data) {
				
				if (!data) {
					console.error('Manifest text not found.');
					return;
				}
				
				var internal_rep = processManifest(data);
				
				if (internal_rep) {
					document.getElementById('internalRepresentation').textContent = JSON.stringify(internal_rep, '', '\t');
				}
			}
		)
		.catch (function(err) {
			console.error(err);
		});
	}
	
	function getManifest() {
		
		return new Promise(function(resolve, reject) {
		
			var manifest_link = document.querySelector('link[rel="publication"]');
			
			if (manifest_link) {
				if (manifest_link.href.indexOf('#') > 0) {
					var script = document.getElementById(manifest_link.href.substring(manifest_link.href.indexOf('#')+1));
					if (script) {
						var data = script.innerHTML.trim();
						resolve(data);
					}
				}
				else {
					$.ajax({
						url:       manifest_link.href,
						cache:     false,
						success: function(data) {
							resolve(JSON.stringify(data));
						},
						error: function(err) {
							reject(err);
						}
					});
				}
			}
			
			else {
				console.error('Manifest link could not be located');
				reject();
			}
		});
	}
	
	
	function processManifest(text) {
	
		var processed = normalizeData(text);
		
		if (!processed) {
			return;
		}
		
		processed = addHTMLDefaults(processed);
		
		if (!processed) {
			return;
		}
		
		processed = checkDataIntegrity(processed);
		
		return processed;
	
	}
	
	
	function normalizeData(text) {
	
		// step 1 - create variable for processed manifest
		
		var processed = {};
		
		// step 2 - parse json
		
		var manifest;
		
		try {
			manifest = JSON.parse(text);
		}
		
		catch (e) {
			console.error('Error parsing manifest: ' + e);
			return '';
		}
		
		// step 3 - manifest contexts
		
		if (!manifest.hasOwnProperty('@context')) {
			console.error('@context not set.');
			return '';
		}
		
		if (!Array.isArray(manifest['@context'])) {
			console.error('@context is not an array.');
			return '';
		}
		
		if (manifest['@context'][0] != 'https://schema.org' || manifest['@context'][1] != 'https://www.w3.org/ns/pub-context') {
			console.error('First two declartaions in @context must be "https://schema.org" and "https://www.w3.org/ns/pub-context"');
			return '';
		}
		
		// step 4 - profile conformance
		
		var profile = '';
		
		if (!manifest.hasOwnProperty('conformsTo')) {
			console.warn('No profile specified. Setting to "https://www.w3.org/TR/pub-manifest"');
			manifest['conformsTo'] = ["https://www.w3.org/TR/pub-manifest"];
			profile = 'https://www.w3.org/TR/pub-manifest';
		}
		
		else if (Array.isArray(manifest['conformsTo'])) {
			var matches = [];
			for (var i = 0; i < manifest['conformsTo'].length; i++) {
				if (knownProfiles.hasOwnProperty(manifest['conformsTo'][i])) {
					matches.push(manifest['conformsTo'][i]);
				}
			}
			
			if (matches.length == 0) {
				console.error('Profile not recognized. Unable to process manifest.');
				return '';
			}
			
			else if (matches.length == 1) {
				profile = matches[0];
			}
			else {
				profile = 'https://www.w3.org/TR/audiobooks';
			}
		}
		
		else {
			if (knownProfiles.hasOwnProperty(manifest['conformsTo'])) {
				profile = manifest['conformsTo'];
			}
			else {
				console.error('Profile not recognized. Unable to process manifest.');
				return '';
			}
		}
		
		// step 5 - global language/direction 
		
		var lang = '';
		var dir = '';
		
		for (var i = manifest['@context'].length - 1; i >= 0; i--) {
			if (manifest['@context'][i] !== null && !Array.isArray(typeof(manifest['@context'][i])) && typeof(manifest['@context'][i]) === 'object') {
				if (lang == '' && manifest['@context'][i].hasOwnProperty('language')) {
					lang = manifest['@context'][i]['language'];
				}
				if (dir == '' && manifest['@context'][i].hasOwnProperty('direction')) {
					lang = manifest['@context'][i]['direction'];
				}
				if (lang != '' && dir != '') {
					break;
				}
			}
		}
		
		// step 6 - normalize values
		
		for (var key in manifest) {
			var normalized = normalizeValue(key, manifest[key]);
			processed[key] = normalized;
		}
		
		// step 7 - add defaults from html
		
		// step 8 - validation
		
		
		function normalizeValue(key, value) {
			var normalized = value;
			
			// step b - create arrays
			
			if (expectsArray.hasOwnProperty(key)) {
				if (!Array.isArray(value)) {
					normalized = [value]
				}
			}
			
			// steb c - expand entity names
			
			if (expectsEntity.hasOwnProperty(key)) {
				for (var i = 0; i < normalized.length; i++) {
					if (typeof(normalized[i]) === 'string') {
						if (normalized[i]) {
							normalized[i] = {
								"type": "Person",
								"name": normalized[i]
							}
						}
						else {
							normalized.splice(i,1);
						}
					}
					else if (typeof(normalized[i]) !== 'object') {
						console.warn(key + 'require a string or entity. Found ' + typeof(normalized[i] + '. Removing from array.'));
						normalized.splice(i,1);
					}
				}
			}
			
			
			// step d - localizable strings
			
			if (expectsLocalizableString.hasOwnProperty(key)) {
				for (var i = 0; i < normalized.length; i++) {
					if (typeof(normalized[i]) === 'string') {
						normalized[i] = {"value": normalized[i]};
						if (lang) {
							normalized[i]['language'] = lang;
						}
						if (dir) {
							normalized[i]['direction'] = dir;
						}
					}
				}
			}
			
			// step e - convert strings to linkedresources
			
			if (expectsLinkedResource.hasOwnProperty(key)) {
				for (var i = 0; i < normalized.length; i++) {
					if (typeof(normalized[i]) === 'string') {
						normalized[i] = {"url": normalized[i]};
					}
				}
			}
			
			// step f - convert relative URLs
			
			if (expectsURL.hasOwnProperty(key)) {
				if (typeof(normalized) === 'string') {
					if (!absolute_url.test(normalized)) {
						normalized = base + normalized;
					}
				}
			}
			
			// step g - no extension steps
			
			// step h + i - recursively update values
			
			if (Array.isArray(normalized)) {
				for (var i = 0; i < normalized.length; i++) {
					if (typeof(normalized[i]) === 'object') {
						for (var key in normalized[i]) {
							normalized[i][key] = normalizeValue(key, normalized[i][key]);
						}
					}
				}
			}
			
			else if (typeof(normalize) === 'object') {
				for (var key in normalize) {
					normalized[key] = normalizeValue(key, normalized[key]);
				}
			}
			
			// step j - set the updated value 
			
			return normalized;
		}
		
		// switch to processed later
		return processed;
		
	}


	function addHTMLDefaults(processed) {
		
		// add html title if name is missing
		
		if (!processed.hasOwnProperty('name')) {
		
			var title = doc.title;
			
			processed.name = {};
			
			if (title) {
				processed.name.value = title;
				if (doc.documentElement.lang) {
					processed.name.language = doc.documentElement.lang;
				}
				if (doc.dir && doc.dir != 'auto') {
					processed.name.direction = doc.dir;
				}
			}
			else {
				processed.name.value = 'Untitled Publication';
				processed.name.language = 'en';
				processed.name.direction = 'ltr';
			}
		}
		
		if (!processed.hasOwnProperty('readingOrder')) {
			if (doc.location.href) {
				processed.readingOrder = [{
					"url": doc.location.href
				}];
			}
			else {
				console.error('No reading order. Document URL could not be determined.');
				return '';
			}
		}
		
		return processed;
	}


	function checkDataIntegrity(processed) {
		
		// step a - recursive validity checks
		
		for (var key in processed) {
			if (expectsArray.hasOwnProperty(key)) {
				if (!Array.isArray(processed[key])) {
					console.warn(key + ' requires an array of values.')
					delete(processed[key]);
				}
				else {
					for (var i = 0; i < processed[key]; i++) {
						var type = typeof(processed[key][i]);
						if (!checkDataType(key,type)) {
							processed[key].splice(i,1);
						}
					}
					if (processed[key].length == 0) {
						console.warn(key + ' is an empty array after processing.');
						delete(processed[key]);
					}
				}
			}
			else if (expectsObject.hasOwnProperty(key)) {
				if (typeof(processed[key]) !== 'object') {
					console.warn(key + ' requires an object.')
					delete(processed[key]);
				}
				else {
					for (var subkey in processed[key]) {
						var type = typeof(processed[key][subkey]);
						if (!checkDataType(subkey,type)) {
							delete(processed[key][subkey]);
						}
					}
					if (processed[key].keys().length == 0) {
						console.warn(key + ' is an empty object after processing.');
						delete(processed[key]);
					}
				}
			}
			else {
				var type = typeof(processed[key]);
				if (!checkDataType(key,type)) {
					delete(processed[key]);
				}
			}
		}
		
		for (var key in processed) {
			processed[key] = recursiveIntegrityChecks(key, processed[key]); 
		}
		
		// step b - check type is set
		
		if (!processed.hasOwnProperty('type') || processed['type'].length == 0) {
			console.warn('Publication type not set.');
			if (processed.hasOwnProperty('type')) {
				delete(processed['type']);
			}
		}
		
		// step c - abridged is boolean
		
		if (processed.hasOwnProperty('abridged') && typeof(processed['abridged']) !== 'boolean') {
			console.warn('The abridged property must be a boolean value.');
			delete(processed['abridged']);
		}
		
		// step d - valid duration
		
		if (processed.hasOwnProperty('duration')) {
			if (!duration.test(processed['duration'])) {
				console.warn('The duration must be a valid ISO 8601 duration.');
				delete(processed['duration']);
			}
		}
		
		// step e - valid publication date

		if (processed.hasOwnProperty('datePublished')) {
			if (!dateTime.test(processed['datePublished'])) {
				console.warn('The publication date must be a valid ISO 8601 dateTime.');
				delete(processed['datePublished']);
			}
		}
		
		// step f - valid modification date
		
		if (processed.hasOwnProperty('dateModified')) {
			if (!dateTime.test(processed['dateModified'])) {
				console.warn('The last modified date must be a valid ISO 8601 dateTime.');
				delete(processed['dateModified']);
			}
		}
		
		// step g - well-formed languages
		
		if (processed.hasOwnProperty('inLanguage')) {
			for (var i = 0; i < processed['inLanguage'].length; i++) {
				if (!language.test(processed['inLanguage'][i])) {
					console.warn('The language tag "' + processed['inLanguage'][i] + '" is not well formed.');
					processed['inLanguage'].splice(i,1);
				}
			}
		}
		
		// step f - valid reading progression
		
		if (processed.hasOwnProperty('readingProgression')) {
			if (processed['readingProgression'] != 'ltr' && processed['readingProgression'] != 'rtl') {
				console.warn('The reading progression must be "ltr" or "rtl".');
				processed['readingProgression'] = 'ltr';
			}
		}
		
		return processed;
	}
	
	
	function checkDataType(key,type) {
		if (expectsLiteral.hasOwnProperty(key) || expectsIdentifier.hasOwnProperty(key) || expectsURL.hasOwnProperty(key)) {
			if (type != 'string') {
				console.warn(key + ' requires a literal.');
				return false;
			}
		}
		else if (expectsNumber.hasOwnProperty(key)) {
			if (type != 'number') {
				console.warn(key + ' requires a number.');
				return false;
			}
		}
		else if (expectsBoolean.hasOwnProperty(key)) {
			if (type != 'boolean') {
				console.warn(key + ' requires a boolean.');
				return false;
			}
		}
		else if (expectsLocalizableString.hasOwnProperty(key) || expectsEntity.hasOwnProperty(key) || expectsLinkedResource.hasOwnProperty(key)) {
			if (type != 'object') {
				console.warn(key + ' requires an object.');
				return false;
			}
		}
		return true
	}
	
	
	
	function recursiveIntegrityChecks(key, value) {
		
		// step ii - entity names
		
		if (expectsEntity.hasOwnProperty(key) && value.length > 0) {
			for (var i = 0; i < value.length; i++) {
				if (!value[i].hasOwnProperty('name')) {
					console.warn('Item ' + i + ' in ' + key + ' does not have a name');
					value.splice(i,1);
				}
				else {
					if (value[i]['name'].length > 0) {
						for (var j = 0; j < value[i]['name'].length; j++) {
							if (!value[i]['name'][j].hasOwnProperty('value') || !value[i]['name'][j]['value']) {
								value[i]['name'].splice(j,1);
							}
						}
					}
				}
			}
		}
		
		// step iii - valid language and direction
		
		if (!Array.isArray(value) && typeof(value) === 'object') {
			if (value.hasOwnProperty('language')) {
				if (!language.test(value['language'])) {
					console.warn('Language tag is not well formed.');
					delete(value['language']);
				}
			}
			if (value.hasOwnProperty('direction')) {
				if (value['direction'] != 'ltr' && value['direction'] != 'rtl') {
					console.warn('Direction must be "ltr" or "rtl".');
					delete(value['direction']);
				}
			}
		}
		
		// step iv - linkedresources have url, duration and encodingFormat
		
		if (expectsLinkedResource.hasOwnProperty(key)) {
			for (var i = 0; i < value.length; i++) {
				
				// check urls
				if (!value[i].hasOwnProperty('url') || !value[i]['url']) {
					console.error('Resource does not have a url.');
					delete(value['url']);
				}
				else {
					if (!valid_url.test(value[i]['url'])) {
						console.error('Resource has invalid url "' + value[i]['url'] + '".');
						delete(value['url']);
					}
				}
				
				// check durations
				if (value[i].hasOwnProperty('length')) {
					if (value[i]['length'] < 0) {
						console.error('Resource lengths cannot be negative numbers.');
						delete(value['length']);
					}
				}
				
				// check alternate encodingFormat
				
				if (key == 'alternate') {
					if (!value[i].hasOwnProperty('encodingFormat')) {
						console.warn('Alternate resources should identify their media type in an encodingFormat property.');
					}
				}
			}
		}
		
		// step vi - recursively check subitems
		
		if (Array.isArray(value)) {
			for (var i = 0; i < value.length; i++) {
				value[i] = recursiveIntegrityChecks('', value[i]);
			}
		}
		
		else if (typeof(value) === 'object') {
			for (var subkey in value) {
				value[subkey] = recursiveIntegrityChecks(subkey, value[subkey]);
			}
		}
		
		return value;
	}


	return {
		generateInternalRep: function() {
			generateInternalRep();
		}
	}

})();

