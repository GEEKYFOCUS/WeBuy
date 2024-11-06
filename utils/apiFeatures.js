class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    let query = this.query;
    let queryObj = { ...this.queryString };
    const excludeFields = ["sort", "fields", "page", "limit"];
    excludeFields.forEach((field) => {
      delete queryObj[field];
    });
    let queryStr = JSON.stringify(queryObj);
    queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }
  sort() {
    if (this.queryString.sort) {
      //   const sortBy = this.queryString.sort.split(",").map((s) => s.trim());
      const sortBy = this.queryString.sort.split(",").join(",");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (thisqueryString.fields) {
      let fields = this.queryString.field.split(",").join(",");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }
  pagginate() {
    const page = parseInt(this.queryString.page) || 1;
    const limit = parseInt(this.queryString.limit) || 10;
    const skip = (page - 1) * limit;
    query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
