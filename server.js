const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION 🔥🔥 shutting down");
  console.log(err.name, err.message, err.stack);
  process.exit(1);
});

// configure environment variables
dotenv.config({ path: "./config.env" });
const app = require("./app");

//replace database placeholder password
const DB = process.env.DATABASE.replace(
  `<PASSWORD>`,
  process.env.DATABASE_PASSWORD
);
console.log(DB);
//connect to database(MONGODB)
mongoose.connect(DB, {}).then((con) => {
  // console.log(con.connections);
  console.log("DB connection successful!");
});
console.log(process.env.NODE_ENV);
const port = process.env.PORT || 3000;
server = app.listen(port, () => {
  console.log(`Server's listening on port ${port}`);
});

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION 😥🔥 shutting down");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
