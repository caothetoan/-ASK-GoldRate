/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
        http://aws.amazon.com/apache2.0/
    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
/**
 * App ID for the skill
 */

const http = require('http')
, TABLE_NAME = "GoldRate"
, SKILL_NAME = "Gold Rate"
, APP_ID = "amzn1.ask.skill.70ccf2c9-a713-4a6d-bf4d-cca55023efda"
  , API_KEY = '34e41d950e9c43aa8f66bc199de67e96'
  , API_URL = 'api.openfpt.vn'
  , API_PATH = '/text2speech/v3/'
  , API_TRANSLATE_KEY = '2b8fb652eb85bf13858e'
  , API_TRANSLATE_ID = 'haylamvietnam@gmail.com'
, WORLD = 'the world'
, VIETNAM = 'vietnam'
, HN_LANGUAGE = 'hà nội'
, HCM_LANGUAGE = 'hồ chí minh'
, USE_API_TTS = false;

var API_TRANSLATE_URL = function (text, target_language) {
    return 'http://api.kenh360.com/api/rate';
};
/**
 * The AlexaSkill prototype and helper functions
 */
function AlexaSkill(appId) {
    this._appId = appId;
}

AlexaSkill.speechOutputType = {
    PLAIN_TEXT: 'PlainText',
    SSML: 'SSML'
}

AlexaSkill.prototype.requestHandlers = {
    LaunchRequest: function (event, context, response) {
        this.eventHandlers.onLaunch.call(this, event.request, event.session, response);
    },

    IntentRequest: function (event, context, response) {
        this.eventHandlers.onIntent.call(this, event.request, event.session, response);
    },

    SessionEndedRequest: function (event, context) {
        this.eventHandlers.onSessionEnded(event.request, event.session);
        context.succeed();
    }
};

/**
 * Override any of the eventHandlers as needed
 */
AlexaSkill.prototype.eventHandlers = {
    /**
     * Called when the session starts.
     * Subclasses could have overriden this function to open any necessary resources.
     */
    onSessionStarted: function (sessionStartedRequest, session) {
    },

    /**
     * Called when the user invokes the skill without specifying what they want.
     * The subclass must override this function and provide feedback to the user.
     */
    onLaunch: function (launchRequest, session, response) {
        throw "onLaunch should be overriden by subclass";
    },

    /**
     * Called when the user specifies an intent.
     */
    onIntent: function (intentRequest, session, response) {
        var intent = intentRequest.intent,
            intentName = intentRequest.intent.name,
            intentHandler = this.intentHandlers[intentName];
        if (intentHandler) {
            console.log('dispatch intent = ' + intentName);
            intentHandler.call(this, intent, session, response);
        } else {
            throw 'Unsupported intent = ' + intentName;
        }
    },

    /**
     * Called when the user ends the session.
     * Subclasses could have overriden this function to close any open resources.
     */
    onSessionEnded: function (sessionEndedRequest, session) {
    }
};

/**
 * Subclasses should override the intentHandlers with the functions to handle specific intents.
 */
AlexaSkill.prototype.intentHandlers = {};

AlexaSkill.prototype.execute = function (event, context) {
    try {
        console.log("session applicationId: " + event.session.application.applicationId);

        // Validate that this request originated from authorized source.
        if (this._appId && event.session.application.applicationId !== this._appId) {
            console.log("The applicationIds don't match : " + event.session.application.applicationId + " and "
                + this._appId);
            throw "Invalid applicationId";
        }

        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        if (event.session.new) {
            this.eventHandlers.onSessionStarted(event.request, event.session);
        }

        // Route the request to the proper handler which may have been overriden.
        var requestHandler = this.requestHandlers[event.request.type];
        requestHandler.call(this, event, context, new Response(context, event.session));
    } catch (e) {
        console.log("Unexpected exception " + e);
        context.fail(e);
    }
};

var Response = function (context, session) {
    this._context = context;
    this._session = session;
};

function createSpeechObject(optionsParam) {
    if (optionsParam && optionsParam.type === 'SSML') {
        return {
            type: optionsParam.type,
            ssml: optionsParam.speech
        };
    } else {
        return {
            type: optionsParam.type || 'PlainText',
            text: optionsParam.speech || optionsParam
        }
    }
}

Response.prototype = (function () {
    var buildSpeechletResponse = function (options) {
        var alexaResponse = {
            outputSpeech: createSpeechObject(options.output),
            shouldEndSession: options.shouldEndSession
        };
        if (options.reprompt) {
            alexaResponse.reprompt = {
                outputSpeech: createSpeechObject(options.reprompt)
            };
        }
        if (options.cardTitle && options.cardContent) {
            alexaResponse.card = {
                type: "Simple",
                title: options.cardTitle,
                content: options.cardContent
            };
        }
        var returnResult = {
            version: '1.0',
            response: alexaResponse
        };
        if (options.session && options.session.attributes) {
            returnResult.sessionAttributes = options.session.attributes;
        }
        return returnResult;
    };

    return {
        tell: function (speechOutput) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                shouldEndSession: true
            }));
        },
        tellWithCard: function (speechOutput, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: true
            }));
        },
        ask: function (speechOutput, repromptSpeech) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                shouldEndSession: false
            }));
        },
        askWithCard: function (speechOutput, repromptSpeech, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: false
            }));
        }
    };
})();


// --------------- Helpers that build all of the responses -----------------------

/**
 * SpaceGeek is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var Translator = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
Translator.prototype = Object.create(AlexaSkill.prototype);
Translator.prototype.constructor = Translator;

Translator.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    //console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

Translator.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    //console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleLaunchRequest(session, response);
};

/**
 * Overridden to show that a subclass can override this function to teardown session state.
 */
