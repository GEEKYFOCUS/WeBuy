const express = require("express");
const viewController = require("../controllers/viewController");
const orderController = require("../controllers/OrderController");
const authController = require("../controllers/authController");
const router = express.Router();

router.get("/", viewController.getHomePage);
// router.use(authController.protect);
router.get(
  "/order/:id",
  orderController.createOrderCheckout,
  viewController.getOrder
);
router.get("/checkout/:id", orderController.getCheckOutSession);
module.exports = router;
