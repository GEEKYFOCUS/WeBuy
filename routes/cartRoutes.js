const express = require("express");
const cartController = require("../controllers/cartController");
const authController = require("../controllers/authController");
// const { consumers } = require('nodemailer/lib/xoauth2');
const router = express.Router();

router.use(authController.protect);
router
  .route("/")
  .get(cartController.getAllCartItems)
  .delete(cartController.clearCart);

router.post("/addItem", cartController.addItemToCart);
router.delete("/removeItem", cartController.removeItemFromCart);
router.patch("/increaseQuantity", cartController.increaseItemQuantity);
router.patch("/decreaseQuantity", cartController.decreaseItemQuantity);
router.get("/:id", cartController.getSingleCart);

module.exports = router;
