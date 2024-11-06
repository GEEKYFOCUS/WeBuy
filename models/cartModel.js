const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", // Assuming you have a Product model
    required: [true, "Product ID is required"],
    // populate: { select: "images" },
  },
  stripePrice: {
    type: String,
    required: [true, "Stripe price is required"],
  },
  quantity: {
    type: Number,
    // required: [true, "Product quantity is required"],
    min: [1, "Quantity cannot be less than 1"],
    max: [12, "Quantity cannot be more than 12"],
    default: 1,
  },
  price: {
    type: Number,
    required: [true, "Product price is required"],
  },
  // originalPrice: {
  //   type: Number,
  //   required: [true, "Product price is required"],
  // },
});
// cartItemSchema.pre("/^find/", function (next) {
//   this.populate({
//     path: "productId",
//     select: "images",
//   });
//   next();
// });

cartItemSchema.pre(/^find/, function (next) {
  this.populate({
    path: "productId",
    select: "name images", // Populate product name and images
  });
  next();
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming you have a User model
      required: [true, "Cart must belong to a user"],
      unique: true, // Each user should have only one cart
    },
    cartItems: [cartItemSchema], // Array of cart items
    totalPrice: {
      type: Number,
    },
    totalItems: {
      type: Number,
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

// cartSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "cartItems.productId",
//     select: "images",
//   });
//   next();
// });
// cartSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "cartItems.productId",
//     select: "name images", // Select the fields you want from the Product model
//   });
//   next();
// });

// cartSchema.pre("save", function (next) {
//   this.populate({
//     path: "cartItems.productId",
//     select: "name images", // Select the fields you want from the Product model
//   });
//   next();
// });

// Pre-save middleware to recalculate total price and total items before saving
cartSchema.pre("save", function (next) {
  // Calculate total items and total price
  // Check if cartItems array has changed, recalculate only when needed
  // if (this.isModified("cartItems")) {
  this.totalItems = this.cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0
  );
  this.totalPrice = this.cartItems.reduce((acc, item) => acc + item.price, 0);

  next();
});
// cartSchema.pre(/^find/, function (next) {
//   // Calculate total items and total price
//   // Check if cartItems array has changed, recalculate only when needed

//   this.totalItems = this.cartItems.reduce(
//     (acc, item) => acc + item.quantity,
//     0
//   );
//   this.totalPrice = this.cartItems.reduce((acc, item) => acc + item.price, 0);

//   next();
// });

// Static method to get cart and populate product details
cartSchema.statics.getCartWithProductDetails = async function (userId) {
  const cart = await this.findOne({ user: userId }).populate({
    // Populate product details
    path: "cartItems.productId",
    // Choose fields to populate
    select: "name images",
  });

  if (!cart) return null;

  // Map through cart items to embed name and images

  const transformedCart = cart.cartItems.map((item) => {
    console.log(item.productId);
    return {
      _id: item._id,
      productId: item.productId._id,
      productName: item.productId.name, // Embed name directly
      productImages: item.productId.images, // Embed images directly
      quantity: item.quantity,
      price: item.price,
    };
  });

  // Return the transformed cart with product details
  return {
    _id: cart._id,
    user: cart.user,
    cartItems: transformedCart,
    totalPrice: cart.totalPrice,
    totalItems: cart.totalItems,
    createdAt: cart.createdAt,
  };
};

// cartSchema.post(/^find/, function (next) {
//   this.constructor.getCartWithProductDetails(this.user);
//   next();
// });
// cartSchema.post(/^find/, function () {
//   this.constructor.calAverageRatingQuantity(this.user);
// });

module.exports = mongoose.model("Cart", cartSchema);
