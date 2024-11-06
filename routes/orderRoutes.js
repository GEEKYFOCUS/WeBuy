const express = require("express");
const orderController = require("../controllers/OrderController");
const authController = require("../controllers/authController");
const router = express.Router();

router.route("/").get(authController.protect, orderController.getAllOrder);
module.exports = router;
