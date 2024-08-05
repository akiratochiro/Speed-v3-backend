//
const express = require("express"); // importing express module
const app = express(); // setting a constant to use express
const mysql = require("mysql");
app.use(express.urlencoded({ extended: true })); // to be able to get inputs from html
const axios = require("axios"); // importing axios to be able to use the OpenData API
const cors = require("cors");
const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "mysql",
  database: "userdb",
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected...");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/triptes.html");
});

function convertToSydneyTime(utcDateString) {
  // function to convert UTC time in Sydney time
  const utcDate = new Date(utcDateString);
  const options = {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  const sydneyDate = utcDate.toLocaleString("en-AU", options);
  return sydneyDate;
}

function convertdatetoAPIdate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function convertTimetoAPITime(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}${minutes}`;
}

function convertTimetoUserTime(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

app.post("/trip", async (req, postRes) => {
  try {
    // finding the ID of stops:
    let findOriginStopConfig = {
      method: "get",
      maxBodyLength: Infinity,
      url:
        "https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&type_sf=stop&name_sf=" +
        req.body.startStation +
        "&coordOutputFormat=EPSG%3A4326&TfNSWSF=true&version=10.2.1.42",
      headers: {
        accept: "application/json",
        Authorization:
          "apikey eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJwaDlCZngyR1VXUnNOa0oybGx2Rm5UbWY4NjFvN1NWNVl2NGJVelFHTVgwIiwiaWF0IjoxNzIyNjQyNDA4fQ.Jd1q47WTtnLsMqe6Mw9cfvVU8RxwUEHmodUB-NviAiA",
      },
    };
    let findDestinationStopConfig = {
      method: "get",
      maxBodyLength: Infinity,
      url:
        "https://api.transport.nsw.gov.au/v1/tp/stop_finder?outputFormat=rapidJSON&type_sf=stop&name_sf=" +
        req.body.endStation +
        "&coordOutputFormat=EPSG%3A4326&TfNSWSF=true&version=10.2.1.42",
      headers: {
        accept: "application/json",
        Authorization:
          "apikey eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJwaDlCZngyR1VXUnNOa0oybGx2Rm5UbWY4NjFvN1NWNVl2NGJVelFHTVgwIiwiaWF0IjoxNzIyNjQyNDA4fQ.Jd1q47WTtnLsMqe6Mw9cfvVU8RxwUEHmodUB-NviAiA",
      },
    };
    const [originResponse, destinationResponse] = await Promise.all([
      axios.request(findOriginStopConfig),
      axios.request(findDestinationStopConfig),
    ]);

    const origin = originResponse.data.locations[0].id;
    const destination = destinationResponse.data.locations[0].id;
    let depArrMacro = "dep";
    let itdDate = convertdatetoAPIdate(req.body.tripTime);
    let itdTime = convertTimetoAPITime(req.body.tripTime);
    let newUrl = `https://api.transport.nsw.gov.au/v1/tp/trip?outputFormat=rapidJSON&coordOutputFormat=EPSG:4326&depArrMacro=${depArrMacro}&itdDate=${itdDate}&itdTime=${itdTime}&type_origin=any&name_origin=${origin}&type_destination=any&name_destination=${destination}&calcNumberOfTrips=1&TfNSWTR=true&version=10.2.1.42`;

    let config = {
      method: "get",
      maxBodyLength: Infinity,
      url: newUrl,
      headers: {
        accept: "application/json",
        Authorization:
          "apikey eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJwaDlCZngyR1VXUnNOa0oybGx2Rm5UbWY4NjFvN1NWNVl2NGJVelFHTVgwIiwiaWF0IjoxNzIyNjQyNDA4fQ.Jd1q47WTtnLsMqe6Mw9cfvVU8RxwUEHmodUB-NviAiA",
      },
    };

    const tripResponse = await axios.request(config);
    // setting SQL table parameters
    const startStation = req.body.startStation;
    const stopStation = req.body.endStation;
    const userID = 0;
    const tripID = JSON.stringify(
      tripResponse.data.journeys[0].legs[0].transportation.properties
        .RealtimeTripId
    );
    const time = convertTimetoUserTime(
      tripResponse.data.journeys[0].legs[0].origin.departureTimeEstimated
    );
    const trip = { startStation, stopStation, userID, tripID, time };
    const query = "INSERT INTO trips SET ?";
    db.query(query, trip, (err) => {
      if (err) throw err;
      postRes.send(`Trip registered successfully`);
    });
  } catch (error) {
    console.log(error);
    postRes.status(500).send("Error processing the request");
  }
});

app.listen(3000);
