<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:opf="http://www.idpf.org/2007/opf"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	exclude-result-prefixes="xs"
	version="2.0">
	
	<xsl:output encoding="UTF-8" indent="yes" media-type="text" omit-xml-declaration="yes"/>
	
	<xsl:template match="opf:package">
		<xsl:text>{
    "@context": [
        "https://schema.org",
        
        "https://www.w3.org/ns/pub-context"</xsl:text>
		
		<!-- add manifest language -->
		<xsl:if test="@xml:lang"><xsl:text>,
		{"language": "</xsl:text><xsl:value-of select="@xml:lang"/><xsl:text>"}</xsl:text></xsl:if>
		<xsl:text>]</xsl:text>
		
		<!-- add placeholder conformsTo -->
		<xsl:call-template name="add-property">
			<xsl:with-param name="property" select="'conformsTo'"/>
			<xsl:with-param name="elem" select="'https://www.w3.org/publishing/epub3/'"/>
			<xsl:with-param name="allow-placeholder" select="'true'"></xsl:with-param>
		</xsl:call-template>
		
		<!-- add canonical identifier -->
		<xsl:call-template name="add-property">
			<xsl:with-param name="property" select="'id'"/>
			<xsl:with-param name="elem" select="opf:metadata/dc:identifier[@id=current()/@unique-identifier]"/>
		</xsl:call-template>
		
		<xsl:apply-templates select="@*|node()"/>
		<xsl:text>}</xsl:text>
	</xsl:template>
	
	
	<!-- process the metadata -->
	
	<xsl:template match="opf:metadata">
		
		<!-- add type -->
		<xsl:choose>
			<xsl:when test="opf:meta[@property='rdf:type']">
				<xsl:call-template name="add-property">
					<xsl:with-param name="property" select="'type'"/>
					<xsl:with-param name="elem" select="opf:meta[@property='rdf:type']"/>
				</xsl:call-template>
			</xsl:when>
			<xsl:otherwise>
				<xsl:call-template name="add-property">
					<xsl:with-param name="property" select="'type'"/>
					<xsl:with-param name="elem" select="'CreativeWork'"/>
				</xsl:call-template>
			</xsl:otherwise>
		</xsl:choose>
		
		<!-- add dc elements -->
		<xsl:variable name="dcProperties" select="dc:*"/>
		<xsl:variable name="dc">
			<dc property="name">title</dc>
			<dc property="inLanguage">language</dc>
			<dc>creator</dc>
			<dc>contributor</dc>
			<dc>publisher</dc>
			<dc property="datePublished">date</dc>
		</xsl:variable>
		
		<xsl:for-each select="$dc/dc">
			<xsl:variable name="property">
				<xsl:choose>
					<xsl:when test="@property"><xsl:value-of select="@property"/></xsl:when>
					<xsl:otherwise><xsl:value-of select="current()"/></xsl:otherwise>
				</xsl:choose>
			</xsl:variable>
			
			<xsl:call-template name="add-property">
				<xsl:with-param name="property" select="$property"/>
				<xsl:with-param name="elem" select="$dcProperties[local-name() = current()]"/>
			</xsl:call-template>
		</xsl:for-each>
		
		<!-- add identifier(s) -->
		<xsl:call-template name="add-property">
			<xsl:with-param name="property" select="'identifier'"/>
			<xsl:with-param name="elem" select="dc:identifier[not(@id=/opf:package/@unique-identifier)]"/>
		</xsl:call-template>
		
		<!-- add last modified date -->
		<xsl:call-template name="add-property">
			<xsl:with-param name="property" select="'dateModified'"/>
			<xsl:with-param name="elem" select="opf:meta[@property='dcterms:modified']"/>
		</xsl:call-template>
		
		<!-- add accessibility metadata -->
		<xsl:variable name="a11y">
			<a11y>accessMode</a11y>
			<a11y>accessibilityFeature</a11y>
			<a11y>accessibilityHazard</a11y>
			<a11y>accessibilitySummary</a11y>
		</xsl:variable>
		
		<xsl:variable name="a11yProperties" select="opf:meta[contains(@property, 'schema:access')]"/>
		
		<xsl:for-each select="$a11y/a11y">
			<xsl:variable name="a11yName" select="concat('schema:',current())"/>
			<xsl:call-template name="add-property">
				<xsl:with-param name="property" select="current()"/>
				<xsl:with-param name="elem" select="$a11yProperties[@property=$a11yName]"/>
			</xsl:call-template>
		</xsl:for-each>
		
		<xsl:if test="opf:meta[@property='schema:accessModeSufficient']">
			<xsl:text>,
			"accessModeSufficient" : [</xsl:text>
			
			<xsl:for-each select="opf:meta[@property='schema:accessModeSufficient']">
				<xsl:if test="not(position()=1)">
					<xsl:text>,</xsl:text>
				</xsl:if>
				
				<xsl:call-template name="make-itemlist">
					<xsl:with-param name="elem" select="current()"/>
				</xsl:call-template>
			</xsl:for-each>
			
			<xsl:text>]</xsl:text>
		</xsl:if>
		
		<xsl:apply-templates select="*[not(local-name()=['language','title','identifier'])]"></xsl:apply-templates>
	</xsl:template>
	
	
	
	<!-- process the manifest -->
	
	<xsl:template match="opf:manifest">
		<xsl:text>,
		"resources" : [</xsl:text>
		
		<!-- adds non-linear content to resources -->
		<xsl:for-each select="opf:item[not(@id=/opf:package/opf:spine/opf:itemref[not(@linear='no')]/@idref)]">
			<xsl:call-template name="add-linked-resource">
				<xsl:with-param name="elem" select="."/>
				<xsl:with-param name="position" select="position()"></xsl:with-param>
			</xsl:call-template>
		</xsl:for-each>
		
		<xsl:text>]</xsl:text>
	</xsl:template>
	
	
	
	<!-- process the spine -->
	
	<xsl:template match="opf:spine">
		<xsl:text>,
		"readingOrder" : [</xsl:text>
		
		<!-- don't include non-linear content in the reading order -->
		<xsl:for-each select="opf:itemref[not(@linear='no')]">
			<xsl:call-template name="add-linked-resource">
				<xsl:with-param name="elem" select="/opf:package/opf:manifest/opf:item[@id=current()/@idref]"/>
				<xsl:with-param name="position" select="position()"></xsl:with-param>
			</xsl:call-template>
		</xsl:for-each>
		
		<xsl:text>]</xsl:text>
		
		<!-- add reading progression -->
		<xsl:choose>
			<xsl:when test="@page-progression-direction">
				<xsl:choose>
					<xsl:when test="@page-progression-direction = 'default'">
						<xsl:call-template name="add-ppd">
							<xsl:with-param name="ppd" select="'ltr'"/>
						</xsl:call-template>
					</xsl:when>
					<xsl:otherwise>
						<xsl:call-template name="add-ppd">
							<xsl:with-param name="ppd" select="@page-progression-direction"/>
						</xsl:call-template>
					</xsl:otherwise>
				</xsl:choose>
			</xsl:when>
			<xsl:otherwise>
				<xsl:call-template name="add-ppd">
					<xsl:with-param name="ppd" select="'ltr'"/>
				</xsl:call-template>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	
	
	<xsl:template match="@*|node()"/>
	


	<!-- NAMED TEMPLATES -->


	<xsl:template name="add-property">
		<xsl:param name="property"/>
		<xsl:param name="elem"/>
		<xsl:param name="allow-placeholder"/>
		
		<xsl:variable name="cnt" select="count($elem)"/>
		
		<xsl:choose>
			<xsl:when test="$cnt > 0">
				
				<xsl:choose>
					<xsl:when test="$cnt > 1">
						<xsl:text>,
			"</xsl:text><xsl:value-of select="$property"/><xsl:text>" : </xsl:text>
						
						<xsl:call-template name="make-array">
							<xsl:with-param name="elem" select="$elem"/>
						</xsl:call-template>
					</xsl:when>
					<xsl:otherwise>
						<xsl:text>,
		"</xsl:text><xsl:value-of select="$property"/><xsl:text>" : "</xsl:text><xsl:value-of select="$elem"/><xsl:text>"</xsl:text>
					</xsl:otherwise>
				</xsl:choose>
			</xsl:when>
			<xsl:when test="$allow-placeholder">
				<xsl:text>,
		"</xsl:text><xsl:value-of select="$property"/><xsl:text>" : ""</xsl:text>
			</xsl:when>
			<xsl:otherwise>
				<!-- ignore the element -->
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	
	
	<xsl:template name="make-array">
		<xsl:param name="elem"/>
		
		<xsl:text>[</xsl:text>
		
		<xsl:for-each select="$elem">
			<xsl:if test="position() > 1">
				<xsl:text>,</xsl:text>
			</xsl:if>
			<xsl:text>"</xsl:text><xsl:value-of select="replace(current(), '&quot;', '\\&quot;')"/><xsl:text>"</xsl:text>
		</xsl:for-each>
		
		<xsl:text>]</xsl:text>
	</xsl:template>
	
	
	
	<xsl:template name="make-itemlist">
		<xsl:param name="elem"/>
		<xsl:text>{
					"type" : "ItemList",
					"itemListElement" : [</xsl:text>
		<xsl:for-each select="tokenize($elem,'(,|\s)\s*')">
			<xsl:if test="not(position() = 1)">
				<xsl:text>,</xsl:text>
			</xsl:if>
			<xsl:text>"</xsl:text><xsl:value-of select="current()"/><xsl:text>"</xsl:text>
		</xsl:for-each>
		<xsl:text>]
				}</xsl:text>
	</xsl:template>
	
	
	
	<xsl:template name="add-linked-resource">
		<xsl:param name="elem"/>
		<xsl:param name="position"/>
		
		<xsl:if test="not($position = 1)">
			<xsl:text>,</xsl:text>
		</xsl:if>
		
		<xsl:text>{
			    "url" : "</xsl:text><xsl:value-of select="$elem/@href"/><xsl:text>"</xsl:text>
		
		<xsl:if test="$elem/@media-type">
			<xsl:text>,
				"encodingFormat" : "</xsl:text><xsl:value-of select="$elem/@media-type"/><xsl:text>"</xsl:text>
		</xsl:if>
		
		<xsl:if test="$elem[tokenize(@properties)='nav']">
			<xsl:text>,
			"rel" : "contents"</xsl:text>
		</xsl:if>
		
		<xsl:if test="$elem[tokenize(@properties)='cover-image']">
			<xsl:text>,
			"rel" : "cover-image"</xsl:text>
		</xsl:if>
		<xsl:text>}</xsl:text>
	</xsl:template>
	
	
	
	<xsl:template name="add-ppd">
		<xsl:param name="ppd"/>
		
		<xsl:text>,
			"readingProgression" : "</xsl:text><xsl:value-of select="$ppd"/><xsl:text>"</xsl:text>
	</xsl:template>
</xsl:stylesheet>
