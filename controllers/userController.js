const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const handlerFactory = require("./handlerFactory");
const multer = require("multer");
const sharp = require("sharp");
const { supabaseUrl, supabase } = require("../utils/supabase");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  console.log(file);

  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Only images are allowed", 405), false);
  }
};

exports.uploadUserPhoto = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
}).single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) next();

  req.file.filename = `user-${req.user.id}.jpeg`;
  const filename = req.file.filename;
  // Resize the image with sharp
  const processedImageBuffer = await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer(); // Convert to a buffer to upload to Supabase

  console.log("Buffer length", processedImageBuffer.length);
  // Upload the image buffer to Supabase storage
  const { data, error } = await supabase.storage
    .from("users") // Specify your Supabase bucket
    .upload(`${filename}`, processedImageBuffer, {
      contentType: "image/jpeg",
      upsert: true, // Replace if the file exists
    });

  if (error) {
    console.log(error, error.message);
    return next(new AppError("Error uploading image to Supabase", 500));
  }
  //Set the file to the uploaded supabase  url
  req.file.supabasePublicURL = `${supabaseUrl}/storage/v1/object/public/users/${filename}`;

  next();
});

exports.getMe = catchAsync(async (req, res, next) => {
  req.params.id = req.user.id;
  next();
});

// const filteredObject = (obj, [...allowedFields]) => {
//   const filteredObj = {};
//   allowedFields.forEach((field) => {
//     if (obj[field]) filteredObj[field] = obj[field];
//   });
//   return filteredObj;
// };

const filteredObject = (Obj, ...allowFields) => {
  const newObj = {};
  Object.keys(Obj).forEach((el) => {
    if (allowFields.includes(el)) newObj[el] = Obj[el];
  });
  return newObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.password) {
    return next(
      new AppError(
        "This is not the route to update password. Please use /updatePassword"
      )
    );
  }

  let filteredBody = filteredObject(req.body, "name", "email");
  console.log(req.file.supabasePublicURL, "filename");
  console.log(req.body);
  if (req.file) filteredBody.photo = req.file.supabasePublicURL;
  console.log(filteredBody);
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      data: updatedUser,
    },
  });
});

// Frontend should redirect redirect the user to login page after account has been deleted
exports.deleteMe = catchAsync(async (req, res, next) => {
  const deleteUser = await User.findByIdAndDelete(req.user.id);
  res.status(201).json({
    successs: true,
    data: null,
  });
});

exports.createUser = catchAsync(async (res, req, next) => {
  next(
    new AppError(
      "This route is not for creating user. use /singup instead ",
      403
    )
  );
});
exports.getUser = handlerFactory.getOne(User);

// Use /updatePassword  to update password. Not this! It will
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
exports.getAllUser = handlerFactory.getAll(User);
