const log = console.log; // just a shortcut for logging to console

// For server
const express = require('express');
const session = require('express-session');
const MongoDbStore = require('connect-mongo');

// For Database
const dbConnection = require('./database-connection')
dbConnection

const User = require('./models/userModel')

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'pug');
app.use(express.json());
app.use(express.urlencoded({extended: true})) // to read HTML form


//https://stackoverflow.com/questions/66654037/mongo-connect-error-with-mongo-connectsession
const sessionStore = MongoDbStore.create({
    mongoUrl: 'mongodb://localhost:27017/a4',
    collection: 'sessions'
})

app.use(session({
    secret:'some secret', //probably should be something else
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    userInfo: {
        loggedIn: false,
        user: null
    },
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));


// Render Home page (home.pug)
app.get('/', (req, res) => {
    log("req.session")
    log(req.session)
    if (req.session.userInfo) {
        log("req.session.userInfo exists")
    } else {
        req.session.userInfo = {
            user: null,
            loggedIn: false
        }
    }
    res.render('home', {userInfo: req.session.userInfo})
  });


// User Directory
/* 
The ':name' notation makes name a parameter so it can be anything. 
Example URL: http://localhost:3000/users/liam
*/
app.get('/orderform', (req, res) => {
    log('in order form')
    res.sendFile(path.join(__dirname, '/public/orderform.html'));
  });

  /** Get the form for registering a new user
   * 
   */
app.get('/register', (req, res) => {
    // if (req.session.loggedIn) {
    //     res.render('register', req.session.user)
    // }
    res.render('register', {userInfo: req.session.userInfo}) 
  });

/** This is called when the form is submitted. It Adds (posts) the new user
 * to the database
 * 
 * Known bug. When schema validation fails or an existing username is used. The app crashes.
*/
app.post('/register', async (req, res) => {
    // get the username and password from the completed form
    const username = req.body.username;
    const password = req.body.password;

    // check if user in DB by searching the username and seeing if the result is larger than 0
    const query = {'username': username} // ToDo: update this to look for usernames that CONTAIN the name, not equal to it.


    search_for_user = await User.find(query) 
    if (search_for_user.length > 0) {
        log ("user already exists")
        res.render('error', {userInfo: req.session.userInfo, errMsg: "Username already exists"})
        return
    }

    // User doesnt exist if you have made it here so create new user

    // new user info
    log("creating new user")
    const new_user = {"username": username.toLowerCase(), "password": password.toLowerCase(), 'privacy': false}
    try {
        // create a new user obj
        const user_obj = new User (new_user)

        // validate these inputs work with schema and save if they do
        user_obj.validate(err => {
            if (err) {
                res.render('register', {userInfo: req.session.userInfo})
                return
            }
            // Save the new user to the database
            user_obj.save() 
            res.render('userprofile', {user: req.session.userInfo, userInfo: req.session.userInfo})
            return
        })
        
    } catch {res.render('register', {userInfo: req.session.userInfo}) }
    
  })

  /**
   * example: http://localhost:3000/users?name=liam
   * 
   * This gets the 'query' which is everything after the '?'
   * reder the userdirectory pug page which will list off all of the users that
   * match this username
   */
app.get('/users', async (req, res) => {
    // get the name parameter 
    let matching_users = []
    if ('name' in req.query) {
        let name = req.query.name
        name.toLowerCase() // make it lowercase
        const query = {'username': {$regex : name}, 'privacy': false}; // construct the query we will look for in db
        try {
            matching_users = await User.find(query); // search db, must wait for response
        } catch { log('name exists but query failed') }
    } else { 
        try {
            matching_users = await User.find()
        } catch { log ('tried to find all users and failed')}
    }    
    res.render('userdirectory', {users: matching_users, userInfo: req.session.userInfo}) // render pug page with matching users
  })

/** The profile page for a specific user, get the user from db if their privacy is false
 * render the userprofile pug page which just shows the name right now
*/
app.get('/users/:userID', async (req, res) => {
    
    let userID = req.params.userID;
    let currentUser = req.session.userInfo.user

    let matching_user = await User.findOne({'_id': userID});
    log("matching_user")
    log(matching_user)
    // if the current user has this userID, show it even if it is private
    if (currentUser && (currentUser._id == userID)){
        res.render('userprofile', {user: matching_user, userInfo: req.session.userInfo }) // render pug page with matching users
        return
    } 
    // else if the current user doesn't have this ID but it is not set to private, show it
    else if (matching_user['privacy']){
        res.render('error', {userInfo: req.session.userInfo, errMsg: "403 User has privacy set to true"})
        return
    }
    if (!matching_user) {
        matching_user['username'] = ''
    }
    // render pug page
    res.render('userprofile', {user: matching_user, userInfo: req.session.userInfo }) // render pug page with matching users
  })

app.post('/login', async (req, res) => {
    // get the username and password from the completed form
    const username = req.body.username;
    const password = req.body.password;
    log('logging in')
    // check if user in DB by searching the username and seeing if the result is larger than 0
    const query = {'username': username, 'password': password};
    user = await User.findOne(query)
    log(user)
    if (user) {
        req.session.userInfo = {
            user: user,
            loggedIn: true
        }
        res.render('userprofile', {user: req.session.userInfo, userInfo: req.session.userInfo})
        return
    } else {
        res.render('error', {userInfo: req.session.userInfo, errMsg: "either username or password is incorrect"})
        return
    }
    
  })

app.get('/logout', (req, res) => {
  req.session.userInfo = {
      user: null,
      loggedIn: false
  }
  res.render('home', {userInfo: req.session.userInfo})
})
  
app.listen(PORT, () => {
console.log(`Restaurant app listening at http://localhost:${PORT}`)
})