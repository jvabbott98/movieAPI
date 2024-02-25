const mongoose = require('mongoose');
const Models = require('./models.js');
//new
const { check, validationResult } = require('express-validator');
//new
const Movies = Models.Movie;
const Users = Models.User;

mongoose.connect('mongodb://localhost:27017/moviesDB', { useNewUrlParser: true, useUnifiedTopology: true });

const express = require('express'),
      app = express(),
      bodyParser = require('body-parser'),
      uuid = require('uuid');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cors = require('cors');                         //new  
//new
let allowedOrigins = ['http://localhost:8080', 'http://testsite.com']; //app.use(cors());//new
app.use(cors({                                            
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));  //new

app.use(cors());//new
let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

//new
app.post('/users',
  // Validation logic here for request
  //you can either use a chain of methods like .not().isEmpty()
  //which means "opposite of isEmpty" in plain english "is not empty"
  //or use .isLength({min: 5}) which means
  //minimum value of 5 characters are only allowed
  [
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {

  // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username }) // Search to see if a user with the requested username already exists
      .then((user) => {
        if (user) {
          //If the user is found, send a response that it already exists
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users
            .create({
              Username: req.body.Username,
              Password: hashedPassword,
              Email: req.body.Email,
              Birthday: req.body.Birthday
            })
            .then((user) => { res.status(201).json(user) })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });
//new

//old
//Create a new user
// app.post('/users', async (req, res) => {
//     await Users.findOne({ username: req.body.username })
//       .then((user) => {
//         if (user) {
//           return res.status(400).send(req.body.username + 'already exists');
//         } else {
//           Users
//             .create({
//               username: req.body.username,
//               password: req.body.password,
//               email: req.body.email,
//               birthday: req.body.birthday
//             })
//             .then((user) =>{res.status(201).json(user) })
//           .catch((error) => {
//             console.error(error);
//             res.status(500).send('Error: ' + error);
//           })
//         }
//       })
//       .catch((error) => {
//         console.error(error);
//         res.status(500).send('Error: ' + error);
//       });
//   });
//old

  // Update a user's info, by username
app.put('/users/:username', passport.authenticate('jwt', { session: false }), async (req, res) => {
    // CONDITION TO CHECK ADDED HERE
    if(req.user.username !== req.params.username){
        return res.status(400).send('Permission denied');
    }
    // CONDITION ENDS
    await Users.findOneAndUpdate({ username: req.params.username }, {
        $set:
        {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            birthday: req.body.birthday
        }
    },
        { new: true }) // This line makes sure that the updated document is returned
        .then((updatedUser) => {
            res.json(updatedUser);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).send('Error: ' + err);
        })
  });

  //Add new movie to a user's favorite movies list
app.post('/users/:username/movies/:movieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Users.findOneAndUpdate({ username: req.params.username }, {
       $push: { favoriteMovies: req.params.movieID }
     },
     { new: true }) // This line makes sure that the updated document is returned
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
  });

//Remove movie from user's favoite movies list
app.delete('/users/:username/movies/:movieID', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Users.findOneAndUpdate({ username: req.params.username }, {
       $pull: { favoriteMovies: req.params.movieID }
     },
     { new: true }) // This line makes sure that the updated document is returned
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
  });

  // Get all users
app.get('/users', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Users.find()
      .then((users) => {
        res.status(201).json(users);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

    // Get a user by username
app.get('/users/:username', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Users.findOne({ username: req.params.username })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

// Delete a user by username
app.delete('/users/:username', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Users.findOneAndDelete({ username: req.params.username })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.username + ' was not found');
        } else {
          res.status(200).send(req.params.username + ' was deleted.');
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });


  //Send list of movie data to user
app.get('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//new
app.get('/', (req, res) => {
  // Send a simple welcome message as a response
  res.send('Welcome to my movie database!');
});
//new


//Send data of a single movie to user
app.get('/movies/:title', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Movies.findOne({ title: req.params.title })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//Send data about the genre of a movie to the user
app.get('/movies/:genre', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Movies.findOne({ "genre.name" : req.params.genre })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//Send data about the director of a movie back to the user
app.get('/movies/:director', passport.authenticate('jwt', { session: false }), async (req, res) => {
    await Movies.find({ director : req.params.director })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//new
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
  console.log('Listening on Port ' + port);
});
//new

  //old
  //app.listen(8080, () => console.log('Listening on 8080'));
  //old