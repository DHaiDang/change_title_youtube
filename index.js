const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const cron = require("node-cron");
const OAuth2 = google.auth.OAuth2;

const SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"];
const TOKEN_DIR =
  (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
  "/.credentials/";
const TOKEN_PATH = TOKEN_DIR + "youtube-updater.json";

const youtube = google.youtube("v3");
const VIDEO_ID = "mDBFZGbBxhg";  

// Load client secrets from a local file.

// COde above here is from the Google Docs
cron.schedule("* * * * *", () => {
  fs.readFile("keys.json", function processClientSecrets(err, content) {
    if (err) {
      console.log("Error loading client secret file: " + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the YouTube API.
    authorize(JSON.parse(content), makeAuthCall);
  });
  
  function authorize(credentials, callback) {
    let clientSecret = credentials.installed.client_secret;
    let clientId = credentials.installed.client_id;
    let redirectUrl = credentials.installed.redirect_uris[0];
    let oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
  
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
      if (err) {
        getNewToken(oauth2Client, callback);
      } else {
        oauth2Client.credentials = JSON.parse(token);
        callback(oauth2Client);
      }
    });
  }
  
  function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url: ", authUrl);
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("Enter the code from that page here: ", function (code) {
      rl.close();
      oauth2Client.getToken(code, function (err, token) {
        if (err) {
          console.log("Error while trying to retrieve access token", err);
          return;
        }
        oauth2Client.credentials = token;
        storeToken(token);
        callback(oauth2Client);
      });
    });
  }
  
  function storeToken(token) {
    try {
      fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
      if (err.code != "EEXIST") {
        throw err;
      }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
      if (err) throw err;
      console.log("Token stored to " + TOKEN_PATH);
    });
  }
  const makeAuthCall = (auth) => {
    youtube.videos.list(
      {
        auth: auth,
        id: VIDEO_ID,
        part: "id,snippet,statistics",
      },
      (err, response) => {
        if (err) {
          console.log(`some shit went wrong ${err}`);
          return;
        }
  
        if (response.data.items[0]) {
          // We have found the video and the details
          console.log(`We found the video, now updating...`);
          updateVideoTitle(response.data.items[0], auth);
        }
      }
    );
  };
  
  const updateVideoTitle =(video, auth) => {
    // get the number of views
    let views = video.statistics.viewCount;
    let likes = video.statistics.likeCount;
    let commentCount = video.statistics.commentCount;
  
    video.snippet.title = `Video này có ${views} views - ${likes} like - ${commentCount} comment`;
  
    console.log(`Updating title to ${video.snippet.title}`);
  
    youtube.videos.update(
      {
        auth: auth,
        part: "snippet,statistics",
        resource: video,
      },
      (err, response) => {
        console.log(response);
        if (err) {
          console.log(`There was an error updating ${err}`);
          return;
        }
        if (response.data.items) {
          console.log("Done");
        }
      }
    );
  };
});


