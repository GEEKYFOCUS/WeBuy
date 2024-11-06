const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const AppError = require("../utils/appError");
const Email = require("../utils/email");
const crypto = require("crypto");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIES_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure || req.header("x-forwarded-proto") === "https",
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });
  console.log(newUser);
  try {
    const token = newUser.createVerificationToken();
    newUser.verificationToken = token;
    console.log("success1");
    console.log(newUser);
    await newUser.save();
    console.log("success2");
    console.log(newUser);
    // zohomail
    const url = `${req.protocol}://${req.get("host")}/api/v1/users/verifyUser/${token}`;
    await new Email(newUser, url).sendVerificationEmail();
    
    console.log("token sent");
    res.status(200).json({
      status: "success",
      message: "User signed up, please check your email for verification",
    });

    // const newUser = await User.create({
    //   name: req.body.name,
    //   email: req.body.email,
    //   password: req.body.password,
    //   passwordConfirm: req.body.passwordConfirm,
    //   role: req.body.role,
    // });
    // console.log(newUser);

    // // 2. Generate verification token
    // const token = newUser.createVerificationToken();
    // console.log("Verification token created", token);

    // // 2. Mark the verificationToken and verificicationTokenExpires fields as modified
    // newUser.markModified("verificationToken");
    // newUser.markModified("verificicationTokenExpires");

    // // 3. Save the token without validating again (if only token field is being updated)

    // await newUser.save({ validateBeforeSave: false });
    // console.log("User saved with verification token");

    // // 4. Construct the verification URL
    // const url = `${req.protocol}://${req.get("host")}/api/v1/users/verifyUser/${token}`;

    // // 5. Send verification email\\\\\\\\

    // await new Email(newUser, url).sendVerificationEmail();
    // console.log("Verification email sent");

    // // 6. Return success response
    // res.status(200).json({
    //   status: "success",
    //   message: "User signed up, please check your email for verification",
    // });
  } catch (error) {
    console.log(error);
    // If error occurs while sending verification email,

    newUser.verificicationTokenExpires = undefined;
    newUser.verificationToken = undefined;
    await newUser.save({ validateBeforeSave: false });
    return next(
      new AppError("Failed to send verification email. Please try again.", 500)
    );
  }
});

// exports.signup = catchAsync(async (req, res, next) => {
//   // Step 1: Create the new user
//   const newUser = await User.create({
//     name: req.body.name,
//     email: req.body.email,
//     password: req.body.password,
//     passwordConfirm: req.body.passwordConfirm,
//     role: req.body.role,
//   });

//   console.log("User created:", newUser);

//   // Step 2: Generate the verification token
//   const token = newUser.createVerificationToken();
//   console.log("Verification token created:", token);

//   // Step 3: Manually update the user with the token
//   newUser.verificationToken = token; // Update the token
//   newUser.verificationTokenExpires = Date.now() + 10 * 60 * 1000; // Update expiry

//   try {
//     // Step 4: Save the user with the token
//     const savedUser = await newUser.save({ validateBeforeSave: false });
//     console.log("User saved with verification token:", savedUser);
//     // Step 5: Construct the verification URL
//     const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/verifyUser/${token}`;
//     console.log("Verification URL:", verificationUrl);

//     // Step 6: Send the verification email
//     await new Email(newUser, verificationUrl).sendVerificationEmail();
//     console.log("Verification email sent");

//     // Step 7: Send success response
//     return res.status(201).json({
//       status: "success",
//       message:
//         "User registered successfully. Please check your email for verification.",
//     });
//   } catch (error) {
//     console.error("Error during signup process:", error);

//     // Rollback: Cleanup the token if there's an issue
//     if (newUser) {
//       newUser.verificationToken = undefined;
//       newUser.verificationTokenExpires = undefined;
//       await newUser.save({ validateBeforeSave: false });
//     }

//     return next(new AppError("Failed to sign up. Please try again.", 500));
//   }
// });

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return next(new AppError("Please  provide email and password", 401));
  }

  // Check if user exists and password is correct
  const user = await User.findOne({ email }).select("+password");

  if (
    !user ||
    !(await user.checkIfPasswordIsCorrect(password, user.password))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", { expires: new Date(Date.now() + 10 * 1000) });
  res.status(200).json({ status: "success", message: "Logged out" });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  //1 Check if token exists in the request the request headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in. Please login to continue", 401)
    );
  }
  console.log(token);
  //2 Check if  token is   valid

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3 Check if user still  exist

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return new AppError(
      "The user belonging  to this token  does no  longer exist",
      400
    );
  }

  // check if user as not change their password
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        "User recently changed thier password!, Please login again",
        401
      )
    );
  }
  //4 Grant access to protected

  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = promisify(jwt.verify)(
        res.cookies.jwt,
        process.env.JWT_SECRET
      );

      //   check if user still exists

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      if (currentUser.changedPasswordAfter(docoded.iat)) {
        return next();
      }
      res.locals.user = currentUser;
      return next();
    } catch {
      return next();
    }
  }
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1 Get user based on provided email

  const user = await User.findOne({ email: req.body.email });

  //2 check if user exists
  if (!user) {
    return next(new AppError("There is no user with that mail address", 404));
  }

  // 3 Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 4 Send reset token to user via email
  try {
    const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetUrl).sendResetPassword();
    res.status(200).json({
      status: "success",
      message: "Reset password token sent to your email",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    // return next(new AppError("Failed to send reset password email", 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1 Get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) next(new AppError("Token is invalid or has Expired"));

  // 2 Update password, set token and expire date to null

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1 Get user from req.user

  const user = await User.findById(req.user._id).select("+password");

  currentPassword = req.body.password;

  if (!(await user.checkIfPasswordIsCorrect(currentPassword, user.password))) {
    return next(
      new AppError(
        "Your password is incorrect. Please input a correct password, or try resetting your password",
        401
      )
    );
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save();
  createSendToken(user, 200, req, res);
});

exports.verifyUser = catchAsync(async (req, res, next) => {
  // 1 Get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificicationTokenExpires: { $gt: Date.now() },
  });
  console.log(user);

  if (!user) return next(new AppError("Token is invalid or has Expired"));

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificicationTokenExpires = undefined;
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, req, res);
});

exports.resendVerificationToken = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  user = await User.findOne({ email });
  if (!user) return next("No user with that email address found", 404);

  console.log(user);
  try {
    const token = user.createVerificationToken();
    console.log(token);
    user.save({ validateBeforeSave: false });

    const url = `${req.protocol}://${req.get("host")}/api/v1/users/verifyUser/${token}`;
    await new Email(user, url).sendVerificationEmail();
    res.status(200).json({
      status: "success",
      message: "Verification token sent successfully",
    });
  } catch (error) {
    console.log(error);
    // If error occurs while sending verification email,

    user.verificicationTokenExpires = undefined;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("Failed to send verification email. Please try again.", 500)
    );
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(req.user.role);
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You are not authorized to access this routes", 401)
      );
    }
    next();
  };
};
