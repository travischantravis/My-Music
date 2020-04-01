/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

const express = require("express"); // Express web server framework
const request = require("request"); // "Request" library
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const axios = require("axios");
require("dotenv").config();

const client_id = "cd66c60352304cec9b3e38584fb3ed47"; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = "http://localhost:3000/callback"; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = "spotify_auth_state";

var app = express();

// Middleware
app
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser());

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", function(req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  const scope = "user-read-private user-read-email user-top-read";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      })
  );
});

app.get("/callback", function(req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch"
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(client_id + ":" + client_secret).toString("base64")
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        // axios
        //   .get("https://api.spotify.com/v1/me", options)
        //   .then(axiosResponse => {
        //     // console.log(axiosResponse.data);
        //     data = axiosResponse.data;
        //     res.redirect(
        //       "mymusic/#" +
        //         querystring.stringify({
        //           access_token: access_token,
        //           refresh_token: refresh_token
        //         })
        //     );
        //   })
        //   .catch(err => console.log(err));

        // we can also pass the token to the browser to make requests from there
        res.redirect(
          "/mymusic/?" +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token
            })
        );
      } else {
        res.redirect(
          "/#" +
            querystring.stringify({
              error: "invalid_token"
            })
        );
      }
    });
  }
});

app.get("/refresh_token", function(req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        new Buffer(client_id + ":" + client_secret).toString("base64")
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token
      });
    }
  });
});

// My music page
app.get("/mymusic/", (req, res) => {
  const { access_token, refresh_token } = req.query;

  const options = {
    headers: { Authorization: "Bearer " + access_token },
    json: true
  };

  async function getData() {
    try {
      const response = await Promise.all([
        axios.get("https://api.spotify.com/v1/me", options),
        axios.get(
          "https://api.spotify.com/v1/me/top/artists/?limit=10&time_range=long_term",
          options
        )
      ]);

      // const data = response.data;
      // console.log(response[1].data.items.length);
      res.render("mymusic", { response: response });
    } catch (err) {
      console.log(err);
    }
  }

  getData();
});

console.log("Listening on 3000");
app.listen(3000);

// express-session, musicScape github, module.exports, spotifyAPI, p5.js d3.js, autocomplete() jqueryUI, fetching jQuery, knockout.js
