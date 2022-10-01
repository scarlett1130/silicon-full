const Conversation = require('../models/conversation');
const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');

async function deleteExpiredMessage() {
  const date = Date.now();
  const conversationWithOldMessages = await Conversation.find({ 'messages.expire_at': { $lt: date } });

  for (let i = 0; i < conversationWithOldMessages.length; i++) {
    conversationWithOldMessages[i].deleteMessageWithDate(date);

    if (!conversationWithOldMessages[i].messages.length) {
      const sender1 = await User.findOne({ username: conversationWithOldMessages[i].sender_1 });

      if (!sender1 || sender1.settings.deleteEmptyConversation) {
        conversationWithOldMessages[i].deleteConversation();
      } else conversationWithOldMessages[i].save();
    } else {
      conversationWithOldMessages[i].save();
    }
  }
}

async function hasOrderBeenPaid() {
  const orders = await Order.find({ orderStatus: 'awaitingPayment' });

  for (let i = 0; i < orders.length; i++) {
    orders[i].continueOrder();
    orders[i].save();
  }
}

// Refund if paid
async function handleOrderWithExpiredTimer() {
  const orders = await Order.find({ timeUntilUpdate: { $lt: Date.now() } });

  for (let i = 0; i < orders.length; i++) {
    if (orders[i].orderStatus !== 'finalized') orders[i].expiredOrder();
    else orders[i].applyPrivacyMeasure();

    orders[i].save();
  }
}

async function deleteInactiveUser() {
  const users = await User.find({ expire_at: { $lt: Date.now() } });

  for (let i = 0; i < users.length; i++) {
    users[i].deleteUser();
  }
}

async function findAndendSales() {
  const products = await Product.find({ sales_end: { $lt: Date.now() } });

  for (let i = 0; i < products.length; i++) {
    products[i].endSales();
    products[i].save();
  }
}

function allDatabaseScanningFunction() {
  setInterval(() => {
    console.log('1min');
    hasOrderBeenPaid();
  }, 60000); // 1 min

  setInterval(() => {
    console.log('5min');
    deleteExpiredMessage();
    handleOrderWithExpiredTimer();
    findAndendSales();
  }, 300000); // 5min

  setInterval(() => {
    console.log('1day');
    deleteInactiveUser();
  }, 86400000); // 1day
}

module.exports = { allDatabaseScanningFunction };