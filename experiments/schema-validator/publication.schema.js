var pubmanifest = {
    "title": "Publication Manifest",
    "type": "object",
    "properties": {
        "@context": {
            "type": "array",
            "items": [
                {
                    "const": "https://schema.org"
                },
                {
                    "const": "https://www.w3.org/ns/pub-context"
                }
            ],
            "additionalItems": true,
            "uniqueItems": true
        },
        "type": {
            "type": [
                "string",
                "array"
            ],
            "items": {
                "type": "string"
            },
            "uniqueItems": true
        },
        "conformsTo" : {
            "oneOf": [
                {
                    "$ref": "#/definitions/url.schema.json"
                },
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/url.schema.json"
                    }        
                }
            ]
        },
        "id": {
            "type": "string"
        },
        "abridged": {
        	"type": "boolean"
        },
        "accessMode": {
            "type": [
                "string",
                "array"
            ],
            "items": {
                "type": "string"
            },
            "uniqueItems": true
        },
        "accessModeSufficient": {
            "type": [
                "string",
                "array"
            ],
            "items": {
                "type": "string"
            },
            "uniqueItems": true
        },
        "accessibilityFeature": {
            "type": [
                "string",
                "array"
            ],
            "items": {
                "type": "string"
            },
            "uniqueItems": true
        },
        "accessibilityHazard": {
            "type": "array",
            "items": {
                "type": "string"
            },
            "uniqueItems": true
        },
        "accessibilitySummary": {
            "$ref": "#/definitions/localizable.schema.json"
        },
        "artist": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "author": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "colorist": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "contributor": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "creator": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "editor": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "illustrator": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "inker": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "letterer": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "penciler": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "publisher": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "readBy": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "translator": {
            "$ref": "#/definitions/contributor.schema.json"
        },
        "url": {
            "$ref": "#/definitions/url.schema.json"
        },
        "duration": {
            "type": "string",
            "pattern": "^P(?!$)((\\d+Y)|(\\d+\\.\\d+Y$))?((\\d+M)|(\\d+\\.\\d+M$))?((\\d+W)|(\\d+\\.\\d+W$))?((\\d+D)|(\\d+\\.\\d+D$))?(T(?=\\d)((\\d+H)|(\\d+\\.\\d+H$))?((\\d+M)|(\\d+\\.\\d+M$))?(\\d+(\\.\\d+)?S)?)??$"
        },
        "inLanguage": {
            "oneOf": [
                {
                    "$ref": "#/definitions/bcp.schema.json"
                },
                {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/bcp.schema.json"
                    }        
                }
            ]
        },
        "dateModified": {
            "type": "string",
            "anyOf": [
                {
                    "format": "date"
                },
                {
                    "format": "date-time"
                }
            ]
        },
        "datePublished": {
            "type": "string",
            "anyOf": [
                {
                    "format": "date"
                },
                {
                    "format": "date-time"
                }
            ]
        },
        "name": {
            "$ref": "#/definitions/localizable.schema.json"
        },
        "readingOrder": {
            "$ref": "#/definitions/resource.categorization.schema.json"
        },
        "resources": {
            "$ref": "#/definitions/resource.categorization.schema.json"
        },
        "links": {
            "$ref": "#/definitions/resource.categorization.schema.json"
        }
    },
    "required": [
        "@context",
        "conformsTo"
    ],
    "definitions" : {
		"url.schema.json" : {
		    "title": "URL",
		    "type": "string",
		    "format": "uri-reference"
		},
		
		"resource.categorization.schema.json" : {
		    "title": "Resource Categorization",
		    "oneOf": [
		        {
		            "oneOf" : [
		                {
		                    "$ref": "#/definitions/url.schema.json"
		                },
		                {
		                    "$ref": "#/definitions/link.schema.json"
		                }
		            ]
		        },
		        {
		            "type": "array",
		            "items": {
		                "anyOf": [
		                    {
		                        "$ref": "#/definitions/url.schema.json"
		                    },
		                    {
		                        "$ref": "#/definitions/link.schema.json"
		                    }
		                ]
		            },
		            "uniqueItems": true
		        }
		    ]
		},
		
		"localizable-object.schema.json" : {
		    "title": "Localizable String Object",
		    "type": "object",
		    "properties": {
		        "value": {
		            "type": "string"
		        },
		        "language": {
		            "type": "string",
		            "pattern": "^((?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?:([A-Za-z]{2,3}(-(?:[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?:[A-Za-z]{4}))?(-(?:[A-Za-z]{2}|[0-9]{3}))?(-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?:[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?:x(-[A-Za-z0-9]{1,8})+))?)|(?:x(-[A-Za-z0-9]{1,8})+))$"
		        }
		    },
		    "required": [
		        "value"
		    ]
		},
		
		"localizable.schema.json" : {
		    "title": "Localizable String or Object",
		    "anyOf": [
		        {
		            "type": "string"
		        },
		        {
		            "type": "array",
		            "items": {
		                "anyOf": [
		                    {
		                        "type": "string"
		                    },
		                    {
		                        "$ref": "#/definitions/localizable-object.schema.json"
		                    }
		                ]
		            },
		            "uniqueItems": true
		        },
		        {
		            "$ref": "#/definitions/localizable-object.schema.json"
		        }
		    ]
		},
		
		"link.schema.json" : {
		    "title": "Publication Links",
		    "type": "object",
		    "properties": {
		        "type": {
		            "anyOf": [
		                {
		                    "type": "string",
		                    "const": "LinkedResource"
		                },
		                {
		                    "type": "array",
		                    "items": {
		                        "type": "string"
		                    },
		                    "contains": {
		                        "const": "LinkedResource"
		                    }
		                }
		            ]
		        },
		        "url": {
		            "$ref": "#/definitions/url.schema.json"
		        },
		        "encodingFormat": {
		            "type": "string"
		        },
		        "name": {
		            "$ref": "#/definitions/localizable.schema.json"
		        },
		        "description": {
		            "anyOf": [
		                {
		                    "type": "string"
		                },
		                {
		                    "$ref": "#/definitions/localizable-object.schema.json"
		                }
		            ]
		        },
		        "rel": {
		            "type": [
		                "string",
		                "array"
		            ],
		            "items": {
		                "type": "string"
		            }
		        },
		        "integrity": {
		            "type": "string"
		        },
		        "duration": {
		            "type": "string",
		            "pattern": "^P(?!$)((\\d+Y)|(\\d+\\.\\d+Y$))?((\\d+M)|(\\d+\\.\\d+M$))?((\\d+W)|(\\d+\\.\\d+W$))?((\\d+D)|(\\d+\\.\\d+D$))?(T(?=\\d)((\\d+H)|(\\d+\\.\\d+H$))?((\\d+M)|(\\d+\\.\\d+M$))?(\\d+(\\.\\d+)?S)?)??$"
		        },
		        "alternate": {
		            "type": "array",
		            "items": {
		                "anyOf": [
		                    {
		                        "$ref": "#/definitions/url.schema.json"
		                    },
		                    {
		                        "$ref": "#/definitions/link.schema.json"
		                    }
		                ]
		            },
		            "uniqueItems": true
		        }
		    },
		    "required": [
		        "url"
		    ]
		},
		
		"contributor-object.schema.json" : {
		    "title": "Contributor Object",
		    "type": "object",
		    "properties": {
		        "name": {
		            "$ref": "#/definitions/localizable.schema.json"
		        },
		        "id": {
		            "$ref": "#/definitions/url.schema.json"
		        },
		        "type": {
		            "anyOf": [
		                {
		                    "type": "string",
		                    "enum": [
		                        "Person",
		                        "Organization"
		                    ],
		                    "default" : "Person"
		                },
		                {
		                    "type": "array",
		                    "items": {
		                        "type": "string"
		                    },
		                    "contains": {
		                        "enum": [
		                            "Person",
		                            "Organization"
		                        ]
		                    }
		                }
		            ]
		        },
		        "url": {
		        	"$ref": "#/definitions/url.schema.json" 
		        },
		        "identifier": {
		        	"type": "array",
		        	"items": {
		        		"type": "string"
		        	}
		        }
		    },
		    "required": [
		        "name"
		    ]
		},
		
		"contributor.schema.json": {
		    "title": "Contributor",
		    "anyOf": [
		        {
		            "type": "string"
		        },
		        {
		            "type": "array",
		            "items": {
		                "anyOf": [
		                    {
		                        "type": "string"
		                    },
		                    {
		                        "$ref": "#/definitions/contributor-object.schema.json"
		                    }
		                ]
		            },
		            "uniqueItems": true
		        },
		        {
		            "$ref": "#/definitions/contributor-object.schema.json"
		        }
		    ]
		},
		
		"bcp.schema.json" : {
		    "title": "BCP47 Language tag",
		    "type": "string",
		    "pattern": "^((?:(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?:([A-Za-z]{2,3}(-(?:[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?:[A-Za-z]{4}))?(-(?:[A-Za-z]{2}|[0-9]{3}))?(-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?:[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?:x(-[A-Za-z0-9]{1,8})+))?)|(?:x(-[A-Za-z0-9]{1,8})+))$"
		}
    }
}
