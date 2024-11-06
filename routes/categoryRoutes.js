const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const authController = require("../controllers/authController");

router.use(authController.protect);
router.use(authController.restrictTo("admin"));

router
  .route("/")
  .post(categoryController.createCategory)
  .get(categoryController.getAllCategory);

router
  .route("/:id")
  .patch(categoryController.updateCategory)
  .delete(categoryController.deleteCategory)
  .get(categoryController.getCategory)

module.exports = router;

