const catchAsync = require("../utils/catchAsync");

exports.getHomePage = catchAsync(async (req, res, next) => {
  res.status(200).render("home", {
    title: "Home",
    message: "Welcome to the home page!",
  });
});

exports.getOrder = catchAsync(async (req, res, next) => {
  res.status(200).render("order"),
    {
      title: "Order",
    };
});
