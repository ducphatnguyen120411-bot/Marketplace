require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const Auction = require('./Auction');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Kết nối Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Đã kết nối MongoDB'))
    .catch(err => console.error('❌ Lỗi kết nối DB:', err));

client.once('ready', async () => {
    console.log(`🤖 Bot đang chạy: ${client.user.tag}`);
    
    // Đăng ký Slash Command
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        await guild.commands.set([
            new SlashCommandBuilder()
                .setName('auction')
                .setDescription('Bắt đầu một phiên đấu giá')
                .addStringOption(opt => opt.setName('item').setDescription('Tên vật phẩm').setRequired(true))
                .addIntegerOption(opt => opt.setName('price').setDescription('Giá khởi điểm').setRequired(true))
                .addIntegerOption(opt => opt.setName('time').setDescription('Thời gian (phút)').setRequired(true)),
            
            new SlashCommandBuilder()
                .setName('bid')
                .setDescription('Đặt giá thầu')
                .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền đặt').setRequired(true))
        ]);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // LỆNH ĐẤU GIÁ
    if (interaction.commandName === 'auction') {
        const item = interaction.options.getString('item');
        const price = interaction.options.getInteger('price');
        const time = interaction.options.getInteger('time');
        const endTime = new Date(Date.now() + time * 60000);

        const newAuction = await Auction.create({
            item, sellerId: interaction.user.id, highestBid: price, endTime, channelId: interaction.channelId
        });

        const embed = new EmbedBuilder()
            .setTitle('🔨 PHIÊN ĐẤU GIÁ BẮT ĐẦU')
            .setColor('Blue')
            .addFields(
                { name: 'Vật phẩm', value: item, inline: true },
                { name: 'Giá khởi điểm', value: `${price} 💰`, inline: true },
                { name: 'Kết thúc lúc', value: `<t:${Math.floor(endTime / 1000)}:R>` }
            );

        return interaction.reply({ embeds: [embed] });
    }

    // LỆNH ĐẶT GIÁ (BID)
    if (interaction.commandName === 'bid') {
        const amount = interaction.options.getInteger('amount');
        const auction = await Auction.findOne({ channelId: interaction.channelId, status: 'active' });

        if (!auction) return interaction.reply('❌ Không có phiên đấu giá nào đang diễn ra ở đây.');
        if (amount <= auction.highestBid) return interaction.reply(`❌ Bạn phải đặt giá cao hơn ${auction.highestBid}!`);

        auction.highestBid = amount;
        auction.highestBidder = interaction.user.id;
        await auction.save();

        return interaction.reply(`✅ **${interaction.user.username}** đã dẫn đầu với **${amount} 💰**!`);
    }
});

client.login(process.env.DISCORD_TOKEN);
