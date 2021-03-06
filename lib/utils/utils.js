"use strict";

/**
 * UTILS
 *
 */
const c = require( "./../constants" ),
      e = require( "./../enums" ),
      fs = require( "fs" );

/**
 *  Public Methods
 */
const utils = {
    checkValInArray: function( val, arr ) {
      if ( val && arr ) {
          if ( arr.indexOf( val ) > -1 ) {
            return val;
          }
      }

      return null;
    },

    debugEnabled: function() {
        return process.env.LOG_LEVEL === e.logLevels.DEBUG;
    },

    /**
     * errorCheckCallback checks that a callback function is valid,
     * otherwise defines an empty function and returns it
     */
    errorCheckCallback: function( callback ) {
        // Check for valid callback, add default if needed
        return callback === undefined || typeof callback !== "function" ? function() {
            } : callback;
    },

    hashInt: ( num ) => {
        let hash = "";

        if ( Number.isInteger( num ) ) {
            const hashchars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

            while ( num > 0 ) {
                hash = hashchars[ parseInt( num % hashchars.length ) ] + hash;

                num = parseInt( num / hashchars.length );
            }
        }

        return hash
    },

    /**
     * Return random index for array
     *
     * @param len
     * @return {number}
     */
    randomIndex: function( len ){
        if ( len && typeof len === "number" ) {
            return Math.floor( Math.random() * len );
        }

        return 0;
    },

    /****************************
     *** ALEXA REQUEST UTILS ****
     ****************************
     */

    /**
     * handlerInput.requestEnvelope.context.System.apiAccessToken
     */
    getApiAccessToken: function( handlerInput ) {
        return this.get( "requestEnvelope.context.System.apiAccessToken", handlerInput, null );
    },

    /**
     * handlerInput.requestEnvelope.context.System.apiEndpoint
     */
    getApiEndpoint: function( handlerInput ) {
        return this.get( "requestEnvelope.context.System.apiEndpoint", handlerInput, null );
    },

    /**
     * handlerInput.requestEnvelope.session.user.accessToken
     */
    getAuthToken: function( handlerInput ) {
        return this.get( "requestEnvelope.session.user.accessToken", handlerInput, null );
    },

    /**
     * handlerInput.requestEnvelope.request.locale
     */
    getLocale: function( handlerInput ) {
        if ( handlerInput ) {
            return this.get( "requestEnvelope.request.locale", handlerInput, "en-US" );
        }

        return "en-US"; // default to US
    },

    /**
     * handlerInput.requestEnvelope.request.intent.name
     */
    getRequestIntent: function( handlerInput ) {
        return this.get( "requestEnvelope.request.intent.name", handlerInput, "" );
    },

    /**
     * handlerInput.requestEnvelope.request.intent.slots
     */
    getRequestIntentSlots: function( handlerInput ) {
        return this.get( "requestEnvelope.request.intent.slots", handlerInput, {} );
    },

    /**
     * Returns array of resolved entity values for a slot.
     *
     * @param handlerInput...standard handlerInput object
     * @param slotName.......the name of the slot (ex: answerList)
     * @param slotType.......the type of custom slot (ex: ANSWER_LIST)
     * @param authority......(optional) the name of the resolution authority
     * @return []
     */
    getResolvedValues: ( handlerInput, slotName, slotType, authority ) => {
        if ( handlerInput && slotName && slotType) {
            const resolutionsPerAuthority = utils.get( "requestEnvelope.request.intent.slots." + slotName + ".resolutions.resolutionsPerAuthority", handlerInput, null );

            if ( Array.isArray( resolutionsPerAuthority ) ) {
                authority = authority || ( e.RESOLUTION_AUTHORITY.SOURCE.AUTHORITY + process.env.APP_ID );

                for ( let i = 0; i < resolutionsPerAuthority.length; i++ ) {
                    const authority = utils.get( "authority", resolutionsPerAuthority[ i ], "" ),
                        statusCode = utils.get( "status.code", resolutionsPerAuthority[ i ], "" );

                    if ( authority.includes( authority )
                        && authority.includes( slotType )
                        && statusCode === e.RESOLUTION_AUTHORITY.SOURCE.CODE.ER_SUCCESS_MATCH ) {
                        return utils.get( "values", resolutionsPerAuthority[ i ], [] ).map( val => utils.get( "value.name", val, "" ) );
                    }
                }
            }
        }

        return [];
    },

    /**
     * handlerInput.requestEnvelope.session.sessionId
     */
    getSessionId: function( handlerInput, fallback ) {
        fallback = fallback || "";

        if ( handlerInput ) {
            return this.get( "requestEnvelope.session.sessionId", handlerInput, fallback );
        }

        return fallback;
    },

    /**
     * Returns value of slot for given name.
     *
     * @param slotName...slot name key
     * @param handlerInput......event object
     */
    getSlotValue: function( handlerInput, slotName, fallback ) {
        if ( fallback === undefined ) {
            fallback = null;
        }

        if ( handlerInput && typeof slotName === "string" ) {
            return this.get( "requestEnvelope.request.intent.slots." + slotName + ".value", handlerInput, fallback );
        }

        return fallback;
    },

    getSupportedLocale: function( locale ) {
      if ( this.get( locale, c.TIMEZONE_OFFSET )) {
        return locale;
      } else {
        return c.DEFAULT_LOCALE;
      }
    },

    /**
     * event.context.System.user.userId
     */
    getUserId: function( event, fallback ) {
        fallback = fallback || "";

        if ( event && event.requestEnvelope ) {
            event = event.requestEnvelope;
        }

        if ( event ) {
            return this.get( "context.System.user.userId", event, fallback );
        }

        return fallback;
    },

    /**
     * handlerInput.context.System.device.supportedInterfaces[ "Alexa.Presentation.APL" ]
     */
    hasAPLInterface: function( handlerInput ){
        const supportedInterfaces = this.get( "requestEnvelope.context.System.device.supportedInterfaces", handlerInput, null );

        if ( supportedInterfaces && supportedInterfaces[ e.INTERFACE.APL ] ) {
            return parseFloat( this.get( e.APL_VERSION.MAX_VERSION, supportedInterfaces[ e.INTERFACE.APL ], 0 ) ) >= e.APL_VERSION.VALID.MIN_VERSION;
        }

        return false;
    },

    /**
     * handlerInput.context.System.device.supportedInterfaces.Display
     */
    hasDisplayInterface: function( handlerInput ){
        const display = this.get( "requestEnvelope.context.System.device.supportedInterfaces." + e.INTERFACE.DISPLAY, handlerInput, null );

        return display
            && display[ e.DISPLAY_VERSION.MARKUP ] === e.DISPLAY_VERSION.VALID.MARKUP
            && display[ e.DISPLAY_VERSION.TEMPLATE ] === e.DISPLAY_VERSION.VALID.TEMPLATE;
    },


    /**
     * handlerInput.context.System.device.supportedInterfaces.Display
     */
    hasAudioInterface: function( handlerInput ){
        return this.get( "requestEnvelope.context.System.device.supportedInterfaces.AudioPlayer", handlerInput, null );
    },

    // TODO: DEPRECATE for method that checks for audio support only
    isDeviceSupport: function( handlerInput ){
        if ( this.get( "requestEnvelope.context.System.device.supportedInterfaces", handlerInput, false ) ) {
            if ( !this.get( "requestEnvelope.context.System.device.supportedInterfaces.AudioPlayer", handlerInput, false ) ) {
                return false;
            }
        }

        return true;
    },

    /**
     * handlerInput.requestEnvelope.session.new
     */
    isNewSession: function( handlerInput ) {
        if ( handlerInput ) {
            return this.get( "requestEnvelope.session.new", handlerInput );
        }

        return false;
    },

    slotIsANumber: function( slot ) {
        if ( slot && slot.value && !isNaN( slot.value ) ) {
            return true;
        }

        return false;
    },

    /****************************
     ****** STRING UTILS ********
     ****************************
     */

    /**
     * Searches str for each key in mapObj and replaces with value of the key.
     *
     * @param str
     * @param mapObj
     * @return {*}
     */
    replaceAll: function( str, mapObj ) {
        if ( !str || typeof str !== "string" || !mapObj || typeof mapObj !== "object" || mapObj.constructor !== Object ) {
            return str;
        }

        const re = new RegExp( Object.keys( mapObj ).join( "|" ), "gi" );

        return str.replace( re, function( matched ) {
            return mapObj[ matched ];
        } );
    },

    replaceAudioTags: function( str ) {
        const pattern =  /<audio>(.*?)<\/audio>/g;

        const tags = str.match( pattern );

        if ( tags ) {
            const files = tags.map( function ( val ) {
                return val.replace( /<\/?audio>/g, '' );
            } );

            for ( let i = 0; i <= tags.length; i++ ) {
                const fileName = files[i];
                if ( !fileName ){
                    continue;
                }

                const url = this.makeAudioPath( files[ i ] );

                const audioTag = "<audio src=\"" + url + "\" />";

                str = str.replace( tags[ i ], audioTag );
            }
        }

        return str;
    },

    sanitizeSsml: function( ssml ) {
        if ( ssml && typeof ssml === "string" ) {
            return  ssml.replace( /&amp;/g, "and" )
            .replace( /&quot;/g, "\"" )
            .replace( /&/g, "and" );
        }

        return ssml;
    },

    trimItemsInArray: function( arr ) {
        if ( Array.isArray( arr ) ) {
            arr = arr.map( Function.prototype.call, String.prototype.trim );
        }

        return arr;
    },


    /****************************
     ****** OBJECT UTILS ********
     ****************************
     */
    cloneObj: ( obj ) => {
        let newObj = ( obj instanceof Array ) ? [] : {};

        for ( let i in obj ) {
            if ( obj[ i ] && typeof obj[ i ] === "object" ) {
                newObj[ i ] = utils.cloneObj( obj[ i ] );
            } else {
                newObj[ i ] = obj[ i ]
            }
        }

        return newObj;
    },

    /**
     * Attempts to retrieve a value from a source object. If
     * the value couldn't be found, returns false or a specified
     * fallback value.
     *
     * @param  {string} key      Key of value to be retrieved. Can also be
     *                           specified using dot notation to retrieve
     *                           nested values. Ex: "content.title"
     * @param  {object} source   Source object.
     * @param  {mixed}  fallback Value to be returned if key could not be
     *                           retrieved.
     * @return {mixed}           Value of the key, false, or specified fallback
     */
    get: function( key, source, fallback ) {
        // use provided default or false
        fallback = ( typeof fallback === "undefined" ) ? false : fallback;

        if ( !key || !source ) {
            return fallback;
        }

        // get the key parts
        let parts = key.split( "." );

        // shift the first key off the front
        key = parts.shift();

        // if the source doesn't contain the key, return the fallback
        if (
            !source ||
            !Object.prototype.hasOwnProperty.call( source, key ) ||
            typeof source[ key ] === "undefined"
        ) {
            return fallback;
        }

        // if there are left over key parts, recurse. otherwise return the value
        return parts.length ? this.get( parts.join( "." ), source[ key ], fallback ) : source[ key ];
    },

    removeEmptyStringElements: function( obj ) {
        for ( let prop in obj ) {
            if ( typeof obj[ prop ] === "object" ) {// dive deeper in
                this.removeEmptyStringElements( obj[ prop ] );
            } else if ( obj[ prop ] === "" ) {// delete elements that are empty strings
                delete obj[ prop ];
            }
        }

        return obj;
    },

    /**
     * Sets the value on the object at the specified path.
     *
     * @param  {string} key      Key of value to be set. Can also be
     *                           specified using dot notation to set
     *                           nested values. Ex: "content.title"
     * @param  {object} source   Source object.
     * @param  {mixed}  value    Value to be set on object at key.
     * @return {mixed}           Value of the key, false, or specified fallback
     */
    set: function( key, source, value ) {
        if ( !key || !source ) {
            return null;
        }

        const pList = key.split( "." ),
            len = pList.length;

        let schema = source;  // a moving reference to internal objects within obj

        for ( let i = 0; i < len-1; i++ ) {
            const elem = pList[ i ];

            if( !schema[ elem ] ) {
                schema[ elem ] = {};
            }

            if ( typeof schema[ elem ] !== "object" ) {
                return null;
            }

            schema = schema[ elem ];
        }

        schema[ pList[ len-1 ] ] = value;

        return source;
    },

    /****************************
     ******* TYPE UTILS *********
     ****************************
     */
    isObject: function( val ) {
        return val && typeof val === "object" && val.constructor === Object;
    },

    isString: function( val ) {
        return typeof val === "string" || val instanceof String;
    },

    /****************************
     ******* PATH UTILS *********
     ****************************
     */

    /**
     * formUrlWithParams takes a URL and an object of params and forms
     * a valid URL with them
     */
    formUrlWithParams : function( url, params ) {
        // Form params with fallback
        params = params === undefined || typeof params !== "object" ? {} : params;

        // Check if there are params to append
        if ( !Object.keys( params ).length ) {
            return url;
        }

        // Check for any existing params
        url = url + ( url.indexOf( "?" ) !== -1 ? "&" : "?" );

        for( var key in params ) {
            // If the param value is "null", treat as a boolean param
            url += key + ( params[ key ] === null ? "" : "=" + params[ key ] ) + "&";
        }

        // Remove trailing ampersands
        return url.replace( /&$/, "" );
    },

    makeImagePath:  function( url ) {
        if ( url && url.indexOf( e.protocol.HTTP ) !== 0 && url.indexOf( e.protocol.HTTPS ) !== 0 ) {
            return c.S3_HOST + c.S3_BUCKET + c.S3_IMAGE_PATH + url;
        }

        return url;
    },

    makeAudioPath: function( url ) {
        if ( url && url.indexOf( e.protocol.HTTP ) !== 0 && url.indexOf( e.protocol.HTTPS ) !== 0 ) {
            return c.S3_HOST + c.S3_BUCKET + c.S3_AUDIO_PATH + url;
        }

        return url;
    },

    readFile: ( filePath ) => {
        return new Promise( (resolve, reject) => {
            fs.readFile( filePath, "utf-8", ( error, content ) => {
                if ( error ) {
                    reject( error );
                }
                else {
                    resolve( JSON.parse( content ) );
                }
            });
        })
    },

    /****************************
     ****** LOGGING UTILS *******
     ****************************
     */
    log: {
        debug: function( msg, ...args ) {
            if ( process.env.LOG_LEVEL === e.logLevels.DEBUG ) {
                if ( args.length > 0 ) {
                    console.log( msg, args );
                } else {
                    console.log( msg );
                }
            }
        }
    },

    logIntentData: function( event ) {
        console.log( ">>>>>> RequestId: " + utils.get( "request.requestId", event, "" ) );

        if ( utils.debugEnabled() ) {
            utils.log.debug( ">>>>>> UserId: " + utils.getUserId( event ) );

            utils.log.debug( "*************************** [ " + utils.get( "request.intent.name", event, "" ) + " ] --> " );

            const slots = utils.get( "request.intent.slots", event );

            if ( slots ) {
                utils.log.debug( JSON.stringify( slots ) );
            }

            const attribs = utils.get( "session.attributes", event );

            if ( attribs ) {
                utils.log.debug( "attributes------->" );

                utils.log.debug( JSON.stringify( attribs ) );
            }
            utils.log.debug( "***************************" );
        }

        return;
    },

    logResponseData: function( response ) {
        if ( response && response._responseObject ) {
            utils.log.debug( "[response] -------> " + JSON.stringify( response._responseObject ) );
        }

        return;
    }
};

module.exports = utils;
