require("dotenv").config();
const express = require("express");
const crypto=require("crypto");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");
const multer = require("multer");
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const fs = require("fs");
const app = express();


app.use(bodyparser.json());
app.set("view-engine", "ejs");
app.use(express.static("public"));
app.use(bodyparser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.KEY,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

mongoose
.connect(process.env.MONGODB_URI)
  .then(() => console.log("mongo connected"))
  .catch((err) => console.log(err));
  
  const messRoutineSchema = new mongoose.Schema({
    day: { type: String, required: true },       
    breakfast: { type: String, required: true }, 
    lunch: { type: String, required: true },     
    dinner: { type: String, required: true }
  });
  
  const messmodel = mongoose.model("messRoutine", messRoutineSchema);
  
  const userschema = new mongoose.Schema({
    username: String,
    password: String,
    registration: { type: String, unique: true },
    name: String,
    hostel: String,
    gender: String,
    role: {
      type: String,
      default: "Student",
    },
    tcomplaint: {
      type: Number,
      default: 0,
    },
    emailVerificationToken: String,  
    isEmailVerified: {
      type: Boolean,
      default: false 
    }
  });
  
  userschema.plugin(passportlocalmongoose);
  
  const usermodel = mongoose.model("messrecord", userschema);
  
  // passport.use(new LocalStrategy(
    //   function(username, password, done) {
      //     usermodel.find({ username: username }).then((user) => {
        //       // if (err) { return done(err); }
        //       if (!user) { return done(null, false, { message: 'Incorrect username.' }); }
        //       bcrypt.compare(password, user[0].salt, function(err, result) {
//         if (err) { return done(err); }
//         console.log(user[0].name);
//         if (!result) { return done(null, false, { message: 'Incorrect password.' }); }
//         return done(null, user);
//       });
//     });
//   }
// ));

passport.serializeUser(function(user, done) {
  done(null, { id: user._id, username: user.username, role: user.role, hostel: user.hostel });
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// passport.serializeUser(usermodel.serializeUser());
// passport.deserializeUser(usermodel.deserializeUser());

passport.use(usermodel.createStrategy());

const complaintschema = new mongoose.Schema({
  userid: mongoose.Types.ObjectId,
  username: String,
  complaint: String,
  hostel: String,
  upvote: {
    type: Number,
    default: 0,
  },
  downvote: {
    type: Number,
    default: 0,
  },
  like: {
    type: [String], // Array of strings
  },
  dislike: {
    type: [String], // Array of strings
  },
  status: {
    type: String,
    default: "open",
  },
  createdAt: {
    type: Date,
    default: Date.now, 
  },
  updatedAt: {
    type: Date,
    default: Date.now, 
  },
  image: String,
  img64: String,
});

const complaintmodel = mongoose.model("complaints", complaintschema);

//storage and filename setting//

const storage = multer.diskStorage({
  destination: "public/uploads",
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images only (mimetype for image files)
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/gif' ||
    file.mimetype === 'image/jpg'
  ) {
    cb(null, true);  // Accept the file
  } else {
    cb(new Error('Only image files are allowed!'), false);  // Reject the file
  }
};

//upload setting//
const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

let cond = true;
let islogged = false;

app.route("/").get(function (req, res) {
  // console.log(req.session.user);
  islogged = req.isAuthenticated()? true : false;
  res.render("home.ejs", { islogged, cond });
});

app
  .route("/login")
  .get(function (req, res) {
    if(req.isAuthenticated() && req.user.role==="Student"){
      // req.session.user = user;
      res.redirect("/userprofile");
    }
    else if(req.isAuthenticated() && req.user.role==="admin"){
      res.redirect("/adminprofile");
    }
    else{    
      res.render("login.ejs", { error: "" });
    }
  })
  .post(function (req, res) {
    usermodel.findOne({ username: req.body.username })
    .then((user) => {
      if (!user) {
        return res.render("login.ejs", { error: "Please Enter Valid Data" });
      }

      passport.authenticate("local", function (err, authenticatedUser, info) {
        if (err) {
          console.log(err);
          return res.status(500).render("login.ejs", { error: "An error occurred during authentication." });
        }
        if (!authenticatedUser) {
          return res.status(401).render("login.ejs", { error: "Invalid user ID or Password" });
        }
    
        if (authenticatedUser.role === "user" && !authenticatedUser.isEmailVerified) {
          return res.status(401).render("login.ejs", { error: 'Please verify your email before logging in.' });
        }
    
        req.login(authenticatedUser, function (err) {
          if (err) {
            console.log(err);
            return res.status(500).render("login.ejs", { error: "An error occurred while logging in." });
          }
    
          if (authenticatedUser.role === "admin") {
            return res.redirect("/adminprofile");
          } else {
            return res.redirect("/userprofile");
          }
        });
      })(req, res);
    })
    .catch(err => {
      console.log(err);
      res.status(500).render("login.ejs", { error: "An error occurred while processing your request." });
    });
  });
  
app.route("/forgot")
  .get(function(req,res){
      res.render("forgot.ejs");
  })
  .post(async function(req,res){
      const email= req.body.username;
      // alert(email);
      try {
        const user = await usermodel.findOne({ username : email });
        // Check if a user with the specified email exists

        if (user) {
            // User found, return a success response
          const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });
          const time = Date.now();
          // console.log(email,otp);
          req.session.otp = otp;
          req.session.time = time;
          req.session.userid=email;
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.mail,
                pass: process.env.password
            }
          });

          const mailOptions = {
            from: process.env.mail,
            to: email,
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
               Please use the following token within one minute to reset your password:\n\n
               Token: ${otp}\n\n
               If you did not request this, please ignore this email and your password will remain unchanged.\n`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                res.send('Error sending OTP');
            } else {
                // console.log('Email sent: ' + info.response);
                // Save the OTP in the database or session for verification
                res.redirect('/verify');
            }
          });
            
        } else {
            // User not found, return a failure response
            res.send("This email is not registered!");
        }
    } catch (err) {
        console.error('Error checking user', err);
        res.status(500).send('Error checking user');
    }
  });

  app.route("/verify")
  .get(function(req,res){
    res.render('verify.ejs',{error:""});
  })
  .post(function(req,res){
    const entered_otp=req.body.otp;
    const otpTimestamp = req.session.time;
    const otpValidityPeriod = 1 * 60 * 1000; // 1 minutes in milliseconds

    // console.log(entered_otp);
    if (Date.now() - otpTimestamp > otpValidityPeriod) {
        res.render('login.ejs',{error:"OTP expired. Please request a new one!"});
        // res.send('OTP expired. Please request a new one.');
    } else if (req.session.otp === entered_otp) {
        res.redirect('/reset')
    } else {
      res.render('verify.ejs',{error:"Invalid OTP. Please try again!"});
    }
  });

  app.route("/reset")
  .get(function(req,res){
    res.render('reset.ejs',{error:""});
  })
  .post(async function(req,res){
    const newpassword=req.body.newpassword;
    const repassword=req.body.repassword;
    if(newpassword===repassword){
      const username=req.session.userid;
      // console.log(newpassword,repassword);
      try {
        // Find the user by username
        const user = await usermodel.findOne({ username });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
    
        // Set new password using setPassword method
        await user.setPassword(newpassword);
    
        // Save the updated user object
        await user.save();
    
        res.render('login.ejs',{error: "Password reset successfully!"});       
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
    else{
      res.render('reset.ejs',{error:"Please Enter the same password!"});
    }
  });

  app
    .route("/signup")
    .get(function (req, res) {
      if(req.isAuthenticated()){
        res.redirect("/userprofile");
      }
      else    res.render("signup.ejs");
    })
    .post(function (req, res) {
        usermodel.register(
          {
            username: req.body.username,
            name: req.body.name,
            registration: req.body.registration,
            hostel: req.body.hostel,
            gender: req.body.inlineRadioOptions,
            emailVerificationToken: crypto.randomBytes(20).toString('hex'),
          },
          req.body.password,
          function (err, user) {
            if (err) {
              if (err.name === 'UserExistsError') {
                // console.log('User already exists with that username.');
                return res.status(400).send('Username already exists. Please choose another username.');
              }
              
              if (err.code === 11000 && err.keyPattern && err.keyPattern.registration) {
                // console.log('User already exists with that registration number.');
                return res.status(400).send('Registration number already exists. Please use a different one.');
              }
        
              console.log(err);
              return res.redirect("/signup");
            }

            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: process.env.mail,
                pass: process.env.password   
              }
            });

            const mailOptions = {
              from: process.env.mail,
              to: req.body.username,  
              subject: 'Verify your email',
              text: `Please verify your email by clicking the following link: 
                     http://mess-relay.onrender.com//verify-email?token=${user.emailVerificationToken}`  // Use token here
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
                return res.status(500).send('Error sending email.');
              } else {
                console.log('Email sent: ' + info.response);
                res.render("login.ejs",{error: 'Please Verify your Email.'});
              }
            });
        
          }
      );
    });

    app.get('/verify-email',async (req, res) => {
      const token = req.query.token;
    
      try {
        const user = await usermodel.findOne({ emailVerificationToken: token });
    
        if (!user) {
          return res.status(400).send('Invalid token or token expired.');
        }
    
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;  // Clear the token after verification
    
        await user.save();
    
        res.render("login.ejs",{error: 'Email verified successfully! You can now log in.'});
      } catch (err) {
        // console.error(err);
        res.status(500).send('Error verifying email.');
      }
    });
  
  app.route("/attendence")
    .get(function(req,res){
      if(req.isAuthenticated()){
        res.render("attendence.ejs");
      }
    });

