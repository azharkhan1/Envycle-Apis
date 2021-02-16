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
var { userModel, placedCollectionModel, vendorModel } = require("./derepo");




var app = express();
var server = http.createServer(app);
var io = socketIo(server);
app.use(morgan("dev"));
app.use(bodyParser.json());

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));

app.use(cookieParser());


app.use((req,res,next)=>{
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Cache-Control, Authorisation");
    next();
})




app.use("/", express.static(path.resolve(path.join(__dirname, "../../build"))));





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

            if (diff > 3000000) { // expire after 5 min (in milis)
                res.status(401).send("token expired")
            }

            else { // issue new token
                if (!decodedData.vendorEmaail) {
                    var token = jwt.sign({
                        id: decodedData.id,
                        userName: decodedData.userName,
                        userEmail: decodedData.userEmail,
                        userPhone: decodedData.userPhone,
                        userAddress: decodedData.userAddress,
                    }, SERVER_SECRET)
                    res.cookie('jToken', token, {
                        maxAge: 86_400_000,
                        httpOnly: true
                    });
                    req.body.jToken = decodedData;
                    req.headers.jToken = decodedData;
                    next();
                }
                else {
                    var token = jwt.sign({
                        id: decodedData.id,
                        vendorName: decodedData.vendorName,
                        vendorEmail: decodedData.vendorEmail,
                        vendorPhone: decodedData.vendorPhone,
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
    userModel.findById(req.body.jToken.id, "userName userEmail userAddress userPhone" , 
        
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

app.post("/schdeduleMaterial", (req, res, next) => {

    if (req.body.cardBoard || req.body.plastic) {
        userModel.findOne({ userEmail: req.body.jToken.userEmail }, (err, userFound) => {
            if (!err) {
                placedCollectionModel.create({
                    cardBoard: req.body.cardBoard,
                    plastic: req.body.plastic,
                    userEmail: req.body.jToken.userEmail,
                    userName: req.body.jToken.userName,
                }).then((orderPlaced) => {
                    res.status(200).send({
                        message: "Your request has been sent succesfully" + orderPlaced,
                    });
                    io.emit("requests", orderPlaced);
                })
                    .catch((err) => {
                        res.status(500).send({
                            message: "an error occured"
                        })
                    })
            }
        })
    }
    else {
        res.status(404).send(
            `
            Please send one of the following in json body:
            e.g
            {
                plastic : "xxkg",
                cardBoard : "xx"kg"
            }
         `
        )
    }

});

app.get("/myRequests", (req, res, next) => {

    userModel.findOne({ userEmail: req.body.jToken.userEmail }, (err, userData) => {
        if (!err) {
            placedCollectionModel.find({ userEmail: req.body.jToken.userEmail }, (err, data) => {
                if (!err) {
                    res.status(200).send({
                        placedRequests: data,
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

