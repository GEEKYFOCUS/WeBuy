const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const shippingAddress = require("../models/shippingModel");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
let params;
const YOUR_DOMAIN = `http://127.0.0.1:8000/`;

exports.createAddress = catchAsync(async () => {});

exports.getCheckOutSession = catchAsync(async (req, res, next) => {
  console.log(req.params.id);
  const cart = await Cart.findById(req.params.id);
  // params = req.params.id;
  if (!cart) return next(new AppError("Cart not found", 404));
  console.log(cart);
  const lineItems = cart.cartItems.map((item) => ({
    price: "price_1Q3lb8P707CB0RMtXmnegrOo",
    quantity: item.quantity,
  }));
  const address = req.body.address;
  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    success_url: `${YOUR_DOMAIN}order/${"6713b433d41b1ef47ee80f92"}?success=true`,
    cancel_url: `${YOUR_DOMAIN}?canceled=true`,
  });
  //   console.log(session);
  res.redirect(303, session.url);

  res.status(200).json({
    status: "success",
    message: "Checkout session created",
    session: session,
  });
});

exports.createOrderCheckout = catchAsync(async (req, res, next) => {
  // Fetch cart details using client_reference_id (cartId)
  const { success } = req.query;
  if (!success) return next();
  //   const user = await User.findOne({ email: session.customer_email });
  const userId = "670e518a4e3b8000000eb383";
  // const cart = await Cart.findById(req.params.id).getCartWithProductDetails(userId);

  const cart = await Cart.getCartWithProductDetails(userId);

  //   const totalPrice = session.amount_total / 100; // Stripe returns amount in cents

  // Create order items from the cart
  console.log(cart);
  const orderItems = cart.cartItems.map((item) => ({
    productId: item.productId,
    name: item.productName,
    price: item.price,
    quantity: item.quantity,
  }));

  // Create the order in the database
  const order = await Order.create({
    user: userId,
    orderItems,
    isPaid: true,
    paidAt: Date.now(),
  });

  res.redirect(req.originalUrl.split("?")[0]);
});

exports.getAllOrder = factory.getAll(Order);
