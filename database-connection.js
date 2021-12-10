const mongoose = require("mongoose");

//your local database url
//27017 is the default mongoDB port
const uri = "mongodb://localhost:27017/a4";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }).then(
    () => {
  
      console.log("You are connected to Mangos");
    },
    err => {
      /** handle initial connection error */
  
      console.log("error connecting to Mangos: ");
      console.log(err);
    }
  );
  
  module.exports = mongoose.connection;