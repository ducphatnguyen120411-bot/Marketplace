require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Schema dữ liệu ngay trong file chính để đơn giản hóa
const auctionSchema = new mongoose.Schema({
    item: String,
    highestBid: Number,
    highestBidder: String,
    endTime: Date,
    channelId: String,
    status: { type: String, default: 'active' }
});
const Auction = mongoose.model('Auction', auctionSchema);

// Kết nối Database
mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected'));

client.once('ready', async () => {
    console.log(`🤖 Bot online: ${client.user.tag}`);
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        await guild.commands.set([
            new SlashCommandBuilder()
                .setName('auction')
                .setDescription('Tạo đấu giá')
                .addStringOption(o => o.setName('item').setDescription('Vật phẩm').setRequired(true))
                .addIntegerOption(o => o.setName('price').setDescription('Giá sàn').setRequired(true))
                .addIntegerOption(o => o.setName('time').setDescription('Phút').setRequired(true)),
            new SlashCommandBuilder()
                .setName('bid')
                .setDescription('Đặt giá')
                .addIntegerOption(o => o.setName('amount').setDescription('Số tiền').setRequired(true))
        ]);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Phản hồi ngay lập tức để tránh lỗi "Ứng dụng không phản hồi"
    await interaction.deferReply();

    if (interaction.commandName === 'auction') {
        const item = interaction.options.getString('item');
        const price = interaction.options.getInteger('price');
        const time = interaction.options.getInteger('time');
        const endTime = new Date(Date.now() + time * 60000);

        await Auction.create({ item, highestBid: price, endTime, channelId: interaction.channelId });

        const embed = new EmbedBuilder()
            .setTitle('🔨 ĐẤU GIÁ MỚI')
            .setDescription(`Vật phẩm: **${item}**\nGiá sàn: **${price}**\nKết thúc: <t:${Math.floor(endTime/1000)}:R>`)
            .setColor('Blue');
        
        return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'bid') {
        const amount = interaction.options.getInteger('amount');
        const auction = await Auction.findOne({ channelId: interaction.channelId, status: 'active' });

        if (!auction) return interaction.editReply('❌ Không có phiên đấu giá nào.');
        if (amount <= auction.highestBid) return interaction.editReply(`❌ Phải đặt cao hơn ${auction.highestBid}`);

        auction.highestBid = amount;
        auction.highestBidder = interaction.user.id;
        await auction.save();

        return interaction.editReply(`✅ **${interaction.user.username}** dẫn đầu với **${amount}**!`);
    }
});

client.login(process.env.DISCORD_TOKEN);
