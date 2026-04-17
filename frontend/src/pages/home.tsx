import { useState } from 'react'
import { get, set } from 'jsonuri'
import { marked } from 'marked'

export default function Home() {
  const [query, setQuery] = useState('')
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
    const questionItem = questions.questions.find(it => it.question === question)
    const querys = questionItem?.query.join(';') || ''
    const eventSource = new EventSource(`/api/generate?question=${question}&querys=${querys}`)
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.uri.includes('quick-answer')) {
        setQuickAnswer(prev => prev + data.delta);
      }

      if (data.uri.includes('outline')) {
        setOutline(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const content = get(next, data.uri);
          set(next, data.uri, (content || '') + data.delta);
          return next;
        });
      }

      if (data.uri.includes('cover_image')) {
        setOutline(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          set(next, 'outline/cover_image', data.delta);
          return next;
        });
      }
    }
    eventSource.addEventListener('finished', () => {
      eventSource.close();
    })
  }

  return (
    <div>
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
    </div>
  )
}