const mongoose = require('mongoose');
const Models = require('./models.js');
const { check, validationResult } = require('express-validator');
const Movies = Models.Movie;
const Users = Models.User;

mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const express = require('express'),
  app = express(),
  bodyParser = require('body-parser'),
  uuid = require('uuid');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cors = require('cors');

let allowedOrigins = ['http://localhost:8080', 'http://testsite.com', 'http://localhost:1234', 'https://justins-myflix-app.netlify.app', 'http://localhost:4200'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) { // If a specific origin isn’t found on the list of allowed origins
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

app.use(cors());
let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

/**
 * @api {post} /users Register a new user
 * @apiName RegisterUser
 * @apiGroup User
 * @apiParam {String} username Username of the user.
 * @apiParam {String} password Password of the user.
 * @apiParam {String} email Email of the user.
 * @apiParam {Date} birthday Birthday of the user.
 */
app.post('/users',
  [
    check('username', 'Username is required').isLength({ min: 5 }),
    check('username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('password', 'Password is required').not().isEmpty(),
    check('email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {

    // Check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.password);
    await Users.findOne({ username: req.body.username }) // Search to see if a user with the requested username already exists
      .then((user) => {
        if (user) {
          // If the user is found, send a response that it already exists
          return res.status(400).send(req.body.username + ' already exists');
        } else {
          Users
            .create({
              username: req.body.username,
              password: hashedPassword,
              email: req.body.email,
              birthday: req.body.birthday
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

/**
 * @api {put} /users/:username Update a user's info, by username
 * @apiName UpdateUser
 * @apiGroup User
 * @apiParam {String} username Username of the user.
 * @apiParam {String} password Password of the user.
 * @apiParam {String} email Email of the user.
 * @apiParam {Date} birthday Birthday of the user.
 */
app.put('/users/:username', passport.authenticate('jwt', { session: false }),
  [
    check('username', 'Username is required').isLength({ min: 5 }),
    check('username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('password', 'Password is required').not().isEmpty(),
    check('email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {
    // Check if the authenticated user matches the username in the request
    if (req.user.username !== req.params.username) {
      return res.status(400).send('Permission denied');
    }

    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.password);

    await Users.findOneAndUpdate({ username: req.params.username }, {
      $set:
      {
        username: req.body.username,
        password: hashedPassword,
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

/**
 * @api {post} /users/:username/movies/:movieID Add new movie to a user's favorite movies list
 * @apiName AddFavoriteMovie
 * @apiGroup User
 * @apiParam {String} username Username of the user.
 * @apiParam {String} movieID ID of the movie.
 */
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

/**
 * @api {delete} /users/:username/movies/:movieID Remove movie from user's favorite movies list
 * @apiName RemoveFavoriteMovie
 * @apiGroup User
 * @apiParam {String} username Username of the user.
 * @apiParam {String} movieID ID of the movie.
 */
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

/**
 * @api {get} /users Get all users
 * @apiName GetUsers
 * @apiGroup User
 */
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

/**
 * @api {get} /users/:username Get a user by username
 * @apiName GetUser
 * @apiGroup User
 * @apiParam {String} username Username of the user.
 */
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

/**
 * @api {delete} /users/:username Delete a user by username
 * @apiName DeleteUser
 * @apiGroup User
 * @apiParam {String} username Username of the user.
 */
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

/**
 * @api {get} /movies Get all movies
 * @apiName GetMovies
 * @apiGroup Movie
 */
app.get('/movies', async (req, res) => {
  await Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * @api {get} / Get welcome message
 * @apiName GetWelcome
 * @apiGroup General
 */
app.get('/', (req, res) => {
  // Send a simple welcome message as a response
  res.send('Welcome to my movie database!');
});

/** */
