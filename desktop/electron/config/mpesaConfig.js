export const mpesaConfig = {
  environment: "sandbox",

  consumerKey:
    process.env.MPESA_CONSUMER_KEY,

  consumerSecret:
    process.env.MPESA_CONSUMER_SECRET,

  shortcode:
    process.env.MPESA_SHORTCODE,

  passkey:
    process.env.MPESA_PASSKEY,

  callbackUrl:
    process.env.MPESA_CALLBACK_URL,

  transactionType:
    "CustomerBuyGoodsOnline",
};