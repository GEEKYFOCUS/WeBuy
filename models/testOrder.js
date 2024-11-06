const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", // Reference to the Product model
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["PayPal", "Stripe", "Credit Card", "Bank Transfer"],
      required: true,
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      updateTime: { type: String },
      emailAddress: { type: String },
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    taxPrice: {
      type: Number,
      default: 0,
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Processed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically create `createdAt` and `updatedAt` fields
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;

const Order = require("../models/orderModel"); // Import the Order model
const Product = require("../models/productModel"); // Import the Product model (for inventory check)
const asyncHandler = require("express-async-handler");

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;

  if (items && items.length === 0) {
    res.status(400);
    throw new Error("No items in the order");
    return;
  } else {
    // Calculate prices
    const itemsPrice = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    const shippingPrice = itemsPrice > 100 ? 0 : 10; // Example logic: Free shipping over $100
    const taxPrice = 0.1 * itemsPrice; // 10% tax
    const totalPrice = itemsPrice + shippingPrice + taxPrice;

    const order = new Order({
      user: req.user._id, // Get user ID from logged-in user
      items,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    });

    const createdOrder = await order.save();

    res.status(201).json(createdOrder);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error("Order not found");
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
};

// 1. Creating a Stripe Checkout Session for the Order
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Get the cart items for the user
  const cart = await Cart.findById(req.body.cartId).populate(
    "cartItems.productId"
  );

  // 2. Create line items for each product to send to Stripe
  const lineItems = cart.cartItems.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.productName,
        // description: item.product.description,
      },
      unit_amount: item.price * 100, // price in cents
    },
    quantity: item.quantity,
  }));

  // 3. Create a Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${req.protocol}://${req.get("host")}/my-orders?alert=order`,
    cancel_url: `${req.protocol}://${req.get("host")}/checkout`,
    customer_email: req.user.email,
    client_reference_id: req.body.cartId, // Store cart ID as a reference
    line_items: lineItems,
    mode: "payment",
  });

  // 4. Send the session as a response
  res.status(200).json({
    status: "success",
    session,
  });
});

// 2. Stripe Webhook to handle successful payment events
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Call function to create order
    createOrderCheckout(session);
  }

  res.status(200).json({ received: true });
};

// 3. Create the order after successful Stripe payment
const createOrderCheckout = async (session) => {
  try {
    // Fetch cart details using client_reference_id (cartId)
    const cart = await Cart.findById(session.client_reference_id).populate(
      "items.product"
    );
    const user = await User.findOne({ email: session.customer_email });
    const totalPrice = session.amount_total / 100; // Stripe returns amount in cents

    // Create order items from the cart
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    }));

    // Create the order in the database
    const order = await Order.create({
      user: user._id,
      orderItems,
      totalPrice,
      isPaid: true,
      paidAt: Date.now(),
      paymentResult: {
        id: session.payment_intent,
        status: session.payment_status,
      },
    });

    // Optionally: Clear the cart after order creation
    await Cart.findByIdAndDelete(session.client_reference_id);
  } catch (err) {
    console.error("Error creating order after payment: ", err);
  }
};

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const catchAsync = require("../utils/catchAsync");

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Get the currently ordered products from the cart or passed data
  const products = await Cart.find({ _id: { $in: req.body.CartId } });

  // 2. Create line items for each product
  const lineItems = products.cartItems.map((product) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: product.name,
        description: product.description,
      },
      unit_amount: product.price * 100, // Convert price to cents for Stripe
    },
    quantity: req.body.quantities[product._id],
  }));

  // 3. Create the checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],

    // Success and cancel URLs
    success_url: `${req.protocol}://${req.get("host")}/my-orders?alert=order`,
    cancel_url: `${req.protocol}://${req.get("host")}/checkout`,

    // Customer details
    customer_email: req.user.email,
    client_reference_id: req.body.productIds, // Store product IDs as a reference

    // Line items
    line_items: lineItems,

    // Set mode to payment
    mode: "payment",

    // Enable address collection
    shipping_address_collection: {
      allowed_countries: ["US", "CA"], // Add allowed countries for shipping
    },

    // Specify shipping options
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 500, currency: "usd" }, // Example: $5 shipping
          display_name: "Standard Shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 7 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 1500, currency: "usd" }, // Example: $15 express shipping
          display_name: "Express Shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 1 },
            maximum: { unit: "business_day", value: 3 },
          },
        },
      },
    ],

    // Collect customer's billing and shipping address
    billing_address_collection: "required",
  });

  // 4. Send session back to the client
  res.status(200).json({
    status: "success",
    session,
  });
});
