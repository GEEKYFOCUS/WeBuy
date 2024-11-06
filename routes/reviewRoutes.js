const express = require("express");
const reviewController = require("../controllers/reviewController");
const authController = require("../controllers/authController");

const router = express.Router({ mergeParams: true });

router.use(authController.protect);
router
  .route("/")
  .post(
    reviewController.setProductAndUserId,
    // after testing, currently using an admin
    // rauthController.restrict("user")
    reviewController.createReviewOnProduct
  )
  .get(reviewController.getAllReviews);

router
  .route("/:id")
  .get(reviewController.getReview)
  .delete(reviewController.deleteReviewOnProduct)
  .patch(reviewController.updateReviewOnProduct);

module.exports = router;
