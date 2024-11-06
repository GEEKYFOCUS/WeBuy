const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const factory = require("./handlerFactory");

// 1. Creating a Stripe Checkout Session for the Order
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1. Get the currently ordered product(s) (from the cart or product directly)
  const products = await Cart.find({ _id: { $in: req.body.CartId } });

  // 2. Create line items for each product to send to Stripe
  const lineItems = product.cartItems.map((Product) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: product.name,
        description: product.description,
      },
      unit_amount: product.price * 100, // price in cents
    },
    quantity: req.body.quantities[product._id],
  }));

  // 3. Create a Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    success_url: `${req.protocol}://${req.get("host")}/my-orders?alert=order`,
    cancel_url: `${req.protocol}://${req.get("host")}/checkout`,
    customer_email: req.user.email,
    client_reference_id: req.body.productIds, // storing product IDs as reference
    line_items: lineItems,
    mode: "payment",
  });

  // 4. Send the session as a response
  res.status(200).json({
    status: "success",
    session,
  });
});

// 2. Creating the Order after successful Stripe Payment
const createOrderCheckout = async (session) => {
  try {
    const productIds = session.client_reference_id;
    const user = (await User.findOne({ email: session.customer_email })).id;
    const totalPrice = session.amount_total / 100; // Stripe returns price in cents

    // Create the order in the database
    await Order.create({
      user,
      orderItems: productIds.map((productId) => ({
        product: productId,
        price:
          session.line_items.find((item) => item.product_data.id === productId)
            .price_data.unit_amount / 100, // Price in dollars
        quantity: session.line_items.find(
          (item) => item.product_data.id === productId
        ).quantity,
      })),
      totalPrice,
      isPaid: true,
      paidAt: Date.now(),
    });
  } catch (err) {
    console.error("Error creating order after payment: ", err);
  }
};

// 3. Stripe Webhook to handle successful payment events
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

  if (event.type === "checkout.session.completed") {
    createOrderCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

// 4. CRUD Operations for Orders
exports.createOrder = factory.createOne(Order);
exports.getAllOrders = factory.getAll(Order);
exports.getOrder = factory.getOne(Order);
exports.deleteOrder = factory.deleteOne(Order);
exports.updateOrder = factory.updateOne(Order);