// ----------------------------userprofile-----------------------------------------

    let openu,closeu,inprogressu;
    app
    .route("/userprofile")
    .get(function (req, res) {
      if (req.isAuthenticated()){ 
        if(req.user.role==="Student"){
          cond = true;
          // console.log(req.user,req.user._id);
          var id = req.user.id;
          complaintmodel
            .find({ userid: id })
            .then((data) => {
              openu=closeu=inprogressu=0;
              for (let i = 0; i < data.length; i++) {
                  if(data[i].status==="open")
                      openu++;
                  else if(data[i].status==="close")
                      closeu++;
                  else
                      inprogressu++;
              }
              // console.log(data);
              res.render("userprofile.ejs", { complaints: data,id,openu,closeu,inprogressu });
            })
            .catch((error) => {
              console.error(error);
            });
        }
        else{
          res.send("Access Denied: This page is for Student only.");
        }
      } else {
        // res.redirect('/login');
        res.render("login.ejs", { error: "Login To View userprofile" });
      }
    })
    .post(function (req, res) {
      async function fetchData() {
        let arr=req.body.likedata;
        if(arr && arr.length > 0){
          // console.log(arr);
          arr.forEach(i => {
            const update = {
              $set: { 
                  downvote: i.downvote, 
                  upvote: i.upvote 
              }
            };
            
            if (i.add && i.add.length > 0) {
              update.$push = { like: i.add };
            }

            if (i.remove && i.remove.length > 0) {
              update.$pull = { like: i.remove };
            }

            if (i.disremove && i.disremove.length > 0) {
              update.$pull = { dislike: i.disremove };
            }

            complaintmodel
            .updateOne({ _id: i.userid },update)
            .then((result) => {
              if (!result) console.log("not updated");
            });
          });
        }
        
      }
      fetchData().then(result => {
        if(result)     console.log("updated");
      });
      var a=req.body.dislikedata;
      if(a && a.length > 0){
        // console.log(a);
        a.forEach(i => {
          // const update = {
          //   $set: {  downvote: i.downvote }
          // };
          const update = {
            $set: { 
                downvote: i.downvote, 
                upvote: i.upvote 
            }
          };
          
          if (i.add && i.add.length > 0) {
            update.$push = { dislike: i.add };
          }

          if (i.remove && i.remove.length > 0) {
            update.$pull = { dislike: i.remove };
          }

          if (i.likeremove && i.likeremove.length > 0) {
            update.$pull = { like: i.likeremove };
          }

          complaintmodel
          .updateOne({ _id: i.userid },update)
          .then((result) => {
            if (!result) console.log("not updated");
          });
        });
      }
      const v = req.body.choose;  
      var id=req.user.id;
      if (v === "All") {
        complaintmodel.find({ hostel: req.user.hostel }).then((data) => {
          // console.log(data);
          openu = 0, closeu = 0, inprogressu = 0;
          // console.log(id);
          for (let i = 0; i < data.length; i++) {
              // console.log(data[i].userid);
              if(data[i].userid.toString() === id.toString()){
                  if (data[i].status === "open") openu++;
                  else if (data[i].status === "close") closeu++;
                  else inprogressu++;
              }
          }
          res.render("userprofile.ejs", { complaints: data,id,openu,closeu,inprogressu });
        });
      } else {
        complaintmodel.find({ userid: id }).then((data) => {
          // console.log(data);
          openu = 0, closeu = 0, inprogressu = 0;
          for (let i = 0; i < data.length; i++) {
              if (data[i].status === "open") openu++;
              else if (data[i].status === "close") closeu++;
              else inprogressu++;
          }
          // openu=closeu=inprogressu=6;
          res.render("userprofile.ejs", { complaints: data,id,openu,closeu,inprogressu });
        });
      }
    });

    
