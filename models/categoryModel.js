const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: {
      type: String,
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
categorySchema.pre("save", function (next) {
  // this.slug = slugify(this.name, { lower: true });
  this.slug = slugify(this.name, { lower: true });
  next();
});
module.exports = mongoose.model("Category", categorySchema);
