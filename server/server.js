// read: 
// Querying/reading data from database: https://mongoosejs.com/docs/models.html#querying
// deleting data from database: https://mongoosejs.com/docs/models.html#deleting
// updating data in database: https://mongoosejs.com/docs/models.html#updating


var express = require("express");
var morgan = require("morgan");
var bodyParser = require("body-parser");
var cors = require("cors");
var jwt = require('jsonwebtoken'); // https://github.com/auth0/node-jsonwebtoken
var cookieParser = require("cookie-parser");
var path = require("path");
var socketIo = require("socket.io");
var authRoutes = require("./routes/auth");
var vendorRoute = require("./routes/vendorauth");
var http = require("http");

var { SERVER_SECRET, PORT } = require("./core");
var { userModel, materialsModel , vendorModel } = require("./derepo");




var app = express();
var server = http.createServer(app);
var io = socketIo(server);
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(cors({
    origin: "*",
    credentials: true,
}));
app.use(cookieParser());
// app.use("/", express.static(path.resolve(path.join(__dirname, "../public"))));





app.use("/vendorauth", vendorRoute)
app.use("/auth", authRoutes);



app.use(function (req, res, next) {

    console.log("req.cookies: ", req.cookies);
    if (!req.cookies.jToken) {
        res.status(401).send("include http-only credentials with every request")
        return;
    }
    jwt.verify(req.cookies.jToken, SERVER_SECRET, function (err, decodedData) {
        if (!err) {
            const issueDate = decodedData.iat * 1000; // 1000 miliseconds because in js ms is in 16 digits
            const nowDate = new Date().getTime();
            const diff = nowDate - issueDate; // 86400,000
            
            if (diff > 30) { // expire after 5 min (in milis)
                res.status(401).send("token expired")
            } 
              
            else { // issue new token
                if (!decodedData.vendorEmaail)
                {
                    var token = jwt.sign({
                        id: decodedData.id,
                        userName: decodedData.userName,
                        userEmail: decodedData.userEmail,
                        profileUrl: decodedData.profileUrl,
                    }, SERVER_SECRET)
                    res.cookie('jToken', token, {
                        maxAge: 86_400_000,
                        httpOnly: true
                    });
                    req.body.jToken = decodedData;
                    req.headers.jToken = decodedData;
                    next();
                }
                else{
                    var token = jwt.sign({
                        id: decodedData.id,
                        vendorName: decodedData.vendorName,
                        vendorEmail: decodedData.vendorEmail,
                    }, SERVER_SECRET)

                    res.cookie('jToken', token, {
                        maxAge: 86_400_000,
                        httpOnly: true
                    });
                    req.body.jToken = decodedData;
                    req.headers.jToken = decodedData;
                    next();
                }
                }
          
        } else {
            res.status(401).send("invalid token")
        }
    });
})

app.get("/profile", (req, res, next) => {
    userModel.findById(req.body.jToken.id, 'userName userEmail profileUrl',
        function (err, doc) {
            if (!err) {
                res.send({
                    profile: doc
                })
            } else {
                res.status(500).send({
                    message: "server error"
                })
            }

        })
});

app.get("/vendorProfile", (req, res, next) => {
    vendorModel.findById(req.body.jToken.id, 'vendorName vendorEmail vendorPhone',
        function (err, doc) {
            if (!err) {
                res.send({
                    profile: doc
                })
            } else {
                res.status(500).send({
                    message: "server error"
                })
            }

        })
});

app.get("/getTweets", (req, res, next) => {

    tweetsModel.find({}, (err, data) => {
        if (!err) {
            userModel.find({}, "profileUrl userEmail", (err, user) => {
                console.log("tweet data=>", data);
                res.status(200).send({
                    tweets: data,
                    profileUrl: user,

                });
            })
        }
        else {
            console.log("error : ", err);
            res.status(500).send("error");
        }
    })
});

app.get("/myTweets", (req, res, next) => {
    console.log("my tweets user=>", req.body);
    userModel.findOne({ userEmail: req.body.jToken.userEmail }, "profileUrl", (err, userData) => {
        if (!err) {
            tweetsModel.find({ userEmail: req.body.jToken.userEmail }, (err, data) => {
                if (!err) {
                    console.log("profile url is => " , userData.profileUrl);
                    res.status(200).send({
                        tweets: data,
                        profileUrl : userData.profileUrl,
                    });
                }
                else {
                    console.log("error : ", err);
                    res.status(500).send("error");
                }
            })
        }
        else {
            console.log("error : ", err);
            res.status(500).send("error");
        }

    })

});



server.listen(PORT, () => {
    console.log("server is running on: ", PORT);
})

