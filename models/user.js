const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName : String,
    lastName : String,
    email : String,
    password : String,
    interests: {
        type: [String],
        default: []
    },
    registeredWorkshops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workshop" }],
    bookmarkedWorkshops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workshop" }]
});

module.exports = mongoose.model("user", userSchema);