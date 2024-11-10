const AppError = require("../utils/appError");

const handleCastErrorInDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateErrorInDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value : ${value}. Please use another value`;
  return new AppError(message, 400);
};
const handleValidationErrorInDB = (err) => {
  const error = Object.value(err.error).map((el) => el.message);
  const message = `Validation failed: ${error.join(". ")} .Please provide a correct data`;
  return new AppError(message, 400);
};
const handleJsonWebTokenError = (err) => {
  return new AppError(
    "Invalid token, Please provide a valid token, Please login again !",
    401
  );
};
const handleTokenExpiredError = (err) => {
  return new AppError("Token expired. Please login again ", 401);
};

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }
};

const sendErrorProd = (err, req, res, next) => {
  console.log(req, "this is the original url");
  if (req.originalUrl.startsWith("/api")) {
    // isOperational Error: truted Error send message to the client

    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // programming or unknown error. Dont't leak error details to the user
    return res.status(err.statusCode).json({
      status: err.status,
      message: "Something went wrong!",
    });
  }
};

module.exports = (error, req, res, next) => {
  // console.log(error.stack);
  console.log(error, " 🔥😥🔥😥");
  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, req, res);

    // if (process.env.NODE_ENV === 'development') {
    //     sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let err = { ...error };
    err.message = error.message;
    console.log(error.message, "This is the error message in production");
    if (err.name === "CastError") err = handleCastErrorInDB(err);
    if (err.code === 11000) err = handleDuplicateErrorInDB(err);
    if (err.name === "ValidationError") err = handleValidationErrorInDB(err);
    if (err.name === "JsonWebTokenError") err = handleJsonWebTokenError(err);
    if (err.name === "TokenExpiredError") err = handleTokenExpiredError(err);
    sendErrorProd(err, req, res, next);
  }
};
