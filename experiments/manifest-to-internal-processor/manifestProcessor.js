
'use strict';

var manifestProcessor = (function() {

	var _internal_rep = null;
	var _manifest_link = '';
	var _toc = null;
	
	var _issues = {
		'warnings' : [],
		'errors' : []
	};
	
	var duration = new RegExp('^P([0-9]+(?:[,\.][0-9]+)?Y)?([0-9]+(?:[,\.][0-9]+)?M)?([0-9]+(?:[,\.][0-9]+)?D)?(?:T([0-9]+(?:[,\.][0-9]+)?H)?([0-9]+(?:[,\.][0-9]+)?M)?([0-9]+(?:[,\.][0-9]+)?S)?)?$');
	var bcp47 = new RegExp('^((?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?:([A-Za-z]{2,3}(-(?:[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?:[A-Za-z]{4}))?(-(?:[A-Za-z]{2}|[0-9]{3}))?(-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?:[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?:x(-[A-Za-z0-9]{1,8})+))?)|(?:x(-[A-Za-z0-9]{1,8})+))$');
	// regex works for general cases, but haven't tested in depth 
	var dateTime = new RegExp('^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])(T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]{3})?(Z)?)?$');
	
	var knownProfiles = {
		'https://www.w3.org/TR/audiobooks/': 'audiobooks',
		'https://www.w3.org/TR/pub-manifest/': 'generic'
	};
	
	var bodyRelValues = new Set(['contents', 'cover', 'pagelist']);
	
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
		'accessibilitySummary': [''],
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
		'duration': ['', 'LinkedResource'],
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
	
	var expectsNumber = {};
	
	var _flags = {};
	
	function processManifest(init) {
		
		_issues.warnings = [];
		_issues.errors = [];
		
		if (!init) {
			init = {};
		}
		
		if (init.hasOwnProperty('flags')) {
			_flags = init.flags;
		}
		
		var test = {};
		
		if (init.hasOwnProperty('test')) {
			test = init.test;
		}
		
		if (init.hasOwnProperty('manifest_link')) {
			_manifest_link = init.manifest_link;
		}
		
		else {
			var mlink = document.querySelector('link[rel="publication"]');
			if (mlink) {
				_manifest_link = mlink.href;
			}
		}
		
		if (!_manifest_link) {
			throw new Error('Manifest link could not be found.');
		}
		
		getManifest();
		
	}
	
	
	function getManifest() {
		
		return new Promise(function(resolve, reject) {
		
			if (_manifest_link) {
				if (_manifest_link.indexOf('#') != -1) {
					var script = document.getElementById(_manifest_link.substring(_manifest_link.indexOf('#')+1));
					if (script) {
						var data = script.innerHTML.trim();
						generateInternalRep(data);
					}
					else {
						console.error('Manifest ' + _manifest_link + ' could not be located');
					}
				}
				else {
					$.ajax({
						url:       _manifest_link,
						cache:     false,
						success: function(data) {
							generateInternalRep(JSON.stringify(data));
						},
						error: function(xhr, status, error) {
							console.error('Manifest ' + _manifest_link + ' not found or an error occurred retrieving.');
						}
					});
				}
			}
			
			else {
				console.error('Manifest link could not be located');
			}
		});
	}
	
	
	
	function generateInternalRep(data) {
		
		(function(){
			var warn = console.warn;
			console.warn = function (msg) {
				_issues.warnings.push(msg);
				warn.apply(console, arguments);
			};
			var error = console.error;
			console.error = function (msg) {
				_issues.errors.push(msg);
				error.apply(console, arguments);
			};
		})();
		
		if (!data) {
			console.error('Manifest text not found.');
			throw new Error();
		}
		
		var base = '';
		var doc_path = [location.protocol, '//', location.host, location.pathname].join('');;
		
		if (_manifest_link.indexOf(doc_path) == 0 || _manifest_link.indexOf('#') == 0) {
			// manifest is embedded
			base = location.href.substring(0, location.href.lastIndexOf("/")+1);
			
			var baseElem = document.getElementsByTagName("base");
			
			if (baseElem.length) {
				base = baseElem[0].href;
			}
		}
		
		else  {
			// use the manifest path
			base = _manifest_link.substring(0, location.href.lastIndexOf("/")+1);
		}
		
		var doc = document;
		
		processManifestData(data, base, doc);
		
		processTOC();
	}
	
	
	
	function processManifestData(text, base, doc) {
	
		// step 1 - create processed object
		
		var processed = {};
		
		// step 2 - parse json
		
		var manifest;
		
		try {
			manifest = JSON.parse(text);
			if (Array.isArray(manifest) || typeof(manifest) !== 'object') {
				console.error('The manifest must be a JSON object.');
				return null;
			}
		}
		
		catch (e) {
			console.error('Error parsing manifest: ' + e);
			return null;
		}
		
		// step 3 - manifest contexts
		
		if (!manifest.hasOwnProperty('@context')) {
			console.error('@context not set.');
			return null;
		}
		
		if (!Array.isArray(manifest['@context'])) {
			console.error('@context is not an array.');
			return null;
		}
		
		if (manifest['@context'][0] != 'https://schema.org' || manifest['@context'][1] != 'https://www.w3.org/ns/pub-context') {
			console.error('First two declarations in @context must be "https://schema.org" and "https://www.w3.org/ns/pub-context"');
			return null;
		}
		
		// step 4 - profile conformance
		
		if (!manifest.hasOwnProperty('conformsTo')) {
			console.error('No profile specified. (No testing for compatible profiles in this processor.)');
			return null;
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
				return null;
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
				return null;
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
					dir = manifest['@context'][i]['direction'];
				}
				if (lang != '' && dir != '') {
					break;
				}
			}
			
			if (lang && !bcp47.test(lang)) {
				console.error('Invalid global language tag "' + lang + '" found.');
				lang = '';
			}
			
			if (dir && (dir != 'ltr' && dir != 'rtl')) {
				console.error('Invalid global direction "' + dir + '" found.');
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
		
		try {
			processed = dataValidation(processed);
		}
		
		catch(e) {
			console.error('Terminating processing.');
			return null;
		}
		
		// step 8 - profile extensions
		
		if (processed['profile'] == 'https://www.w3.org/TR/audiobooks/') {
			
			// step 1 - check table of contents
			if (!doc || !doc.querySelector('*[role="doc-toc"]')) {
				var toc = false;
				if (processed.hasOwnProperty('resources')) {
					res: for (var i = 0; i < processed['resources'].length; i++) {
						if (processed['resources'][i].hasOwnProperty('rel')) {
							for (var j = 0; j < processed['resources'][i]['rel'].length; j++) {
								if (processed['resources'][i]['rel'][j].toLowerCase() == 'contents') {
									toc = true;
									break res;
								}
							}
						}
					}
				}
				if (!toc) {
					console.warn('No table of contents found in the publication.');
				}
			}
			
			// step 2 - check durations
			
			var resourceDuration = 0;
			
			for (var e = 0; e < processed['readingOrder'].length; e++) {
				if (processed['readingOrder'][e].hasOwnProperty('duration')) {
					try {
						var dur = new Duration(processed['readingOrder'][e]['duration']);
						resourceDuration += dur.inSeconds();
					}
					catch (e) {
						console.warn('Problem parsing duration ' + processed['readingOrder'][e]['duration']);
					}
				}
				else {
					console.warn('Entries in the reading order should specify their duration.');
				}
			}
			
			if (processed.hasOwnProperty('duration')) {
				var totalDuration;
				try { 
					var tdur = new Duration(processed['duration']);
					totalDuration = tdur.inSeconds();
					
					if (totalDuration != resourceDuration) {
						console.warn('Total duration ' + totalDuration + ' does not equal the sum of the resource durations ' + resourceDuration);
					}
				}
				catch (e) {
					console.warn('Something bad happened parsing the total duration ' + processed['duration']);
				}
			}
			else {
				console.warn('Total duration not specified. Cannot verify the sum duration of the individual resources.');
			}
		}
		
		// step 9 - add html defaults
		
		try {
			processed = addHTMLDefaults(processed, doc);
		}
		catch(e) {
			console.error('Terminating processing.');
			return null;
		}
		
		// non-spec steps to make valid json output
		
		// convert the set used to hold the unique resources to an array
		processed['uniqueResources'] =  Array.from(processed['uniqueResources']);

		
		// step 10 - return finished data 
		
		_internal_rep = processed;
	
	}
	
	
	function normalizeData(key, value, lang, dir, base, context) {
		
		// step 1 - set normalized to the incoming value
		
		var normalized = value;
		
		// step 2 - remove @context
		
		if (key == '@context') {
			throw new Error();
		}
		
		// step 3 - create arrays
		
		if (checkExpectsArray(key, context)) {
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
					console.error(key + 'requires a string or entity. Found ' + typeof(normalized[i]) + '. Removing from array.');
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
					console.error('Non-string value found in ' + key + '.');
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
					try {
						normalized[i] = {"type": ["LinkedResource"], "url": convertAbsoluteURL(normalized[i], base)};
					}
					catch(e) {
						console.error('Invalid absolute URL generated from ' + normalized[i]);
						normalized.splice(i,1);
					}
				}
				else if (Array.isArray(normalized[i]) || type !== 'object') {
					console.error(key + ' requires only strings or objects in its array. Found ' + type + '. Removing from array.');
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
				console.error('Invalid data type "' + type + '" for URL.');
				throw new Error();
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
			var url = new URL(data, base);
			return url.toString()
		}
		else {
			console.error(key + ' requires a string. Found ' + type + '.');
			throw new Error();
		}
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
		
		// step 2 - profile extensions
		
		if (data['profile'] == 'https://www.w3.org/TR/audiobooks/') {
			
			// step 1 - default reading order
			
			if (!data.hasOwnProperty('readingOrder') || data['readingOrder'].length == 0) {
				console.error('Audiobook must have a reading order');
				throw new Error();
			}
			
			else {
				var audioType = new RegExp('^audio\/');
				
				for (var i = data['readingOrder'].length - 1; i >= 0; i--) {
					if (data['readingOrder'][i].hasOwnProperty('encodingFormat')) {
						if (!audioType.test(data['readingOrder'][i]['encodingFormat'])) {
							console.error('Audiobook cannot have non-audio resources in the reading order.');
							data['readingOrder'].splice(i,1);
						}
					}
					
					else {
						if (_flags.hasOwnProperty('skipAudioInReadingOrder')) {
							console.info('Audiobook media sniffing in reading order was skipped. Check manually.');
						}
						else {
							var isAudio = new Audio(data['readingOrder'][i]['url']);
							if (!isAudio.duration) {
								console.error('Audiobook cannot have non-audio resources in the reading order.');
								data['readingOrder'].splice(i,1);
							}
						}
					}
				}
			}
			
			if (data['readingOrder'].length == 0) {
				console.error('Audiobook must have a reading order');
				throw new Error();
			}
			
			
			// step 2 - publication type
			
			if (!data.hasOwnProperty('type') || data['type'].length == 0) {
				console.warn('type should be specified. Setting to Audiobook.');
				data['type'] = ['Audiobook'];
			}
			
			
			// step 3 - recommended properties
			
			if (!data.hasOwnProperty('abridged')) {
				console.warn('abridged is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('accessMode')) {
				console.warn('accessMode is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('accessModeSufficient')) {
				console.warn('accessModeSufficient is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('accessibilityFeature')) {
				console.warn('accessibilityFeature is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('accessibilityHazard')) {
				console.warn('accessibilityHazard is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('accessibilitySummary')) {
				console.warn('accessibilitySummary is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('url')) {
				console.warn('address is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('author')) {
				console.warn('author is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('dateModified')) {
				console.warn('dateModified is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('datePublished')) {
				console.warn('datePublished is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('duration')) {
				console.warn('duration is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('id')) {
				console.warn('id is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('inLanguage')) {
				console.warn('inLanguage is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('name')) {
				console.warn('name is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('readBy')) {
				console.warn('readBy is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('readingProgression')) {
				console.warn('readingProgression is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('resources')) {
				console.warn('resource is a recommended property for audiobooks.');
			}
			
			if (!data.hasOwnProperty('type')) {
				console.warn('type is a recommended property for audiobooks.');
			}
			
			// step 3 - recommended resource info
			
			var reslist = ['readingOrder','resources'];
			var cover = false;
			
			for (var n = 0; n < reslist.length; n++) {
			
				if (data.hasOwnProperty(reslist[n])) {
				
					var resource = data[reslist[n]];
					
					for (var p = 0; p < resource.length; p++) {
						
						// check if the cover
						if (resource[p].hasOwnProperty('rel')) {
							for (var q = 0; q < resource[p]['rel'].length; q++) {
								if (resource[p]['rel'][q].toLowerCase() == 'cover') {
									cover = true;
								}
							}
						}
					}
				}
			}
			
			if (!cover) {
				console.warn('A resource designated as the cover was not found.');
			}
		}
		
		// step 3 - check type is set
		
		if (!data.hasOwnProperty('type') || data['type'].length == 0) {
			console.warn('Publication type not set.');
			data['type'] = ['CreativeWork'];
		}
		
		// step 4 - validate accessModeSufficient itemlists
		
		if (data.hasOwnProperty('accessModeSufficient')) {
			for (var i = data['accessModeSufficient'].length - 1; i >= 0; i--) {
				if (!data['accessModeSufficient'][i].hasOwnProperty('type') || data['accessModeSufficient'][i]['type'] != 'ItemList') {
					console.error('accessModeSufficient must only contain ItemList objects.');
					data['accessModeSufficient'].splice(i,1);
				}
			}
		}
		
		// step 5 - canonical id
		
		if (!data.hasOwnProperty('id') || !data['id']) {
			console.warn('A canonical identifier should be specified.');
		}
		
		else {
			try {
				var canonical = new URL(data['id']);
			}
			catch(e) {
				console.warn('The canonical identifier is not a valid URL.');
				delete(data['id']);
			}
		}
		
		// step 6 - valid duration
		
		if (data.hasOwnProperty('duration')) {
			if (!duration.test(data['duration'])) {
				console.error('The duration must be a valid ISO 8601 duration.');
				delete(data['duration']);
			}
		}
		
		// step 7 - valid modification date
		
		if (data.hasOwnProperty('dateModified')) {
			if (!dateTime.test(data['dateModified'])) {
				console.error('The last modified date must be a valid ISO 8601 dateTime.');
				delete(data['dateModified']);
			}
		}
		
		// step 8 - valid publication date

		if (data.hasOwnProperty('datePublished')) {
			if (!dateTime.test(data['datePublished'])) {
				console.error('The publication date must be a valid ISO 8601 dateTime.');
				delete(data['datePublished']);
			}
		}
		
		// step 9 - well-formed languages
		
		if (data.hasOwnProperty('inLanguage')) {
			for (var i = data['inLanguage'].length - 1; i >= 0; i--) {
				if (!bcp47.test(data['inLanguage'][i])) {
					console.error('The language tag "' + data['inLanguage'][i] + '" is not well formed.');
					data['inLanguage'].splice(i,1);
				}
			}
		}
		
		// step 10 - valid reading progression
		
		if (data.hasOwnProperty('readingProgression')) {
			if (data['readingProgression'] != 'ltr' && data['readingProgression'] != 'rtl') {
				console.error('The reading progression must be "ltr" or "rtl".');
				data['readingProgression'] = 'ltr';
			}
		}
		else {
			data['readingProgression'] = 'ltr'
		}
		
		// step 11 - get list of unique URLs
		
		var readingOrderURLs = data.hasOwnProperty('readingOrder') ? getUniqueURLs(data['readingOrder']) : new Set();
		
		var resourcesURLs = data.hasOwnProperty('resources') ? getUniqueURLs(data['resources']) : new Set();
		
		data['uniqueResources'] =  union(readingOrderURLs, resourcesURLs);
		
		// step 12 - check links
		
		if (data['links']) {
			for (var i = data['links'].length - 1; i >= 0; i--) {
				
				var url = data['links'][i]['url'].replace(/[#?].*$/, '');
				
				if (data['uniqueResources'].has(url)) {
					console.error('Linked resource ' + data['links'][i]['url'] + ' cannot also be a publication resource.');
					data['links'].splice(i,1);
					continue;
				}
				
				if (data['links'][i].hasOwnProperty('rel')) {
					for (var j = 0; j < data['links'][i]['rel'].length; j++) {
						var rel = data['links'][i]['rel'][j].toLowerCase();
						if (bodyRelValues.has(rel)) {
							console.error('Link relation ' + rel + ' must not appear in the links section.');
							data['links'].splice(i,1);
							break;
						}
					}
				}
				else {
					console.error('Resource ' + data['links'][i]['url'] + ' in the links section does not specify a rel value.');
				}
			}
		}
		
		// step 13 - structural resource checks
		
		
		var relres = data.hasOwnProperty('readingOrder') ? data['readingOrder'] : [];
		
		if (data.hasOwnProperty('resources')) {
			relres = relres.concat(data['resources']);
		}
		
		var rel_flags = {'cover' : false, 'pagelist': false, 'contents': false};
		var imageType = new RegExp('image/');
		
		if (relres.length) {
			for (var u = 0; u < relres.length; u++) {
				if (relres[u].hasOwnProperty('rel')) {
					for (var b = 0; b < relres[u]['rel'].length; b++) {
						var rel = relres[u]['rel'][b].toLowerCase();
						if (rel_flags.hasOwnProperty(rel)) {
							if (rel_flags[rel]) {
								console.error('Link relation ' + rel + ' specified multiple times.');
							}
							else {
								rel_flags[rel] = true;
							}
						}
						
						if (rel == 'cover') {
							if (relres[u].hasOwnProperty('encodingFormat')) {
								if (imageType.test(relres[u].encodingFormat)) {
									if (!relres[u].hasOwnProperty('name')) {
										console.warn('Cover image should include alternative text in a name property.');
									}
								}
							}
						}
					}
				}
			}
		}
		
		// step 14 - remove empty arrays
		
		for (var term in data) {
			try {
				data[term] = removeEmptyArrays(data[term]);
			}
			catch(e) {
				delete(data[term]);
			}
		}
		
		// step 15 - return data
		
		return data;
	}
	
		
	function globalDataChecks(term, value, context) {
		
		// step 1 - value category check 
		
		if (hasKnownValueCategory(term, context)) {
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
					try
					{
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
						console.error('Language tag is not well formed.');
						delete(value[i]['language']);
					}
				}
				if (value[i].hasOwnProperty('direction')) {
					if (value[i]['direction'] != 'ltr' && value[i]['direction'] != 'rtl') {
						console.error('Direction must be "ltr" or "rtl".');
						delete(value[i]['direction']);
					}
				}
			} 
		}
		
		// step 4 - entity names
		
		if (expectsEntity.hasOwnProperty(term) && value.length > 0) {
			for (var i = value.length - 1; i >= 0; i--) {
				if (!value[i].hasOwnProperty('name') || value[i]['name'].length == 0) {
					console.error('Item ' + i + ' in ' + term + ' does not have a name');
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
					var url = new URL(value[i]['url']);
					
					if (!url.host) {
						console.error('Resource has invalid url "' + value[i]['url'] + '".');
						value.splice(i,1);
						continue;
					}
				}
				
				// check durations
				if (value[i].hasOwnProperty('duration')) {
					if (!duration.test(value[i]['duration'])) {
						console.error('Invalid duration "' + value[i]['duration'] + '" specified on linked resource.');
						delete(value[i]['duration']);
					}
				}
			}
		}
		
		// step 6 - return value
		
		return value;
	}
	
	
	function hasKnownValueCategory(key, context) {
		
		if (context === null) {
			return false;
		}
		
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
		
		if (checkExpectsArray(term, context)) {
			if (!Array.isArray(value)) {
				console.error(term + ' requires an array of values.');
				throw new Error();
			}
			else {
				for (var i = value.length - 1; i >= 0; i--) {
					try {
						confirmCategory(term, value[i], '');
					}
					catch (e) {
						value.splice(i,1);
						continue;
					}
					
					if (!Array.isArray(value[i]) && typeof(value[i]) === 'object') {
						var obj_context = getContext(value[i]);
						for (var key in value[i]) {
							if (hasKnownValueCategory(key, obj_context)) {
								try {
									value[i][key] = verifyValueCategory(key, value[i][key], obj_context);
								}
								catch (e) {
									console.error(key + " in " + term + " has an invalid value.");
									delete(value[i][key]);
								}
							}
						}
					}
				}
				if (value.length == 0) {
					console.error(term + ' is an empty array after processing.');
					throw new Error();
				}
			}
		}
		else if (expectsObject.hasOwnProperty(term) || 
				 expectsEntity.hasOwnProperty(term) || 
				 expectsLocalizableString.hasOwnProperty(term) || 
				 expectsLinkedResource.hasOwnProperty(term)) {
			
			if (typeof(processed[term]) !== 'object') {
				console.error(term + ' requires an object.');
				throw new Error();
			}
			else {
				for (var key in value) {
					try {
						value[key] = verifyValueCategory(key, value[key], context);
					}
					catch (e) {
						console.error(key + " of " + term + " has an invalid value.");
						delete(value[key]);
					}
				}
				if (value.keys().length == 0) {
					console.error(term + ' is an empty object after processing.');
					throw new Error();
				}
			}
		}
		else {
			try {
				if (!confirmCategory(term, value, context)) {
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
		var expected_type = getExpectedType(term, context);
		
		if (expected_type == 'string' && type !== 'string') {
			console.error(term + ' requires a literal.');
			throw new Error();
		}
		else if (expected_type == 'number' && type !== 'number') {
			console.error(term + ' requires a number.');
			throw new Error();
		}
		else if (expected_type == 'boolean' && type !== 'boolean') {
			console.error(term + ' requires a boolean.');
			throw new Error();
		}
		else if (expected_type == 'object' && type !== 'object') {
			console.error(term + ' requires an object.');
			throw new Error();
		}
		
		return true;
	}
	
	
	
	function getExpectedType(term, context) {
		if (checkExpectsValue('Literal', term, context) || checkExpectsValue('Identifier', term, context) || checkExpectsValue('URL', term, context)) {
			return 'string';
		}
		else if (checkExpectsValue('Number', term, context)) {
			return 'number';
		}
		else if (checkExpectsValue('Boolean', term, context)) {
			return 'boolean';
		}
		else if (checkExpectsValue('LocalizableString', term, context) || checkExpectsValue('Entity', term, context) || checkExpectsValue('LinkedResource', term, context) || checkExpectsValue('Object', term, context)) {
			return 'object';
		}
		return '';
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
				console.error('Empty array.');
				throw new Error();
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
		
		// step 1 -- add html title if name is missing
		
		if (!processed.hasOwnProperty('name')) {
		
			var title = doc ? doc.title : '';
			
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
				console.warn('Publication should specify a name. Automatically generating one.');
				processed.name.value = 'Untitled Publication';
				processed.name.language = 'en';
				processed.name.direction = 'ltr';
			}
		}
		
		// step 2 -- add linking document to the reading order
		
		if (!processed.hasOwnProperty('readingOrder')) {
			if (doc && doc.location.href) {
				processed.readingOrder = [{
					"url": doc.location.href
				}];
				processed.uniqueResources.add(doc.location.href)
			}
			else {
				console.error('No reading order. Document URL could not be determined.');
				throw new Error();
			}
		}
		
		// step 3 -- extension steps
		
		// none currently
		
		// step 4 -- check linking document in resources
		
		if (doc && doc.location.href && !processed.uniqueResources.has(doc.location.href)) {
			console.error('The page that links to the manifest must be a publication resource.');
		}
		
		return processed;
	}
	
	
	function checkExpectsArray(term, context) {
		if (expectsArray.hasOwnProperty(term)) {
			for (var i = 0; i < expectsArray[term].length; i++) {
				if (expectsArray[term][i] == context) {
					return true;
				}
			}
		}
		return false;
	}
	
	
	
	function checkExpectsValue(category, term, context) {
		
		var contexts;
		
		switch (category) {
			case "Entity":
				contexts = expectsEntity.hasOwnProperty(term) ? expectsEntity[term] : null;
				break;
			case "LinkedResource":
				contexts = expectsLinkedResource.hasOwnProperty(term) ? expectsLinkedResource[term] : null;
				break;
			case "LocalizableString":
				contexts = expectsLocalizableString.hasOwnProperty(term) ? expectsLocalizableString[term] : null;
				break;
			case "URL":
				contexts = expectsURL.hasOwnProperty(term) ? expectsURL[term] : null;
				break;
			case "Literal":
				contexts = expectsLiteral.hasOwnProperty(term) ? expectsLiteral[term] : null;
				break;
			case "Boolean":
				contexts = expectsBoolean.hasOwnProperty(term) ? expectsBoolean[term] : null;
				break;
			case "Identifier":
				contexts = expectsIdentifier.hasOwnProperty(term) ? expectsIdentifier[term] : null;
				break;
			case "Number":
				contexts = expectsNumber.hasOwnProperty(term) ? expectsNumber[term] : null;
				break;
			case "Object":
				contexts = expectsObject.hasOwnProperty(term) ? expectsObject[term] : null;
				break;
			default:
				contexts = null;
		}
		
		if (contexts !== null) {
			for (var i = 0; i < contexts.length; i++) {
				if (contexts[i] == context) {
					return true;
				}
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
			return null;
		}
		if (value.hasOwnProperty('type')) {
			for (var k = 0; k < value['type'].length; k++) {
				if (value['type'][k] == 'Person' || value['type'][k] == 'Organization' || value['type'][k] == 'LinkedResource' || value['type'][k] == 'ItemList') {
					return value['type'][k];
				}
			}
		}
		return null;
	}


    function processTOC() {
    
    	var toc_markup;
    	
    	// get the toc resource
    	
    	var resources = _internal_rep.hasOwnProperty('readingOrder') ? _internal_rep.readingOrder : [];
    		Array.prototype.push.apply(resources, _internal_rep.hasOwnProperty('resources') ? _internal_rep.resources : []);
    	
    	var toc_str = '';
    	var toc_resource = '';
    	
    	for (var i = 0; i < resources.length; i++) {
    		if (resources[i].hasOwnProperty('rel')) {
    			for (var j = 0; j < resources[i].rel.length; j++) {
    				if (resources[i].rel[j].toLowerCase() == 'contents') {
    					toc_resource = resources[i].url;
    				}
    			}
    		}
    	}
    	
    	if (toc_resource) {
			getTOC(toc_resource);
    	}
    	
    	else {
    		var toc_element = document.querySelector("*[role~='doc-toc']");
			generateTOC(toc_element);
    	}
    }
	
	
	function generateTOC(toc) {
		if (toc) {
			parseTOC(toc,null,null);
		}
		else {
			console.error('No table of contents found.');
		}
		initPublication();
	}
	
	
	function parseTOC(root, enter, exit) {
		
		var node = root;
		
		var toc = new Object();
		var stack = new Array();
		var current_toc_branch = null;
		
		start: while (node) {
			
			if (node == root) {
				toc.name = '';
				toc.entries = new Array();
			}
			else {
				// only interested in processing start element nodes
				if (node.nodeType == 1) {
					// if process_start returns false, skip descending into the element
					if (!process_start(node)) {
						if (node.nextSibling) {
							node = node.nextSibling;
							continue start;
						}
					}
				}
			}
			
			if (node.firstChild) {
				node = node.firstChild;
				continue start;
			}
			
			while (node) {
			
				// only interested in processing end element nodes
				if (node.nodeType == 1) {
					if (node == root) {
						if (toc.entries.length == 0) {
							toc.entries = null;
						}
						_toc = (toc.entries !== null && toc.entries.length > 0) ? JSON.stringify(toc,null,3) : null;
					}
					else {
						process_end(node, root);
					}
				}
				
				if (node == root) {
					node = null;
				}
				
				else if (node.nextSibling) {
					node = node.nextSibling;
					continue start;
				}
				
				else {
					node = node.parentNode;
				}
			}
			
			
			function process_start(node) {
			
				var lc_element = node.localName.toLowerCase();
				
				// set toc name to the heading if undefined and no branches have been created yet
				if (lc_element.match(/^h[1-6]$/)) {
					if (toc.name === '' && stack.length == 0) {
						var label = node.textContent.trim();
						toc.name = label ? label : null;
					}
					return false;
				}
				
				else if (lc_element.match(/^[ou]l$/)) {
					// the toc does not have a heading if one is not discovered before the first list
					if (toc.name === '') {
						toc.name = null;
					}
					
					if (current_toc_branch !== null) {
						// skip processing if this is an additional list within a branch
						if (current_toc_branch.entries !== null && current_toc_branch.entries.length > 0) {
							return false;
						}
						else {
							stack.push(Object.assign({},current_toc_branch));
						}
					}
					
					else {
						if (stack.length == 0) {
							// skip processing if this is an additional list at the root of the nav element
							if (toc.entries !== null && toc.entries.length > 0) {
								return false;
							}
						}
					}
				}
				
				// create a new object when encountering a list item and push on current_toc_branch
				else if (lc_element == 'li') {
					
					var new_branch = new Object();
						new_branch.name = '';
						new_branch.url = '';
						new_branch.type = '';
						new_branch.rel = '';
						new_branch.entries = new Array();
					
					current_toc_branch = new_branch;
				}
				
				// set the current current_toc_branch name and url properties when encountering an a tag
				else if (lc_element == 'a') {
					if (current_toc_branch !== null) {
						if (current_toc_branch.name === '') {
							
							var label = node.textContent.trim();
							current_toc_branch.name = (label !== '') ? label : null;
							
							current_toc_branch.url = node.hasAttribute('href') ? node.getAttribute('href') : null;
							
							var type = node.hasAttribute('type') ? node.getAttribute('type').trim() : null;
							current_toc_branch.type = type ? type : null;
							
							var rel = node.hasAttribute('rel') ? node.getAttribute('rel').trim() : null;
							current_toc_branch.rel = rel ? rel : null;
						}
					}
					return false;
				}
				
				// don't descend into sectioning and sectioning root elements
				else if (lc_element == 'aside' ||
					lc_element == 'article' ||
					lc_element == 'section' ||
					lc_element == 'nav' ||
					lc_element == 'blockquote' ||
					lc_element == 'details' ||
					lc_element == 'dialog' ||
					lc_element == 'fieldset' ||
					lc_element == 'figure' ||
					lc_element == 'td' ||
					node.hidden) {
					return false;
				}
				
				return true;
			}
			
			function process_end(node,root) {
				
				var lc_element = node.localName.toLowerCase();
				
				if (lc_element.match(/^[ou]l$/)) {
					if (stack.length > 0) {
						current_toc_branch = stack.pop();
					}
				}
				
				else if (lc_element == 'li') {
					
					// if the entries array is empty after processing the branch, set it to null
					if (current_toc_branch.entries.length == 0) {
						current_toc_branch.entries = null;
					}
					
					// if there are active branches being created, the finished branch gets added into current_toc_branch
					// otherwise, if there are no active branches it gets added to the root toc object's entries array
					if (stack.length > 0) {
						
						if (current_toc_branch.name === '') {
							
							// if the branch has no name but subentries, set the name to null,
							// otherwise, discard the branch if it doesn't have a name or any subentries
							if (current_toc_branch.length > 0) {
								current_toc_branch.name = null;
							}
							
							else {
								current_toc_branch = null;
								return;
							}
						}
						
						// add the active branch to the entries array of its parent
						stack[stack.length-1].entries.push(Object.assign({},current_toc_branch));
					}
					else {
						toc.entries.push(Object.assign({},current_toc_branch));
					}
					
					// discard the active branch now that processing is complete
					current_toc_branch = null;
				}
			}
		}
	}
	
	
	function getTOC(toc_url) {
		$.ajax({
			url:       toc_url,
			cache:     false,
			success: function(toc_page) {
		    	var parser = new DOMParser();
				var htmldoc = parser.parseFromString(toc_page, "text/html");
				
				var toc_element = htmldoc.querySelector('nav[role~="doc-toc"]');
				generateTOC(toc_element);
			},
			error: function(xhr, status, error) {
				console.error('Table of contents ' + toc_url + ' not found or an error occurred retrieving.');
			}
		});
	}
	
	return {
		processManifest: function(init) {
			return processManifest(init);
		},
		getInternalRep: function() {
			return _internal_rep;
		},
		getIssues: function() {
			return _issues;
		},
		getTOC: function() {
			return _toc;
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
