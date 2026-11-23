const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { spawn } = require('child_process');

// جلب توكن البوت من المتغير البيئي في Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ACCESS_PASSWORD = process.env.ONE_WEB_PASSWORD || 'JenkinWoo';
const API_BASE_URL = 'http://127.0.0.1:8787';

if (!TELEGRAM_TOKEN) {
  console.error("❌ خطأ: لم يتم ضبط TELEGRAM_TOKEN في Environment Variables!");
  process.exit(1);
}

// تشغيل خادم sheeridVerify المحلي تلقائياً في الخلفية
console.log("🚀 جاري تشغيل خادم sheeridVerify المحلي...");
const webServer = spawn('npm', ['run', 'web'], { stdio: 'inherit' });

// إعداد بوت تليجرام
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// رسالة البداية /start
bot.onText(/\/start/, (msg) => {
  const welcomeText = 
    "👋 أهلاً بك في بوت التحقق التلقائي!\n\n" +
    "لإرسال مهمة تحقق جديدة، استخدم الأمر بالشكل التالي:\n" +
    "`/verify [الرابط] [الاسم الأول] [الاسم الأخير] [تاريخ الميلاد YYYY-MM-DD]`\n\n" +
    "📌 *مثال:*\n" +
    "`/verify https://services.sheerid.com/verify/123456/ John Doe 2000-01-01`";
  
  bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: 'Markdown' });
});

// استقبال أمر التوثيق /verify
bot.onText(/\/verify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].trim().split(/\s+/);

  if (args.length < 4) {
    return bot.sendMessage(
      chatId, 
      "❌ *خطأ في الصيغة!*\nيرجى التأكد من كتابة الرابط، الاسم الأول، الاسم الأخير، وتاريخ الميلاد تفصيلاً.",
      { parse_mode: 'Markdown' }
    );
  }

  const [url, firstName, lastName, birthDate] = args;

  bot.sendMessage(chatId, "⏳ جاري إرسال الطلب إلى خادم التوثيق وتمرير البيانات...");

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/jobs`,
      {
        url: url,
        firstName: firstName,
        lastName: lastName,
        birthDate: birthDate,
        proxy: ""
      },
      {
        headers: {
          'X-Web-Password': ACCESS_PASSWORD,
          'Content-Type': 'application/json'
        }
      }
    );

    const jobId = response.data.id || 'قيد المعالجة';
    bot.sendMessage(
      chatId, 
      `✅ *تمت إضافة المهمة إلى الطابور بنجاح!*\n\n🆔 معرّف المهمة: \`${jobId}\`\n⚡ يتم الآن فحص وتعبئة البيانات تلقائياً.`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error("Error connecting to local server:", error.message);
    bot.sendMessage(
      chatId, 
      "❌ *فشل الاتصال بخادم التوثيق المحلي.*\nتأكد من إعداد كلمة المرور والمتغيرات بشكل صحيح."
    );
  }
});

console.log("🤖 بوت تليجرام يعمل الآن ونشط على تليجرام!");
