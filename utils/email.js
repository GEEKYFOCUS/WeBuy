const nodemailer = require("nodemailer");
const htmlToText = require("html-to-text");
const pug = require("pug");
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.from = `Abdulhakeem ${process.env.EMAIL_FROM}`;
    this.url = url;
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_FROM, // Your Gmail email
          pass: process.env.EMAIL_APP_PASSWORD, // App password generated from Google
        },
      });
      console.log(transporter);
    }
    // 267f57c42e85ed7d6ab73212ae57b8e22f260aae
    // 784975b6-99bf48ac
    // sandbox408b0dcbb92c4611940261415b61cdd7.mailgun.org;
    //     EMAIL_FROM=geekyfocus@gmail.com
    // EMAIL_HOST=sandbox.smtp.mailtrap.io
    // EMAIL_PORT=2525
    // EMAIL_PASSWORD=9ba776f2379f67
    // EMAIL_USERNAME=61e4e28c33543e

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // allow self-signed certificates
      },
    });
  }

  async send(template, subject) {
    //1 pug template to be later render for product.
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });
    //2 mail options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html),
    };

    const mailRes = await this.newTransport().sendMail(mailOptions);
    console.log(mailRes);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to WeBuy");
  }
  async sendResetPassword() {
    await this.send(
      "passwordReset",
      "your password reset is only valid for 10min"
    );
  }
  async sendVerificationEmail() {
    await this.send("verifyUser", "Account Verification Link");
  }
};
