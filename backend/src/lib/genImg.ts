import 'dotenv/config'

const VOLCANO_URL = process.env.VOLCANO_URL as string
const VOLCANO_API_KEY = process.env.VOLCANO_API_KEY as string

export const genImg = async (imagePrompt: string): Promise<string> => {
    const response = await fetch(VOLCANO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VOLCANO_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'doubao-seedream-5-0-260128',
          prompt: imagePrompt,
        }),
      })
      const data: any = await response.json()
      return data.data[0].url
}