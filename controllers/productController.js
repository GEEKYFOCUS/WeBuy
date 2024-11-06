const Product = require("../models/productModel");
const AppError = require("../utils/appError");
const multer = require("multer");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const sharp = require("sharp");
const { supabaseUrl, supabase } = require("../utils/supabase");

// Configure multer to store files in memory
const multerStorage = multer.memoryStorage();

// Only allow images
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

// Multer setup for handling multiple images
exports.uploadProductImage = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
}).fields([
  { name: "images", maxCount: 2 }, // max of 2 additional images
  { name: "imageProductDetail", maxCount: 1 }, // 1 detail image
]);

// Middleware to resize images and upload to Supabase
exports.resizeProductImage = catchAsync(async (req, res, next) => {
  if (!req.files.imageProductDetail || !req.files.images) {
    return next(new AppError("Product must have at least one image", 400));
  }

  // (1) Product Detail Image
  const detailImageFilename = `product-${req.user.id}-${Date.now()}-detail.jpeg`;

  const processedDetailBuffer = await sharp(
    req.files.imageProductDetail[0].buffer
  )
    .resize(2000, 1350)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

  const { error: detailError } = await supabase.storage
    .from("product")
    .upload(`${detailImageFilename}`, processedDetailBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (detailError) {
    console.log(detailError, detailError.message);
    return next(new AppError("Error uploading detail image to Supabase", 500));
  }

  req.body.imageProductDetail = `${supabaseUrl}/storage/v1/object/public/product/${detailImageFilename}`;

  // (2) Additional Images
  const uploadedImages = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `product-${req.user.id}-${Date.now()}-${i + 1}.jpeg`;

      const processedImageBuffer = await sharp(file.buffer)
        .resize(2000, 1450)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toBuffer();

      const { error: imageError } = await supabase.storage
        .from("product")
        .upload(`${filename}`, processedImageBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (imageError) {
        console.log(imageError, imageError.message);
        return next(
          new AppError("Error uploading additional image to Supabase", 500)
        );
      }

      const publicURL = `${supabaseUrl}/storage/v1/object/public/product/${filename}`;
      uploadedImages.push(publicURL);
    })
  );

  req.body.images = uploadedImages;

  next();
});

exports.checkIfImageExists = catchAsync(async (req, res, next) => {
  //  Ensure that images are present,

  if (
    !req.body.imageProductDetail ||
    !req.body.images ||
    req.body.images.length === 0
  ) {
    return next(new AppError("Product must have at least one image", 400));
  }
  next();
});

exports.createProduct = factory.createOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
exports.getSingleProduct = factory.getOne(Product, { path: "reviews" });
exports.getAllProducts = factory.getAll(Product);
exports.updateProduct = factory.updateOne(Product);
