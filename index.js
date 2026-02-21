require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Dữ liệu lưu tạm thời trong RAM
let auctions = new Map(); 

client.once('ready', async () => {
    console.log(`🤖 Bot Marketplace đã Online: ${client.user.tag}`);
    
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        await guild.commands.set([
            new SlashCommandBuilder()
                .setName('auction')
                .setDescription('Bắt đầu đấu giá')
                .addStringOption(o => o.setName('item').setDescription('Tên món đồ').setRequired(true))
                .addIntegerOption(o => o.setName('price').setDescription('Giá khởi điểm').setRequired(true))
                .addIntegerOption(o => o.setName('time').setDescription('Số phút đấu giá').setRequired(true)),
            new SlashCommandBuilder()
                .setName('bid')
                .setDescription('Đặt giá thầu')
                .addIntegerOption(o => o.setName('amount').setDescription('Số tiền đặt').setRequired(true))
        ]);
        console.log('✅ Đã đăng ký lệnh Slash');
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'auction') {
        const item = interaction.options.getString('item');
        const price = interaction.options.getInteger('price');
        const time = interaction.options.getInteger('time');
        const endTime = Date.now() + time * 60000;

        // Lưu thông tin vào bộ nhớ tạm
        auctions.set(interaction.channelId, {
            item,
            highestBid: price,
            highestBidder: 'Chưa có',
            endTime
        });

        const embed = new EmbedBuilder()
            .setTitle('🔨 ĐẤU GIÁ MỚI')
            .setColor('Yellow')
            .addFields(
                { name: 'Vật phẩm', value: item, inline: true },
                { name: 'Giá sàn', value: `${price}`, inline: true },
                { name: 'Kết thúc', value: `<t:${Math.floor(endTime / 1000)}:R>` }
            );

        return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'bid') {
        const amount = interaction.options.getInteger('amount');
        const data = auctions.get(interaction.channelId);

        if (!data) return interaction.reply('❌ Không có phiên đấu giá nào ở kênh này.');
        if (Date.now() > data.endTime) return interaction.reply('❌ Phiên đấu giá này đã kết thúc!');
        if (amount <= data.highestBid) return interaction.reply(`❌ Bạn phải đặt cao hơn ${data.highestBid}!`);

        data.highestBid = amount;
        data.highestBidder = interaction.user.tag;
        auctions.set(interaction.channelId, data);

        return interaction.reply(`✅ **${interaction.user.username}** đã dẫn đầu với **${amount} 💰**!`);
    }
});

client.login(process.env.DISCORD_TOKEN);
