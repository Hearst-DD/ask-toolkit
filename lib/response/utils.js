"use strict";

const Alexa = require( "ask-sdk-core" ),
    c = require( "./../constants" ),
    e = require( "./../enums" ),
    path = require( "path" ),
    persistence = require( "./../persistence/persistence" ),
    utils = require( "./../utils/utils" );

const responseUtils = {
    buildAplCommandDirective: async ( handlerInput, data ) => {
        if ( data && Array.isArray( data.commands ) ) {
            return {
                type: c.APL.COMMANDS.TYPE,
                token: data.token || `token%{ Date.now() }`,
                commands: utils.get( "commands", data, [] )
            };
        } else {
            return null;
        }
    },

    buildAplRenderDocumentDirective: async ( handlerInput, data ) => {
        if ( data && data.document ) {
            const document = await utils.readFile( path.resolve( c.APL.RENDER_DOCUMENT.DIRECTORY, data.document + ".json" ) );

            return {
                type: c.APL.RENDER_DOCUMENT.TYPE,
                version: c.APL.RENDER_DOCUMENT.VERSION,
                token: data.token || `token%{ Date.now() }`,
                datasources: utils.get( "datasources", data, {} ),
                document: document
            };
        } else {
            return null;
        }
    },

    buildDisplayTemplate: ( handlerInput, data ) => {
        let img = null,
            template = null,
            txt = null;

        if ( data && data.template ) {
            template = {
                type: data.template
            };

            //TODO: clean udio tags from text objects
            switch( data.template ) {
                case e.template.BODY_1:
                    txt = responseUtils.buildTextObj( utils.get( "text", data ) );

                    if ( txt ) {
                        utils.set( "textContent", template, txt );
                    }
                    break;
                case e.template.BODY_2:
                case e.template.BODY_3:
                case e.template.BODY_6:
                    img = responseUtils.buildImageObj( utils.get( "image", data ) );

                    if ( img ) {
                        utils.set( "image", template, img );
                    }

                    txt = responseUtils.buildTextObj( utils.get( "text", data ) );

                    if ( txt ) {
                        utils.set( "textContent", template, txt );
                    }
                    break;
                case e.template.BODY_7:
                    img = responseUtils.buildImageObj( utils.get( "image", data ) );

                    if ( img ) {
                        utils.set( "image", template, img );
                    }
                    break;
                case e.template.LIST_1:
                case e.template.LIST_2:
                    const items = utils.get( "list", data ),
                        itemList = [];

                    if ( items && Array.isArray( items ) ) {
                        for ( let i = 0; i < items.length; i++ ) {
                            let listItem = {
                                token: utils.get( "token", items[ i ] )
                            };

                            if ( utils.get( "image.url", items[ i ] ) ) {
                                const img = responseUtils.buildImageObj( utils.get( "image", items[ i ] ) );

                                if ( img ) {
                                    utils.set( "image", listItem, img );
                                }
                            }

                            const txt = responseUtils.buildTextObj( utils.get( "text", data ) );

                            if ( txt ) {
                                utils.set( "textContent", listItem, txt );
                            }

                            itemList.push( listItem );
                        }

                        utils.set( "listItems", template, itemList );
                    }
                    break;
            }

            //Back Button
            if ( utils.get( "backButton", data ) === e.visibility.HIDDEN ) {
                utils.set( "backButton", template, e.visibility.HIDDEN );
            }

            // Background Image
            const bgImg = responseUtils.buildImageObj( responseUtils.getRandomItem( utils.get( "backgroundImage", data ) ) );

            if ( bgImg ) {
                utils.set( "backgroundImage", template, bgImg );
            }

            // Title
            utils.set( "title", template, utils.get( "title", data, "" ) );

            // Token
            const token = utils.get( "token", data );

            if ( token ) {
                utils.set( "token", template, token );
            }
        }

        return template;
    },

    buildImageObj: ( img ) => {
        if ( img ) {
            const makeImage = new Alexa.ImageHelper();

            const description = utils.get( "description", img, null ),
                width = utils.get( "width", img, null ),
                height = utils.get( "height", img, null );

            if ( description ) {
                makeImage.withDescription( description );
            }

            makeImage.addImageInstance(
                    utils.makeImagePath( utils.get( "url", img, null ) ),
                    utils.get( "size", img, null ),
                    ( width ? parseInt( width ) : null ),
                    ( height ? parseInt( height ) : null )
                );

            return makeImage.getImage();
        }

        return null;
    },

    buildSsml: ( data ) => {
        data = data || {};

        let output = responseUtils.getRandomItem( utils.get( "speech.output", data, "" ) ),
            reprompt = responseUtils.getRandomItem( utils.get( "speech.reprompt", data, "" ) );

        return {
            output: utils.replaceAudioTags( utils.sanitizeSsml( output ) ),
            reprompt: utils.replaceAudioTags( utils.sanitizeSsml( reprompt ) )
        };
    },

    buildTextObj: ( txt ) => {
        if ( txt ) {
            const primary = utils.get( "primary", txt, null ),
                secondary = utils.get( "secondary", txt, null ),
                tertiary = utils.get( "tertiary", txt, null );

            let textBuilder;

            if ( utils.get( "type", primary ) === e.TEXT_STYLE.PLAIN
                && utils.get( "type", secondary ) === e.TEXT_STYLE.PLAIN
                && utils.get( "type", tertiary ) === e.TEXT_STYLE.PLAIN ) {
                textBuilder = new Alexa.PlainTextContentHelper();
            } else {
                textBuilder = new Alexa.RichTextContentHelper();
            }

            return textBuilder
                .withPrimaryText( utils.get( "text", primary, null ) )
                .withSecondaryText( utils.get( "text", secondary, null ) )
                .withTertiaryText( utils.get( "text", tertiary, null ) )
                .getTextContent();
        }

        return null;
    },

    /**
     * Checks if the item is an array and returns a random element from the array.
     *
     * @param data
     * @return {*}
     */
    getRandomItem: function( data ){
        // check if response obj is an array of items
        if ( data && Array.isArray( data ) ){
            const randomIndex = utils.randomIndex( data.length );

            data = data[ randomIndex ];
        }

        return data;
    },


    replaceInAll: ( data, mapObj ) => {
        return responseUtils.replaceInDisplay( responseUtils.replaceInSpeechAndCard( data, mapObj ), mapObj )
    },

    replaceInDisplay: ( data, mapObj ) => {
        if ( utils.get( "display.text.primary.text", data ) ) {
            data.display.text.primary.text = utils.replaceAll( data.display.text.primary.text, mapObj );
        }

        if ( utils.get( "display.text.secondary.text", data ) ) {
            data.display.text.secondary.text = utils.replaceAll( data.display.text.secondary.text, mapObj );
        }

        if ( utils.get( "display.text.tertiary.text", data ) ) {
            data.display.text.tertiary.text = utils.replaceAll( data.display.text.tertiary.text, mapObj );
        }

        return data;
    },

    replaceInSpeechAndCard: ( data, mapObj ) => {
        if ( utils.get( "speech.output", data ) ) {
            data.speech.output = utils.replaceAll( data.speech.output, mapObj );
        }

        if ( utils.get( "speech.reprompt", data ) ) {
            data.speech.reprompt = utils.replaceAll( data.speech.reprompt, mapObj );
        }

        if ( utils.get( "card.title", data ) ) {
            data.card.title = utils.replaceAll( data.card.title, mapObj );
        }

        if ( utils.get( "card.output", data ) ) {
            data.card.output = utils.replaceAll( data.card.output, mapObj );
        }

        return data;
    },

    setRepeatSpeech: ( handlerInput, data, options ) => {
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let output = null,
            reprompt = null;

        if ( options && options.repeatSpeech ) {   // Check if option is explicitly set
            output = utils.get( "repeatSpeech.output", options, null );

            reprompt = utils.get( "repeatSpeech.reprompt", options, null );
        } else if ( data && data.repeatSpeech ) {  //  Check for repeatSpeech in data
            output = utils.get( "repeatSpeech.output", data, null );

            reprompt = utils.get( "repeatSpeech.reprompt", data, null );
        } else if ( data && data.speech ) {        // Default to regular speech output and reprompt
            output = utils.get( "speech.output", data, null );
            reprompt = utils.get( "speech.reprompt", data, null );
        }

        if ( options && utils.get( "saveRepeat", options, true ) === false ) {
            delete sessionAttributes[ e.attr.SPEECH_OUTPUT ];

            delete sessionAttributes[ e.attr.SPEECH_REPROMPT ];
        } else {
            sessionAttributes[ e.attr.SPEECH_OUTPUT ] = output;

            if ( reprompt ) {
                sessionAttributes[ e.attr.SPEECH_REPROMPT ] = reprompt;
            } else {
                delete sessionAttributes[ e.attr.SPEECH_REPROMPT ];
            }
        }

        persistence.setSessionAttributes( handlerInput, sessionAttributes );
    }
};

module.exports = responseUtils;