Translator.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    //console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

Translator.prototype.intentHandlers = {
    "CityIntent": function (intent, session, response) {
        handleTranslatorRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can ask me translate something, or, you can say exit... What can I help you with?", "What can I help you with?");
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};


var httpPost = function (requestData, options, callback) {
    console.log("start call api");
    console.log(requestData);
    console.log(JSON.stringify(options));

    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        var body = '';

        res.on('data', function (data) {
            body += data;
        });

        res.on('end', function () {
            console.log(body);
            var result = JSON.parse(body);
            callback(result);
        });
    }).on('error', function (e) {
        console.log('Error: ' + e);
    });

    req.write(requestData);
    req.end();

};
var httpGet = function (url, callback) {
    http.get(url, function (res) {
        var body = '';

        res.on('data', function (data) {
            body += data;
        });

        res.on('end', function () {
            var result = JSON.parse(body);
            callback(result);
        });

    }).on('error', function (e) {
        console.log('Error: ' + e);
    });
};

function handleLaunchRequest(session, response) {
    var cardTitle = "Welcome to " + SKILL_NAME;

    console.log("Welcome Message Invoked");
    const params = {
        TableName: TABLE_NAME,
        Key: { Key: session.user.userId }
    };
    var audioOutput = "<speak>";
    audioOutput = audioOutput + "Welcome to " + SKILL_NAME + ".";
    audioOutput = audioOutput + " Your tool for seeking gold rate  in the world. Let's seeking by saying " +
        " gold rate.";
    audioOutput = audioOutput + "</speak>";

    var cardOutput = "Welcome to " + SKILL_NAME + ". Your tool for seeking gold rate in the world.";

    var repromptText = "Please start by saying " +
            " gold rate.";

    var speechOutput = {
        type: "SSML",
        speech: audioOutput
    };
    response.askWithCard(speechOutput, repromptText, cardTitle, cardOutput);

}

function getCityIntent(intent) {
    if (intent.slots.city) {
        var city = intent.slots.city.value;
        if (!city)
            return VIETNAM;
        switch (city.toLowerCase()) {
            case 'hanoi':
                return HN_LANGUAGE;
            case 'ho chi minh':
                return HCM_LANGUAGE;
            default:
                return VIETNAM;
        }
    }
    return VN_LANGUAGE;
}
var cardTitle = SKILL_NAME;
var getSpeechByItem = function (item) {
    return ' Type ' + item.Type
            + ' Buy ' + item.Buy
            + ' Sell ' + item.Sell + '.';
}
var getSpeechByCities = function (currentCity, type) {
    var text = ' City ' + currentCity.Name;
    for (var j = 0; j < currentCity.Items.length; j++) {
        var item = currentCity.Items[j];
        if (type && type.toLowerCase() === item.Type.toLowerCase()) {
            text = getSpeechByItem(item);
            break;
        }
        else
            text += getSpeechByItem(item);
    }
    return text;
}
function handleTranslatorRequest(intent, session, response) {
    console.log("TranslatorRequest Invoked");
    const params = {
        TableName: TABLE_NAME,
        Key: { Key: session.user.userId }
    };
    var cityName = getCityIntent(intent);
    console.log("getCityIntent " + cityName);

    var type = '';
    if (intent.slots.gold)
        type = intent.slots.gold.value;

    var sentence = 'Gold ';

    //call api translate
    httpGet(API_TRANSLATE_URL(sentence, cityName),
        function (res) {
            console.log('callback ' + JSON.stringify(res));

            var translatedText = '';
            var cities = [];
            if (res.Cities)
                cities = res.Cities;

            console.log(res.Updated);
            if (cities && cities.length > 0) {

                for (var i = 0; i < cities.length; i++) {
                    var currentCity = cities[i];
                    // find item by name                       
                    if (cityName !== VIETNAM && cityName === currentCity.Name.toLowerCase()) {
                        translatedText = getSpeechByCities(currentCity, type);
                        break;
                    }
                    else
                        translatedText += getSpeechByCities(currentCity, type);
                }
            }
            else {
                console.log(translatedText);
            }

            // call api tts
            if (USE_API_TTS)
                ttsApi(sentence, translatedText, session, response);
            else {
                var speechOutput = sentence + " " + translatedText;
                var cardOutput = "" + sentence + " " + translatedText;
                console.log(speechOutput);
                response.tellWithCard(speechOutput, cardTitle, cardOutput);
            }
        });
}
var ttsApi = function (sentence, translatedText, session, response) {
    console.log("ttsApi Invoked");

    var data = JSON.stringify(translatedText);

    var options = {
        host: API_URL,
        port: 80,
        path: API_PATH,
        method: 'POST',
        skipAuthorization: true,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            voice: 'male',
            speed: 0,
            api_key: API_KEY
        }
    };

    httpPost(data,
        options,
        function (res) {
            if (!res) {
                console.log("api response invalid");
                var speechOutput = sentence + " meaning " + translatedText;
                var cardOutput = "Translating " + sentence + " meaning " + translatedText;

                response.tellWithCard(speechOutput, cardTitle, cardOutput);
                return;
            }

            var async = res.async;
            console.log("api response async:" + async);

            var audioOutput = "<speak>";
            audioOutput = audioOutput + "" + sentence + " meaning ";
            audioOutput = audioOutput + "<audio src=\"" + async + "\" />";

            audioOutput = audioOutput + "</speak>";

            var cardOutput = "Translating " + sentence + " meaning " + translatedText;

            var speechOutput = {
                type: "SSML",
                speech: audioOutput
            };

            response.tellWithCard(speechOutput, cardTitle, cardOutput);
        });
}
// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var translator = new Translator();
    translator.execute(event, context);
};
