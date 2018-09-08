"use strict";

/**
 * ANALYTICS
 * Sends tracking events.
 *
 * REQUIREMENTS:
 * 1) ANALYTICS_PROVIDER set as an environment variable
 *    default: e.analyticsProvider.DASHBOT
 * 2) ANALYTICS_TOKEN set as an environment variable
 * 3) Add `analytics.init( event );` to main file
 *    immediately following `const alexa` .
 *
 */
const analyticsUtils = require( "./analyticsUtils" ),
    c = require( "./constants" ),
    dashbotEventService = require( "./dashbotEventService" ),
    e = require( "./enums" ),
    utils = require( "./../utils/utils" );

let provider = null,
    incomingLogging = null,
    outgoingLogging = null;

const initProvider = () => {
    if ( analyticsUtils.getProvider() === e.analyticsProvider.VOICELAB ) {
        // Initialize other provider here
    } else  {
        const config = {
            debug: false //utils.debugEnabled()
        };

        provider = require( "dashbot" )( process.env.ANALYTICS_TOKEN, config ).alexa;
    }
};

const analyticsHandlers = {
    "initProvider": initProvider,

    "queueTracking": function( queue, data, options ) {
        queue.addToBeforeResponse( c.QUEUE_KEY, function( cb ) {
            if ( utils.get( "track", options, true ) === false ) {
                cb( null, "NotTracked" );
            } else {
                analyticsHandlers.sendResponseTracking.call( this, data, options, cb );
            }
        } );
    },

    /**
     * Sends tracking event when request is received.
     *
     * @param event
     * @param cb
     */
    "sendRequestTracking": function( event, cb ) {
        cb = utils.errorCheckCallback( cb );

        if ( provider && event && analyticsUtils.getProvider() === e.analyticsProvider.DASHBOT ) {
            utils.log.debug( "Dashbot Request Tracking" );

            incomingLogging = provider.logIncoming( event, null );

            cb();
        } else {
            cb();
        }
    },

    /**
     * Sends tracking event before response is sent.
     *
     * @param data
     * @param cb
     */
    "sendResponseTracking": function( data, options, cb ) {
        data = data || {};

        cb = utils.errorCheckCallback( cb );

        const requestType = utils.get( "event.request.type", this, "" ),
            metadata = {
                state: utils.get( "handler.state", this, "" ), // handler mode

                slots: null, // slot values

                locale: utils.get( "event.request.locale", this, "" )
            };

        let intentName = "";

        if ( requestType === c.requestType.launchRequest || requestType.indexOf( c.requestType.audioPlayer ) === 0 || requestType.indexOf( c.requestType.playbackController ) === 0 ) {
            intentName = requestType;
        } else if ( requestType === c.requestType.sessionEndedRequest ) {
            intentName = c.SESSION_END;
        } else if ( requestType == c.requestType.intentRequest && this.event.request.intent ) {
            intentName = utils.get( "event.request.intent.name", this, "" );

            metadata[ "slots" ] = utils.get( "event.request.intent.slots", this, {} );
        }

        if ( analyticsUtils.getProvider() === e.analyticsProvider.DASHBOT && analyticsUtils.isTrackableRequest( this.event ) ) {
            utils.log.debug( "Dashbot Response Tracking" );

            let responseObj = Object.assign( {}, utils.get( "_responseObject", this.response, {} ) );

            // add outgoing intent if present
            const outgoingIntent = analyticsUtils.buildOutgoingIntent( options );

            if ( outgoingIntent ) {
                //TODO: switch to use provider.setOutgoingIntent()
                responseObj[ "intent" ] = outgoingIntent;
            }

            outgoingLogging = provider.logOutgoing( this.event, responseObj );

            Promise.all( [ incomingLogging, outgoingLogging ] );

            cb();
        } else {
            cb();
        }
    },

    "sendEvent": function( event, trackingEvent, trackingParams, cb ) {
        cb = utils.errorCheckCallback( cb );

        if ( analyticsUtils.getProvider() === e.analyticsProvider.DASHBOT &&  analyticsUtils.isTrackableRequest( event ) && trackingEvent ) {
            utils.log.debug( "[sendEvent] --> " + trackingEvent + " - " + JSON.stringify( trackingParams ) );

            dashbotEventService.send( event, trackingEvent, trackingParams, cb );
        } else {
            cb( "Not sent", null);
        }
    },

    "sendSponsorEvent": function( event, campaignId, adLabel, cb ) {
        analyticsHandlers.sendEvent( event, "SponsorPlayedEvent", { campaignId: campaignId, label: adLabel }, cb );
    }
};

initProvider();

module.exports = analyticsHandlers;