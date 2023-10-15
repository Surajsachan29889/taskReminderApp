//module assignment
const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const app = express();
const accountSid = "ACeaeb1b0ee39771d0230220f55e316c4c";
const authToken = "69a428802d5c508c73c98ebc8ca53b9e" ;
const client = require("twilio")(accountSid, authToken);
const cron = require("node-cron");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.session());
app.use(passport.initialize());
app.use(bodyparser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));

cron.schedule("* * * * *", async () => {
  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour12: false,
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });



  // Get all tasks that are due at the current time
  const dueTasks = await Items.find({ time: currentTime, done: false});

  // Send reminder message for each due task
  for (const task of dueTasks) {
    client.messages
      .create({
        body: `Reminder:Complete  ${task.name}  immediately!`,
        from: "whatsapp:+14155238886",
        to: "whatsapp:+916393806660",
      })
      .then((message) => {
        console.log(`WhatsApp message sent. Message ID: ${message.sid}`);
      })
      .catch((error) =>
        console.error(`Error sending WhatsApp message: ${error.message}`)
      );
  }
});
//security code
const userschema=new mongoose.Schema({
      fullname:String,
      email: String,
      password: String,
      googleId:String

});
userschema.plugin(passportLocalMongoose);
userschema.plugin(findOrCreate);
const todolistusers = mongoose.model('todolistusers', userschema);
passport.use(todolistusers.createStrategy());
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});
passport.use(new GoogleStrategy({
  clientID: "359915866245-qoqfac105vq6aa5l3jmofenp7eog686u.apps.googleusercontent.com",
  clientSecret: "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",
  callbackURL: "http://16.170.205.2:9000/auth/google/login"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  todolistusers.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
  );
  app.get('/auth/google/login', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });
app.get("/login",(req, res) => {
  res.render("login");
});
//post routing for login
app.post("/login",(req, res) => {

  const newuser = new todolistusers({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(newuser, (err)=> {

      if (err) {
          console.log(err);
      }else {
          passport.authenticate("local")(req, res, ()=>{

              res.redirect('/');
          })


      }
  }) 

});
app.get('/register', (req, res) => {
  res.render('register');
});
app.post('/register', (req, res) => {

  todolistusers
      .register({ username: req.body.username }, req.body.password)
      .then((users) => {
        passport.authenticate("local")(req, res, () => {
          res.redirect('/login');
        });
      })
      .catch((err) => {
        console.error(err);
        res.redirect("/register");
      });
});
//about me route
app.get("/homepage/about", function (req, res) {
  res.render("about_me");
});

//get route for homepage
app.get("/", function (req, res) {
  //logic for done status
  let status;
  //date time
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.toLocaleString('default', { month: 'long' });  
  const date = currentDate.getDate();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = daysOfWeek[currentDate.getDay()];

  Items.find({})
    .then((foundItems) => {
      if (foundItems.length === 0) {
        Items.insertMany(defaultitems)
          .then(() => {
            console.log("success");
          })
          .catch((err) => {
            console.log(err);
          });
        res.redirect("/");
      } else {
        res.render("list", {
          newListItems: foundItems,
          listTitle: "Today",
          status: status,
          year: year,
          month: month,
          date: date,
          day: day,
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/homepage", (req, res) => {
  Listhome.find()
    .then((lists) => {
      res.render("home", { newlist: lists });
    })
    .catch((err) => console.log(err));
});


//get route for coustumlist
app.get("/:coustumroute", (req, res) => {

  //date time
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.toLocaleString('default', { month: 'long' });  
  const date = currentDate.getDate();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = daysOfWeek[currentDate.getDay()];

  const route = req.params.coustumroute;
  List.findOne({ name: route })
    .then((foundList) => {
      if (!foundList) {
        const list = new List({
          name: route,
          items: defaultitems,
        });
        list.save();
        res.redirect("/" + route);
      } else {
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items,
          year: year,
          month: month,
          date: date,
          day: day,
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});



//post routing inserting
app.post("/", function (req, res) {
  const itemname = req.body.newitem;
  const listname = req.body.list;
  const tasktime = req.body.time;
  const item = new Items({
    name: itemname,
    time: tasktime,
  });

  const taskDueTime = tasktime; // due time for the task in 24-hour format
  const currentTime = new Date(); // current time

  // get the hours and minutes of the current time
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // declare taskDueHour and taskDueMinute outside the if statement
  let taskDueHour;
  let taskDueMinute;

  // split the task due time into hours and minutes if it is defined and not empty
  if (taskDueTime && taskDueTime.trim() !== "") {
    [taskDueHour, taskDueMinute] = taskDueTime.split(":").map(Number);
  } else {
    // Handle the case when taskDueTime is undefined or empty
    res.status(400).send("Invalid task due time");
    return;
  }

  if (
    currentHour > taskDueHour ||
    (currentHour === taskDueHour && currentMinute >= taskDueMinute)
  ) {
    // send message on WhatsApp using Twilio API
    client.messages
      .create({
        body: `Reminder: Complete  ${itemname}  immediately!`,
        from: "whatsapp:+14155238886",
        to: "whatsapp:+916393806660",
      })
      .then((message) => {
        console.log(`WhatsApp message sent. Message ID: ${message.sid}`);
        console.log("Task is overdue!");
        if (listname == "Today") {
          item.save();
          res.redirect("/");
        } else {
          List.findOne({ name: listname })
            .then((foundList) => {
              if (foundList) {
                foundList.items.push(item);
                foundList.save();
                res.redirect("/" + listname);
              } else {
                console.log("List not found");
                res.status(404).send("List not found");
              }
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((error) => {
        console.error(`Error sending WhatsApp message: ${error.message}`);
        res.status(500).send("Error sending WhatsApp message");
      });
  } else {
    console.log("Task is not yet due.");
    if (listname == "Today") {
      item.save();
      res.redirect("/");
    } else {
      List.findOne({ name: listname })
        .then((foundList) => {
          if (foundList) {
            // Check if foundList is not null
            foundList.items.push(item);
            foundList.save();
            res.redirect("/" + listname);
          } else {
            console.log("List not found");
            res.status(404).send("List not found");
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
});


//post route for incoming requests

app.post("/incoming", (req, res) => {
  let reply = req.body.Body;
  let lreply = reply.toLowerCase();
  console.log("Incoming message:", lreply);
  let taskdonename;
  let done;

  if (reply) {
    [taskdonename, done] = lreply.split(" ");
  }

  if (Items && !Items.done) {
    Items.findOneAndUpdate({ name: taskdonename }, { done: true })
      .then(() => {
        console.log("updated successfully");
        res.redirect("/"); // Redirect back to the same page
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

//post route for deleting
app.post("/delete", (req, res) => {
  var checkeditem = req.body.checkbox;
  var listName = req.body.listName;
  if (listName == "Today") {
    Items.findByIdAndRemove(checkeditem)
      .then(() => {
        console.log("successfully deleted item");
        res.redirect("/");
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkeditem } } }
    ).then(() => {
      res.redirect("/" + listName);
    });
  }
});

app.post("/newlist", (req, res) => {
  const newlist = req.body.newlist;
  const newList = new Listhome({
    name: req.body.newlist,
  });
  newList
    .save()
    .then(() => {
      res.redirect("/homepage");
    })
    .catch((err) => console.log(err));

  // Render the HTML for the new card
  const newCardHtml = `
    <div class="card mb-3 main-card" style="max-width: 540px;">
        <div class="row g-0">
          <div class="col-md-4">
            <img src="cardimg.png" class="img-fluid rounded-start" alt="todoimg">
          </div>
          <div class="col-md-8">
            <div class="card-body">
              <h5 class="card-title">${newlist}</h5>
              <p class="card-text">This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.</p>
              <button onclick="deleteCard('${newlist}')" class="btn btn-danger">Delete</button>
              <a href="/${newlist}" class="btn btn-primary">Open</a>
            </div>
          </div>
        </div>
      </div>
`;

  // Send the new list name and the HTML of the new card as a response
  res.send({ newlist: newlist, newCardHtml: newCardHtml });
});
app.delete("/card/:id", (req, res) => {
  const id = req.params.id;
  console.log(id);
  // Delete the card with the given ID from the database
  Listhome.findByIdAndDelete(id)
    .then(() => {
      console.log("Successfully deleted the list plss refresh the page.");
      res.redirect("/homepage");
    })
    .catch((err) => {
      console.error(err);
      res.redirect("/homepage");
    });
});

//database connection
mongoose
  .connect("mongodb+srv://srjsachan:8858856132@portfolioprojects.1mx7zhr.mongodb.net/todolist?retryWrites=true&w=majority")
  .then(() => {
    console.log("Connected!!");
  })
  .catch((err) => {
    console.log(err);
  });

// database schemas
const item = {
  name: String,
  time: String,
  done: { type: Boolean, default: false },
};
const listschema = {
  name: String,
  items: [item],
};
const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

// database modeling

const List = mongoose.model("List", listschema);
const Items = mongoose.model("Items", item);
const Listhome = mongoose.model("Listhome", listSchema);

// creating default items
const item1 = new Items({
  name: "Welcome to todolist",
});
const item2 = new Items({
  name: "Hit the + button to enter new item",
});
const item3 = new Items({
  name: "<--- Hit this to delete the item",
});

const defaultitems = [item1, item2, item3];

//making server
app.listen(9000, function () {
  console.log("server is working on 9000 port");
});