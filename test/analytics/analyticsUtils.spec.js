"use strict";

const analyticsHelper = require( "./../../lib/analytics/analyticsUtils" ),
    c = require( "./../../lib/analytics/constants" );

describe( "ANALYTICS UTILS", function() {
    describe( "analyticsUtils.isTrackableRequest ", function() {
        it( "should return true for intent request", function() {
            const event = {
                session: {
                    user: {
                        userId: "abc123"
                    }
                },
                request: {
                    type: c.requestType.intentRequest
                }
            }

            expect( analyticsHelper.isTrackableRequest( event ) ).to.be.true;
        } );


        it( "should return false when user data is not available", function() {
            const event = {
                session: {
                    attributes: {
                        STATE: "_DAILY_TIP"
                    }
                },
                request: {
                    type: "AudioPlayer.PlaybackStarted"
                }
            }

            expect( analyticsHelper.isTrackableRequest( event ) ).to.be.false;
        } );
    } );
} );
