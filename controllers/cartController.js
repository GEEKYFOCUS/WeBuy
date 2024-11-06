const AppError = require("../utils/appError");
const Cart = require("../models/cartModel");
const catchAsync = require("../utils/catchAsync");
const mongoose = require("mongoose");
const Product = require("../models/productModel");
const factory = require("./handlerFactory");

// // exports.addItemToCart = catchAsync(async (req, res, next) => {
// //   const {
// //     items: { product, quantity, priceAtAdd },
// //   } = req.body;

// //   const cart = await Cart.findOneAndUpdate(
// //     { user: req.user._id },
// //     { $push: { items } },
// //     { new: true, upsert: true }
// //   );
// // });

exports.addItemToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  // 1. Validate product ID and quantity
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return next(new AppError("Invalid product ID.", 400));
  }

  if (!quantity || quantity < 1) {
    return next(new AppError("Quantity must be at least 1.", 400));
  }

  // 2. Get the user's cart (assuming user ID is available from the token or session)
  let cart = await Cart.findOne({ user: req.user.id });
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("Product not found.", 404));
  }

  // 3. If the cart doesn't exist, create a new one
  if (!cart) {
    cart = new Cart({
      user: req.user.id,
      cartItems: [],
      totalItems: 0,
      totalPrice: 0,
    });
  }

  // 4. Check if product is already in the cart
  const existingProductIndex = cart.cartItems.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (existingProductIndex > -1) {
    // If product exists, update the quantity
    // cart.cartItems[existingProductIndex].quantity += quantity * 1;
    // cart.cartItems[existingProductIndex].price =
    //   product.price * cart.cartItems[existingProductIndex].quantity;
    next(
      new AppError(
        "Item already exists in cart. You can either increase quantity, decrease quantity or delete item from cart",
        400
      )
    );
  } else {
    // Add new item to cart
    cart.cartItems.push({
      productId,
      quantity: quantity * 1,
      stripePrice: product.stripePrice,
      price: product.price * (quantity * 1),
    });
  }

  // 5. Update total price and total items
  // cart.totalItems = cart.cartItems.reduce(
  //   (acc, item) => acc + item.quantity,
  //   0
  // );
  // cart.totalPrice = cart.cartItems.reduce((acc, item) => acc + item.price, 0);

  // 6. Save the cart
  await cart.save();

  res.status(200).json({
    status: "success",
    data: { data: cart },
  });
});

exports.removeItemFromCart = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  //  Validate product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return next(new AppError("Invalid product ID.", 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    return next(new AppError("Cart not found.", 404));
  }

  //  Find the index of the product to remove
  const itemIndex = cart.cartItems.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    return next(new AppError("Item not found in cart.", 404));
  }

  //. Remove the item from cart
  cart.cartItems.splice(itemIndex, 1);

  //  Update total items and total price
  cart.totalItems = cart.cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0
  );
  cart.totalPrice = cart.cartItems.reduce((acc, item) => acc + item.price, 0);

  // Save the updated cart
  await cart.save();

  res.status(200).json({
    status: "success",
    data: { data: cart },
  });
});

exports.increaseItemQuantity = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  // 1. Validate product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return next(new AppError("Invalid product ID.", 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    return next(new AppError("Cart not found.", 404));
  }

  // Find the product in the cart
  const itemIndex = cart.cartItems.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    return next(new AppError("Item not found in cart.", 404));
  }

  // 2. Retrieve the original price from the product model using productId
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("Product not found.", 404));
  }

  const originalPrice = product.price; // assuming 'price' is the field storing the product price

  // Increase the item's quantity
  cart.cartItems[itemIndex].quantity += 1;

  // Update the total price of the item (unit price * quantity)
  cart.cartItems[itemIndex].price =
    originalPrice * cart.cartItems[itemIndex].quantity;

  // // Update total items and total price for the cart
  // cart.totalItems = cart.cartItems.reduce((acc, item) => acc + item.quantity, 0);
  // cart.totalPrice = cart.cartItems.reduce((acc, item) => acc + (item.quantity * originalPrice), 0);

  // Save the updated cart
  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

exports.decreaseItemQuantity = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  // 1. Validate product ID
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return next(new AppError("Invalid product ID.", 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    return next(new AppError("Cart not found.", 404));
  }

  // Find the product in the cart
  const itemIndex = cart.cartItems.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    return next(new AppError("Item not found in cart.", 404));
  }

  // 2. Retrieve the original price from the product model using productId
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("Product not found.", 404));
  }

  const originalPrice = product.price; // assuming 'price' is the field storing the product price

  // Increase the item's quantity
  cart.cartItems[itemIndex].quantity -= 1;

  // Update the total price of the item (unit price * quantity)
  cart.cartItems[itemIndex].price =
    originalPrice * cart.cartItems[itemIndex].quantity;

  // // Update total items and total price for the cart
  // cart.totalItems = cart.cartItems.reduce((acc, item) => acc + item.quantity, 0);
  // cart.totalPrice = cart.cartItems.reduce((acc, item) => acc + (item.quantity * originalPrice), 0);

  // Save the updated cart
  await cart.save();

  res.status(200).json({
    status: "success",
    data: { cart },
  });
});

// exports.getAllCartItems = factory.getAll(Cart);
exports.getAllCartItems = catchAsync(async (req, res, next) => {
  const userId = req.user._id; // Assuming you have the user id from the session or token

  // Fetch the cart with product details
  const cart = await Cart.getCartWithProductDetails(userId);

  if (!cart) {
    return res.status(404).json({
      status: "fail",
      message: "Cart not found",
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      cart,
    },
  });
});

exports.getSingleCart = factory.getOne(Cart);

exports.clearCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.deleteOne({ user: req.user.id });
  console.log(cart);
  if (!cart) return next(new AppError("No cart found with that id", 404));
  res.status(204).json({
    status: "success",
    data: {
      data: null,
    },
  });
});
