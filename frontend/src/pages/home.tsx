import { useState } from 'react'
import { get, set } from 'jsonuri'
import { marked } from 'marked'

const HISTORY_KEY = 'bearbobo_history'

type HistoryItem = {
  id: number
  question: string
  quickAnswer: string
  outline: {
    question: string
    topics: { topic: string }[]
    introduction: string
    cover_image: string
  }
  createdAt: string
}

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [age, setAge] = useState(8)
  const [gender, setGender] = useState<'male' | 'female'>('female')
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory)
  const [questions, setQuestions] = useState<{ questions: { question: string, query: string[] }[]}>({
    questions: [],
  })
  const [quickAnswer, setQuickAnswer] = useState('')
  const [outline, setOutline] = useState<{
    outline: {
      question: string,
      topics: { topic: string }[],
      introduction: string,
      cover_image: string,
    }
  }>({
    outline: {
      question: '',
      topics: [],
      introduction: '',
      cover_image: '',
    },
  })

  const handleSearch = async () => {
    setQuestions({
      questions: [],
    })
    const eventSource = new EventSource('/api/make-question?question=' + query)
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const { uri, delta } = data;
      setQuestions(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        const content = get(next, uri);
        if (content === undefined && uri.includes('/question')) {
          const questions = get(next, 'questions');
          questions.push({
            question: '',
            query: [],
          });
        }
        set(next, uri, (content || '') + delta);
        return next;
      });
    }

    eventSource.addEventListener('finished', () => {
      eventSource.close();
    })
  }

  const handleQuickAnswer = async (question: string) => {
    setQuickAnswer('')
    setOutline({ outline: { question: '', topics: [], introduction: '', cover_image: '' } })
    const questionItem = questions.questions.find(it => it.question === question)
    const querys = questionItem?.query.join(';') || ''
    let finalQuickAnswer = ''
    let finalOutline = { question: '', topics: [] as { topic: string }[], introduction: '', cover_image: '' }
    const eventSource = new EventSource(`/api/generate?question=${question}&querys=${querys}&age=${age}&gender=${gender}`)
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.uri.includes('quick-answer')) {
        finalQuickAnswer += data.delta
        setQuickAnswer(prev => prev + data.delta);
      }

      if (data.uri.includes('outline')) {
        setOutline(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const content = get(next, data.uri);
          set(next, data.uri, (content || '') + data.delta);
          finalOutline = next.outline
          return next;
        });
      }

      if (data.uri.includes('cover_image')) {
        setOutline(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          set(next, 'outline/cover_image', data.delta);
          finalOutline = next.outline
          return next;
        });
      }
    }
    eventSource.addEventListener('finished', () => {
      eventSource.close()
      const item: HistoryItem = {
        id: Date.now(),
        question,
        quickAnswer: finalQuickAnswer,
        outline: finalOutline,
        createdAt: new Date().toLocaleString('zh-CN'),
      }
      setHistory(prev => {
        const next = [item, ...prev].slice(0, 20)
        saveHistory(next)
        return next
      })
    })
  }

  const handleRestoreHistory = (item: HistoryItem) => {
    setQuickAnswer(item.quickAnswer)
    setOutline({ outline: item.outline })
  }

  const handleDeleteHistory = (id: number) => {
    setHistory(prev => {
      const next = prev.filter(it => it.id !== id)
      saveHistory(next)
      return next
    })
  }

  return (
    <div>
      <div>
        <label>
          年龄：
          <select value={age} onChange={e => setAge(Number(e.target.value))}>
            {[6, 7, 8, 9, 10, 11, 12].map(n => (
              <option key={n} value={n}>{n} 岁</option>
            ))}
          </select>
        </label>
        <label style={{ marginLeft: '16px' }}>
          性别：
          <select value={gender} onChange={e => setGender(e.target.value as 'male' | 'female')}>
            <option value="female">女生</option>
            <option value="male">男生</option>
          </select>
        </label>
      </div>
      <input type="text" value={query} onChange={e => setQuery(e.target.value)} />
      <button onClick={handleSearch}>Search</button>
      <div>
        {questions.questions.map((question) => (
          <div key={question.question}>
            <h3 onClick={() => handleQuickAnswer(question.question)}>{question.question}</h3>
            <ul>
              {question.query?.length > 0 && question.query.map((query) => (
                <li key={query}>{query}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {
        quickAnswer && (
          <div>
            <h3>回答</h3>
            <div dangerouslySetInnerHTML={{ __html: marked.parse(quickAnswer) }} />
          </div>
        )
      }
      {
        outline.outline.introduction && (
          <div>
            <h3>简介</h3>
            {outline.outline.cover_image && (
              <img style={{ width: '500px', height: '400px' }} src={outline.outline.cover_image} alt="cover" />
            )}
            <div dangerouslySetInnerHTML={{ __html: marked.parse(outline.outline.introduction) }} />
          </div>
        )
      }
      {
        history.length > 0 && (
          <div>
            <h3>历史记录</h3>
            <ul>
              {history.map(item => (
                <li key={item.id} style={{ marginBottom: '8px' }}>
                  <span
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => handleRestoreHistory(item)}
                  >
                    {item.question}
                  </span>
                  <span style={{ marginLeft: '8px', color: '#999', fontSize: '12px' }}>{item.createdAt}</span>
                  <button
                    style={{ marginLeft: '8px' }}
                    onClick={() => handleDeleteHistory(item.id)}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      }
    </div>
  )
}