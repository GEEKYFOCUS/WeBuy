const express = require("express");
const productController = require("../controllers/productController");
const authController = require("../controllers/authController");
const reviewRoute = require("./reviewRoutes");

const router = express.Router();
// router.use(/tourId)

router.use("/:productId/reviews", reviewRoute);

router.use(authController.protect);
router
  .route("/")
  .post(
    authController.restrictTo("admin"),
    productController.uploadProductImage,
    productController.resizeProductImage,
    productController.checkIfImageExists,
    productController.createProduct
  )
  .get(productController.getAllProducts);

router
  .route("/:id")
  .get(productController.getSingleProduct)
  .patch(authController.restrictTo("admin"), productController.updateProduct)
  .delete(authController.restrictTo("admin"), productController.deleteProduct);

module.exports = router;
