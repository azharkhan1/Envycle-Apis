var express = require("express");
var bcrypt = require("bcrypt-inzi");
var postmark = require("postmark");
var jwt = require("jsonwebtoken");

var { SERVER_SECRET, POSTSECRET } = require("../core");
var { userModel, otpModel } = require("../derepo");

var api = express.Router();
var client = new postmark.Client(POSTSECRET);



api.post("/signup", (req, res, next) => {
    if (!req.body.userEmail
        || !req.body.userPassword
        || !req.body.userName
        || !req.body.userAddress
        || !req.body.userPhone
    ) {
        res.status(403).send(`
            please send name, email, passwod, phone and gender in json body.
            e.g:
            {
                "userName": "Azhar",
                "userEmail": "azhar@gmail.com",
                "userPassword": "abc",
                "userAddress" : "abcd address",
                "userPhone" : "12333344xx"
            }`)
        return;
    }
    userModel.findOne({ userEmail: req.body.userEmail },
        (err, data) => {
            if (!err && !data) {
                bcrypt.stringToHash(req.body.userPassword).then(hashPassword => {

                    var newUser = new userModel({
                        userEmail: req.body.userEmail,
                        userPassword: hashPassword,
                        userName: req.body.userName,
                        userPhone : req.body.userPhone,
                        userAddress : req.body.userAddress,
                    });

                    newUser.save((err, data) => {
                        if (!err) {
                            console.log("user created");
                            res.status(200).send({
                                message: "Signed up succesfully",
                            })
                        }
                        else {
                            console.log("Could not save due to: " + err);
                            res.status(500).send("error is =>>" + err);
                        }
                    })
                })
            }
            else if (err) {
                res.status(500).send({
                    message: "Database error"
                })
            }
            else {
                res.status(409).send({
                    message: "user already exists",
                })
            }
        })
});

api.post("/login", (req, res, next) => {
    if (!req.body.userEmail || !req.body.userPassword) {
        res.status(403).send(`
            please send email and password in json body
            e.g:
            {
            userEmail : "abc@gmail.com",
            userPassword: "1234",
            }
         `)
        return;
    }
    userModel.findOne({ userEmail: req.body.userEmail }, (err, user) => {
        if (err) {
            res.status(503).send({
                message: "an error occured " + JSON.stringify(err),
            })
        }
        else if (user) {

            bcrypt.varifyHash(req.body.userPassword, user.userPassword).then(isMatched => {
                if (isMatched) {

                    var token =
                        jwt.sign({
                            id: user._id,
                            userEmail: user.userEmail,
                            userName: user.userName,
                            userPassword: user.userPassword,
                            profileUrl: user.profileUrl,
                        }, SERVER_SECRET)

                    res.cookie('jToken', token, {
                        maxAge: 86_400_000,
                        httpOnly: true
                    });

                    res.status(200).send({
                        message: "signed in succesfully",
                        user: {
                            userEmail: user.userEmail,
                            userName: user.userName,
                        },
                        token: token,
                    })
                } else {
                    res.status(409).send({
                        message: "Password not matched",
                    })
                }
            })
        }
        else {
            res.status(409).send({
                message: "User not found",
            })
        }
    })
})


api.post("/logout", (req, res, next) => {
    res.cookie('jToken', "", {
        maxAge: 86_400_000,
        httpOnly: true
    });

    res.send("logout succesfully");

})

api.post("/forget-password", (req, res, next) => {

    if (!req.body.userEmail) {

        res.status(403).send(`
            please send email in json body.
            e.g:
            {
                "userEmail": "abc@gmail.com"
            }`)
        return;
    }
    userModel.findOne({ userEmail: req.body.userEmail },
        function (err, user) {
            if (err) {
                res.status(500).send({
                    message: "an error occured: " + JSON.stringify(err)
                });
            } else if (user) {
                console.log("user==>", user);
                const otp = Math.floor(getRandomArbitrary(11111, 99999))

                otpModel.create({
                    userEmail: req.body.userEmail,
                    otp: otp
                }).then((doc) => {
                    console.log("Otp created=>> ", doc);
                    client.sendEmail({
                        "From": "mudassir_student@sysborg.com",
                        "To": req.body.userEmail,
                        "Subject": "Reset your password",
                        "TextBody": `Here is your pasword reset code: ${otp}`
                    }).then((status) => {

                        console.log("status: ", status);
                        res.status(200).send(
                            {
                                message: "email sent with otp"
                            }
                        )
                    })
                }).catch((err) => {
                    console.log("error in creating otp: ", err);
                    res.status(500).send({ message: "unexpected error " })
                })
            } else {
                res.status(403).send({
                    message: "user not found"
                });
            }
        });
})

api.post("/forget-password-step-2", (req, res, next) => {
    if (!req.body.userEmail || !req.body.otp || !req.body.newPassword) {
        res.status(400).send(`
        Please send email in JSON body
        e.g:
        "userEmail" : "abc@dummy.com"
        "newPassword" : "123456"
        "otp" : "xxxxx"
    `)

        return;
    }
    userModel.findOne({ userEmail: req.body.userEmail },
        function (err, user) {
            if (err) {
                res.status(500).send({
                    message: "an error occured: " + JSON.stringify(err)
                });
            } else if (user) {

                otpModel.find({ userEmail: req.body.userEmail },
                    function (err, otpData) {
                        if (err) {
                            res.status(500).send({
                                message: "an error occured: " + JSON.stringify(err)
                            });
                        } else if (otpData) {
                            console.log("otpData: ", otpData);
                            otpData = otpData[otpData.length - 1]


                            const now = new Date().getTime();
                            const otpIat = new Date(otpData.createdOn).getTime(); // 2021-01-06T13:08:33.657+0000
                            const diff = now - otpIat; // 300000 5 minute

                            console.log("diff: ", diff);

                            if (otpData.otp === req.body.otp && diff < 300000) { // correct otp code
                                otpData.remove()
                                bcrypt.stringToHash(req.body.newPassword).then(function (hash) {
                                    user.update({ userPassword: hash }, {}, function (err, data) {
                                        res.status(200).send({
                                            message: "password updated",
                                        });
                                    })
                                })

                            } else {
                                res.status(401).send({
                                    message: "incorrect otp"
                                });
                            }
                        } else {
                            res.status(401).send({
                                message: "incorrect otp"
                            });
                        }
                    })

            } else {
                res.status(403).send({
                    message: "user not found"
                });
            }
        });
});





module.exports = api;

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
};