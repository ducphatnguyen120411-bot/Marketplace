require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Bộ nhớ tạm để lưu thông tin đấu giá (Dữ liệu sẽ mất khi bot restart)
const auctions = new Map(); 

// ID Role được phép sử dụng lệnh /auction
const ADMIN_ROLE_ID = '1465374336214106237';

client.once('ready', () => {
    console.log(`✅ Bot Marketplace đã sẵn sàng: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // --- LỆNH TẠO ĐẤU GIÁ (Chỉ dành cho Role chỉ định) ---
    if (interaction.commandName === 'auction') {
        // Kiểm tra quyền Role
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ 
                content: `❌ Bạn không có quyền sử dụng lệnh này. Chỉ dành cho thành viên có Role ID: \`${ADMIN_ROLE_ID}\`.`, 
                ephemeral: true 
            });
        }

        const item = interaction.options.getString('item');
        const price = interaction.options.getInteger('price');
        const time = interaction.options.getInteger('time');
        const endTime = Date.now() + time * 60000;

        const embed = new EmbedBuilder()
            .setTitle('🔨 PHIÊN ĐẤU GIÁ ĐANG DIỄN RA')
            .setAuthor({ name: `Người bán: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setColor('#FFD700') // Màu vàng Gold
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1041/1041040.png')
            .addFields(
                { name: '📦 Vật phẩm', value: `\`${item}\``, inline: true },
                { name: '💰 Giá hiện tại', value: `**${price.toLocaleString()}** 🪙`, inline: true },
                { name: '👤 Người dẫn đầu', value: `Chưa có`, inline: true },
                { name: '⏰ Kết thúc trong', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: false }
            )
            .setFooter({ text: 'Sử dụng /bid để đặt giá ngay!' })
            .setTimestamp();

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });

        // Lưu thông tin phiên đấu giá vào Map
        auctions.set(interaction.channelId, {
            item,
            highestBid: price,
            highestBidder: null,
            endTime,
            messageId: message.id,
            seller: interaction.user.username,
            sellerAvatar: interaction.user.displayAvatarURL()
        });
    }

    // --- LỆNH ĐẶT GIÁ (Cập nhật trực tiếp vào Embed gốc) ---
    if (interaction.commandName === 'bid') {
        const amount = interaction.options.getInteger('amount');
        const data = auctions.get(interaction.channelId);

        if (!data) {
            return interaction.reply({ content: '❌ Không có phiên đấu giá nào đang diễn ra tại kênh này!', ephemeral: true });
        }

        if (Date.now() > data.endTime) {
            return interaction.reply({ content: '❌ Phiên đấu giá này đã kết thúc!', ephemeral: true });
        }

        if (amount <= data.highestBid) {
            return interaction.reply({ 
                content: `⚠️ Giá đặt phải cao hơn mức giá hiện tại (**${data.highestBid.toLocaleString()}** 🪙)!`, 
                ephemeral: true 
            });
        }

        // Cập nhật dữ liệu mới
        data.highestBid = amount;
        data.highestBidder = interaction.user.id;
        auctions.set(interaction.channelId, data);

        // Tạo Embed đã cập nhật
        const updatedEmbed = new EmbedBuilder()
            .setTitle('🔨 PHIÊN ĐẤU GIÁ ĐANG DIỄN RA')
            .setAuthor({ name: `Người bán: ${data.seller}`, iconURL: data.sellerAvatar })
            .setColor('#2ECC71') // Đổi sang màu xanh lá khi có người bid
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1041/1041040.png')
            .addFields(
                { name: '📦 Vật phẩm', value: `\`${data.item}\``, inline: true },
                { name: '💰 Giá hiện tại', value: `**${amount.toLocaleString()}** 🪙`, inline: true },
                { name: '👤 Người dẫn đầu', value: `<@${interaction.user.id}>`, inline: true },
                { name: '⏰ Kết thúc', value: `<t:${Math.floor(data.endTime / 1000)}:R>`, inline: false }
            )
            .setFooter({ text: `Vừa cập nhật bởi ${interaction.user.username}` })
            .setTimestamp();

        try {
            // Sửa tin nhắn gốc (Edit)
            const channel = await client.channels.fetch(interaction.channelId);
            const originalMessage = await channel.messages.fetch(data.messageId);
            await originalMessage.edit({ embeds: [updatedEmbed] });

            // Thông báo riêng cho người đặt giá thành công
            return interaction.reply({ content: `✅ Bạn đã dẫn đầu với mức giá **${amount.toLocaleString()}**!`, ephemeral: true });
        } catch (error) {
            console.error('Lỗi khi cập nhật tin nhắn:', error);
            return interaction.reply({ content: '❌ Lỗi hệ thống khi cập nhật bảng giá!', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
