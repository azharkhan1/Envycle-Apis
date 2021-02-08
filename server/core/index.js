var PORT = process.env.PORT || 5000;
var SERVER_SECRET = process.env.SECRET || "12ka4";
var POSTSECRET = process.env.POSTSECRET || "1231321";
var DBURI = process.env.DBURI 

module.exports = {
    PORT : PORT,
    SERVER_SECRET : SERVER_SECRET,
    POSTSECRET : POSTSECRET,
    DBURI : DBURI,
}