
'use strict';

var manifestProcessor = (function() {

	var absolute_url = new RegExp('^https?://', 'i');
	var valid_url = new RegExp('^(https?:\\/\\/)?(((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|localhost)|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$','i');
	var duration = new RegExp('^P([0-9]+(?:[,\.][0-9]+)?Y)?([0-9]+(?:[,\.][0-9]+)?M)?([0-9]+(?:[,\.][0-9]+)?D)?(?:T([0-9]+(?:[,\.][0-9]+)?H)?([0-9]+(?:[,\.][0-9]+)?M)?([0-9]+(?:[,\.][0-9]+)?S)?)?$');
	var bcp47 = new RegExp('^((?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?:([A-Za-z]{2,3}(-(?:[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?:[A-Za-z]{4}))?(-(?:[A-Za-z]{2}|[0-9]{3}))?(-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?:[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?:x(-[A-Za-z0-9]{1,8})+))?)|(?:x(-[A-Za-z0-9]{1,8})+))$');
	// regex works for general cases, but haven't tested in depth 
	var dateTime = new RegExp('^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])(T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]{3})?(Z)?)?$');
	
	var knownProfiles = {
		'https://www.w3.org/TR/audiobooks': 'audiobooks'
	};
	
	var expectsObject = {
		'accessModeSufficient': ['']
	};
	
	var expectsArray = {
		'url': [''],
		'type': ['', 'Person', 'Organization', 'LinkedResource'],
		'inLanguage': [''],
		'conformsTo': [''],
		'name': ['', 'Person', 'Organization', 'LinkedResource'],
		'identifier': ['Person', 'Organization'],
		'address': [''],
		'accessMode': [''],
		'accessModeSufficient': [''],
		'accessibilityFeature': [''],
		'accessibilityHazard': [''],
		'artist': [''],
		'author': [''],
		'colorist': [''],
		'contributor': [''],
		'creator': [''],
		'editor': [''],
		'illustrator': [''],
		'inker': [''],
		'letterer': [''],
		'penciler': [''],
		'publisher': [''],
		'readBy': [''],
		'translator': [''],
		'readingOrder': [''],
		'resources': [''],
		'links': [''],
		'alternate': ['LinkedResource'],
		'description': ['LinkedResource'],
		'rel': ['LinkedResource']
	};
	
	var expectsEntity = {
		'artist': [''],
		'author': [''],
		'colorist': [''],
		'contributor': [''],
		'creator': [''],
		'editor': [''],
		'illustrator': [''],
		'inker': [''],
		'letterer': [''],
		'penciler': [''],
		'publisher': [''],
		'readBy': [''],
		'translator': ['']
	};
	
	var expectsLocalizableString = {
		'name': ['', 'Person', 'Organization', 'LinkedResource'],
		'accessibilitySummary': [''],
		'description': ['LinkedResource']
	}
	
	var expectsLinkedResource = {
		'readingOrder': [''],
		'resources': [''],
		'links': [''],
		'alternate': ['']
	};
	
	var expectsURL = {
		'url': ['', 'Person', 'Organization', 'LinkedResource'],
		'address': ['']
	};
	
	var expectsLiteral = {
		'type': [''],
		'encodingFormat': ['LinkedResource'],
		'rel': ['LinkedResource'],
		'integrity': ['LinkedResource'],
		'accessMode': [''],
		'accessibilityHazard': [''],
		'accessibilityFeature': [''],
		'duration': [''],
		'dateModified': [''],
		'datePublished': [''],
		'inLanguage': [''],
		'readingProgression': [''],
		'url': ['LinkedResource'],
		'identifier': ['Person', 'Organization']
	};
	
	var expectsIdentifier = {
		'id': ['', 'Person', 'Organization']
	}
	
	var expectsBoolean = {
		'abridged': ['']
	};
	
	var expectsNumber = {
		'length': ['LinkedResource']
	}
	
	function generateInternalRep(manifest_link) {
		
		getManifest(manifest_link)
			.then(function(data) {
				
				if (!data) {
					throw new Error('Manifest text not found.')
				}
				
				var base = location.href.substring(0, location.href.lastIndexOf("/")+1);
				var doc = document;
				
				var internal_rep = processManifest(data, base, doc);
				
				if (internal_rep) {
					document.getElementById('internalRepresentation').textContent = JSON.stringify(internal_rep, '', '\t');
				}
			}
		)
		.catch (function(err) {
			console.error(err);
		});
	}
	
	
	function getManifest(manifest_link) {
		
		return new Promise(function(resolve, reject) {
		
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
	
	
	function processManifest(text, base, doc) {
	
		// step 1 - create processed
		
		var processed = {};
		
		// step 2 - parse json
		
		var manifest;
		
		try {
			manifest = JSON.parse(text);
			if (Array.isArray(manifest) || typeof(manifest) !== 'object') {
				throw new Error('The manifest must be a JSON object.');
			}
		}
		
		catch (e) {
			throw new Error('Error parsing manifest: ' + e);
		}
		
		// step 3 - manifest contexts
		
		if (!manifest.hasOwnProperty('@context')) {
			throw new Error('@context not set.');
		}
		
		if (!Array.isArray(manifest['@context'])) {
			throw new Error('@context is not an array.');
		}
		
		if (manifest['@context'][0] != 'https://schema.org' || manifest['@context'][1] != 'https://www.w3.org/ns/pub-context') {
			throw new Error('First two declartaions in @context must be "https://schema.org" and "https://www.w3.org/ns/pub-context"');
		}
		
		// step 4 - profile conformance
		
		if (!manifest.hasOwnProperty('conformsTo')) {
			console.error('No profile specified. (No testing for compatible profiles in this processor.)');
			throw new Error();
		}
		
		else if (Array.isArray(manifest['conformsTo'])) {
			var matches = [];
			for (var i = 0; i < manifest['conformsTo'].length; i++) {
				if (knownProfiles.hasOwnProperty(manifest['conformsTo'][i])) {
					matches.push(manifest['conformsTo'][i]);
				}
			}
			
			if (matches.length == 0) {
				console.error('No profiles recognized. (No testing for compatible profiles in this processor.)');
				throw new Error();
			}
			
			else {
				processed['profile'] = matches[0];
			}
		}
		
		else {
			if (knownProfiles.hasOwnProperty(manifest['conformsTo'])) {
				processed['profile'] = manifest['conformsTo'];
			}
			else {
				console.error('Profile not recognized. (No testing for compatible profiles in this processor.)');
				throw new Error();
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
			
			if (lang && !bcp47.test(lang)) {
				console.warn('Invalid global language tag "' + lang + '" found.');
				lang = '';
			}
			
			if (dir && (dir != 'ltr' && dir != 'rtl')) {
				console.warn('Invalid global direction "' + dir + '" found.');
				dir = '';
			}
		}
		
		// step 6 - add normalized data to processed
		
		for (var key in manifest) {
			try {
				processed[key] = normalizeData(key, manifest[key], lang, dir, base, '');
			}
			catch(e) {
				// don't add key to processed
			}
		}
		
		// step 7 - run data validation checks
		
		processed = dataValidation(processed);
		
		// step 8 - add html defaults
		
		try {
			processed = addHTMLDefaults(processed, doc);
		}
		catch(e) {
			throw new Error('Terminating processing.');
		}
		
		// step 9 - return finished data 
		
		return processed;
	
	}
	
	
	function normalizeData(key, value, lang, dir, base, context) {
		
		// step 1 - set normalized to the incoming value
		
		var normalized = value;
		
		// step 2 - remove @context
		
		if (key == '@context') {
			throw new Error();
		}
		
		// step 3 - create arrays
		
		if (checkExpectsArray(key,context)) {
			if (!Array.isArray(value)) {
				normalized = [value];
			}
		}
		
		// steb 4 - expand entity names
		
		if (expectsEntity.hasOwnProperty(key)) {
			for (var i = normalized.length - 1; i >= 0; i--) {
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
					console.warn(key + 'requires a string or entity. Found ' + typeof(normalized[i] + '. Removing from array.'));
					normalized.splice(i,1);
				}
				else {
					if (normalized[i].hasOwnProperty('type')) {
						var hasType = false;
						for (var j = 0; j < normalized[i]['type'].length; j++) {
							if (normalized[i]['type'][j] == 'Person' || normalized[i]['type'][j] == 'Organization') {
								hasType = true;
								break;
							}
						}
						if (!hasType) {
							normalized[i]['type'].push('Person');
						}
					}
					else {
						normalized[i]['type'] = ['Person'];
					}
				}
			}
		}
		
		
		// step 5 - localizable strings
		
		if (expectsLocalizableString.hasOwnProperty(key)) {
			for (var i = normalized.length - 1; i >= 0; i--) {
				var type = typeof(normalized[i]);
				if (type === 'string') {
					normalized[i] = {"value": normalized[i]};
					if (lang) {
						normalized[i]['language'] = lang;
					}
					if (dir) {
						normalized[i]['direction'] = dir;
					}
				}
				else if (Array.isArray(normalized[i]) || type !== 'object') {
					console.warn('Non-string value found in ' + key + '.');
					normalized.splice(i,1);
				}
				else {
					if (!normalized[i].hasOwnProperty('language') && lang) {
						normalized[i]['language'] = lang;
					}
					else {
						if (!normalized[i]['language']) {
							delete(normalized[i]['language']);
						}
					}
					if (!normalized[i].hasOwnProperty('direction') && dir) {
						normalized[i]['direction'] = dir;
					}
					else {
						if (!normalized[i]['direction']) {
							delete(normalized[i]['direction']);
						}
					}
				}
			}
		}
		
		// step 5 - convert strings to linkedresources
		
		if (expectsLinkedResource.hasOwnProperty(key)) {
			for (var i = normalized.length - 1; i >= 0; i--) {
				var type = typeof(normalized[i]);
				if (type === 'string') {
					normalized[i] = {"type": "LinkedResource", "url": normalized[i]};
				}
				else if (Array.isArray(normalized[i]) || type !== 'object') {
					console.warn(key + ' requires only strings or objects in its array. Found ' + type + '. Removing from array.');
					normalized.splice(i,1);
				}
				else {
					if (normalized[i].hasOwnProperty('type')) {
						var hasType = false;
						for (var j = 0; j < normalized[i]['type'].length; j++) {
							if (normalized[i]['type'][j] == 'LinkedResource') {
								hasType = true;
								break;
							}
						}
						if (!hasType) {
							normalized[i]['type'].push('LinkedResource');
						}
					}
					else {
						normalized[i]['type'] = ['LinkedResource'];
					}
				}
			}
		}
		
		// step 6 - convert relative URLs

		if (expectsURL.hasOwnProperty(key)) {
			var type = typeof(normalized);
			
			if (type == 'string') {
				try {
					normalized = convertAbsoluteURL(normalized, base);
				}
				catch (e) {
					throw new Error();
				}
				
			}
			else if (Array.isArray(normalized)) {
				for (var i = normalized.length - 1; i >= 0; i--) {
					try {
						normalized[i] = convertAbsoluteURL(normalized[i], base);
					}
					catch (e) {
						normalized.splice(i,1);
					}
				}
			}
			else {
				throw new Error('Invalid data type "' + type + '" for URL.');
			}
		};
		
		// step 7 - no extension steps
		
		// step 8 + 9 - recursively update values
		
		if (Array.isArray(normalized)) {
			for (var i = 0; i < normalized.length; i++) {
				if (typeof(normalized[i]) === 'object') {
					var obj_context = getContext(normalized[i]);
					for (var key in normalized[i]) {
						try {
							normalized[i][key] = normalizeData(key, normalized[i][key], lang, dir, base, obj_context);
						}
						catch(e) {
							delete(normalized[i][key]);
						}
					}
				}
			}
		}
		
		else if (typeof(normalize) === 'object') {
			var obj_context = getContext(normalized);
			for (var key in normalize) {
				try {
					normalized[key] = normalizeData(key, normalized[key], lang, dir, base, obj_context);
				}
				catch(e) {
					delete(normalized[key]);
				}
			}
		}
		
		// step 10 - set the updated value 
		
		return normalized;
	}
	
	
	function convertAbsoluteURL(data, base) {
		if (typeof(data) === 'string') {
			if (!absolute_url.test(data)) {
				data = base + data;
			}
			// need a check for the validty of the result
		}
		else {
			throw new Error(key + ' requires a string. Found ' + type + '.');
		}
		return data;
	}


	function dataValidation(data) {
		
		// step 1 - recursive validity checks
		
		for (var key in data) {
			try {
				data[key] = commonDataChecks(key, data[key], ''); 
			}
			catch (e) {
				delete(data[key]);
			}
		}
		
		// step 2 - check type is set
		
		if (!data.hasOwnProperty('type') || data['type'].length == 0) {
			console.warn('Publication type not set.');
			data['type'] = ['CreativeWork'];
		}
		
		// step 3 - validate accessModeSufficient itemlists
		
		if (data.hasOwnProperty('accessModeSufficient')) {
			for (var i = data['accessModeSufficient'].length - 1; i >= 0; i--) {
				if (!data['accessModeSufficient'][i].hasOwnProperty('type') || data['accessModeSufficient'][i]['type'] != 'ItemList') {
					console.warn('accessModeSufficient must only contain ItemList objects.');
					data['accessModeSufficient'].splice(i,1);
				}
			}
		}
		
		// step 4 - canonical id
		
		if (!data.hasOwnProperty('id') || !data['id']) {
			console.warn('A canonical identifier should be specified.');
		}
		
		// step 5 - valid duration
		
		if (data.hasOwnProperty('duration')) {
			if (!duration.test(data['duration'])) {
				console.warn('The duration must be a valid ISO 8601 duration.');
				delete(data['duration']);
			}
		}
		
		// step 6 - valid modification date
		
		if (data.hasOwnProperty('dateModified')) {
			if (!dateTime.test(data['dateModified'])) {
				console.warn('The last modified date must be a valid ISO 8601 dateTime.');
				delete(data['dateModified']);
			}
		}
		
		// step 7 - valid publication date

		if (data.hasOwnProperty('datePublished')) {
			if (!dateTime.test(data['datePublished'])) {
				console.warn('The publication date must be a valid ISO 8601 dateTime.');
				delete(data['datePublished']);
			}
		}
		
		// step 8 - well-formed languages
		
		if (data.hasOwnProperty('inLanguage')) {
			for (var i = data['inLanguage'].length - 1; i >= 0; i--) {
				if (!bcp47.test(data['inLanguage'][i])) {
					console.warn('The language tag "' + data['inLanguage'][i] + '" is not well formed.');
					data['inLanguage'].splice(i,1);
				}
			}
		}
		
		// step 9 - valid reading progression
		
		if (data.hasOwnProperty('readingProgression')) {
			if (data['readingProgression'] != 'ltr' && data['readingProgression'] != 'rtl') {
				console.warn('The reading progression must be "ltr" or "rtl".');
				data['readingProgression'] = 'ltr';
			}
		}
		else {
			data['readingProgression'] = 'ltr'
		}
		
		// step 10 - no profile extensions
		
		// step 11 - remove empty arrays
		
		for (var term in data) {
			try {
				data[term] = removeEmptyArrays(data[term]);
			}
			catch(e) {
				delete(data[term]);
			}
		}
		
		// step 12 - return data
		
		return data;
	}
	
		
	function commonDataChecks(key, value, context) {
		
		// step 1 - value category check 
		
		if (hasKnownValueCategory(key)) {
			try {
				value = valueCategoryCheck(key, value, context);
			}
			catch (e) {
				throw new Error();
			}
		}
		
		else {
			return value;
		}
		
		
		// step 2 - recursively check value
		
		if (!Array.isArray(value) && typeof(value) === 'object') {
			
			var obj_context = getContext(value);
			
			if (obj_context) {
				for (var subkey in value) {
					try {
						value[subkey] = commonDataChecks(subkey, value[subkey], obj_context);
					}
					catch(e) {
						delete(value[subkey]);
					}
				}
			}
		}
		
		if (Array.isArray(value)) {
			for (var i = 0; i < value.length; i++) {
				if (!Array.isArray(value[i]) && typeof(value[i]) === 'object') {
					var obj_context = getContext(value[i]);
					if (obj_context) {
						for (var subkey in value[i]) {
							try {
								value[i][subkey] = commonDataChecks(subkey, value[i][subkey], obj_context);
							}
							catch (e) {
								delete(value[i][subkey]);
							}
						}
					}
				}
			}
		}
		
		// step 3 - valid language and direction
		
		if (expectsLocalizableString.hasOwnProperty(key)) {
			for (var i = value.length - 1; i >= 0; i--) {
				if (!value[i].hasOwnProperty('value')) {
					value.splice(i,1);
				}
				
				if (value[i].hasOwnProperty('language')) {
					if (!bcp47.test(value[i]['language'])) {
						console.warn('Language tag is not well formed.');
						delete(value[i]['language']);
					}
				}
				if (value[i].hasOwnProperty('direction')) {
					if (value[i]['direction'] != 'ltr' && value[i]['direction'] != 'rtl') {
						console.warn('Direction must be "ltr" or "rtl".');
						delete(value[i]['direction']);
					}
				}
			} 
		}
		
		// step 4 - entity names
		
		if (expectsEntity.hasOwnProperty(key) && value.length > 0) {
			for (var i = value.length - 1; i >= 0; i--) {
				if (!value[i].hasOwnProperty('name') || value[i]['name'].length == 0) {
					console.warn('Item ' + i + ' in ' + key + ' does not have a name');
					value.splice(i,1);
				}
			}
		}
		
		// step 5 - linkedresources have url, duration and encodingFormat
		
		if (expectsLinkedResource.hasOwnProperty(key)) {
			
			for (var i = value.length - 1; i >= 0; i--) {
				
				// check urls
				if (!value[i].hasOwnProperty('url') || !value[i]['url']) {
					console.error('Resource does not have a url.');
					value.splice(i,1);
					continue;
				}
				else {
					if (!valid_url.test(value[i]['url'])) {
						console.error('Resource has invalid url "' + value[i]['url'] + '".');
						value.splice(i,1);
						continue;
					}
				}
				
				// check durations
				if (value[i].hasOwnProperty('length')) {
					if (value[i]['length'] < 0) {
						console.error('Resource lengths cannot be negative numbers.');
						delete(value[i]['length']);
					}
				}
				
				// check alternate encodingFormat
				
				if (key == 'alternate') {
					for  (var j = 0; j < value[i]['alternate'].length; j++) {
						if (!value[i]['alternate'][j].hasOwnProperty('encodingFormat')) {
							console.warn('Alternate resources should identify their media type in an encodingFormat property.');
						}
					}
				}
			}
		}
		
		// step 6 - return value
		
		return value;
	}
	
	
	function hasKnownValueCategory(key) {
		if (expectsObject.hasOwnProperty(key) 
		    || expectsEntity.hasOwnProperty(key)
		    || expectsLinkedResource.hasOwnProperty(key)
		    || expectsLocalizableString.hasOwnProperty(key)
		    || expectsLinkedResource.hasOwnProperty(key)
		    || expectsURL.hasOwnProperty(key)
		    || expectsLiteral.hasOwnProperty(key)
		    || expectsIdentifier.hasOwnProperty(key)
		    || expectsBoolean.hasOwnProperty(key)) {
			return true;
		}
		return false;
	}
	
	
	function valueCategoryCheck(key, value, context) {
	
		if (checkExpectsArray(key, context)) {
			if (!Array.isArray(value)) {
				throw new Error(key + ' requires an array of values.');
			}
			else {
				for (var i = value.length - 1; i >= 0; i--) {
					try {
						confirmCategory(key,value[i]);
					}
					catch (e) {
						value.splice(i,1);
						continue;
					}
					
					if (!Array.isArray(value[i]) && typeof(value[i]) === 'object') {
						var obj_context = getContext(value[i]);
						for (var subkey in value[i]) {
							if (hasKnownValueCategory(subkey)) {
								try {
									value[i][subkey] = valueCategoryCheck(subkey,value[i][subkey],obj_context);
								}
								catch (e) {
									console.warn(subkey + " in " + key + " has an invalid value.");
									delete(value[i][subkey]);
								}
							}
						}
					}
				}
				if (value.length == 0) {
					throw new Error(key + ' is an empty array after processing.');
				}
			}
		}
		else if (expectsObject.hasOwnProperty(key) || 
				 expectsEntity.hasOwnProperty(key) || 
				 expectsLocalizableString.hasOwnProperty(key) || 
				 expectsLinkedResource.hasOwnProperty(key)) {
				 
			if (typeof(processed[key]) !== 'object') {
				throw new Error(key + ' requires an object.');
			}
			else {
				for (var subkey in value) {
					try {
						value[subkey] = valueCategoryCheck(subkey,value[subkey],context);

					}
					catch (e) {
						console.warn(subkey + " of " + key + " has an invalid value.");
						delete(value[subkey]);
					}
				}
				if (value.keys().length == 0) {
					throw new Error(key + ' is an empty object after processing.');
				}
			}
		}
		else {
			try {
				if (!confirmCategory(key,value,context)) {
					throw new Error();
				}
			}
			catch (e) {
				throw new Error();
			}
		}
		return value;
	}
	
	
	function confirmCategory(key, value, context) {
	
		var type = typeof(value);
		
		if (checkExpectsLiteral(key,context) || expectsIdentifier.hasOwnProperty(key) || expectsURL.hasOwnProperty(key)) {
			if (type !== 'string') {
				throw new Error(key + ' requires a literal.');
			}
		}
		else if (expectsNumber.hasOwnProperty(key)) {
			if (type !== 'number') {
				throw new Error(key + ' requires a number.');
			}
		}
		else if (expectsBoolean.hasOwnProperty(key)) {
			if (type !== 'boolean') {
				throw new Error(key + ' requires a boolean.');
			}
		}
		else if (expectsLocalizableString.hasOwnProperty(key) || expectsEntity.hasOwnProperty(key) || expectsLinkedResource.hasOwnProperty(key)) {
			if (type !== 'object') {
				throw new Error(key + ' requires an object.');
			}
		}
		
		return true;
	}
	
	
	function removeEmptyArrays(value) {
		if (Array.isArray(value)) {
			if (value.length == 0) {
				throw new Error('Empty array.');
			}
			else {
				for (var i = 0; i < value.length; i++) {
					if (!Array.isArray(value[i]) && typeof(value[i]) === 'object') {
						for (var subkey in value[i]) {
							try {
								value[i][subkey] = removeEmptyArrays(value[i][subkey]);
							}
							catch(e) {
								delete(value[i][subkey]);
							}
						}
					}
				}
			}
		}
		else if (typeof(value) === 'object') {
			for (var subkey in value) {
				try {
					value[subkey] = removeEmptyArrays(value[subkey]);
				}
				catch(e) {
					delete(value[subkey]);
				}
			}
		}
		return value;
	}


	function addHTMLDefaults(processed, doc) {
		
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
				throw new Error('No reading order. Document URL could not be determined.');
			}
		}
		
		return processed;
	}
	
	
	
	function checkExpectsArray(term,context) {
		if (expectsArray.hasOwnProperty(term)) {
			for (var i = 0; i < expectsArray[term].length; i++) {
				if (expectsArray[term][i] == context) {
					return true;
				}
			}
		}
		return false;
	}
	
	function checkExpectsLiteral(key, context) {
		if (expectsLiteral.hasOwnProperty(key)) {
			for (var i = 0; i < expectsLiteral[key].length; i++) {
				if (expectsLiteral[key][i] == context) {
					return true;
				}
			}
		}
		return false;
	}
	
	
	function getContext(value) {
		if (Array.isArray(value) || typeof(value) !== 'object') {
			return '';
		}
		if (value.hasOwnProperty('type')) {
			for (var k = 0; k < value['type'].length; k++) {
				if (value['type'][k] == 'Person' || value['type'][k] == 'Organization' || value['type'][k] == 'LinkedResource') {
					return value['type'][k];
				}
			}
		}
		return '';
	}
	
	
	


	return {
		generateInternalRep: function(manifest_link) {
			generateInternalRep(manifest_link);
		}
	}

})();

