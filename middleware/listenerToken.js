const asyncHandler = require("express-async-handler");

const listenerCheck = asyncHandler(async (req, res, next) => {
    if (req.user && req.user.role === 'listener') {
        next();
    } else {
        res.status(403);
        throw new Error("Access forbidden, not a listener");
    }
});

module.exports = listenerCheck;