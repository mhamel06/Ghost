var config = require('../../server/config'),
    escapeExpression = require('../services/themes/engine').escapeExpression,
    socialUrls = require('@tryghost/social-urls'),
    _ = require('lodash');

function schemaImageObject(metaDataVal) {
    var imageObject;
    if (!metaDataVal) {
        return null;
    }

    imageObject = {
        '@type': 'ImageObject',
        url: metaDataVal.url
    };

    if (metaDataVal.dimensions) {
        imageObject = Object.assign(imageObject, {
            width: metaDataVal.dimensions.width,
            height: metaDataVal.dimensions.height
        });
    }

    return imageObject;
}

// Creates the final schema object with values that are not null
function trimSchema(schema) {
    var schemaObject = {};

    _.each(schema, function (value, key) {
        if (value !== null && typeof value !== 'undefined') {
            schemaObject[key] = value;
        }
    });

    return schemaObject;
}

function trimSameAs(data, context) {
    var sameAs = [];

    if (context === 'post' || context === 'page') {
        if (data[context].primary_author.website) {
            sameAs.push(escapeExpression(data[context].primary_author.website));
        }
        if (data[context].primary_author.facebook) {
            sameAs.push(socialUrls.facebook(data[context].primary_author.facebook));
        }
        if (data[context].primary_author.twitter) {
            sameAs.push(socialUrls.twitter(data[context].primary_author.twitter));
        }
    } else if (context === 'author') {
        if (data.author.website) {
            sameAs.push(escapeExpression(data.author.website));
        }
        if (data.author.facebook) {
            sameAs.push(socialUrls.facebook(data.author.facebook));
        }
        if (data.author.twitter) {
            sameAs.push(socialUrls.twitter(data.author.twitter));
        }
    }

    return sameAs;
}

function getPostSchema(metaData, data) {
    // CASE: metaData.excerpt for post context is populated by either the custom excerpt, the meta description,
    // or the automated excerpt of 50 words. It is empty for any other context.
    var description = metaData.excerpt ? escapeExpression(metaData.excerpt) : null,
        schema;

    const context = data.page ? 'page' : 'post';

    schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        publisher: {
            '@type': 'Organization',
            name: escapeExpression(metaData.blog.title),
            logo: schemaImageObject(metaData.blog.logo) || null
        },
        author: {
            '@type': 'Person',
            name: escapeExpression(data[context].primary_author.name),
            image: schemaImageObject(metaData.authorImage),
            url: metaData.authorUrl,
            sameAs: trimSameAs(data, context),
            description: data[context].primary_author.metaDescription ?
                escapeExpression(data[context].primary_author.metaDescription) :
                null
        },
        headline: escapeExpression(metaData.metaTitle),
        url: metaData.url,
        datePublished: metaData.publishedDate,
        dateModified: metaData.modifiedDate,
        image: schemaImageObject(metaData.coverImage),
        keywords: metaData.keywords && metaData.keywords.length > 0 ?
            metaData.keywords.join(', ') : null,
        description: description,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': metaData.blog.url || null
        }
    };
    schema.author = trimSchema(schema.author);
    return trimSchema(schema);
}

function getHomeSchema(metaData) {
    var schema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        publisher: {
            '@type': 'Organization',
            name: escapeExpression(metaData.blog.title),
            logo: schemaImageObject(metaData.blog.logo) || null
        },
        url: metaData.url,
        image: schemaImageObject(metaData.coverImage),
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': metaData.blog.url || null
        },
        description: metaData.metaDescription ?
            escapeExpression(metaData.metaDescription) :
            null
    };
    return trimSchema(schema);
}

function getTagSchema(metaData, data) {
    var schema = {
        '@context': 'https://schema.org',
        '@type': 'Series',
        publisher: {
            '@type': 'Organization',
            name: escapeExpression(metaData.blog.title),
            logo: schemaImageObject(metaData.blog.logo) || null
        },
        url: metaData.url,
        image: schemaImageObject(metaData.coverImage),
        name: data.tag.name,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': metaData.blog.url || null
        },
        description: metaData.metaDescription ?
            escapeExpression(metaData.metaDescription) :
            null
    };

    return trimSchema(schema);
}

function getAuthorSchema(metaData, data) {
    var schema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        sameAs: trimSameAs(data, 'author'),
        name: escapeExpression(data.author.name),
        url: metaData.authorUrl,
        image: schemaImageObject(metaData.coverImage),
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': metaData.blog.url || null
        },
        description: metaData.metaDescription ?
            escapeExpression(metaData.metaDescription) :
            null
    };

    return trimSchema(schema);
}

function getSchema(metaData, data) {
    if (!config.isPrivacyDisabled('useStructuredData')) {
        var context = data.context ? data.context : null;
        if (_.includes(context, 'post') || _.includes(context, 'page') || _.includes(context, 'amp')) {
            return getPostSchema(metaData, data);
        } else if (_.includes(context, 'home')) {
            return getHomeSchema(metaData);
        } else if (_.includes(context, 'tag')) {
            return getTagSchema(metaData, data);
        } else if (_.includes(context, 'author')) {
            return getAuthorSchema(metaData, data);
        }
    }
    return null;
}

module.exports = getSchema;
