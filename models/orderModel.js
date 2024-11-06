const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    shippingAddress: { type: addressSchema, required: true },
    totalPrice: { type: Number },
    isPaid: { type: Boolean, default: true },
    paidAt: { type: Date, default: Date.now },
    isDelivered: { type: Boolean, default: false },
    // deliveredAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    timeLeft: { type: Date },
  },
  { timestamps: true }
);

// Indexes for optimization
orderSchema.index({ user: 1 });
orderSchema.index({ isPaid: 1 });
orderSchema.index({ isDelivered: 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ timeLeft: 1 }, { expireAfterSeconds: 0 });

// Calculate total price before saving
orderSchema.pre("save", function (next) {
  this.totalPrice = this.orderItems.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  const tenDaysInMilliSec = 10 * 24 * 60 * 60 * 1000;
  this.timeLeft = new Date(this.createdAt.getTime() + tenDaysInMilliSec);

  next();
});

// Populate references
orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name email photo",
  }).populate({
    path: "orderItems.productId",
    select: "name price, image",
  });
  next();
});

module.exports = mongoose.model("Order", orderSchema);
