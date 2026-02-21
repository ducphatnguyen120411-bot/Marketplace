const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
    item: String,
    sellerId: String,
    highestBidder: { type: String, default: 'None' },
    highestBid: { type: Number, default: 0 },
    endTime: Date,
    channelId: String,
    status: { type: String, default: 'active' } // 'active' hoặc 'ended'
});

module.exports = mongoose.model('Auction', auctionSchema);
