require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let auctions = new Map(); 

client.once('ready', () => {
    console.log(`🤖 Bot Marketplace đã Online: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // --- LỆNH TẠO ĐẤU GIÁ ---
    if (interaction.commandName === 'auction') {
        const item = interaction.options.getString('item');
        const price = interaction.options.getInteger('price');
        const time = interaction.options.getInteger('time');
        const endTime = Date.now() + time * 60000;

        const embed = new EmbedBuilder()
            .setTitle('🔨 PHIÊN ĐẤU GIÁ ĐANG DIỄN RA')
            .setAuthor({ name: `Người bán: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setColor('#FFD700')
            .setThumbnail('https://i.imgur.com/m86S79v.png')
            .addFields(
                { name: '📦 Vật phẩm', value: `\`${item}\``, inline: true },
                { name: '💰 Giá hiện tại', value: `**${price.toLocaleString()}** 🪙`, inline: true },
                { name: '👤 Người dẫn đầu', value: `Chưa có`, inline: true },
                { name: '⏰ Kết thúc', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: false }
            )
            .setFooter({ text: 'Gõ /bid để đặt giá!' })
            .setTimestamp();

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });

        // Lưu thông tin kèm theo ID của tin nhắn để sau này Edit
        auctions.set(interaction.channelId, {
            item,
            highestBid: price,
            highestBidder: 'Chưa có',
            endTime,
            messageId: message.id, 
            seller: interaction.user.username
        });
    }

    // --- LỆNH ĐẶT GIÁ ---
    if (interaction.commandName === 'bid') {
        const amount = interaction.options.getInteger('amount');
        const data = auctions.get(interaction.channelId);

        if (!data) return interaction.reply({ content: '❌ Không có đấu giá nào!', ephemeral: true });
        if (amount <= data.highestBid) return interaction.reply({ content: `⚠️ Phải đặt cao hơn **${data.highestBid}**!`, ephemeral: true });

        // Cập nhật dữ liệu mới
        data.highestBid = amount;
        data.highestBidder = interaction.user.username;
        auctions.set(interaction.channelId, data);

        // Tạo Embed mới đã cập nhật thông tin
        const updatedEmbed = new EmbedBuilder()
            .setTitle('🔨 PHIÊN ĐẤU GIÁ ĐANG DIỄN RA')
            .setAuthor({ name: `Người bán: ${data.seller}` })
            .setColor('#2ECC71') // Đổi sang màu xanh lá khi có người bid
            .setThumbnail('https://i.imgur.com/m86S79v.png')
            .addFields(
                { name: '📦 Vật phẩm', value: `\`${data.item}\``, inline: true },
                { name: '💰 Giá hiện tại', value: `**${amount.toLocaleString()}** 🪙`, inline: true },
                { name: '👤 Người dẫn đầu', value: `${interaction.user}`, inline: true },
                { name: '⏰ Kết thúc', value: `<t:${Math.floor(data.endTime / 1000)}:R>`, inline: false }
            )
            .setFooter({ text: `Người đặt giá cuối: ${interaction.user.tag}` })
            .setTimestamp();

        // 1. Sửa tin nhắn gốc (Cập nhật Embed)
        const channel = await client.channels.fetch(interaction.channelId);
        const originalMessage = await channel.messages.fetch(data.messageId);
        await originalMessage.edit({ embeds: [updatedEmbed] });

        // 2. Trả lời người đặt giá (Tin nhắn này sẽ tự ẩn sau vài giây hoặc hiện thông báo ngắn)
        return interaction.reply({ content: `✅ Bạn đã đặt giá **${amount.toLocaleString()}** thành công!`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
