
'use strict';

var manifestProcessor = (function() {

	var absolute_url = new RegExp('^https?://', 'i');
	var valid_url = new RegExp('^([a-z\\d]+:\\/\\/)?(((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|localhost)|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$','i');
	var duration = new RegExp('^P([0-9]+(?:[,\.][0-9]+)?Y)?([0-9]+(?:[,\.][0-9]+)?M)?([0-9]+(?:[,\.][0-9]+)?D)?(?:T([0-9]+(?:[,\.][0-9]+)?H)?([0-9]+(?:[,\.][0-9]+)?M)?([0-9]+(?:[,\.][0-9]+)?S)?)?$');
	var bcp47 = new RegExp('^((?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?:([A-Za-z]{2,3}(-(?:[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?:[A-Za-z]{4}))?(-(?:[A-Za-z]{2}|[0-9]{3}))?(-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?:[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?:x(-[A-Za-z0-9]{1,8})+))?)|(?:x(-[A-Za-z0-9]{1,8})+))$');
	// regex works for general cases, but haven't tested in depth 
	var dateTime = new RegExp('^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])(T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]{3})?(Z)?)?$');
	
	var knownProfiles = {
		'https://www.w3.org/TR/audiobooks': 'audiobooks'
	};
	
	var bodyRelValues = new Set('contents', 'cover', 'pagelist');
	
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
		'alternate': ['LinkedResource']
	};
	
	var expectsURL = {
		'url': ['', 'Person', 'Organization', 'LinkedResource'],
		'address': ['']
	};
	
	var expectsLiteral = {
		'type': ['', 'Person', 'Organization', 'LinkedResource'],
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
	
		// step 1 - create processed object
		
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
		
		// non-spec steps to make valid json output
		
		// convert the set used to hold the unique resources to an array
		processed['uniqueResources'] =  Array.from(processed['uniqueResources']);

		
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
		
		if (checkExpectsValue('Array', key, context)) {
			if (!Array.isArray(value)) {
				normalized = [value];
			}
		}
		
		// steb 4 - expand entity names
		
		if (checkExpectsValue('Entity', key, context)) {
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
					console.warn(key + 'requires a string or entity. Found ' + typeof(normalized[i]) + '. Removing from array.');
					normalized.splice(i,1);
				}
				else {
					if (normalized[i].hasOwnProperty('type')) {
						if (!checkHasType(normalized[i]['type'], 'Person') && !checkHasType(normalized[i]['type'], 'Organization')) {
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
		
		if (checkExpectsValue('LocalizableString', key, context)) {
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
		
		// step 6 - convert strings to linkedresources
		
		if (checkExpectsValue('LinkedResource', key, context)) {
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
						if (!checkHasType(normalized[i]['type'], 'LinkedResource')) {
							normalized[i]['type'].push('LinkedResource');
						}
					}
					else {
						normalized[i]['type'] = ['LinkedResource'];
					}
				}
			}
		}
		
		// step 7 - convert relative URLs

		if (checkExpectsValue('URL', key, context)) {
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
		
		// step 8 - no extension steps
		
		// step 9 - recursively update values
		
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
				data[key] = globalDataChecks(key, data[key], ''); 
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
		
		// step 10 - get list of unique URLs
		
		var readingOrderURLs = data.hasOwnProperty('readingOrder') ? getUniqueURLs(data['readingOrder']) : new Set();
		
		var resourcesURLs = data.hasOwnProperty('resources') ? getUniqueURLs(data['resources']) : new Set();
		
		data['uniqueResources'] =  union(readingOrderURLs, resourcesURLs);
		
		// step 11 - check links
		
		if (data['links']) {
			for (var i = data['links'].length - 1; i >= 0; i--) {
				var url = data['links'][i]['url'];
				if (data['uniqueResources'].has(url)) {
					console.warn('Linked resource ' + url + ' cannot also be publication resources.');
					data['links'].splice(i,1);
					continue;
				}
				if (data['links'][i].hasOwnProperty('rel')) {
					for (var j = 0; j < data['links'][i]['rel'].length; j++) {
						if (bodyRelValues.has(data['links'][i]['rel'][j])) {
							console.warn('Link relation ' + data['links'][i]['rel'][j] + ' cannot also be used in the links section.');
							data['links'].splice(i,1);
							break;
						}
					}
				}
			}
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
	
		
	function globalDataChecks(term, value, context) {
		
		// step 1 - value category check 
		
		if (hasKnownValueCategory(term)) {
			try {
				value = verifyValueCategory(term, value, context);
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
				for (var key in value) {
					try {
						value[key] = globalDataChecks(key, value[key], obj_context);
					}
					catch(e) {
						delete(value[key]);
					}
				}
			}
		}
		
		else if (Array.isArray(value)) {
			for (var i = 0; i < value.length; i++) {
				if (!Array.isArray(value[i]) && typeof(value[i]) === 'object') {
					var obj_context = getContext(value[i]);
					if (obj_context) {
						for (var key in value[i]) {
							try {
								value[i][key] = globalDataChecks(key, value[i][key], obj_context);
							}
							catch (e) {
								delete(value[i][key]);
							}
						}
					}
				}
			}
		}
		
		// step 3 - valid language and direction
		
		if (expectsLocalizableString.hasOwnProperty(term)) {
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
		
		if (expectsEntity.hasOwnProperty(term) && value.length > 0) {
			for (var i = value.length - 1; i >= 0; i--) {
				if (!value[i].hasOwnProperty('name') || value[i]['name'].length == 0) {
					console.warn('Item ' + i + ' in ' + term + ' does not have a name');
					value.splice(i,1);
				}
			}
		}
		
		// step 5 - linkedresources have url, duration and encodingFormat
		
		if (expectsLinkedResource.hasOwnProperty(term)) {
			
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
	
	
	function verifyValueCategory(term, value, context) {
	
		// step 1 - check values in arrays
		
		if (checkExpectsValue('Array', term, context)) {
			if (!Array.isArray(value)) {
				throw new Error(term + ' requires an array of values.');
			}
			else {
				for (var i = value.length - 1; i >= 0; i--) {
					try {
						confirmCategory(term,value[i]);
					}
					catch (e) {
						value.splice(i,1);
						continue;
					}
					
					if (!Array.isArray(value[i]) && typeof(value[i]) === 'object') {
						var obj_context = getContext(value[i]);
						for (var key in value[i]) {
							if (hasKnownValueCategory(key)) {
								try {
									value[i][key] = verifyValueCategory(key,value[i][key],obj_context);
								}
								catch (e) {
									console.warn(key + " in " + term + " has an invalid value.");
									delete(value[i][key]);
								}
							}
						}
					}
				}
				if (value.length == 0) {
					throw new Error(term + ' is an empty array after processing.');
				}
			}
		}
		else if (expectsObject.hasOwnProperty(term) || 
				 expectsEntity.hasOwnProperty(term) || 
				 expectsLocalizableString.hasOwnProperty(term) || 
				 expectsLinkedResource.hasOwnProperty(term)) {
				 
			if (typeof(processed[term]) !== 'object') {
				throw new Error(term + ' requires an object.');
			}
			else {
				for (var key in value) {
					try {
						value[key] = verifyValueCategory(key,value[key],context);
					}
					catch (e) {
						console.warn(key + " of " + term + " has an invalid value.");
						delete(value[key]);
					}
				}
				if (value.keys().length == 0) {
					throw new Error(term + ' is an empty object after processing.');
				}
			}
		}
		else {
			try {
				if (!confirmCategory(term,value,context)) {
					throw new Error();
				}
			}
			catch (e) {
				throw new Error();
			}
		}
		return value;
	}
	
	
	function confirmCategory(term, value, context) {
	
		var type = typeof(value);
		
		if (checkExpectsValue('Literal', term, context) || checkExpectsValue('Identifier', term, context) || checkExpectsValue('URL', term, context)) {
			if (type !== 'string') {
				throw new Error(term + ' requires a literal.');
			}
		}
		else if (checkExpectsValue('Number', term, context)) {
			if (type !== 'number') {
				throw new Error(term + ' requires a number.');
			}
		}
		else if (checkExpectsValue('Boolean', term, context)) {
			if (type !== 'boolean') {
				throw new Error(term + ' requires a boolean.');
			}
		}
		else if (checkExpectsValue('LocalizableString', term, context) || checkExpectsValue('Entity', term, context) || checkExpectsValue('LinkedResource', term, context)) {
			if (type !== 'object') {
				throw new Error(term + ' requires an object.');
			}
		}
		
		return true;
	}
	
	
	function getUniqueURLs(resources) {
		
		// step 1 - new set
		
		var uniqueURLs = new Set();
		
		// step 2 - iterate urls and warn if duplicates
		
		for (var i = 0; i < resources.length; i++) {
			
			var url = resources[i]['url'].split('#')[0];
			
			if (uniqueURLs.has(url)) {
				console.warn('Duplicate resource ' + url + ' declared.')
			}
			else {
				uniqueURLs.add(url);
			}
			
			if (resources[i].hasOwnProperty('alternate')) {
				for (var j = 0; j < resources[i]['alternate'].length; j++) {
					var alt_url = resources[i]['alternate'][j];
					
					if (uniqueURLs.has(alt_url)) {
						console.warn('Duplicate alternate resource ' + url + ' declared.')
					}
					else {
						uniqueURLs.add(alt_url);
					}
				}
			}
		}
		
		// step 3 return unique urls
		
		return uniqueURLs;
	}
	
	
	function removeEmptyArrays(value) {
		if (Array.isArray(value)) {
			if (value.length == 0) {
				throw new Error('Empty array.');
			}
			else {
				for (var i = 0; i < value.length; i++) {
					if (!Array.isArray(value[i]) && typeof(value[i]) === 'object') {
						for (var key in value[i]) {
							try {
								value[i][key] = removeEmptyArrays(value[i][key]);
							}
							catch(e) {
								delete(value[i][key]);
							}
						}
					}
				}
			}
		}
		else if (typeof(value) === 'object') {
			for (var key in value) {
				try {
					value[key] = removeEmptyArrays(value[key]);
				}
				catch(e) {
					delete(value[key]);
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
	
	
	
	function checkExpectsValue(category, term, context) {
		
		var contexts;
		
		switch (category) {
			case "Array":
				contexts = expectsArray.hasOwnProperty(term) ? expectsArray[term] : [];
				break;
			case "Entity":
				contexts = expectsEntity.hasOwnProperty(term) ? expectsEntity[term] : [];
				break;
			case "LinkedResource":
				contexts = expectsLinkedResource.hasOwnProperty(term) ? expectsLinkedResource[term] : [];
				break;
			case "LocalizableString":
				contexts = expectsLocalizableString.hasOwnProperty(term) ? expectsLocalizableString[term] : [];
				break;
			case "URL":
				contexts = expectsURL.hasOwnProperty(term) ? expectsURL[term] : [];
				break;
			case "Literal":
				contexts = expectsLiteral.hasOwnProperty(term) ? expectsLiteral[term] : [];
				break;
			case "Boolean":
				contexts = expectsBoolean.hasOwnProperty(term) ? expectsBoolean[term] : [];
				break;
			case "Identifier":
				contexts = expectsIdentifier.hasOwnProperty(term) ? expectsIdentifier[term] : [];
				break;
			case "Number":
				contexts = expectsNumber.hasOwnProperty(term) ? expectsNumber[term] : [];
				break;
			case "Object":
				contexts = expectsObject.hasOwnProperty(term) ? expectsObject[term] : [];
				break;
			default:
				contexts = [];
		}
		
		for (var i = 0; i < contexts.length; i++) {
			if (contexts[i] == context) {
				return true;
			}
		}
		
		return false;
	}
	
	
	function checkHasType(types, type) {
		for (var j = 0; j < types.length; j++) {
			if (types[j] == type) {
				return true;
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

	
	function union(setA, setB) {
		var _union = new Set(setA);
		for (var elem of setB) {
		    _union.add(elem);
		}
		return _union;
	}
