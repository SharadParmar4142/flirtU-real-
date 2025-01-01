const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const validateToken = asyncHandler(async (req, res, next) => {
    let token;
    let authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];

        if (!token) {
            res.status(401);
            throw new Error("User not authorized or token is missing in the request");
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                res.status(401);
                throw new Error("User is not authorized");
            }
            req.user = decoded; // Set the decoded token payload to req.user
            next();
        });
    } else {
        res.status(401);
        throw new Error("User not authorized or token is missing in the request");
    }
});

module.exports = validateToken;