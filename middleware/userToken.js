const asyncHandler = require("express-async-handler");

const userCheck = asyncHandler(async (req, res, next) => {
    if (req.user && req.user.role === 'user') {
        next();
    } else {
        res.status(403);
        throw new Error("Access forbidden, not a user");
    }
});

module.exports = userCheck;