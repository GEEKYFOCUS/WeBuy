const Category = require("../models/categoryModel");
const AppError = require("../utils/appError");
const factory = require("../controllers/handlerFactory");

exports.createCategory = factory.createOne(Category);
exports.deleteCategory = factory.deleteOne(Category);
exports.updateCategory = factory.updateOne(Category);
exports.getCategory = factory.getOne(Category);
exports.getAllCategory = factory.getAll(Category);
//  exports.getAllCategory = factory.getAll(Category)
