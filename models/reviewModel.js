const mongoose = require("mongoose");
const Product = require("./productModel");
const AppError = require("../utils/appError");

const reviewSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: [true, "A Review must have a content"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "a Review must belong to a user"],
    },
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "A Review must belong to a Product"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

//   this.populate({
//     path: "user",
//     select: "name photo",
//   }).populate({
//     path: "product",
//     select: "name",
//   });
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo",
  });
  next();
});

// ratingAverage
// ratingQuantity

reviewSchema.statics.calAverageRatingQuantity = async function (productId) {
  try {
    const statics = await this.aggregate([
      { $match: { product: productId } },
      {
        $group: {
          _id: "$product",
          totalRating: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    if (statics.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        ratingAverage: statics[0].averageRating,
        ratingQuantity: statics[0].totalRating,
      });
    } else {
      await Product.findByIdAndUpdate(productId, {
        ratingAverage: 4.2,
        ratingQuantity: 0,
      });
    }
  } catch (err) {
    new AppError("An Error occur please try again");
    console.error("Error calculating average rating and quantity:", err);
  }
};

reviewSchema.post("save", function () {
  this.constructor.calAverageRatingQuantity(this.product);
});

// middleware for find and update. The above might not work for that
// `doc` contains the document after the update or delete

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.clone().findOne();
  console.log(this.r, "finding it ");

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calAverageRatingQuantity(this.r.product);
});

module.exports = mongoose.model("Review", reviewSchema);
