const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please tell us your name to create an account"],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: [true, "An email is require to create an account"],
      maxLength: [
        30,
        "A maximum  character a number can  hace in 30 characters long",
      ],
      validate: [validator.isEmail, "Please enter a valid email address"],
    },
    photo: {
      type: String,
      // default: "https://www.gravatar.com/avatar?d=retro",
      default: "default.jpeg",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    password: {
      type: String,
      required: [true, "Please enter a password  to create a new account"],
      minlength: [8, "A password must be at least 8 characters long"],
      validate: [
        function (password) {
          // Check for at least one uppercase letter
          if (!password.match(/[A-Z]/)) {
            return false;
          }
          // Check for at least one lowercase letter
          if (!password.match(/[a-z]/)) {
            return false;
          }
          // Check for at least one number
          if (!password.match(/\d/)) {
            return false;
          }
          // Check for at least one special character
          if (!password.match(/[!@#$%^&*(),.?":{}|<>]/)) {
            return false;
          }
          return true;
        },
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        // this only works on CREATE and SAVE
        validator: function (passwordConfirm) {
          return this.password === passwordConfirm;
        },
        message:
          "Passwords need  to not match, initial password must match  with this ",
      },
    },

    passwordChangedAt: Date,
    passwordResetExpires: Date,
    passwordResetToken: String,
    verificicationTokenExpires: Date,
    verificationToken: String,
    // passwordResetExpires: String,

    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.pre("save", function (next) {
  if (!this.isModified() || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
});
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // hash the password with code before saving it to the database for security reasons
  this.password = await bcrypt.hash(this.password, 12);

  //   Delete the password confirm as it is  not requires in the database
  //   This is a security measure to prevent password leakage.
  this.passwordConfirm = undefined;
  //   next();
});

userSchema.methods.checkIfPasswordIsCorrect = async function (
  candidatePassword,
  userPassword
) {
  // compare the candidate password with the hashed password stored in the database
  if (await bcrypt.compare(candidatePassword, userPassword)) {
    console.log("passwords match");
  }
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTtimestamp) {
  if (this.passwordChangedAt) {
    const changeTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000);

    return JWTtimestamp < changeTimeStamp;
  }
  // false mean the password does not change

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * (60 * 1000);

  return resetToken;
};

userSchema.methods.createVerificationToken = function () {
  const _verificationToken = crypto.randomBytes(32).toString("hex");
  this.verificationToken = crypto
    .createHash("sha256")
    .update(_verificationToken)
    .digest("hex");

  this.verificicationTokenExpires = Date.now() + 10 * (60 * 1000);

  return _verificationToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;

// userSchema.methods.createPasswordResetToken = function () {
//   const resetToken = crypto.randomBytes(32).toString("hex");

//   this.passwordResetToken = crypto
//     .createHash("sha256")
//     .update(resetToken)
//     .digest("hex");

//   console.log({ resetToken }, this.passwordResetToken);

//   this.passwordResetExpires = Date.now() + 10 * (60 * 1000);

//   return resetToken;
// };
