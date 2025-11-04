const mongoose = require("mongoose");
const hackathonSchema = new mongoose.Schema({
    orgName: String,
    hackathonTitle: String,
    url: String,
    description: String,
    skills: [String],
    participationType: String,
    mode: String,
    venue: String,
    location: String,
    minSize: Number,
    maxSize: Number,
    logo: String,  
    registrationDate : Date,
    commenceDate : Date,
    organiserName : String,
    organiserDesignation : String,
    organiserEmail : String,
    organiserNumber : String,
    stages : String
});

module.exports = mongoose.model("Hackathon", hackathonSchema);
