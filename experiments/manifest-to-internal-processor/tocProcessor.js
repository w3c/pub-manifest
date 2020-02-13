
'use strict';

var tocProcessor = (function() {

    function processTOC(internal_rep) {
    
    	var toc_markup;
    	
    	// get the toc resource
    	
    	var resources = internal_rep.hasOwnProperty('readingOrder') ? internal_rep.readingOrder : [];
    		Array.prototype.push.apply(resources, internal_rep.hasOwnProperty('resources') ? internal_rep.resources : []);
    	
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
			getTOC(toc_resource)
				.then(function(toc_page) {
			    	var parser = new DOMParser();
					var htmldoc = parser.parseFromString(toc_page, "text/html");
					
					var toc_element = htmldoc.querySelector('nav[role~="doc-toc"]');
					generateTOC(toc_element);
				});
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
						document.getElementById('toc').textContent = (toc.entries !== null && toc.entries.length > 0) ? JSON.stringify(toc,null,3) : 'null';
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
		return new Promise(function(resolve, reject) {
			$.ajax({
				url:       toc_url,
				cache:     false,
				success: function(data) {
					resolve(data);
				},
				error: function(xhr, status, error) {
					console.error('Table of contents ' + toc_url + ' not found or an error occurred retrieving.');
					reject('Table of contents not found or an error occurred retrieving.');
				}
			});
		});
	}
	
	return {
		processTOC: function(internal_rep) {
			processTOC(internal_rep);
		}
	}
})();