const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/resetPassword/:token", authController.resetPassword);
router.get("/verifyUser/:token", authController.verifyUser);
router.post("/resendVerificationToken", authController.resendVerificationToken);

router.use(authController.protect);

router.patch("/updatePassword", authController.updatePassword);

router.get("/getMe", userController.getMe, userController.getUser);
router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete("deleteMe", userController.deleteMe);

router.use(authController.restrictTo("admin"));

router
  .route("/")
  .post(userController.createUser)
  .get(userController.getAllUser);
router
  .route("/:id")
  .patch(userController.updateUser)
  .delete(userController.deleteUser)
  .get(userController.getUser);

module.exports = router;
