const asyncHandler = require("express-async-handler");

const adminCheck = asyncHandler(async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403);
        throw new Error("Access forbidden, not an admin");
    }
});

module.exports = adminCheck;