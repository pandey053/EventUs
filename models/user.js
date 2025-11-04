const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    firstName : String,
    lastName : String,
    email : String,
    password : String,
    interests: {
        type: [String],
        default: []
    }
});

module.exports = mongoose.model("User", userSchema);
