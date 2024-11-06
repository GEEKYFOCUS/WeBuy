const mongoose = require("mongoose");
const validator = require("validator");
const slugify = require("slugify");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxLength: [20, "Product name max length is 20"],
      required: [true, "Product name is required"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      maxLength: [
        300,
        "Product description can not be more than 150 characters",
      ],
    },
    slug: {
      type: String,
    },
    price: {
      type: Number,
      required: [true, "Price is required to create a product"],
    },
    priceDiscount: {
      type: Number,
      default: 0,
      validate: {
        validator: function (value) {
          return value < this.price;
        },
        message: `Discount price ({VALUE}) must be below the regular price `,
      },
    },
    ratingAverage: {
      type: Number,
      default: 4.1,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
    },
    ratingQuantity: {
      type: Number,
      default: 0,
    },
    stripePrice: String,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required to create a product"],
    },
    images: [String],
    imageProductDetail: {
      type: String,
      required: [true, "Product must have at least one image"],
    },

    createdAt: {
      type: Date,
      default: Date.now,
      selectfalse: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.index({ price: 1, ratingAverage: 1 });
productSchema.index({ slug: 1 });

productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
});

productSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

productSchema.pre(/^find/, function (next) {
  this.populate({
    path: "category",
    select: "name",
  });
  next();
});
module.exports = mongoose.model("Product", productSchema);
