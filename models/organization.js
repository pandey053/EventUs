const mongoose = require("mongoose");

const orgSchema = new mongoose.Schema({
    name : String,
    email : String,
    location : String,
    password : String
});

module.exports = mongoose.model("org", orgSchema);