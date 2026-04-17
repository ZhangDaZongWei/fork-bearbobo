/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'

const request = axios.create({
    baseURL: '/api',
})

const get = async (url: string, params?: any) => {
  const response = await request.get(url, { params })
  return response.data
}

const post = async (url: string, data: any) => {
  const response = await request.post(url, data)
  return response.data
}

export default { get, post }