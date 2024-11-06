const catchAsync = require("../utils/catchAsync");
const factory = require("../controllers/handlerFactory");
const Review = require("../models/reviewModel");
const AppError = require("../utils/appError");

exports.setProductAndUserId = catchAsync(async (req, res, next) => {
  const { comment, rating } = req.body;
  console.log(req.body);
  if (!req.body.user) req.body.user = req.user.id;
  if (!req.body.product) req.body.product = req.params.productId;
  if (!comment || !rating) {
    return next(new AppError("Please review and rating can't be empty.!", 400));
  }
  next();
});

exports.createReviewOnProduct = factory.createOne(Review);
exports.updateReviewOnProduct = factory.updateOne(Review);
exports.deleteReviewOnProduct = factory.deleteOne(Review);
exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
