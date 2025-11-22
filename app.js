const express = require('express')
const app = express()
const path = require('path')
const multer = require("multer");
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// console.log("Gemini KEY:", process.env.GEMINI_API_KEY);
const { calculateUserEventSimilarity } = require("./utils/similarityMatrix");
const Workshop = require('./models/workshop')
const hackathon = require('./models/hackathon');
const userModel = require('./models/user')
const orgModel = require('./models/organization');
const Seminar = require('./models/seminar')
const Networking = require('./models/networking')
app.set('view engine','ejs');
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,'public')))
app.use(cookieParser())
app.use("/uploads", express.static("uploads"));

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");   
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });


const isLogged = (req, res, next) => {
    let token = req.cookies.user_token;
    if (!token) {
      return res.redirect('/user/login');
    }
  
    jwt.verify(token, 'shhh', (err, user_email) => {
      if (err) {
        return res.redirect('/user/login');
      }
      req.user = user_email;
      next();
    });
};

const isLogged2 = (req, res, next) => {
    let token = req.cookies.org_token;
    if (!token) return res.redirect('/organisation/login');

    jwt.verify(token, 'shhh', (err, decoded) => {
        if (err) return res.redirect('/organisation/login');
        req.user = decoded; 
        next();
    });
};


app.use('/uploads', express.static('uploads'));
app.get('/organiser',(req,res) => {
    
    res.render("organiser")
})
async function getEmbedding(text) {
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

        const result = await model.embedContent(text);
        return result.embedding.values; 
    } 
    catch (err) {
        console.error("Embedding Error:", err);
        return Array(768).fill(0);
    }
}
function cosineSimilarity(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

app.get("/api/host/workshops", isLogged2, async (req, res) => {
    try {
        const workshops = await Workshop.find({ email: req.user.email });
        res.json({ success: true, workshops });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


app.get('/workshop',isLogged2,(req,res)=>{
    res.render('workshop')
})
app.get('/host/workshop',isLogged2,(req,res)=>{
    res.render('host_offline_workshop')
})
app.post('/host/workshop', isLogged2, upload.single("logo"), async (req, res) => {
    
    try {
        const token = req.cookies.org_token;

       
        const decoded = jwt.verify(token, "shhh");
        const orgEmail = decoded.email;  

        const skillsArr = JSON.parse(req.body.skills || "[]");
        const logoPath = req.file.path.replace(/\\/g, "/");
        const combinedText = `
            ${req.body.workshopTitle}
            ${req.body.description}
            ${skillsArr.join(" ")}
            ${req.body.mode}
            ${req.body.location}
        `;
        const embedding = await getEmbedding(combinedText);

        const workshop = new Workshop({
            email: orgEmail,    
            orgName: req.body.orgName,
            workshopTitle: req.body.workshopTitle,
            url: req.body.url,
            description: req.body.description,
            skills: skillsArr,
            participationType: req.body.participationType,
            mode: req.body.mode,
            venue: req.body.venue,
            location: req.body.location,
            minSize: req.body.minSize,
            maxSize: req.body.maxSize,
            logo:  logoPath ,
            registrationDate: req.body.registrationDate,
            commenceDate: req.body.commenceDate,
            organiserName: req.body.organiserName,
            organiserDesignation: req.body.organiserDesignation,
            organiserEmail: req.body.organiserEmail,
            organiserNumber: req.body.organiserNumber,
            embedding : embedding
        });

        await workshop.save();

        return res.json({
            success: true,
            message: "Workshop saved",
            fields: req.body,
            file: req.file
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: "Something went wrong" });
    }
});

app.post('/user/create_user_account',async (req,res)=>{
    let {fname,lname,email,password} = req.body;
  
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async (err,hash)=>{
            let createdUser = await userModel.create({
                firstName : fname,
                lastName : lname,
                email : email,
                password : hash,
                interests : ['AR/VR']
            }) 
            let token = jwt.sign({email : email},'shhh')
            res.cookie('user_token',token)
            res.redirect('/foryou')
        })
    })    
})
app.post('/user/login-account',async (req,res)=>{
    let {email,password} = req.body;
    let user = await userModel.findOne({email:email});
    if(!user){
        return res.redirect('/user/login')
    }
    bcrypt.compare(password, user.password, (err, isValid) => {
        if (err){
            console.error("Error comparing passwords:", err);
            return res.redirect('/user/login');
        }
        if (!isValid) {
            console.log("Invalid credentials.");
            return res.redirect('/user/login');
        }
        let token = jwt.sign({ email: user.email }, 'shhh', { expiresIn: '7d' });
        res.cookie('user_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.redirect('/foryou');
    });
})

app.post('/organisation/create_org_account',async (req,res)=>{
    let {orgName,location,email,password} = req.body;
  
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async (err,hash)=>{
            let createdOrg = await orgModel.create({
                name : orgName,
                email : email,
                location : location,
                password : hash
            }) 
            let token = jwt.sign({email : email},'shhh')
            res.cookie('user_token','');
            res.cookie('org_token',token)
            res.redirect('/organiser')
        })
    })    
})
app.post('/organisation/login-account',async (req,res)=>{
    let {email,password} = req.body;
    let user = await orgModel.findOne({email:email});
    if(!user){
        return res.redirect('/organisation/login')
    }
    bcrypt.compare(password, user.password, (err, isValid) => {
        if (err){
            console.error("Error comparing passwords:", err);
            return res.redirect('/organisation/login');
        }
        if (!isValid) {
            console.log("Invalid credentials.");
            return res.redirect('/organisation/login');
        }
        let token = jwt.sign({ email: user.email }, 'shhh', { expiresIn: '7d' });
        res.cookie('user_token','');
        res.cookie('org_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.redirect('/organiser');
    });
})



app.get('/host/workshop/completed',isLogged2,(req,res)=>{
    res.render('host_workshop_complete')
})

app.get('/hackathon',isLogged2,(req,res)=>{
    res.render('hackathon')
})
app.get('/host/hackathon',isLogged2,(req,res)=>{
    res.render('host_hackathon')
})
app.post('/host/hackathon',isLogged2, upload.single("logo"),async (req, res) => {

    try {
        const skillsArr = JSON.parse(req.body.skills || "[]");
        
        const hackat = new hackathon({
            orgName: req.body.orgName,
            hackathonTitle: req.body.hackathonTitle,
            url: req.body.url,
            description: req.body.description,
            skills: skillsArr,
            participationType: req.body.participationType,
            mode: req.body.mode,
            venue: req.body.venue,
            location: req.body.location,
            minSize: req.body.minSize,
            maxSize: req.body.maxSize,
            logo: req.file ? req.file.path : null,
            registrationDate : req.body.registrationDate,
            commenceDate : req.body.commenceDate,
            organiserName : req.body.organiserName,
            organiserDesignation : req.body.organiserDesignation,
            organiserEmail : req.body.organiserEmail,
            organiserNumber : req.body.organiserNumber ,
            stages : req.body.stages
                });
        res.json({
            success: true,
            message: "hackathon saved",
            fields: req.body,
            file: req.file
        });
        await hackat.save();


        
       

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, error: "Something went wrong" });
    }
});

