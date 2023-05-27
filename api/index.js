import { Telegraf, session } from 'telegraf'
import { openai, initCommand, processTextToChat, INITIAL_SESSION } from './openai.js'
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'



const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

bot.use(session())
// при вызове команды new и start бот регистрирует новую беседу,
// новый контекст

bot.command('new', initCommand)
bot.command('start', initCommand)

bot.on(message('voice'), async (ctx) => {
     // если сессия не определилась, создаем новую
  ctx.session = ctx.session ?? INITIAL_SESSION
  try {
    await ctx.reply(code('Processing voice request...'))
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)
    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    const text = await openai.transcription(mp3Path)
    await ctx.reply(code(`Ваш запрос: ${text}`))
    await processTextToChat(ctx, text) 
    const messages = [{role: openai.roles.USER, content: text}]
    const response = await openai.chat(messages)
    await ctx.reply(response.content)
  } catch (e) {
		console.log(`Error while voice message`, e.message)
  }
})

bot.on(message('text'), async (ctx) => {
    ctx.session = ctx.session ?? INITIAL_SESSION    
    try {
      await ctx.reply(code('Processing text request...'))
      await processTextToChat(ctx, ctx.message.text)
    } catch (e) {
      console.log(`Error while voice message`, e.message)
    }
  })

bot.launch();