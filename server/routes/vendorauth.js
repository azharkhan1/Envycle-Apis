var express = require("express");
var bcrypt = require("bcrypt-inzi");
var postmark = require("postmark");
var jwt = require("jsonwebtoken");

var { SERVER_SECRET, POSTSECRET } = require("../core");
var { vendorModel } = require("../derepo");

var api = express.Router();



api.post("/signup", (req, res) => {

    if (!req.body.vendorName || !req.body.vendorEmail || !req.body.vendorAddress || !req.body.vendorPassword || !req.body.vendorPhone) {
        res.status(403).send(
            `
            Please send following in json body
            e.g
            vendorName : "abc",
            vendorEmail : "abc@gmail.com",
            vendorAddress : "xxx",
            vendorPassword : "xxx",
            vendorPhone : "xxx"
            `
        )
        return;
    }


    vendorModel.findOne({ vendorEmail: req.body.vendorEmail }, (err, user) => {
        if (user) {
            res.status(403).send(
                {
                    message: "User already exists with this email",
                }
            )
            return;
        }
        bcrypt.stringToHash(req.body.vendorPassword).then(hash => {
            vendorModel.create({
                vendorName: req.body.vendorName,
                vendorEmail: req.body.vendorEmail,
                vendorPassword: hash,
                vendorPhone: req.body.vendorPhone,
                vendorAddress: req.body.vendorAddress,
            }).then((data) => {

                res.status(200).send(
                    {
                        message: "You have been signed up succesfully",
                    })

            }).catch((err) => {
                res.status(500).send(
                    {
                        message: "an error has been occured",
                    }
                )
            })
        })

    })
})

api.post("/login", (req, res, next) => {
    if (!req.body.vendorEmail || !req.body.vendorPassword) {
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
    vendorModel.findOne({ vendorEmail: req.body.vendorEmail }, (err, vendor) => {
        if (err) {
            res.status(503).send({
                message: "an error occured " + JSON.stringify(err),
            })
        }
        else if (vendor) {

            bcrypt.varifyHash(req.body.vendorPassword, vendor.vendorPassword).then(isMatched => {
                if (isMatched) {

                    var token =
                        jwt.sign({
                            id: vendor._id,
                            vendorEmail: vendor.vendorEmail,
                            vendorName: vendor.vendorName,
                        }, SERVER_SECRET)

                    res.cookie('jToken', token, {
                        maxAge: 86_400_000,
                        httpOnly: true
                    });

                    res.status(200).send({
                        message: "signed in succesfully",
                        vendor: {
                            vendorEmail: vendor.vendorEmail,
                            vendorName: vendor.vendorName,
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
    res.clearCookie();

    res.send("logout succesfully");

})

module.exports = api;



