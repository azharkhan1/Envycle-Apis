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

var { SERVER_SECRET, PORT } = require("./core");
var { userModel, tweetsModel } = require("./derepo");
var http = require("http");

// Firebase bucket
////// For sending file to mongoose
const fs = require('fs')
const multer = require("multer");
const admin = require("firebase-admin");

const storage = multer.diskStorage({ // https://www.npmjs.com/package/multer#diskstorage
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, `${new Date().getTime()}-${file.filename}.${file.mimetype.split("/")[1]}`)
    }
})
var upload = multer({ storage: storage })

var serviceAccount = require("./firebase/firebase.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://webmobile-48ab0.firebaseio.com"
});

const bucket = admin.storage().bucket("gs://webmobile-48ab0.appspot.com");

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
app.use("/", express.static(path.resolve(path.join(__dirname, "../public"))));




app.get("/download", (req, res) => {
    console.log(__dirname);
    res.sendFile(path.resolve(path.join(__dirname, "/package.json")))
})

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

            const issueDate = decodedData.iat * 1000;
            const nowDate = new Date().getTime();
            const diff = nowDate - issueDate; // 86400,000

            if (diff > 300000) { // expire after 5 min (in milis)
                res.status(401).send("token expired")
            } else { // issue new token
                // console.log("profile url ==>", decodedData);
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

app.post("/postTweet", upload.any(), (req, res, next) => {
    if (!req.files) {
        if (!req.body.userEmail || !req.body.tweetText) {
            res.status(409).send(`
            Please send useremail and tweet in json body
            e.g:
            "userEmail" : "abc@gmail.com",
            "tweetText" : "xxxxxx"
        `)
            return;
        };
        userModel.findById(req.body.jToken.id, 'userName userEmail profileUrl',
            (err, user) => {
                if (!err) {
                    // console.log("tweet user : " + user);
                    tweetsModel.create({
                        userEmail: req.body.userEmail,
                        tweetText: req.body.tweetText,
                        userName: user.userName,
                    }).then((data) => {
                        datatoSend = data;
                        console.log("user profile url is => ", user.profileUrl);
                        datatoSend.profileUrl = user.profileUrl;
                        console.log("Tweet created: " + datatoSend),
                            res.status(200).send({
                                message: "tweet created",
                                userName: user.userName,
                                userEmail: user.userEmail,
                                profileUrl: user.profileUrl,
                            });
                        io.emit("NEW_POST", {
                            userEmail: user.userEmail,
                            tweetText: data.tweetText,
                            userName: user.userName,
                            profileUrl: user.profileUrl,
                        });
                    }).catch((err) => {
                        res.status(500).send({
                            message: "an error occured : " + err,
                        });
                    });
                }
                else {
                    res.status.send({
                        message: "an error occured" + err,
                    })
                }
            })
    }

});


app.post("/postTweetWithImage", upload.any(), (req, res, next) => {

    //    console.log("image url is == > " , req.body);
    bucket.upload(
        req.files[0].path,
        // {
        //     destination: `${new Date().getTime()}-new-image.png`, // give destination name if you want to give a certain name to file in bucket, include date to make name unique otherwise it will replace previous file with the same name
        // },
        function (err, file, apiResponse) {
            if (!err) {
                // console.log("api resp: ", apiResponse);

                // https://googleapis.dev/nodejs/storage/latest/Bucket.html#getSignedUrl
                file.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                }).then((urlData, err) => {
                    if (!err) {
                        userModel.findById(req.headers.jToken.id, 'userName userEmail profileUrl',
                            (err, user) => {
                                if (!err) {
                                    // console.log("tweet user : " + user);
                                    tweetsModel.create({
                                        userEmail: req.headers.jToken.userEmail,
                                        tweetText: req.body.tweetText,
                                        userName: user.userName,
                                        tweetImage: urlData[0]
                                    }).then((data) => {
                                        // console.log("Tweet created: " + data),
                                        // console.log("profile url is = > " , user.profileUrl);
                                        // console.log("imgae url is == > ", urlData[0]);
                                        res.status(200).send({
                                            message: "tweet created",
                                            userName: user.userName,
                                            userEmail: user.userEmail,
                                            profileUrl: user.profileUrl,
                                            tweetImage: urlData[0]
                                        });
                                        io.emit("NEW_POST", {
                                            userEmail: user.userEmail,
                                            profileUrl: user.profileUrl,
                                            tweetImage: urlData[0],
                                            userName: user.userName,
                                            tweetText: data.tweetText,
                                        });
                                    }).catch((err) => {
                                        res.status(500).send({
                                            message: "an error occured : " + err,
                                        });
                                    });
                                }
                                else {
                                    res.status.send({
                                        message: "an error occured" + err,
                                    })
                                }
                            })

                        try {
                            fs.unlinkSync(req.files[0].path)
                            //file removed
                        } catch (err) {
                            console.error(err)
                        }

                    }
                })
            } else {
                console.log("err: ", err)
                res.status(500).send();
            }
        });



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

app.post("/upload", upload.any(), (req, res, next) => {
    userDetails = JSON.parse(req.body.myDetails)
    userEmail = userDetails.userEmail
    // console.log("user email is ===> ",userEmail);
    // console.log("req.body: ", req.body);
    // console.log("req.body: ", JSON.parse(req.body.myDetails));
    // console.log("req.files: ", req.fFiles);

    // console.log("file type: ", req.files[0].mimetype);
    // console.log("file name in server folders: ", req.files[0].filename);
    // console.log("file path in server folders: ", req.files[0].path);

    // upload file to storage bucket 
    // you must need to upload file in a storage bucket or somewhere safe
    // server folder is not safe, since most of the time when you deploy your server
    // on cloud it makes more t2han one instances, if you use server folder to save files
    // two things will happen, 
    // 1) your server will no more stateless
    // 2) providers like heroku delete all files when dyno restarts (their could be lots of reasons for your dyno to restart, or it could restart for no reason so be careful) 


    // https://googleapis.dev/nodejs/storage/latest/Bucket.html#upload-examples
    bucket.upload(
        req.files[0].path,
        // {
        //     destination: `${new Date().getTime()}-new-image.png`, // give destination name if you want to give a certain name to file in bucket, include date to make name unique otherwise it will replace previous file with the same name
        // },
        function (err, file, apiResponse) {
            if (!err) {
                // console.log("api resp: ", apiResponse);

                // https://googleapis.dev/nodejs/storage/latest/Bucket.html#getSignedUrl
                file.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                }).then((urlData, err) => {
                    if (!err) {
                        console.log("public downloadable url: ", urlData[0]) // this is public downloadable url 
                        console.log("my email is => ", userEmail);
                        userModel.findOne({ userEmail: userEmail }, {}, (err, user) => {
                            if (!err) {
                                console.log("user is ===>", user);
                                user.update({ profileUrl: urlData[0] }, (err, updatedUrl) => {
                                    if (!err) {
                                        res.status(200).send({
                                            url: urlData[0],
                                        })
                                        console.log("succesfully uploaded");
                                    }
                                    else {
                                        res.status(500).send({
                                            message: "an error occured" + err,
                                        })
                                        console.log("error occured whhile uploading");
                                    }

                                })
                            }
                        })
                        // delete file from folder before sending response back to client (optional but recommended)
                        // optional because it is gonna delete automatically sooner or later
                        // recommended because you may run out of space if you dont do so, and if your files are sensitive it is simply not safe in server folder
                        try {
                            fs.unlinkSync(req.files[0].path)
                            //file removed
                            return;
                        } catch (err) {
                            console.error(err)
                        }
                        // res.send("Ok");/
                    }
                })
            } else {
                console.log("err: ", err)
                res.status(500).send();
            }
        });
})



server.listen(PORT, () => {
    console.log("server is running on: ", PORT);
})