// -----------user_inforation---------------------------------------------
app.route("/information")
  .get(function(req,res){
      if(req.isAuthenticated()){
        usermodel.find({_id : req.user.id}).then((data) => {
          // console.log(data);
          res.render("information.ejs",{user: data});
        });
      }
      else  res.render('login.ejs',{error:"Login to see information of User!"});
    });

// ======================adminprofile=================================

let opena,closea,inprogressa;
app.route("/adminprofile")
.get(function (req, res) {
  if(req.isAuthenticated()){
    if(req.user.role==="admin"){
      // console.log(req.user);
      cond = false;
      islogged = true;
      complaintmodel.find({}).then((data) => {
      opena=closea=inprogressa=0;
      for (let i = 0; i < data.length; i++) {
          if(data[i].status==="open")
              opena++;
          else if(data[i].status==="close")
              closea++;
          else
              inprogressa++;
      }
      return complaintmodel.find({ status: "open" });
      }).then((openComplaints) => {
          // Render admin profile with data from both find operations
          res.render("adminprofile.ejs", { complaints: openComplaints, opena, closea, inprogressa });
      }).catch((error) => {
          console.error(error);
      });
    }
    else{
      res.send("Access Denied: This page is for Admin only.");
    }
  }
  else
    res.render("login.ejs", { error: "Login To View Adminprofile" });
})
.post(async function(req,res){
  try {
    var status = req.body.change;
      let result;
      if (req.body.choose === "tick1") {
        status="initiated";
        opena--;
        if(opena<0)
            opena=0;
        inprogressa++;
        result = await complaintmodel.updateOne({ _id: req.body.c_id }, { $set: { status: "in-progress",updatedAt: new Date() } });
      } 
      else if(req.body.choose==="tick2"){
        status="completed";
        inprogressa--;
        if(inprogressa<0)
            inprogressa=0;
        closea++;
        result = await complaintmodel.updateOne({ _id:  req.body.c_id }, { $set: { status: "close",updatedAt: new Date() } });
      }

      // if (!result) {
      //   console.log("Data not updated");
      // } 

      let data;
      if (status == "all") {
        data = await complaintmodel.find({ status: "open" });
      } else if (status == "initiated") {
        data = await complaintmodel.find({ status: "in-progress" });
      } else {
        data = await complaintmodel.find({ status: "close" });
      }
      // console.log(data);
      res.render("adminprofile.ejs", { complaints: data, opena, closea, inprogressa });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

let f;
app.route("/detail")
  .get(function(req,res){
      if(req.isAuthenticated()){
        if(req.user.role==="admin"){
          complaintmodel.find({_id:f}).then((data) => {
            res.render("detail.ejs",{complaints: data});
          });
        }
        else
           res.send("Access Denied:This is Only for Admin!");
      }
      else  res.render('login.ejs',{error:"Login to see Detail of Complaint!"});
  })
  .post(function(req,res){
    if(req.isAuthenticated()){
      f=req.body.userId;
      // console.log(f);
      complaintmodel.find({_id:f}).then((data) => {
          // console.log(data);
            res.render("detail.ejs",{complaints: data});
        });
    }
    else  res.render('login.ejs',{error:"Login to see Detail of Complaint!"});
  });


// ==================menu============================================

var isAdmin=0;
app.route("/menu")
  .get(async function (req,res){
    if(req.isAuthenticated()){
      try {
        const routine = await messmodel.find();
        // console.log(req.user.role);
        if(req.user.role==="admin"){
          isAdmin=1;
        }
        else  isAdmin=0;
        res.render("menu.ejs",{ routine,isAdmin });
      } catch (err) {
          res.status(500).send("Error fetching mess routine");
      }
    }
    else  res.render('login.ejs',{error:"Login to see Menu!"});
  });


  app.post('/update-mess-routine', async (req, res) => {
    const { day, breakfast, lunch, dinner } = req.body;

    try {
        await messmodel.findOneAndUpdate({ day }, { breakfast, lunch, dinner }, { upsert: true });
        const routine = await messmodel.find();
        if(req.user.role==="admin"){
          isAdmin=1;
        }
        res.render("menu.ejs",{ routine,isAdmin });
    } catch (err) {
        res.status(500).send("Error updating mess routine");
    }
});
  
  // =======================complaint===========================================
  
  app
  .route("/complaint")
  .get(function (req, res) {
    if (req.isAuthenticated() && req.user.role==="Student") {
      res.render("complaint.ejs");
    } else {
      res.render("login.ejs", { error: "Login To Add Complaint" });
    }
  })
  .post(upload.single("image"), function (req, res) {
    var id = req.user.id;
    var imgpath = req.file ? req.file.path : null;
    var img = null;

    if (imgpath) {
      // console.log(imgpath);
      img = fs.readFileSync(imgpath, { encoding: "base64" });
    }

    usermodel
      .updateOne({ _id: id }, { $inc: { tcomplaint: 1 } })
      .then((result) => {
        if (!result) console.log("not updated");
      });

    var comp = req.body.message;
    var name = req.user.username;

    const complaintData = {
      userid: id,
      username: name,
      complaint: comp,
      hostel: req.user.hostel,
    };

    if (req.file) {
      complaintData.image = req.file.filename;
      complaintData.img64 = img;
    }

    const c = new complaintmodel(complaintData);

    c.save().then(() => {
      if (imgpath) fs.unlinkSync(imgpath); // Remove file only if it was uploaded
      res.redirect("/userprofile");
    });
  });
  
  app.get("/logout", (req, res) => {
    // Destroy the session to log out the user
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        res.status(500).send("Internal Server Error");
    } else {
      islogged = false;
      res.redirect("/login"); // Redirect to the login page after logout
    }
  });
});

