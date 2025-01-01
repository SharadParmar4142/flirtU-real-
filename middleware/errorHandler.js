const {constants}=require("../constants"); 
const errorHandler=(err,req,res,next)=>{

    const statusCode=res.statusCode ? res.statusCode:500; //If we have a statusCode from the controller then that code shall be passed else 500 will be passed as status code
 //We can also add the stackTrace or remove it accordingly

    switch (statusCode) {
        case constants.VALIDATION_ERROR:
            res.json({
                title: "Validation Failed",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        case constants.NOT_FOUND:
            res.json({
                title: "Not Found",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        case constants.UNAUTHORIZED:
            res.json({
                title: "Unauthorized",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        case constants.FORBIDDEN:
            res.json({
                title: "Forbidden",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        case constants.SERVER_ERROR:
            res.json({
                title: "Server error",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        default:
            console.log("No error all good!!");
            break;
    }
    
};


module.exports=errorHandler;