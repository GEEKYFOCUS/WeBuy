const express = require("express");
const path = require("path");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const mongoSanitizer = require("express-mongo-sanitize");
const AppError = require("./utils/appError");
const hpp = require("hpp");
const morgan = require("morgan");
const xss = require("xss-clean");
const globalErrorHandler = require("./controllers/errorController");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const cartRoutes = require("./routes/cartRoutes");
const viewRoutes = require("./routes/viewRoutes");
const pug = require("pug");
// initialize  express app

const app = express();
// use to enable proxy(reverse)
// app.enable("true proxy");

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
//BODY PARSER, READING DATA FROM THE body INTO REQ.BODY
app.use(express.json());

app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
// Data Sanitization against SQL injection
app.use(mongoSanitizer());
// Data Sanitization against Sxss
app.use(xss());

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});
// Used to hanle global incorect urls

// Mounting Router
app.use("/", viewRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/order", orderRoutes);
app.all("*", (req, res, next) => {
  next(new AppError(`Cant find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