app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen("3000", function (req, res) {
  console.log("server started");
});

// usermodel.register(
//     {
//         username: "puneetk322003@gmail.com",
//         name: "Puneet",
//     registration: "xxxx",
//     hostel: "raman",
//     gender: "male",
//     role: "admin",
//   },
//   "puneet",
//   (err, user) => {
//       if (err) {
//           console.error(err);
//           return res.status(500).json({ error: "Error registering user" });
//         }
//       }
//     );

    //------------------ mess routine ---------------

    //   const routines = [
    //     { day: "Monday", breakfast: "Pancakes", lunch: "Pasta", dinner: "Pizza" },
    //     { day: "Tuesday", breakfast: "Omelette", lunch: "Biryani", dinner: "Burger" },
    //     { day: "Wednesday", breakfast: "Cereal", lunch: "Tacos", dinner: "Steak" },
    //     { day: "Thursday", breakfast: "Waffles", lunch: "Salad", dinner: "Chicken" },
    //     { day: "Friday", breakfast: "Toast", lunch: "Sandwich", dinner: "Fish" },
    //     { day: "Saturday", breakfast: "Fruit", lunch: "Sushi", dinner: "BBQ" },
    //     { day: "Sunday", breakfast: "Bagels", lunch: "Pizza", dinner: "Soup" }
    // ];
    
    // routines.forEach(async (routine) => {
    //     const newRoutine = new messmodel(routine);
    //     try {
    //         await newRoutine.save();
    //         console.log(`${routine.day} routine saved!`);
    //     } catch (error) {
    //         console.error(`Error saving ${routine.day} routine:`, error);
    //     }
    // });
