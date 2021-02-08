var express = require("express");
var bcrypt = require("bcrypt-inzi");
var postmark = require("postmark");
var jwt = require("jsonwebtoken");

var { SERVER_SECRET, POSTSECRET } = require("../core");
var { vendorModel  } = require("../derepo");

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
            res.status.send(
                {
                    message: "User already exists with this email",
                }
            )
            return;
        }
        vendorModel.create({
            vendorName: req.body.vendorName,
            vendorEmail: req.body.vendorEmail,
            vendorPassword: req.body.vendorPassword,
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


module.exports = api;



