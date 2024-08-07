const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * @typedef {Object} Genre
 * @property {String} name - Name of the genre.
 * @property {String} description - Description of the genre.
 */

/**
 * @typedef {Object} Director
 * @property {String} name - Name of the director.
 * @property {String} bio - Biography of the director.
 */

/**
 * @typedef {Object} Movie
 * @property {String} title - Title of the movie.
 * @property {String} description - Description of the movie.
 * @property {Genre} genre - Genre of the movie.
 * @property {Director} director - Director of the movie.
 * @property {String[]} actors - List of actors in the movie.
 * @property {String} imagePath - Path to the movie image.
 * @property {Boolean} featured - Whether the movie is featured.
 */

let movieSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    genre: {
        name: String,
        description: String
    },
    director: {
        name: String,
        bio: String
    },
    actors: [String],
    imagePath: String,
    featured: Boolean
});

/**
 * @typedef {Object} User
 * @property {String} username - Username of the user.
 * @property {String} password - Password of the user.
 * @property {String} email - Email of the user.
 * @property {Date} birthday - Birthday of the user.
 * @property {mongoose.Schema.Types.ObjectId[]} favoriteMovies - List of favorite movies.
 */

let userSchema = mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    birthday: Date,
    favoriteMovies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }]
});

/**
 * Hashes a password.
 * @function hashPassword
 * @memberof User
 * @static
 * @param {String} password - The password to hash.
 * @returns {String} The hashed password.
 */
userSchema.statics.hashPassword = (password) => {
    return bcrypt.hashSync(password, 10);
};

/**
 * Validates a password.
 * @function validatePassword
 * @memberof User
 * @instance
 * @param {String} password - The password to validate.
 * @returns {Boolean} Whether the password is valid.
 */
userSchema.methods.validatePassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

let Movie = mongoose.model('Movie', movieSchema);
let User = mongoose.model('User', userSchema);

module.exports.Movie = Movie;
module.exports.User = User;
