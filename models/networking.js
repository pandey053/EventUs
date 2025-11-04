const mongoose = require("mongoose");

const networkingSchema = new mongoose.Schema({
    orgName: String,
    email : String,
    networkingTitle: String,
    url: String,
    description: String,
    skills: [String],
    tfidfVector: { type: [Number], default: [] },
    embedding: { type: [Number], default: [] },
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
    registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    embedding: { type: [Number], default: [] }

});

module.exports = mongoose.model("networking", networkingSchema);