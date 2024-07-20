const passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  Models = require('./models.js'),
  passportJWT = require('passport-jwt');

let Users = Models.User,
  JWTStrategy = passportJWT.Strategy,
  ExtractJWT = passportJWT.ExtractJwt;

/**
 * Local strategy for user authentication using username and password.
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
    },
    /**
     * @function
     * @param {String} username - The username of the user.
     * @param {String} password - The password of the user.
     * @param {Function} callback - The callback function.
     * @returns {Promise<void>}
     */
    async (username, password, callback) => {
      console.log(`${username} ${password}`);
      await Users.findOne({ username: username })
        .then((user) => {
          if (!user) {
            console.log('incorrect username');
            return callback(null, false, {
              message: 'Incorrect username or password.',
            });
          }
          if (!user.validatePassword(password)) {
            console.log('incorrect password');
            return callback(null, false, { message: 'Incorrect password.' });
          }
          console.log('finished');
          return callback(null, user);
        })
        .catch((error) => {
          if (error) {
            console.log(error);
            return callback(error);
          }
        });
    }
  )
);

/**
 * JWT strategy for user authentication using JSON Web Tokens.
 */
passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'your_jwt_secret'
},
  /**
   * @function
   * @param {Object} jwtPayload - The JWT payload.
   * @param {Function} callback - The callback function.
   * @returns {Promise<void>}
   */
  async (jwtPayload, callback) => {
    return await Users.findById(jwtPayload._id)
      .then((user) => {
        return callback(null, user);
      })
      .catch((error) => {
        return callback(error);
      });
  }));
