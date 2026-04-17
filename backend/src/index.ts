import 'dotenv/config'
import express from 'express'
import { ChatConfig, Ling } from '@bearbobo/ling'
import prompt from './prompt/make-question.tpl'
import quickAnswerPrompt from './prompt/quick-answer.tpl'
import outlinePrompt from './prompt/outline.tpl'
import { pipeline } from 'node:stream/promises'
import { search } from './lib/serper.search'
import { genImg } from './lib/genImg'

const app = express()
const PORT = process.env.PORT || 3000

const config: ChatConfig = {
  model_name: process.env.KIMAI_MODEL_NAME as string,
  api_key: process.env.KIMAI_API_KEY as string,
  endpoint: process.env.KIMAI_BASE_URL as string,
  sse: true,
}

app.use(express.json())

app.get('/make-question', async (req, res) => {
  const { question } = req.query as { question: string }

  const ling = new Ling(config)

  const quickAnswerBot = ling.createBot()

  quickAnswerBot.addPrompt(prompt)

  quickAnswerBot.chat(question)

  ling.close()

  res.writeHead(200, {
      'Content-Type': "text/event-stream",
      'Cache-Control': "no-cache",
      'Connection': "keep-alive",
    }
  )

  pipeline(ling.stream, res)
})

app.get('/generate', async (req, res) => {
  const { question, querys } = req.query as { question: string, querys: string }

  // 搜索
  let searchResults = ''
  if (querys) {
    searchResults = JSON.stringify(await Promise.all(querys.split(';').map(query => search(query))))
  }

  const ling = new Ling(config)

  const quickAnswerBot = ling.createBot('quick-answer', {}, {
    response_format: { type: 'text' },
  })

  const outlineBot = ling.createBot('outline')

  quickAnswerBot.addPrompt(quickAnswerPrompt, {
    gender: 'female',
    age: 6,
  })
  outlineBot.addPrompt(outlinePrompt, {
    gender: 'female',
    age: 6,
  })

  outlineBot.addFilter('image-prompt')
  outlineBot.addListener('string-response', ({ uri, delta}) => {
    if (uri.includes('image_prompt')) {
      ling.handleTask(async () => {
        const imageUrl = await genImg(`A full-size picture suitable as a cover for children's picture books that depicts ${delta}. DO NOT use any text or symbols.`)
        ling.sendEvent({ uri: 'cover_image', delta: imageUrl })
      })
    }
  })

  if (searchResults) {
    quickAnswerBot.addPrompt(`参考资料\n\n${searchResults}`)
    outlineBot.addPrompt(`参考资料\n\n${searchResults}`)
  }

  quickAnswerBot.chat(question)
  outlineBot.chat(question)

  ling.close()

  res.writeHead(200, {
    'Content-Type': "text/event-stream",
    'Cache-Control': "no-cache",
    'Connection': "keep-alive",
  })

  pipeline(ling.stream, res)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
