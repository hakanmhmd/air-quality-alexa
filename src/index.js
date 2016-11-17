/**
 * App ID for the skill
 */
var APP_ID = "amzn1.ask.skill.b3b64419-1bea-4de4-afbb-0f28b5871bf5"


// endpoints urls
const AQ_BASE_URL = 'https://api.breezometer.com/baqi/'
const MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/'

// configuration object
var config = {
    aqi_key: '4a2913f1e1ea42ff9ce8bccf8e665afa',
    google_key: 'AIzaSyBZfjQW4cMtL2RnmkXCHYRIMrc33FIemrM',
    data_format: 'json'
}

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill')
var https = require('https')

/**
 * AirQualitySkill is a subclass of AlexaSkill.
 */
var AirQualitySkill = function () {
    AlexaSkill.call(this, APP_ID)
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
    "GetAirQuality": function (intent, session, response) {
        var locationSlot = intent.slots.location
        var repromptText, speechOutput
        // in case we end with this intent but location is not recognized
        if(!locationSlot.value){
            repromptText = "Please try again providing me with a location, for example, Trafalgar Square, London. "
                + "For which location would you like air quality information?";
            speechOutput = "I'm sorry, I didn't quite recognize that location. " + repromptText

            response.ask(speechOutput, repromptText)
            return
        }
        // location is found
        var location = locationSlot.value

        handleRequest(location, response)
    },

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

// -------------------------- AirQuality skill Domain Specific Business Logic --------------------------

// welcomes user when the skill is started
function handleWelcomeRequest(response) {
    var repromptText = "Which city/town/area would you like air quality information for?",
    speechOutput = {
            speech: "<speak>Welcome to Air Quality. "
                + repromptText
                + "</speak>",
            type: AlexaSkill.speechOutputType.SSML
        },
        repromptOutput = {
            speech: "I can give you useful information about the "
                + "air quality of a particular city, town, address."
                + repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };

    response.ask(speechOutput, repromptOutput);
}

// handles request when user requests help
function handleHelpRequest(response) {
    var repromptText = "Which city/town/area would you like air quality information for?";
    var speechOutput = "I can give you useful information about the "
        + "air quality of a particular city, town, address."
        + repromptText;

    response.ask(speechOutput, repromptText);
}

function handleRequest(location, response){
    getAirQuality(location, function(err, data) {
        if(err){
            // either or both of the api's threw error
            if(err.message) response.tellWithCard(err.message)
            else response.tellWithCard("Sorry, the Air Quality service is experiencing a problem. Please try again later.")
        } else {
            // everything went fine
            response.tellWithCard(data)
        }
    })
}

function getAirQuality(location, callback){
    config.givenLocation = location
    var google_url = MAPS_BASE_URL + getMapsParameters()

    https.get(google_url, function (res) {
        console.log(google_url)
        var response = '';

        if (res.statusCode != 200) {
            callback(new Error())
        }

        res.on('data', function (data) {
            response += data;
        });

        res.on('end', function () {
            var obj = JSON.parse(response);

            if (obj.status == "ZERO_RESULTS") {
                callback(new Error("Sorry! Google did not recognize that location. Please try again!"))
            } else if (obj.status == "REQUEST_DENIED"){
                callback(new Error("Sorry! There is a problem with Google Maps API."))
            } else if(obj.status == "INVALID_REQUEST"){
                callback(new Error("Address parameter is missing. Please try again!"))
            } else {
                config.resolvedLocation = obj.results[0].formatted_address
                config.latitude = obj.results[0].geometry.location.lat
                config.longitude = obj.results[0].geometry.location.lng

                var airq_url = AQ_BASE_URL + getAQIParameters()
                https.get(airq_url, function(res){
                    console.log(airq_url)
                    var response = ''

                    if (res.statusCode != 200) {
                        callback(new Error())
                    }

                    res.on('data', function (data) {
                        response += data
                    });
                    res.on('end', function () {
                        var obj = JSON.parse(response);
                        if (obj.error) {
                            callback(new Error("Error: " + obj.error.message))
                        } else {
                            var text = ''
                            var airq_desc = obj.breezometer_description
                            var pollution_desc = obj.country_description
                            text += airq_desc + ' and ' + pollution_desc + ' in ' + config.resolvedLocation 
                            text += '. My recommendations are: '
                            for(var prop in obj.random_recommendations){
                                text += obj.random_recommendations[prop] + '. '
                            }
                            text += 'The dominant pollutant is ' + obj.dominant_pollutant_description
                            text += '. The effects are: ' + obj.dominant_pollutant_text.effects
                            text += '. The causes are: ' + obj.dominant_pollutant_text.causes
                            callback(null, text)
                        }
                    }).on('error', function (e) {
                        console.log("Error: " + e.message);
                        callback(new Error(e.message));
                    })
                    
                });
            }
            
        }).on('error', function (e) {
            console.log("Error: " + e.message);
            callback(new Error(e.message));
        })
    })
}

// connect google maps api parameters
function getMapsParameters(){
    var params = config.data_format
    params += '?address=' + encodeURIComponent(config.givenLocation)
    params += '&key=' + config.google_key
    return params
}

// connect all the parameters before hitting the endpoint
function getAQIParameters() {
  var params = '?'
  params += 'lat=' + encodeURIComponent(config.latitude)
  params += '&lon=' + encodeURIComponent(config.longitude)
  params += '&key=' + config.aqi_key
  return params;
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var skill = new AirQualitySkill();
    skill.execute(event, context);
};
