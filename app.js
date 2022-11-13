require("dotenv").config();
var mongoose = require('mongoose');
const ejs = require("ejs");
const express = require('express')
const bodyParser = require("body-parser");
const path = require('path'); 
const findOrCreate = require("mongoose-findorcreate");

const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

// const becrypt=require("bcrypt");
// const md5=require("md5");
// const encrypt=require("mongoose-encryption");

///////////////////////////////////////////////////////////


const app = express()
const port = process.env.PORT|| 3000
app.set('view engine', 'ejs');


app.enable('trust proxy'); 
app.use(session({
  secret:"OURLITTLESECRET",
  resave:true,
  saveUninitialized: true,
  proxy: true,
  sameSite: "none",
  
}));


app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, 'public')));

///////////////////////////////////////////////////////////

var mongoDB = 'mongodb+srv://admin-mossarella:untold123456@untold.upgx1nh.mongodb.net/UserDB';
mongoose.connect(mongoDB, { useNewUrlParser: true });
// mongoose.set("useCreateIndex",true);


var Schema = mongoose.Schema;
// console.log(process.env.SECRET);
//^YOU CAN SEE ENV SECRET BY THIS
var userSchema = new Schema({
  // eMail: String,
  // passWord: String
  //when we use passport. This guy above is deprecate the passport will handle the schema
  secret:Array,
  googleId:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


var userData = mongoose.model('User', userSchema );

passport.use(userData.createStrategy());
// passport.serializeUser(userData.serializeUser());
// passport.deserializeUser(userData.deserializeUser());




passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "/auth/google/secrets",
  userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  // console.log(profile);

  userData.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

passport.use(new FacebookStrategy({
  clientID: process.env.CLIENT_ID_FB,
  clientSecret: process.env.CLIENT_SECRET_FB,
  callbackURL: "/auth/facebook/secrets",
  // userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  // console.log(profile);

  userData.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

///////////////////////////////////////////////////////////


app.route("/")
.get((req, res) => {

  console.log(req.isAuthenticated());
  if(req.isAuthenticated()){
    res.redirect("/secrets");

  }
  else{
    res.render("home");
  }
});

app.route("/auth/google")
.get(
  passport.authenticate("google",{scope:["profile"]})
)

app.route("/auth/google/secrets")
.get(
  passport.authenticate("google",{failureRedirect:"/login"}),
  function(req,res){
    res.redirect("/secrets");
  }
)
app.route("/auth/facebook")
.get(
  passport.authenticate("facebook")
)

app.route("/auth/facebook/secrets")
.get(
  passport.authenticate("facebook",{failureRedirect:"/login"}),
  function(req,res){
    res.redirect("/secrets");
  }
)


app.route("/login")
.get((req,res)=>{
  res.render("login");
})
.post((req,res)=>{
  // const userName=req.body.username;
  // const passWord=md5(req.body.password);
  
  // userData.findOne({eMail:userName},(err,foundUser)=>{
  //   if(!err){
  //     if(foundUser){
  //       if(foundUser.passWord===passWord){
  //         res.render("secrets");
  //       }
  //       else{
  //         console.log("WRONG PASS");
  //       }
  //     }
  //   }
  // })

  const user=new userData({
    username:req.body.username,
    password:req.body.passWord
  })
  req.logIn(user,(err)=>{
    if(!err){
      passport.authenticate("local",{failureRedirect:"/login"})(req,res,function(){

        if(user){
          
          res.redirect("/secrets");
          console.log("authen");
        }
        else{
          console.log("wrongpass");
        }

      })

    }
    //local scope
  })
})

app.route("/register")
.get((req,res)=>{
  res.render("register")
})
.post((req,res)=>{

  // const newUser= new userData({
  //   eMail:req.body.username,
  //   passWord:md5(req.body.password)
  // });

  // newUser.save((err)=>{userData
  //   if(!err){
  //     res.render("secrets");
  //   }
  // })
  //MD5

  userData.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    
    else{
      passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
      });
    }
  })
});



app.route("/secrets")
.get((req,res)=>{

  userData.find({"secret":{$ne:null}},(err,foundUser)=>{
    if(err){
      console.log(err);
    }
    else{
      if(foundUser){
        res.render("secrets",{userWithSecrets:foundUser});
      }
      else{
        res.render("secrets",{userWithSecrets:["Start submit a secret now"]});

      }

    }
  })


});

app.route("/submit")
.get((req,res)=>{

  
  if(req.isAuthenticated()){
    // console.log(req.user._id)
    userData.findById(req.user._id,function (err,foundUser){
      

      if(!err){
        res.render("submit",{secrets:foundUser.secret});
      }
      else{
        console.log(err);
      }
  })

}
  else{
    res.redirect("/login");
  }

})

.post((req,res)=>{
  const secretSubmitted=req.body.secret;
  const userSubmitted=req.user._id;


  // userData.findById(userSubmitted,(err,foundUser)=>{
  //   if(!err){
  //     if(foundUser){
  //       foundUser.secret.push(secretSubmitted);
  //       foundUser.save();
  //         res.redirect("/secrets");
        

  //     }
  //   }
  //   else{
  //     console.log(err);
  //   }
  // })
  // })
  if(req.isAuthenticated()){
    userData.findById(userSubmitted,function (err, user){
      user.secret.push(secretSubmitted);
      user.save(function (){
        res.redirect("/secrets");
      });
    });
 
  }else {
   res.redirect("/login");
  }
});





app.route("/logout")
.get((req,res)=>{
  req.logOut(function(err){
    if(err){ 
      res.redirect("/login");
    }
    else{
      res.redirect("/login");

    }
  });
});

app.post("/submit/delete",function (req, res){
  if(req.isAuthenticated()){
    userData.findById(req.user._id, function (err,foundUser){
      foundUser.secret.splice(foundUser.secret.indexOf(req.body.secret),1);
      foundUser.save(function (err) {
        if(!err){
          res.redirect("/submit");
        }
      });
    });
  }else {
    res.redirect("/login");
  }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
})

