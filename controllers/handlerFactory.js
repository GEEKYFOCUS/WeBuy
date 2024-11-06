const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/apiFeatures");

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const deletedDoc = await Model.findByIdAndDelete(req.params.id);
    if (!deletedDoc)
      return next(
        new AppError(`No doc found for that id ${req.params.id}`, 404)
      );

    res.status(201).json({
      status: "success",
      data: null,
    });
  });
};

exports.updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    // Depending the business require. But basically admin should not be allowed to update it user password . Rather reset using /forgetPassword
    // if(req.body.password || req.body.passwordConfirm) return next(new AppError("You can't even update the user password as an admin.", 401))
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    console.log(updatedDoc);
    if (!updatedDoc)
      return next(
        new AppError(`No Doc found with the id ${req.params.id}`, 404)
      );
    res.status(200).json({
      status: "success",
      data: {
        data: updatedDoc,
      },
    });
  });
};
exports.getOne = (Model, populateOptions) => {
  return catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;
    if (!doc) return next(`No Do found with the id ${req.params.id}`, 404);

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });
};

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    let filter;
    if (req.params.productId) filter = { product: req.params.productId };
    const features = new APIFeatures(Model.find(filter), req.query);
    const doc = await features.query;

    if (!doc) return new AppError("No Doc found ", 404);
    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });
