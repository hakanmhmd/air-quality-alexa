/**
 * App ID for the skill
 */
var APP_ID = undefined;//replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

var http = require('http')

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * AirQualitySkill is a subclass of AlexaSkill.
 */
var AirQualitySkill = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
AirQualitySkill.prototype = Object.create(AlexaSkill.prototype);
AirQualitySkill.prototype.constructor = AirQualitySkill;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

AirQualitySkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

AirQualitySkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleWelcomeRequest(response);
};

AirQualitySkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

/**
 * override intentHandlers to map intent handling functions.
 */
AirQualitySkill.prototype.intentHandlers = {
    "AMAZON.HelpIntent": function (intent, session, response) {
        handleHelpRequest(response);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Thanks for letting me help you. Goodbye.";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Thanks for letting me help you. Goodbye.";
        response.tell(speechOutput);
    }
};

function handleHelpRequest(response) {
    var repromptText = "Which city would you like air quality information for?";
    var speechOutput = "I can give you useful information about the "
        + "air quality of a particular city, town, address "
        + "or you can simply open Air Quality skill and ask for the air quality around, "
        + "I will find your location myself."
        + repromptText;

    response.ask(speechOutput, repromptText);
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var AirQualitySkill = new AirQualitySkill();
    AirQualitySkill.execute(event, context);
};