app.get('/host/hackathon/completed',isLogged2,(req,res)=>{
    res.render("host_hackathon_completed")
})
app.get('/foryou', isLogged, async (req, res) => {
    const user = await userModel.findOne({ email: req.user.email });
    if (!user) return res.send("User not found");

    let workshops = [
        ...await Workshop.find(),
        ...await Seminar.find(),
        ...await hackathon.find(),
        ...await Networking.find()
    ];

    const scored = workshops.map(w => {
        const score = calculateUserEventSimilarity(user.interests || [], w.skills || []);
        return {
            workshop: w,
            score: score
        };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);
    
    res.render("foryou", { workshops: sorted });
});





app.get('/',(req,res)=>{
    res.render('landing')
})

app.get('/user/login',(req,res)=>{
    res.render('user_login')
})
app.get('/create/user',(req,res)=>{
    res.render('create_user')
})

app.get('/create/organisation',(req,res)=>{
    res.render('create_org')
})
app.get('/organisation/login',(req,res)=>{
    res.render('org_login')
})
app.get("/set_preferences", isLogged, async (req, res) => {
    const user = await userModel.findOne({ email: req.user.email });

    res.render("set_preferences", {
        interests: user?.interests || []
    });
});

app.get('/user/logout',(req,res)=>{
    res.cookie('user_token','');
    res.redirect('/')
})

    app.post('/user/set-preferences', isLogged, async (req, res) => {
        try {
            const { interests } = req.body;   

            
            if (!Array.isArray(interests)) {
                return res.status(400).json({ error: "Interests must be an array" });
            }

            const updated = await userModel.findOneAndUpdate(
                { email: req.user.email },
                { interests: interests },     
                { new: true }
            );

            res.json({ success: true, message: "Preferences updated", interests: updated.interests });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    });


app.get("/api/my-workshops", isLogged2, async (req, res) => {
    try {
        const workshops = await Workshop.find({ email: req.user.email });
        res.json({ success: true, workshops });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Error fetching workshops" });
    }
});
app.get("/workshop/:id", isLogged, async (req, res) => {
    try {
        let workshop = await Workshop.findById(req.params.id);
        
        if (!workshop){
            workshop = await Seminar.findById(req.params.id)
            
        }

        const user = await userModel.findOne({ email: req.user.email });
        if (!user) return res.status(404).send("User not found");

        res.render("event_details", { workshop, user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get('/bookmarks', isLogged, async (req, res) => {
    try {
     
        const user = await userModel
            .findOne({ email: req.user.email })
            .populate("bookmarkedWorkshops")     
            .lean();

        if (!user) {
            return res.redirect('/login');
        }

        const bookmarks = user.bookmarkedWorkshops || [];

        console.log("User Bookmarks:", bookmarks);

        res.render("bookmarks", { bookmarks });

    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
});


app.post("/register/:id", isLogged, async (req, res) => {
    try {
        const workshopId = req.params.id;

     
        const user = await userModel.findOne({ email: req.user.email });
        if (!user) return res.status(404).send("User not found");

        const workshop = await Workshop.findById(workshopId);
        if (!workshop) return res.status(404).send("Workshop not found");

       
        if (!workshop.registeredUsers.includes(user._id)) {
            workshop.registeredUsers.push(user._id);
            await workshop.save();
        }

        
        if (!user.registeredWorkshops.includes(workshopId)) {
            user.registeredWorkshops.push(workshopId);
            await user.save();
        }

        res.redirect(`/workshop/${workshopId}`);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error registering");
    }
});


app.post("/bookmark/:id", isLogged, async (req, res) => {
    try {
        const workshopId = req.params.id;

        const user = await userModel.findOne({ email: req.user.email });
        if (!user) return res.status(404).send("User not found");

        // ✅ Add bookmark only if not already present
        if (!user.bookmarkedWorkshops.includes(workshopId)) {
            user.bookmarkedWorkshops.push(workshopId);
            await user.save();
        }

        res.redirect(`/workshop/${workshopId}`);
    } 
    catch (err) {
        console.error(err);
        res.status(500).send("Bookmark failed");
    }
});




app.listen(process.env.PORT || 3000,()=>{
    console.log('running');
});


app.get('/seminar',(req,res)=>{
    res.render('seminar')
})

app.get('/host/seminar',(req,res)=>{
    res.render('host_seminar')
})
app.post('/host/seminar', isLogged2, upload.single("logo"), async (req, res) => {
    try {
        const token = req.cookies.org_token;
        const decoded = jwt.verify(token, "shhh");
        const orgEmail = decoded.email;

        const skillsArr = JSON.parse(req.body.skills || "[]");
        const logoPath = req.file.path.replace(/\\/g, "/");

        const combinedText = `
            ${req.body.seminarTitle}
            ${req.body.description}
            ${skillsArr.join(" ")}
            ${req.body.mode}
            ${req.body.location}
        `;

        const embedding = await getEmbedding(combinedText);

        const newSeminar = new Seminar({
            email: orgEmail,
            orgName: req.body.orgName,
            seminarTitle: req.body.seminarTitle,
            url: req.body.url,
            description: req.body.description,
            skills: skillsArr,
            participationType: req.body.participationType,
            mode: req.body.mode,
            venue: req.body.venue,
            location: req.body.location,
            minSize: req.body.minSize,
            maxSize: req.body.maxSize,
            logo: logoPath,
            registrationDate: req.body.registrationDate,
            commenceDate: req.body.commenceDate,
            organiserName: req.body.organiserName,
            organiserDesignation: req.body.organiserDesignation,
            organiserEmail: req.body.organiserEmail,
            organiserNumber: req.body.organiserNumber,
            embedding: embedding
        });

        await newSeminar.save();

        return res.json({
            success: true,
            message: "Seminar saved",
            fields: req.body,
            file: req.file
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: "Something went wrong" });
    }
});


app.get('/host/seminar/completed',(req,res)=>{
    res.render('host_seminar_complete')
})

///
app.get("/api/host/workshops", isLogged2, async (req, res) => {
    try {
        const workshops = await Workshop.find({ email: req.user.email });
        res.json({ success: true, workshops });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});




app.get('/networking',(req,res)=>{
    res.render('networking')
})

app.get('/host/networking',(req,res)=>{
    res.render('host_networking')
})
app.post('/host/networking', isLogged2, upload.single("logo"), async (req, res) => {
    try {
        const token = req.cookies.org_token;
        const decoded = jwt.verify(token, "shhh");
        const orgEmail = decoded.email;

        const skillsArr = JSON.parse(req.body.skills || "[]");
        const logoPath = req.file.path.replace(/\\/g, "/");

        const combinedText = `
            ${req.body.networkingTitle}
            ${req.body.description}
            ${skillsArr.join(" ")}
            ${req.body.mode}
            ${req.body.location}
        `;

        const embedding = await getEmbedding(combinedText);

        const newNetworking = new Networking({
            email: orgEmail,
            orgName: req.body.orgName,
            networkingTitle: req.body.networkingTitle,
            url: req.body.url,
            description: req.body.description,
            skills: skillsArr,
            participationType: req.body.participationType,
            mode: req.body.mode,
            venue: req.body.venue,
            location: req.body.location,
            minSize: req.body.minSize,
            maxSize: req.body.maxSize,
            logo: logoPath,
            registrationDate: req.body.registrationDate,
            commenceDate: req.body.commenceDate,
            organiserName: req.body.organiserName,
            organiserDesignation: req.body.organiserDesignation,
            organiserEmail: req.body.organiserEmail,
            organiserNumber: req.body.organiserNumber,
            embedding: embedding
        });

        await newNetworking.save();

        return res.json({
            success: true,
            message: "Networking saved",
            fields: req.body,
            file: req.file
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, error: "Something went wrong" });
    }
});


app.get('/host/networking/completed',(req,res)=>{
    res.render('host_network_complete')
})

app.get('/explore',(req,res)=>{
    res.render('explore')
})
app.get("/api/host/networking", isLogged2, async (req, res) => {
    try {
        const events = await Networking.find({ email: req.user.email });
        res.json({ success: true, events });

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});